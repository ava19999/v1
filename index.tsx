import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';

// --- TAMBAHAN KODE ---
// Cek apakah variabel global dari Android ada
// Kita tambahkan 'any' untuk mengakses window
const isNativeApp = (window as any).IS_NATIVE_ANDROID_APP === true;
// -------------------

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const root = ReactDOM.createRoot(rootElement); // Buat root di sini

if (!googleClientId) {
  // Render pesan error jika Client ID tidak ada
  const ErrorComponent = () => (
    <div style={{ color: 'white', backgroundColor: '#0A0A0A', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ border: '1px solid #FF00FF', padding: '20px', borderRadius: '8px', textAlign: 'center', maxWidth: '500px' }}>
        <h1 style={{ color: '#FF00FF', fontSize: '24px' }}>Kesalahan Konfigurasi</h1>
        <p style={{ marginTop: '10px', lineHeight: '1.6' }}>
            Variabel lingkungan <strong>GOOGLE_CLIENT_ID</strong> tidak ditemukan.
            Harap konfigurasikan variabel ini di pengaturan situs Netlify Anda atau di dalam file <code>.env</code> lokal Anda untuk mengaktifkan login Google.
        </p>
      </div>
    </div>
  );
  root.render(<ErrorComponent />); // Render komponen error
  console.error("GOOGLE_CLIENT_ID is not defined...");
  // Hentikan eksekusi lebih lanjut jika perlu
  // throw new Error("GOOGLE_CLIENT_ID is not defined.");
} else {
  // --- PERUBAHAN LOGIKA DI SINI ---
  // Tentukan apa yang akan di-render berdasarkan Jembatan
  const AppRoot = (
    <React.StrictMode>
      {isNativeApp ? (
        // Jika di app native, JANGAN render GoogleOAuthProvider
        // Library Firebase (onAuthStateChanged) akan tetap berfungsi
        <App />
      ) : (
        // Jika di browser web biasa, render seperti biasa
        <GoogleOAuthProvider clientId={googleClientId as string}>
          <App />
        </GoogleOAuthProvider>
      )}
    </React.StrictMode>
  );
  
  root.render(AppRoot); // Render AppRoot yang sudah benar
  // ------------------------------
}

