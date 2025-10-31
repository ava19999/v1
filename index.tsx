// ava19999/v1/v1-1e0a8198e325d409dd8ea26e029e0b4dd5c5e986/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
// Hapus import GoogleOAuthProvider
import App from './App';

// --- HAPUS KODE CEK JEMBATAN NATIVE ---
// const isNativeApp = ...
// ------------------------------------

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// Hapus pengecekan googleClientId
// Render App secara langsung
const AppRoot = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

root.render(AppRoot);