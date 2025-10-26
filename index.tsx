import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const googleClientId = process.env.VITE_GOOGLE_CLIENT_ID;

if (!googleClientId) {
  // Render an error message if the Client ID is not available
  const ErrorComponent = () => (
    <div style={{ color: 'white', backgroundColor: '#0A0A0A', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ border: '1px solid #FF00FF', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
        <h1 style={{ color: '#FF00FF', fontSize: '24px' }}>Konfigurasi Error</h1>
        <p style={{ marginTop: '10px' }}>VITE_GOOGLE_CLIENT_ID tidak terdefinisi. Harap tambahkan ke variabel lingkungan Anda untuk mengaktifkan login Google.</p>
      </div>
    </div>
  );
  const root = ReactDOM.createRoot(rootElement);
  root.render(<ErrorComponent />);
  throw new Error("VITE_GOOGLE_CLIENT_ID is not defined. Please add it to your environment variables.");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);