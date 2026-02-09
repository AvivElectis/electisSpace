import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';
import pkg from './package.json';

// https://vite.dev/config/
export default defineConfig({
  base: './', // Important for Electron - use relative paths for file:// protocol
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    basicSsl(),  // HTTPS with self-signed certificate for dev
    // Gzip compression
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
    }),
    // Brotli compression
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
    }),
    // Bundle analyzer - generates stats.html in dist folder
    visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }) as any,
  ],
  resolve: {
    alias: {
      '@features': path.resolve(__dirname, './src/features'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@test': path.resolve(__dirname, './src/test'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      // Backend API proxy - SSE requires special handling
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false, // Allow HTTP target
        ws: true, // Enable WebSocket proxy (helps with long-lived connections)
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Disable buffering for SSE endpoints
            if (req.url?.includes('/events')) {
              proxyReq.setHeader('Connection', 'keep-alive');
              proxyReq.setHeader('Cache-Control', 'no-cache');
            }
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            // Don't buffer SSE responses
            if (req.url?.includes('/events')) {
              proxyRes.headers['connection'] = 'keep-alive';
              proxyRes.headers['cache-control'] = 'no-cache';
            }
          });
        },
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            if (id.includes('@mui') || id.includes('@emotion')) {
              return 'mui-vendor';
            }
            if (id.includes('react-hook-form') || id.includes('zod')) {
              return 'form-vendor';
            }
            if (id.includes('i18next') || id.includes('react-i18next')) {
              return 'i18n-vendor';
            }
            if (id.includes('axios') || id.includes('papaparse') || id.includes('date-fns')) {
              return 'utils-vendor';
            }
          }
        },
      },
    },
    chunkSizeWarningLimit: 1200, // Raised for lazy-loaded ArticleFormatEditor (~1.1MB vanilla-jsoneditor)
    sourcemap: false,
    minify: 'terser',
  },
});
