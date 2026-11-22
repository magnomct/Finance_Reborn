import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
        manifest: {
          id: '/',
          name: 'Yupee Reborn - Finanças Pessoais & 6 Potes',
          short_name: 'Yupee',
          description: 'App de finanças pessoais Reborn com 6 Potes, fluxo de caixa e registro offline de transações.',
          theme_color: '#4f46e5',
          background_color: '#0f172a',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          globIgnores: ['**/node_modules/**/*', '**/*.map'],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              urlPattern: /\/api\/(metadata|categories|config|jars|goals-meta)/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'finance-metadata-swr',
                cacheableResponse: {
                  statuses: [0, 200],
                },
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24,
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            const normalized = id.replace(/\\/g, '/');

            if (
              normalized.includes('/node_modules/react/') ||
              normalized.includes('/node_modules/react-dom/') ||
              normalized.includes('/node_modules/scheduler/') ||
              normalized.includes('/node_modules/react-is/')
            ) {
              return 'vendor-react';
            }

            if (
              normalized.includes('/node_modules/d3/') ||
              normalized.includes('/node_modules/d3-axis/') ||
              normalized.includes('/node_modules/d3-brush/') ||
              normalized.includes('/node_modules/d3-chord/') ||
              normalized.includes('/node_modules/d3-contour/') ||
              normalized.includes('/node_modules/d3-delaunay/') ||
              normalized.includes('/node_modules/d3-dispatch/') ||
              normalized.includes('/node_modules/d3-drag/') ||
              normalized.includes('/node_modules/d3-dsv/') ||
              normalized.includes('/node_modules/d3-fetch/') ||
              normalized.includes('/node_modules/d3-force/') ||
              normalized.includes('/node_modules/d3-geo/') ||
              normalized.includes('/node_modules/d3-hierarchy/') ||
              normalized.includes('/node_modules/d3-polygon/') ||
              normalized.includes('/node_modules/d3-quadtree/') ||
              normalized.includes('/node_modules/d3-random/') ||
              normalized.includes('/node_modules/d3-selection/') ||
              normalized.includes('/node_modules/d3-transition/') ||
              normalized.includes('/node_modules/d3-zoom/')
            ) {
              return 'd3-charts';
            }

            if (
              normalized.includes('/src/utils/finance.ts') ||
              normalized.includes('/src/utils/storage.ts') ||
              normalized.includes('/src/utils/baseIncomeConfig.ts') ||
              normalized.includes('/src/utils/sixJarsMetrics.ts') ||
              normalized.includes('/src/utils/budgetAlerts.ts') ||
              normalized.includes('/src/utils/offlineSync.ts') ||
              normalized.includes('/src/utils/categoryHierarchy.ts') ||
              normalized.includes('/src/utils/pwaLifecycle.ts') ||
              normalized.includes('/src/data/initialData.ts')
            ) {
              return 'core-finance';
            }

            return undefined;
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
