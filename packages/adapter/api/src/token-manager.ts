import type { AuthApi } from '@tsumugi-chan/client';

/** トークンの有効期限が切れる何秒前にリフレッシュを開始するか */
const REFRESH_THRESHOLD_SECONDS = 60;

/**
 * JWT の payload から exp クレーム（秒）を取得する。
 * デコード不可の場合は undefined を返す。
 */
function getJwtExp(token: string): number | undefined {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return undefined;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    const payload = JSON.parse(json) as { exp?: number };
    return payload.exp;
  } catch {
    return undefined;
  }
}

/**
 * アクセストークンをオンメモリで管理する。
 *
 * - 有効期限内のトークンはそのまま返す
 * - 有効期限が間近（REFRESH_THRESHOLD_SECONDS 以内）ならリフレッシュを開始
 * - 同時に複数箇所から呼ばれた場合、進行中の Promise に合流しリクエストは1回のみ
 */
export class TokenManager {
  private token: string | null = null;
  private expiresAt: number | null = null;
  private refreshPromise: Promise<string> | null = null;
  private authApi: AuthApi | null = null;

  /**
   * AuthApi を後から注入する。
   * （AuthApi 自体が Configuration を必要とし、Configuration が TokenManager を必要とするため）
   */
  setAuthApi(authApi: AuthApi): void {
    this.authApi = authApi;
  }

  /**
   * トークンを外部からセットする（ログイン成功時、コールバック時など）。
   */
  setToken(token: string): void {
    this.token = token;
    this.expiresAt = getJwtExp(token) ?? null;
  }

  /**
   * トークンをクリアする（ログアウト時）。
   */
  clear(): void {
    this.token = null;
    this.expiresAt = null;
    this.refreshPromise = null;
  }

  /**
   * 現在のトークンを取得する（有効期限チェックなし）。
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * 認証済みかどうかを返す。
   */
  isAuthenticated(): boolean {
    return this.token !== null;
  }

  /**
   * リフレッシュを試みてトークンを取得する。
   * トークンの有無に関わらず Cookie のリフレッシュトークンでアクセストークンを取得する。
   * 同時呼び出し時は進行中の refresh Promise に合流する。
   */
  async refreshToken(): Promise<string> {
    if (!this.authApi) {
      throw new Error('TokenManager: AuthApi is not set');
    }

    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.doRefresh().finally(() => {
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  /**
   * 有効なアクセストークンを取得する。
   *
   * - メモリ上にトークンがあり有効期限内 → そのまま返す
   * - 有効期限が間近 or 切れている → リフレッシュして返す
   * - 同時呼び出し時は進行中の refresh Promise に合流する
   * - トークンがない場合はエラーを投げる（未認証状態）
   */
  async getAccessToken(): Promise<string> {
    if (this.token && !this.isExpiringSoon()) {
      return this.token;
    }

    if (!this.token) {
      throw new Error('Not authenticated');
    }

    if (!this.authApi) {
      throw new Error('TokenManager: AuthApi is not set');
    }

    // 既にリフレッシュ中ならそのPromiseに合流
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    // 新規リフレッシュ開始
    this.refreshPromise = this.doRefresh().finally(() => {
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  private isExpiringSoon(): boolean {
    if (this.expiresAt === null) {
      // exp が不明な場合は期限切れとみなしてリフレッシュを試みる
      return true;
    }
    const nowSeconds = Math.floor(Date.now() / 1000);
    return this.expiresAt - nowSeconds <= REFRESH_THRESHOLD_SECONDS;
  }

  private async doRefresh(): Promise<string> {
    if (!this.authApi) {
      throw new Error('TokenManager: AuthApi is not set');
    }

    try {
      const result = await this.authApi.postTokenRefresh();
      this.setToken(result.accessToken);
      return result.accessToken;
    } catch (error) {
      // リフレッシュ失敗時はトークンをクリア
      this.clear();
      throw error;
    }
  }
}
