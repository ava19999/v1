// services/supabaseService.ts
import { createClient } from '@supabase/supabase-js';
// Impor tipe database yang akan kita buat
import type { Database } from '../types_db';

// Ambil var env dari vite.config.ts
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Kesalahan: SUPABASE_URL atau SUPABASE_ANON_KEY tidak ditemukan.');
  console.error('Pastikan Anda sudah mengatur variabel lingkungan di file .env dan vite.config.ts');
}

// Buat client Supabase dengan tipe Database
export const supabase = createClient<Database>(supabaseUrl!, supabaseAnonKey!);

// Fungsi untuk mengetes koneksi
const testSupabaseConnection = async () => {
  try {
    // Coba ambil 1 room
    const { error } = await supabase.from('rooms').select('id').limit(1);
    if (error) {
      console.error('❌ Gagal terhubung ke Supabase:', error.message);
      return false;
    }
    console.log('✅ Supabase berhasil diinisialisasi dan terhubung!');
    return true;
  } catch (e) {
    console.error('❌ Gagal menginisialisasi Supabase client:', e);
    return false;
  }
};

// Panggil tes koneksi saat modul dimuat
setTimeout(testSupabaseConnection, 1000);

export default supabase;