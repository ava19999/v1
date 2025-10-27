// ava19999/v1/v1-a55800044f80d0f00370f9f03c7fe8adc53a2627/services/firebaseService.ts
import { initializeApp, FirebaseApp, FirebaseOptions } from "firebase/app";
import { getDatabase, Database } from "firebase/database"; // Import Database type
// Import getAnalytics jika Anda menggunakannya
// import { getAnalytics } from "firebase/analytics";

// Buat objek konfigurasi dari variabel process.env
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp | null = null;
let database: Database | null = null; // Tipe eksplisit Database | null

// Validasi dan Inisialisasi dalam try-catch
try {
  // Validasi konfigurasi dasar
  if (!firebaseConfig?.apiKey || !firebaseConfig?.databaseURL || !firebaseConfig?.projectId) {
    throw new Error("Konfigurasi Firebase tidak lengkap! Pastikan API Key, DatabaseURL, dan ProjectId ada.");
  }

  // Inisialisasi Firebase
  // Berikan tipe FirebaseOptions secara eksplisit untuk kejelasan
  app = initializeApp(firebaseConfig as FirebaseOptions);

  // Dapatkan instance Realtime Database
  database = getDatabase(app);

  console.log("Firebase initialized successfully."); // Konfirmasi inisialisasi

  // Inisialisasi Analytics jika diperlukan
  // const analytics = getAnalytics(app);

} catch (error) {
    console.error("Gagal menginisialisasi Firebase:", error);
    // Biarkan app dan database tetap null jika gagal
    // Anda bisa menambahkan logic fallback atau menampilkan pesan error di UI dari sini
}

// Ekspor instance database (bisa jadi null jika inisialisasi gagal)
export { database };