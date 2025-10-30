import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';

// Cek apakah variabel global dari Android ada
const isNativeApp = (window as any).IS_NATIVE_ANDROID_APP === true;

// Cek apakah ada token Firebase dari Android
const hasFirebaseToken = !!(window as any).FIREBASE_AUTH_TOKEN;

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const root = ReactDOM.createRoot(rootElement);

// --- LOGIKA BARU: Hanya izinkan akses jika dari aplikasi Android ---
if (!isNativeApp && !hasFirebaseToken) {
  // Jika bukan aplikasi native dan tidak ada token Firebase, tampilkan pesan akses ditolak
  const AccessDenied = () => (
    <div style={{ 
      color: 'white', 
      backgroundColor: '#0A0A0A', 
      height: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '20px', 
      fontFamily: 'sans-serif' 
    }}>
      <div style={{ 
        border: '1px solid #FF00FF', 
        padding: '40px', 
        borderRadius: '12px', 
        textAlign: 'center', 
        maxWidth: '500px',
        background: 'rgba(0, 0, 0, 0.8)'
      }}>
        <div style={{ marginBottom: '20px' }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#FF00FF" strokeWidth="2"/>
            <path d="M12 8V12" stroke="#FF00FF" strokeWidth="2" strokeLinecap="round"/>
            <path d="M12 16H12.01" stroke="#FF00FF" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <h1 style={{ color: '#FF00FF', fontSize: '28px', marginBottom: '16px' }}>Akses Dibatasi</h1>
        <p style={{ marginBottom: '8px', lineHeight: '1.6', color: '#CCCCCC' }}>
          Aplikasi ini hanya dapat diakses melalui <strong>Aplikasi Android RT Crypto</strong>.
        </p>
        <p style={{ lineHeight: '1.6', color: '#888888', fontSize: '14px' }}>
          Silakan download aplikasi resmi dari Play Store untuk melanjutkan.
        </p>
      </div>
    </div>
  );
  root.render(<AccessDenied />);
} else if (!googleClientId) {
  // Jika Client ID Google tidak ada (untuk fallback)
  const ErrorComponent = () => (
    <div style={{ color: 'white', backgroundColor: '#0A0A0A', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ border: '1px solid #FF00FF', padding: '20px', borderRadius: '8px', textAlign: 'center', maxWidth: '500px' }}>
        <h1 style={{ color: '#FF00FF', fontSize: '24px' }}>Kesalahan Konfigurasi</h1>
        <p style={{ marginTop: '10px', lineHeight: '1.6' }}>
          Variabel lingkungan <strong>GOOGLE_CLIENT_ID</strong> tidak ditemukan.
        </p>
      </div>
    </div>
  );
  root.render(<ErrorComponent />);
} else {
  // Jika dari aplikasi Android atau memiliki token Firebase, render aplikasi normal
  const AppRoot = (
    <React.StrictMode>
      {isNativeApp ? (
        // Jika di app native, JANGAN render GoogleOAuthProvider
        <App />
      ) : (
        // Jika di web dengan token Firebase, gunakan GoogleOAuthProvider sebagai fallback
        <GoogleOAuthProvider clientId={googleClientId as string}>
          <App />
        </GoogleOAuthProvider>
      )}
    </React.StrictMode>
  );
  
  root.render(AppRoot);
}