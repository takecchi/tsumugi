import type { AuthAdapter, AuthState, GoogleAuthUrl } from '@tsumugi/adapter';
import type { ApiClients } from '@/client';
import type { TokenManager } from '@/token-manager';

export function createAuthAdapter(
  clients: ApiClients,
  tokenManager: TokenManager,
): AuthAdapter {
  return {
    async getAuthState(): Promise<AuthState> {
      const accessToken = tokenManager.getToken();
      if (!accessToken) {
        return {
          isAuthenticated: false,
          accessToken: null,
        };
      }
      return {
        isAuthenticated: true,
        accessToken,
      };
    },

    async getGoogleAuthUrl(): Promise<GoogleAuthUrl> {
      const opts = await clients.auth.getGoogleLoginRequestOpts();
      return { url: `${clients.configuration.basePath}${opts.path}` };
    },

    async logout(): Promise<void> {
      try {
        await clients.auth.postLogout();
      } catch (error) {
        console.error('Failed to logout:', error);
      } finally {
        tokenManager.clear();
      }
    },

    async refreshAccessToken(): Promise<AuthState> {
      try {
        const accessToken = await tokenManager.refreshToken();
        return {
          isAuthenticated: true,
          accessToken,
        };
      } catch {
        return {
          isAuthenticated: false,
          accessToken: null,
        };
      }
    },
  };
}
