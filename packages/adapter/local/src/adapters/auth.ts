import type { AuthAdapter, AuthState, GoogleAuthUrl } from '@tsumugi/adapter';

/**
 * ローカルアダプター用の認証アダプター
 *
 * ローカルでは認証は不要なため、常にログイン済み状態として扱う。
 */
export function createAuthAdapter(): AuthAdapter {
  const authState: AuthState = {
    isAuthenticated: true,
    accessToken: null,
  };

  return {
    async getAuthState(): Promise<AuthState> {
      return authState;
    },

    async getGoogleAuthUrl(): Promise<GoogleAuthUrl> {
      throw new Error('Google OAuth is not supported in local adapter');
    },

    async logout(): Promise<void> {
      // ローカルではログアウト不要
    },

    async refreshAccessToken(): Promise<AuthState> {
      return authState;
    },
  };
}
