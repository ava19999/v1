// services/supabaseService.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// [PERBAIKAN V4 - SOLUSI TOKEN REUSE]
// Menonaktifkan autoRefreshToken untuk mencegah konflik dengan
// pengaturan "Token Revocation" di dashboard Supabase Anda.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: false, // <-- INI KUNCINYA
    detectSessionInUrl: true, // Diperlukan untuk Google OAuth
  }
});