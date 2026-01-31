import { Outlet, Scripts, ScrollRestoration } from 'react-router';
import type { LinksFunction } from 'react-router';
import { AdapterProvider } from './adapter-provider';
import { SafeErrorBoundary, SafeMeta, SafeLinks } from '@tsumugi/react-router';

import '@tsumugi/ui/index.css';

export const links: LinksFunction = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&display=swap',
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <SafeMeta />
        <SafeLinks />
      </head>
      <body>
        <SafeErrorBoundary
          fallback={
            <main className="container mx-auto p-4 pt-16">
              <h1>Oops!</h1>
              <p>An unexpected error occurred.</p>
            </main>
          }
        >
          {children}
        </SafeErrorBoundary>
        <SafeErrorBoundary fallback={null}>
          <ScrollRestoration />
          <Scripts />
        </SafeErrorBoundary>
      </body>
    </html>
  );
}

export default function App() {
  return (
    <AdapterProvider>
      <Outlet />
    </AdapterProvider>
  );
}

