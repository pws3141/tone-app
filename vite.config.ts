/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Hosts smplr fetches instrument samples from.
const SAMPLE_HOSTS = ['gleitz.github.io', 'goldst.dev', 'smpldsnds.github.io'];

export default defineConfig({
  base: '/tone-app/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon.png'],
      manifest: {
        name: 'Tones & Drones',
        short_name: 'Tones',
        description: 'Ear training for microtonal pitch, plus drones and a metronome for practice.',
        theme_color: '#14161f',
        background_color: '#14161f',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/tone-app/',
        scope: '/tone-app/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            // Cache instrument samples after first use so they work offline.
            urlPattern: ({ url }) => SAMPLE_HOSTS.includes(url.hostname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'instrument-samples',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
