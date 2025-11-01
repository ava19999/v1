// services/supabaseService.ts
import { createClient } from '@supabase/supabase-js';
// [FIX] Hapus impor tipe Database yang rusak
// import type { Database } from '../types_db';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// [FIX] Hapus generic <Database> dari createClient.
// Ini adalah Solusi 2 (workaround) untuk menghindari error 'never'.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});