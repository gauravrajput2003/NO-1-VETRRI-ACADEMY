import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // A standalone web dev server uses the same reachable API as the mobile app.
  // Set API_PROXY_TARGET for explicit local candidate-backend testing.
  const apiTarget = env.API_PROXY_TARGET || 'https://no-1-vetrri-academy.onrender.com';
  const configureProxy = (proxy) => {
    // Browser requests are same-origin to Vite. Forward server-to-server without
    // a browser Origin, so an occupied dev port does not break upstream CORS.
    proxy.on('proxyReq', (request) => request.removeHeader('origin'));
    proxy.on('proxyReqWs', (request) => request.removeHeader('origin'));
  };
  return {
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        configure: configureProxy,
      },
      '/socket.io': {
        target: apiTarget,
        ws: true,
        changeOrigin: true,
        configure: configureProxy,
      },
    },
  },
  };
})
