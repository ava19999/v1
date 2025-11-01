// services/supabaseService.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// [FIX] Mengatasi masalah Token Revocation dengan menonaktifkan auto-refresh.
// Ini adalah SOLUSI BARU berdasarkan petunjuk Anda.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: false, // Nonaktifkan refresh otomatis
    detectSessionInUrl: true, // Tetap diperlukan untuk Google OAuth
  }
});