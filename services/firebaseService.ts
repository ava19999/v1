// ava19999/v1/v1-7937f4b735b14d55e5e6024522254b32b9924b3b/services/firebaseService.ts
import { initializeApp, FirebaseApp, FirebaseOptions } from "firebase/app";
import { getDatabase, Database } from "firebase/database";
// Import getAnalytics jika Anda menggunakannya
// import { getAnalytics } from "firebase/analytics";

// Buat objek konfigurasi dari variabel process.env
const firebaseConfig: FirebaseOptions = {
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
let database: Database | null = null;

// Fungsi untuk mendapatkan instance Firebase (Singleton Pattern)
export const getFirebaseApp = (): FirebaseApp | null => {
  if (app) return app;
  
  try {
    // Validasi konfigurasi yang lebih ketat
    const requiredConfigs = [
      { key: 'apiKey', value: firebaseConfig.apiKey },
      { key: 'databaseURL', value: firebaseConfig.databaseURL },
      { key: 'projectId', value: firebaseConfig.projectId },
      { key: 'appId', value: firebaseConfig.appId }
    ];

    const missingConfigs = requiredConfigs.filter(config => !config.value);
    
    if (missingConfigs.length > 0) {
      const missingKeys = missingConfigs.map(config => config.key).join(', ');
      throw new Error(`Konfigurasi Firebase tidak lengkap! Missing: ${missingKeys}`);
    }

    // Inisialisasi Firebase
    app = initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully.");
    
    return app;
  } catch (error) {
    console.error("Gagal menginisialisasi Firebase:", error);
    return null;
  }
};

// Fungsi untuk mendapatkan instance Database
export const getDatabaseInstance = (): Database | null => {
  if (database) return database;
  
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;
  
  try {
    database = getDatabase(firebaseApp);
    return database;
  } catch (error) {
    console.error("Gagal mendapatkan instance database:", error);
    return null;
  }
};

// Inisialisasi otomatis saat module dimuat
try {
  getFirebaseApp();
  getDatabaseInstance();
} catch (error) {
  console.error("Automatic initialization failed:", error);
}

// Ekspor instance untuk backward compatibility
export { app, database };

// Ekspor default untuk kemudahan penggunaan
export default {
  app,
  database,
  getFirebaseApp,
  getDatabaseInstance
};