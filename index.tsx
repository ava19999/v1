import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Access environment variable defined in vite.config.ts
const googleClientId = process.env.GOOGLE_CLIENT_ID;

if (!googleClientId) {
  // Render a more helpful error message if the Client ID is not available
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
  const root = ReactDOM.createRoot(rootElement);
  root.render(<ErrorComponent />);
  throw new Error("GOOGLE_CLIENT_ID is not defined. Please configure this environment variable in your Netlify settings or local .env file.");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);
