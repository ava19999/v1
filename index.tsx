// index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';

// Cek apakah di native Android app
const isNativeApp = (window as any).IS_NATIVE_ANDROID_APP === true;

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const root = ReactDOM.createRoot(rootElement);

if (!googleClientId && !isNativeApp) {
  // Hanya tampilkan error jika di web dan tidak ada Client ID
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
  console.error("GOOGLE_CLIENT_ID is not defined...");
} else {
  // Untuk native app, render App tanpa GoogleOAuthProvider
  // Untuk web, render dengan GoogleOAuthProvider
  const AppRoot = (
    <React.StrictMode>
      {isNativeApp ? (
        <App />
      ) : (
        <GoogleOAuthProvider clientId={googleClientId as string}>
          <App />
        </GoogleOAuthProvider>
      )}
    </React.StrictMode>
  );
  
  root.render(AppRoot);
}