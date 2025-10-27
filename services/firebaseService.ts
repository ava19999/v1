// ava19999/v1/v1-a55800044f80d0f00370f9f03c7fe8adc53a2627/services/firebaseService.ts
import { initializeApp, FirebaseOptions } from "firebase/app";
import { getDatabase } from "firebase/database";
// Import getAnalytics jika Anda menggunakannya
// import { getAnalytics } from "firebase/analytics";

// Buat objek konfigurasi dari variabel process.env yang didefinisikan di vite.config.ts
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  // Tambahkan databaseURL
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
};

// Validasi sederhana
if (!firebaseConfig?.apiKey || !firebaseConfig?.databaseURL) { // Tambahkan pengecekan databaseURL
  console.error("Konfigurasi Firebase (API Key atau DatabaseURL) tidak ditemukan di environment variables!");
  // Pertimbangkan fallback atau throw error di sini jika diperlukan
  // Misalnya: throw new Error("Konfigurasi Firebase tidak lengkap!");
}

let app;
let database;

try {
  // Inisialisasi Firebase
  // Berikan tipe FirebaseOptions secara eksplisit untuk kejelasan
  app = initializeApp(firebaseConfig as FirebaseOptions);

  // Dapatkan instance Realtime Database
  database = getDatabase(app);

  // Inisialisasi Analytics jika diperlukan
  // const analytics = getAnalytics(app);

} catch (error) {
    console.error("Gagal menginisialisasi Firebase:", error);
    // Handle error inisialisasi, mungkin tampilkan pesan ke pengguna
    // Set database ke null atau objek dummy untuk mencegah error lebih lanjut
    database = null; // atau objek mock jika perlu
}

// Ekspor instance database (bisa jadi null jika inisialisasi gagal)
export { database };