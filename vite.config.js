import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      name: 'no-crossorigin',
      transformIndexHtml(html) {
        return html.replace(/ crossorigin/g, '')
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['tommy.png', 'roma.png'],
      manifest: {
        name: 'Tommy',
        short_name: 'Tommy',
        description: 'Asistente de IM ROMA',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#FFFFFF',
        theme_color: '#FFFFFF',
        icons: [
          { src: './tommy.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        ],
      },
      workbox: {
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest,ico}'],
      },
    }),
  ],
  server: {
    host: true,
    port: 5174,
    proxy: {
      '/groq': {
        target: 'https://api.groq.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/groq/, '/openai/v1'),
      },
      '/xai': {
        target: 'https://api.x.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/xai/, '/v1'),
      },
      '/higgsfield': {
        target: 'https://api.higgsfield.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/higgsfield/, ''),
      },
    },
  },
})
