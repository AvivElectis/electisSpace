import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';
import pkg from './package.json';

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_PATH || './', // './' for dev/Docker dev, '/app/' for Windows production
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    // basicSsl(),  // HTTPS disabled to allow direct SSE connections (SSE through HTTPS proxy has buffering issues)
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
        ws: true, // Enable WebSocket proxy
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            if (req.url?.includes('/events')) {
              // Disable any buffering for SSE
              proxyReq.setHeader('Cache-Control', 'no-cache');
              proxyReq.setHeader('X-Accel-Buffering', 'no');
            }
          });

          proxy.on('proxyRes', (proxyRes, req, res) => {
            if (req.url?.includes('/events')) {
              // Remove HTTP/1-specific headers for HTTP/2 compatibility
              delete proxyRes.headers['connection'];
              delete proxyRes.headers['transfer-encoding'];
              delete proxyRes.headers['keep-alive'];
              delete proxyRes.headers['content-encoding'];

              // Set SSE headers
              proxyRes.headers['content-type'] = 'text/event-stream';
              proxyRes.headers['cache-control'] = 'no-cache';
              proxyRes.headers['x-accel-buffering'] = 'no';

              // Write headers immediately
              if (!res.headersSent) {
                res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
              }

              // CRITICAL: Pipe the response directly without buffering
              proxyRes.pipe(res, { end: true });
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
    chunkSizeWarningLimit: 600, // Lowered to detect unexpected chunk growth (vanilla-jsoneditor is lazy-loaded)
    sourcemap: false, // Disabled in production for security and smaller dist
    minify: 'terser',
    terserOptions: {
      compress: {
        pure_funcs: ['console.log', 'console.debug', 'console.info'], // Only remove log/debug/info, keep error/warn
        drop_debugger: true,
      },
    },
  },
});
