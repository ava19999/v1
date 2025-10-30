// components/LoginPage.tsx
import React, { useState } from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import type { LoginPageProps } from '../types'; // Pastikan tipe ini sudah diupdate

const LoginPage: React.FC<LoginPageProps> = ({ onGoogleRegisterSuccess }) => {
    // State error hanya untuk Google Login
    const [error, setError] = useState('');

    return (
        <div className="min-h-screen bg-transparent text-white font-sans flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm text-center animate-fade-in-up">
                {/* Header Aplikasi */}
                <div className="flex items-center justify-center space-x-3 mb-4">
                    <svg className="h-12 w-12 text-electric" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 6L5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M16 6L19 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <rect x="3" y="8" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
                        <path d="M7 12H10L12 16L14 12H17" stroke="magenta" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-electric to-magenta text-transparent bg-clip-text font-heading">
                        RT Crypto
                    </h1>
                </div>
                <p className="text-lg text-gray-400 mt-2 mb-6 max-w-xl mx-auto">
                    Masuk atau daftar untuk bergabung dengan komunitas pejuang cuan.
                </p>

                {/* Tombol Google Login */}
                <div className="flex flex-col items-center">
                   <GoogleLogin
                        onSuccess={onGoogleRegisterSuccess}
                        onError={() => {
                            console.error('Login Google Gagal');
                            setError('Gagal masuk dengan Google. Silakan coba lagi.');
                        }}
                        theme="outline"
                        text="signup_with" // Atau "signin_with" jika lebih sesuai
                        shape="pill"
                        width="320px" // Lebar konsisten
                    />
                    {/* Tampilkan error Google Login jika ada */}
                    {error && <p className="text-magenta text-sm text-center mt-4">{error}</p>}
                </div>
            </div>
            {/* Animasi */}
            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default LoginPage;