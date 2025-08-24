
import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          admin: resolve(__dirname, 'admin.html'),
        },
      },
    },
    define: {
      // Per @google/genai guidelines, the API key must be passed via process.env.API_KEY.
      // We are loading the VITE_API_KEY from the .env file and making it available as process.env.API_KEY.
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY),
    },
  };
});