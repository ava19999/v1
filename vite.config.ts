// ava19999/v1/v1-1e0a8198e325d409dd8ea26e029e0b4dd5c5e986/vite.config.ts
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Muat semua variabel dari .env di direktori saat ini
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    // Definisikan variabel yang ingin di-expose ke process.env di client-side
    define: {
      // Kunci-kunci ini (Supabase) adalah KUNCI PUBLIK (anon key).
      // Aman untuk tetap ada di sini.
      'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY),
      
      // HAPUS SEMUA 'process.env.FIREBASE_*'
      // 'process.env.GOOGLE_CLIENT_ID': JSON.stringify(env.GOOGLE_CLIENT_ID),
      // 'process.env.FIREBASE_API_KEY': JSON.stringify(env.FIREBASE_API_KEY),
      // 'process.env.FIREBASE_AUTH_DOMAIN': JSON.stringify(env.FIREBASE_AUTH_DOMAIN),
      // 'process.env.FIREBASE_PROJECT_ID': JSON.stringify(env.FIREBASE_PROJECT_ID),
      // 'process.env.FIREBASE_STORAGE_BUCKET': JSON.stringify(env.FIREBASE_STORAGE_BUCKET),
      // 'process.env.FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.FIREBASE_MESSAGING_SENDER_ID),
      // 'process.env.FIREBASE_APP_ID': JSON.stringify(env.FIREBASE_APP_ID),
      // 'process.env.FIREBASE_MEASUREMENT_ID': JSON.stringify(env.FIREBASE_MEASUREMENT_ID),
      // 'process.env.FIREBASE_DATABASE_URL': JSON.stringify(env.FIREBASE_DATABASE_URL),
    },
    // Naikkan batas warning ukuran chunk (misalnya ke 1000 kB)
    build: {
      chunkSizeWarningLimit: 1000,
    },
  }
})