import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  build: {
    // Use esbuild for faster builds
    minify: 'esbuild',
    // Remove console statements in production
    esbuild: {
      drop: ['console', 'debugger']
    },
    // Code splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['vue', 'vue-router', 'pinia', 'axios']
        }
      }
    }
  },
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Spotify Discovery Studio',
        short_name: 'Discovery',
        description: 'AI-powered music recommendations with YouTube Music-inspired algorithm',
        theme_color: '#1DB954',
        background_color: '#121212',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // Don't intercept navigation requests
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.spotify\.com\/.*/i,
            handler: 'NetworkFirst',
            method: 'GET', // Only cache GET requests, not OPTIONS/POST
            options: {
              cacheName: 'spotify-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 300 // 5 minutes
              },
              cacheableResponse: {
                statuses: [0, 200]
              },
              // Skip CORS preflight and authentication requests
              matchOptions: {
                ignoreVary: true
              }
            }
          },
          {
            urlPattern: /^https:\/\/i\.scdn\.co\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'spotify-images-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 86400 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 8888,
    strictPort: true,
    open: true
  }
})