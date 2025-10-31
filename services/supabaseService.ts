// services/supabaseService.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types_db';

// Gunakan environment variables yang benar
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// FIX: Gunakan type assertion untuk menghindari error tipe kompleks
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);