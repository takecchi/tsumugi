import { useAdapter } from '~/hooks/useAdapter';
import useSWR from 'swr';
import type { AuthState } from '@tsumugi/adapter';

interface AuthStateKey {
  type: 'authState';
}

export function useAuthState() {
  const adapter = useAdapter();
  return useSWR<AuthState, Error, AuthStateKey>({ type: 'authState' }, () =>
    adapter.auth.getAuthState(),
  );
}
