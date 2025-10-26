import React from 'react';
import type { LoginPageProps } from '../types';

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {

    const handleLogin = () => {
        // Hanya beri sinyal bahwa langkah login berhasil,
        // alur aplikasi utama akan menangani langkah selanjutnya (pembuatan ID).
        onLoginSuccess();
    };

    return (
        <div className="min-h-screen bg-transparent text-white font-sans flex flex-col items-center justify-center p-4">
             <div className="text-center animate-fade-in-up">
                 <div className="flex items-center justify-center space-x-3 mb-4">
                        <svg className="h-12 w-12 text-electric" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 6L5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M16 6L19 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <rect x="3" y="8" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
                            <path d="M7 12H10L12 16L14 12H17" stroke="magenta" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-electric to-magenta text-transparent bg-clip-text">
                            RT Crypto
                        </h1>
                    </div>

                <p className="text-lg text-gray-400 mt-2 max-w-xl mx-auto">
                    Selamat datang di basecamp para pejuang cuan. Masuk untuk mulai analisis pasar dan diskusi bareng komunitas.
                </p>
                <button
                    onClick={handleLogin}
                    className="mt-6 flex items-center justify-center gap-3 w-full max-w-xs mx-auto bg-white/10 border border-white/20 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 hover:bg-electric/20 hover:border-electric focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-electric"
                >
                    <svg className="w-5 h-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                        <path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 110.3 512 0 401.7 0 265.9c0-13.2 1-26.4 2.9-39.3h241.1v-93.1H12.9C58.9 57.3 145.8 0 244 0c78.2 0 144.4 34.9 191.1 92.5l-68.5 68.5c-29.2-27.4-68.8-44.5-113.8-44.5-84.3 0-155.2 64.7-172.4 150.1H244v93.1z"></path>
                    </svg>
                    <span>Masuk dengan Google</span>
                </button>
            </div>
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