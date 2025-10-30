// services/firebaseService.ts
import { initializeApp, FirebaseApp, FirebaseOptions } from "firebase/app";
import { getDatabase, Database, ref, onValue } from "firebase/database";

// Konfigurasi Firebase - Gunakan nilai langsung sebagai fallback
const getFirebaseConfig = (): FirebaseOptions => {
  // Prioritaskan environment variables, fallback ke nilai hardcoded untuk development
  const config = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyBrGnNNElUWMCodGOXClccoWPqNJdbgwNE",
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0496903959.firebaseapp.com",
    databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL || "https://gen-lang-client-0496903959-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "gen-lang-client-0496903959",
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0496903959.firebasestorage.app",
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "717915454389",
    appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:717915454389:web:c07f680547fcc1a7f777fc",
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-8EFFZB2GSF",
  };

  // Debug logging untuk membantu troubleshooting
  console.log('Firebase Config Check:', {
    hasApiKey: !!config.apiKey,
    hasDatabaseURL: !!config.databaseURL,
    hasProjectId: !!config.projectId,
    usingEnvVars: !!(process.env.REACT_APP_FIREBASE_API_KEY),
    usingHardcoded: !!(config.apiKey && !process.env.REACT_APP_FIREBASE_API_KEY)
  });

  return config;
};

let app: FirebaseApp | null = null;
let database: Database | null = null;

export const getFirebaseApp = (): FirebaseApp | null => {
  if (app) return app;
  
  try {
    const firebaseConfig = getFirebaseConfig();

    // Validasi konfigurasi
    const requiredConfigs = [
      { key: 'apiKey', value: firebaseConfig.apiKey },
      { key: 'databaseURL', value: firebaseConfig.databaseURL },
      { key: 'projectId', value: firebaseConfig.projectId },
    ];

    const missingConfigs = requiredConfigs.filter(config => !config.value);
    
    if (missingConfigs.length > 0) {
      const missingKeys = missingConfigs.map(config => config.key).join(', ');
      console.error('❌ Konfigurasi Firebase tidak lengkap. Missing:', missingKeys);
      
      // Untuk native app, kita masih bisa lanjut tanpa Firebase
      const isNativeApp = (window as any).IS_NATIVE_ANDROID_APP === true;
      if (isNativeApp) {
        console.warn('⚠️ Native app detected, continuing without Firebase');
        return null;
      }
      
      throw new Error(`Konfigurasi Firebase tidak lengkap! Missing: ${missingKeys}`);
    }

    // Inisialisasi Firebase
    app = initializeApp(firebaseConfig);
    console.log("✅ Firebase initialized successfully with project:", firebaseConfig.projectId);
    
    return app;
  } catch (error) {
    console.error("❌ Gagal menginisialisasi Firebase:", error);
    
    // Untuk native app, jangan throw error, biarkan continue tanpa Firebase
    const isNativeApp = (window as any).IS_NATIVE_ANDROID_APP === true;
    if (isNativeApp) {
      console.warn('⚠️ Native app detected, continuing without Firebase');
      return null;
    }
    
    throw error;
  }
};

export const getDatabaseInstance = (): Database | null => {
  if (database) return database;
  
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) {
    console.warn('⚠️ Tidak dapat mendapatkan Firebase App - mungkin di native app');
    return null;
  }
  
  try {
    database = getDatabase(firebaseApp);
    console.log("✅ Database instance created successfully");
    return database;
  } catch (error) {
    console.error("❌ Gagal mendapatkan instance database:", error);
    
    // Untuk native app, jangan throw error
    const isNativeApp = (window as any).IS_NATIVE_ANDROID_APP === true;
    if (isNativeApp) {
      console.warn('⚠️ Native app detected, continuing without database');
      return null;
    }
    
    throw error;
  }
};

// Test koneksi database
export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    const db = getDatabaseInstance();
    if (!db) {
      console.warn('⚠️ Database instance tidak tersedia - mungkin di native app');
      return false;
    }
    
    // Coba baca dari path test
    const testRef = ref(db, '.info/connected');
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.warn('⚠️ Database connection test timeout');
        resolve(false);
      }, 5000);

      onValue(testRef, (snapshot) => {
        clearTimeout(timeout);
        const connected = snapshot.val();
        console.log('📡 Database connection test:', connected ? '✅ Connected' : '❌ Disconnected');
        resolve(!!connected);
      }, { onlyOnce: true });
    });
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
};

// Fungsi untuk mengecek status koneksi real-time
export const monitorConnection = (callback: (connected: boolean) => void): (() => void) => {
  try {
    const db = getDatabaseInstance();
    if (!db) {
      console.warn('⚠️ Tidak dapat memonitor koneksi: database tidak tersedia - mungkin di native app');
      return () => {};
    }

    const connectedRef = ref(db, '.info/connected');
    const unsubscribe = onValue(connectedRef, (snapshot) => {
      const connected = snapshot.val();
      console.log('📡 Connection status:', connected ? '✅ Connected' : '❌ Disconnected');
      callback(!!connected);
    });

    return unsubscribe;
  } catch (error) {
    console.error('❌ Gagal memonitor koneksi:', error);
    return () => {};
  }
};

// Inisialisasi otomatis saat module dimuat
console.log('🚀 Initializing Firebase...');
try {
  const isNativeApp = (window as any).IS_NATIVE_ANDROID_APP === true;
  
  if (isNativeApp) {
    console.log('📱 Native app detected, Firebase initialization will be lazy');
  } else {
    getFirebaseApp();
    getDatabaseInstance();
    
    // Test koneksi secara asynchronous
    setTimeout(() => {
      testDatabaseConnection().then(connected => {
        if (connected) {
          console.log('🎉 Firebase berhasil diinisialisasi dan terhubung!');
        } else {
          console.warn('⚠️ Firebase diinisialisasi tetapi koneksi bermasalah');
        }
      });
    }, 1000);
  }
  
} catch (error) {
  console.error("❌ Automatic initialization failed:", error);
}

// Ekspor instance untuk backward compatibility
export { app, database };

export default {
  app,
  database,
  getFirebaseApp,
  getDatabaseInstance,
  testDatabaseConnection,
  monitorConnection
};