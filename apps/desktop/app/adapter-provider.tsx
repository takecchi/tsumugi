import { createContext, useEffect, useMemo, useState } from 'react';
import { createAdapter } from '@tsumugi/adapter';
import type { Adapter } from '@tsumugi/adapter';

export const AdapterContext = createContext<Adapter | null>(null);

/**
 * Tauri IPC ブリッジ（window.__TAURI_INTERNALS__）が利用可能になるまで待つ。
 * dev 起動時、WebView のロード直後は IPC がまだ注入されていない場合があり、
 * その状態で Tauri API を呼ぶとエラーになるレースコンディションを防ぐ。
 */
function useTauriReady(): boolean {
  const [ready, setReady] = useState(
    () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window,
  );

  useEffect(() => {
    if (ready) return;

    // 短い間隔でポーリングして IPC の注入を待つ
    const id = setInterval(() => {
      if ('__TAURI_INTERNALS__' in window) {
        setReady(true);
        clearInterval(id);
      }
    }, 50);

    return () => clearInterval(id);
  }, [ready]);

  return ready;
}

const isApiAdapter = import.meta.env.VITE_ADAPTER === 'api';

export function AdapterProvider({
  adapter,
  children,
}: {
  adapter?: Adapter;
  children: React.ReactNode;
}) {
  const tauriReady = useTauriReady();

  const value = useMemo(() => {
    if (adapter) return adapter;

    if (isApiAdapter) {
      return createAdapter({
        api: {
          baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
        },
      });
    }

    if (!tauriReady) return null;

    return createAdapter({
      local: {
        ai: {
          provider: import.meta.env.VITE_AI_PROVIDER || 'openai',
          apiKey: import.meta.env.VITE_AI_API_KEY || '',
          defaultModel: import.meta.env.VITE_AI_MODEL || undefined,
          baseUrl: import.meta.env.VITE_AI_BASE_URL || undefined,
        },
      },
    });
  }, [adapter, tauriReady]);

  if (!value) {
    return null;
  }

  return (
    <AdapterContext.Provider value={value}>{children}</AdapterContext.Provider>
  );
}
