// FIX: Add triple-slash directive to include Node types and resolve error on 'process.cwd()'.
/// <reference types="node" />

import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  // FIX: Replaced process.cwd() with resolve() to avoid TypeScript type errors with the global process object.
  const env = loadEnv(mode, resolve(), '');

  return {
    // Add esbuild configuration to handle JSX syntax correctly for React components.
    // This resolves the 500 Internal Server Error when serving .tsx files.
    // FIX: Added 'as const' to fix TypeScript error where 'automatic' was inferred as string instead of a literal type.
    esbuild: {
      jsx: 'automatic' as const,
    },
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          speakUp: resolve(__dirname, 'speak-up.html'),
          admin: resolve(__dirname, 'admin.html'),
          logicflow: resolve(__dirname, 'logicflow.html'),
          writeright: resolve(__dirname, 'writeright.html'),
        },
      },
    },
    define: {
      // Per @google/genai guidelines, the API key must be passed via process.env.API_KEY.
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY),
      'process.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(env.VITE_GOOGLE_CLIENT_ID),
      'process.env.VITE_FIREBASE_API_KEY': JSON.stringify(env.VITE_FIREBASE_API_KEY),
      'process.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN),
      'process.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(env.VITE_FIREBASE_PROJECT_ID),
      'process.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET),
      'process.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID),
      'process.env.VITE_FIREBASE_APP_ID': JSON.stringify(env.VITE_FIREBASE_APP_ID),
    },
  };
});