import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';

// Komponen loading sementara
const LoadingScreen: React.FC = () => (
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric mx-auto"></div>
      </div>
      <h1 style={{ color: '#FF00FF', fontSize: '28px', marginBottom: '16px' }}>Memuat Aplikasi</h1>
      <p style={{ marginBottom: '8px', lineHeight: '1.6', color: '#CCCCCC' }}>
        Sedang mempersiapkan RT Crypto...
      </p>
    </div>
  </div>
);

// Komponen akses ditolak
const AccessDenied: React.FC = () => (
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

// Komponen error konfigurasi
const ErrorComponent: React.FC<{ message: string }> = ({ message }) => (
  <div style={{ color: 'white', backgroundColor: '#0A0A0A', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
    <div style={{ border: '1px solid #FF00FF', padding: '20px', borderRadius: '8px', textAlign: 'center', maxWidth: '500px' }}>
      <h1 style={{ color: '#FF00FF', fontSize: '24px' }}>Kesalahan Konfigurasi</h1>
      <p style={{ marginTop: '10px', lineHeight: '1.6' }}>
        {message}
      </p>
    </div>
  </div>
);

// Komponen utama yang akan memeriksa status akses
const AppInitializer: React.FC = () => {
  const [accessStatus, setAccessStatus] = useState<'checking' | 'granted' | 'denied'>('checking');
  const [isNativeApp, setIsNativeApp] = useState<boolean>(false);

  useEffect(() => {
    const checkAccess = () => {
      console.log('Memeriksa status akses aplikasi...');
      
      // Cek berbagai cara untuk mendeteksi aplikasi native
      const nativeAppIndicators = [
        (window as any).IS_NATIVE_ANDROID_APP === true,
        !!(window as any).FIREBASE_AUTH_TOKEN,
        !!(window as any).Android,
        window.location.protocol === 'file:',
        navigator.userAgent.toLowerCase().includes('wv'), // WebView
        navigator.userAgent.toLowerCase().includes('android')
      ];

      const isNative = nativeAppIndicators.some(indicator => indicator);
      
      console.log('Hasil pemeriksaan akses:', {
        IS_NATIVE_ANDROID_APP: (window as any).IS_NATIVE_ANDROID_APP,
        FIREBASE_AUTH_TOKEN: !!(window as any).FIREBASE_AUTH_TOKEN,
        Android: !!(window as any).Android,
        protocol: window.location.protocol,
        userAgent: navigator.userAgent,
        isNative
      });

      if (isNative) {
        console.log('✅ Akses diberikan: Aplikasi native terdeteksi');
        setIsNativeApp(true);
        setAccessStatus('granted');
      } else {
        // Untuk development, beri akses sementara
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          console.log('⚠️ Development mode: Akses diberikan untuk localhost');
          setIsNativeApp(false);
          setAccessStatus('granted');
        } else {
          console.log('❌ Akses ditolak: Bukan aplikasi native');
          setAccessStatus('denied');
        }
      }
    };

    // Beri waktu sedikit untuk variabel global ter-set
    setTimeout(checkAccess, 100);
  }, []);

  const googleClientId = process.env.GOOGLE_CLIENT_ID;

  if (accessStatus === 'checking') {
    return <LoadingScreen />;
  }

  if (accessStatus === 'denied') {
    return <AccessDenied />;
  }

  if (!googleClientId) {
    return <ErrorComponent message="Variabel lingkungan GOOGLE_CLIENT_ID tidak ditemukan." />;
  }

  // Jika akses diberikan, render aplikasi
  return (
    <React.StrictMode>
      {isNativeApp ? (
        // Jika di app native, JANGAN render GoogleOAuthProvider
        <App />
      ) : (
        // Jika di web biasa, render dengan GoogleOAuthProvider
        <GoogleOAuthProvider clientId={googleClientId}>
          <App />
        </GoogleOAuthProvider>
      )}
    </React.StrictMode>
  );
};

// Inisialisasi aplikasi
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(<AppInitializer />);