import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import type { LoginPageProps } from '../types';

const LoginPage: React.FC<LoginPageProps> = ({ onGoogleRegisterSuccess, onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        const result = await onLogin(username, password);
        if (result) {
            setError(result);
        }
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-transparent text-white font-sans flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm text-center animate-fade-in-up">
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

                {/* Apply flex centering here */}
                <div className="space-y-4 flex flex-col items-center">
                    <GoogleLogin
                        onSuccess={onGoogleRegisterSuccess}
                        onError={() => {
                            console.error('Login Gagal');
                            setError('Gagal masuk dengan Google. Silakan coba lagi.');
                        }}
                        theme="outline"
                        text="signup_with"
                        shape="pill"
                        width="320px" // Fixed width for Google button consistency
                    />

                    {/* Constrain separator width */}
                    <div className="flex items-center my-4 w-full max-w-[320px]">
                        <div className="flex-grow border-t border-white/10"></div>
                        <span className="flex-shrink mx-4 text-gray-500 text-sm">Login dengan username dan pasword</span>
                        <div className="flex-grow border-t border-white/10"></div>
                    </div>

                    {/* Constrain form container width */}
                    <div className="bg-gray-900/30 border border-white/10 rounded-2xl p-5 backdrop-blur-sm w-full max-w-[320px]">
                        <form onSubmit={handleLoginSubmit} className="space-y-4">
                            <div>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    placeholder="Username"
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-electric transition-all"
                                />
                            </div>
                            <div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Kata Sandi"
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-electric transition-all"
                                />
                            </div>
                            {error && <p className="text-magenta text-sm text-center">{error}</p>}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-electric hover:bg-electric/80 text-white font-bold py-2.5 px-6 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-electric disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {isLoading ? (
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    'Masuk'
                                )}
                            </button>
                        </form>
                    </div>
                </div>
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