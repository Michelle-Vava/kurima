/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Kurima: planting and rainfall guidance',
        short_name: 'Kurima',
        description: 'Should I plant yet? Rainfall, forecasts and season outlooks for farmers across Africa.',
        theme_color: '#2f8f4e',
        background_color: '#f7f3ea',
        display: 'standalone',
        start_url: '/',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: {
        // Keep the last weather responses so the app still opens offline.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/(api|archive-api|seasonal-api|geocoding-api)\.open-meteo\.com\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'open-meteo',
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
  },
})
