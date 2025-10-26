import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  // FIX: Replaced `process.cwd()` with `''` to resolve a TypeScript type error. `loadEnv` uses `path.resolve` internally, which treats an empty string as the current working directory.
  const env = loadEnv(mode, '', '');
  return {
    plugins: [react()],
    define: {
      // Vite replaces this with the value of the API_KEY environment variable at build time.
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(env.VITE_GOOGLE_CLIENT_ID)
    }
  }
})