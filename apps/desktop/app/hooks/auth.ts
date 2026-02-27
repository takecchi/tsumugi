import { useAdapter } from '~/hooks/useAdapter';
import useSWR from 'swr';
import type { AuthState, GoogleAuthUrl } from '@tsumugi/adapter';
import useSWRMutation from 'swr/mutation';

interface AuthStateKey {
  type: 'authState';
}

export function useAuthState() {
  const adapter = useAdapter();
  return useSWR<AuthState, Error, AuthStateKey>({ type: 'authState' }, () =>
    adapter.auth.getAuthState(),
  );
}

export function useGoogleLogin() {
  const adapter = useAdapter();
  return useSWRMutation<GoogleAuthUrl, Error, { type: 'googleLogin' }>(
    { type: 'googleLogin' },
    async (_) => {
      return adapter.auth.getGoogleAuthUrl();
    },
  );
}
