import { createContext, useMemo } from 'react';
import { createAdapter } from '@tsumugi/adapter';
import type { Adapter } from '@tsumugi/adapter';

export const AdapterContext = createContext<Adapter | null>(null);

export function AdapterProvider({
  adapter,
  children,
}: {
  adapter?: Adapter;
  children: React.ReactNode;
}) {
  const value = useMemo(() => {
    if (adapter) return adapter;

    return createAdapter({
      api: {
        baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
      },
    });
  }, [adapter]);

  return (
    <AdapterContext.Provider value={value}>{children}</AdapterContext.Provider>
  );
}
