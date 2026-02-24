import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      // Service-worker filename — must be referenced by nginx too
      filename: 'sw.js',
      manifest: {
        name: 'CWG Recipes',
        short_name: 'Recipes',
        description: 'Self-hosted recipe management',
        theme_color: '#16a34a',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
        // Web Share Target Level 1 — receives shared URLs from the OS share sheet
        // When installed as a PWA, this makes the app appear in the native share menu.
        // Level 2 (video file sharing) requires service-worker interception and is
        // wired up in the generated service worker for future native-app parity.
        share_target: {
          action: '/?share',
          method: 'GET',
          params: {
            title: 'title',
            text: 'text',
            url: 'url',
          },
        } as any,
      },
      workbox: {
        // Cache navigation requests with network-first so the SPA always loads
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // API responses: network-first, short cache for freshness
            urlPattern: /\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          {
            // Static assets: cache-first
            urlPattern: /\.(js|css|woff2?|png|svg|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
