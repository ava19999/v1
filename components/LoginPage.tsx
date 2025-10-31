// ava19999/v1/v1-1e0a8198e325d409dd8ea26e029e0b4dd5c5e986/components/LoginPage.tsx
import React, { useState } from 'react';
import { supabase } from '../services/supabaseService';
import type { LoginPageProps } from '../types'; // Prop sekarang kosong

const LoginPage: React.FC<LoginPageProps> = () => {
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleGoogleLogin = async () => {
      setIsLoading(true);
      setError('');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // Arahkan kembali ke URL di mana aplikasi Anda di-host
          redirectTo: window.location.origin 
        }
      });
      
      if (error) {
        setError(error.message);
        setIsLoading(false);
      }
      // Jika berhasil, browser akan me-redirect ke halaman Google
    };

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

                {/* Tombol Google Login (Supabase) */}
                <div className="flex flex-col items-center">
                   <button
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                        className="w-full max-w-xs flex items-center justify-center gap-3 bg-white/10 border border-white/20 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 hover:bg-electric/20 hover:border-electric focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-electric disabled:opacity-50"
                   >
                     {isLoading ? (
                       'Mengarahkan...'
                     ) : (
                       <>
                         <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                           <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                           <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                           <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                           <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                           <path d="M1 1h22v22H1z" fill="none"/>
                         </svg>
                         Masuk dengan Google
                       </>
                     )}
                   </button>
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