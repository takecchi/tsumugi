import { Outlet, Scripts, ScrollRestoration } from 'react-router';
import type { LinksFunction, MetaFunction } from 'react-router';
import React from 'react';
import { AdapterProvider } from './adapter-provider';
import { SafeErrorBoundary, SafeMeta, SafeLinks } from '@tsumugi/react-router';

import './app.css';

export const links: LinksFunction = () => [
  { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
  {
    rel: 'icon',
    type: 'image/png',
    sizes: '16x16',
    href: '/favicon-16x16.png',
  },
  {
    rel: 'icon',
    type: 'image/png',
    sizes: '32x32',
    href: '/favicon-32x32.png',
  },
  { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/icon-192.png' },
  { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
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
  // APIとPWA
  ...(import.meta.env.VITE_ADAPTER === 'api'
    ? [
        { rel: 'preconnect', href: import.meta.env.VITE_API_BASE_URL },
        {
          rel: 'manifest',
          href: '/manifest.webmanifest',
        },
      ]
    : []),
];

export const meta: MetaFunction = () => {
  return [
    { title: 'Tsumugi - AI小説執筆支援ツール' },
    {
      name: 'description',
      content:
        'Tsumugiは小説やストーリー執筆を支援するツールです。プロット管理、キャラクター設定、執筆進捗管理など、創作活動に必要な機能を提供します。',
    },
    {
      name: 'keywords',
      content:
        '小説,執筆,創作,プロット,キャラクター,ストーリー,執筆支援,創作ツール,小説家,作家',
    },
    { name: 'author', content: 'takecchi' },
    { name: 'robots', content: 'index,follow' },
    { name: 'theme-color', content: '#ffffff' },

    // OGPタグ
    { property: 'og:type', content: 'website' },
    { property: 'og:title', content: 'Tsumugi - 小説執筆支援ツール' },
    {
      property: 'og:description',
      content:
        'Tsumugiは小説やストーリー執筆を支援するツールです。プロット管理、キャラクター設定、執筆進捗管理など、創作活動に必要な機能を提供します。',
    },
    { property: 'og:site_name', content: 'Tsumugi' },
    { property: 'og:locale', content: 'ja_JP' },
    { property: 'og:image', content: '/og-image.png' },
    { property: 'og:image:width', content: '400' },
    { property: 'og:image:height', content: '400' },
    { property: 'og:image:alt', content: 'Tsumugi - 小説執筆支援ツール' },

    // Twitter Card
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: 'Tsumugi - 小説執筆支援ツール' },
    {
      name: 'twitter:description',
      content:
        'Tsumugiは小説やストーリー執筆を支援するツールです。プロット管理、キャラクター設定、執筆進捗管理など、創作活動に必要な機能を提供します。',
    },
    { name: 'twitter:image', content: '/og-image.png' },
    { name: 'twitter:image:alt', content: 'Tsumugi - 小説執筆支援ツール' },
  ];
};

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <SafeMeta />
        <SafeLinks />
        <script src="/registerSW.js" />
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
  // Register Service Worker for PWA
  React.useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    }
  }, []);

  return (
    <AdapterProvider>
      <Outlet />
    </AdapterProvider>
  );
}
