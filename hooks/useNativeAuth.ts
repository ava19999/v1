import { useEffect } from 'react';
import { getAuth, GoogleAuthProvider, signInWithCredential } from "firebase/auth";

// Definisikan tipe global window agar TypeScript tidak error
declare global {
  interface Window {
    IS_NATIVE_ANDROID_APP?: boolean;
    // Android memanggil fungsi ini dari MainActivity.kt
    onFirebaseTokenReady?: (token: string) => void;
    // Android juga men-set variabel ini sebagai fallback
    FIREBASE_AUTH_TOKEN?: string;
  }
}

// Hook ini akan menangani login otomatis saat berjalan di dalam WebView Android
export const useNativeAuth = () => {
  useEffect(() => {
    // 1. Periksa apakah kita berada di dalam WebView Android
    if (window.IS_NATIVE_ANDROID_APP) {
      console.log("🤖 Aplikasi React berjalan di dalam WebView Android.");

      // Fungsi untuk menangani login
      const performNativeLogin = (token: string) => {
        console.log("✅ Menerima Google ID Token dari Android!");
        if (!token) {
          console.error("Token yang diterima dari Android kosong.");
          return;
        }

        const auth = getAuth();
        
        // 3. Buat kredensial Firebase menggunakan token dari Android
        const credential = GoogleAuthProvider.credential(token);

        // 4. Login ke Firebase di sisi web menggunakan kredensial tersebut
        signInWithCredential(auth, credential)
          .then((result) => {
            // Pengguna sekarang sudah login di dalam WebView!
            console.log("🎉 Berhasil login di web dengan kredensial dari Android!", result.user);
            // 'onAuthStateChanged' di App.tsx sekarang akan mengambil alih
          })
          .catch((error) => {
            console.error("❌ Gagal login di web dengan kredensial dari Android:", error);
          });
      };

      // 2. Definisikan fungsi yang akan "menangkap" token dari Android
      // MainActivity.kt akan memanggil 'window.onFirebaseTokenReady(token)'
      window.onFirebaseTokenReady = performNativeLogin;
      
      console.log("👍 Fungsi 'window.onFirebaseTokenReady' sudah siap menangkap token.");

      // Fallback: Cek jika token sudah di-inject sebelum hook ini siap
      if (window.FIREBASE_AUTH_TOKEN) {
        console.log("Fallback: Menemukan token yang sudah di-inject. Memproses login...");
        performNativeLogin(window.FIREBASE_AUTH_TOKEN);
      }

    } else {
      console.log("🌐 Aplikasi React berjalan di browser biasa.");
    }
    
    // Cleanup function
    return () => {
      if (window.onFirebaseTokenReady) {
        delete window.onFirebaseTokenReady;
      }
    }
  }, []); // [] = Hanya berjalan sekali
};
