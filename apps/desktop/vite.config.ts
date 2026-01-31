import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type PluginOption } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { generateSW } from 'workbox-build';
import path from 'path';

const host = process.env.TAURI_DEV_HOST;

const customGenerateSW = (): PluginOption => ({
  name: 'service-worker-generator',
  apply: 'build',
  closeBundle: async () => {
    const distDir = path.resolve(__dirname, 'build/client');
    await generateSW({
      swDest: path.join(distDir, 'sw.js'),
      globDirectory: distDir,
      globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,woff2,woff}'],
      navigateFallback: 'index.html',
      // SW経由でもナビゲーションを並行取得
      navigationPreload: true,
      // 古いキャッシュ掃除＆即時有効化
      cleanupOutdatedCaches: true,
      skipWaiting: true,
      clientsClaim: true,
      // ランタイムキャッシュ戦略
      runtimeCaching: [
        // JS/CSS/フォントは表示を止めない SWR
        {
          urlPattern: /\/assets\/.*\.(?:js|css|woff2?|ttf|otf)$/i,
          handler: 'StaleWhileRevalidate',
          options: { cacheName: 'assets-v1' },
        },
        // 画像はCacheFirst
        {
          // 末尾の拡張子 + クエリ文字列付きもOK
          urlPattern: /\.(?:png|jpe?g|webp|avif|gif|svg|ico)(?:\?.*)?$/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'images-any-v1',
            expiration: { maxEntries: 300, maxAgeSeconds: 14 * 24 * 60 * 60 },
            // 3rd-party(CORS)のopaqueレスポンスもキャッシュ対象にする
            cacheableResponse: { statuses: [0, 200] },
          },
        },
      ],
    });
  },
});

export default defineConfig({
  // Rustのエラーメッセージが見えるようにする
  clearScreen: false,
  resolve: {
    alias: {
      // ビルド時に @tsumugi/adapter を @tsumugi/adapter-local に置換
      '@tsumugi/adapter': '@tsumugi/adapter-local',
    },
  },
  server: {
    // ポート固定
    port: 5173,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // src-tauriの変更を監視しない
      ignored: ['**/src-tauri/**'],
    },
  },
  // VITE_またはTAURI_ENV_*で始まる環境変数をTauriのソースコードで使用可能にする
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  build: {
    // ターゲットブラウザを指定
    target:
      process.env.TAURI_ENV_PLATFORM == 'windows' ? 'chrome105' : 'safari13',
    // デバッグビルドではminifyしない
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    // デバッグビルド時にソースマップを生成
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths(), customGenerateSW()],
});
