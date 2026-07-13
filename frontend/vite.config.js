import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// The backend nginx gateway (docker-compose) is published on localhost:8080
// (port 80 is occupied by the local Apache) and proxies /api/<service>/ to
// each microservice.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': { 
          target: env.VITE_PROXY_TARGET || 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
    // Allow JSX inside .js files (context/, redux/ use .js per project structure).
    esbuild: {
      loader: 'jsx',
      include: /src\/.*\.[jt]sx?$/,
    },
    optimizeDeps: {
      esbuildOptions: {
        loader: { '.js': 'jsx' },
      },
    },
  };
}); 
