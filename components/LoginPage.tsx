// LoginPage.tsx
import React, { useState, useEffect } from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import type { LoginPageProps } from '../types';
import { AndroidBridgeService } from '../services/androidBridgeService';

const LoginPage: React.FC<LoginPageProps> = ({ onGoogleRegisterSuccess }) => {
    const [error, setError] = useState('');
    const bridgeService = AndroidBridgeService.getInstance();
    const isNativeApp = bridgeService.isNativeAndroidApp();
    const hasAndroidBridge = bridgeService.isAndroidBridgeAvailable();
    const [bridgeStatus, setBridgeStatus] = useState<any>(null);

    useEffect(() => {
        const status = bridgeService.getBridgeStatus();
        setBridgeStatus(status);
        
        if (isNativeApp) {
            console.log('🔧 LoginPage: Native app detected', status);
            console.log('🔧 LoginPage: Authentication should be handled by AppContent');
        }
    }, [isNativeApp]);

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

                {/* Untuk Native App */}
                {isNativeApp ? (
                    <div className="text-center">
                        <div className="bg-electric/20 rounded-full h-16 w-16 mx-auto mb-4 flex items-center justify-center">
                            {hasAndroidBridge ? (
                                <svg className="h-8 w-8 text-electric" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            ) : (
                                <svg className="h-8 w-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            )}
                        </div>
                        
                        <p className={`font-semibold ${hasAndroidBridge ? 'text-electric' : 'text-yellow-500'}`}>
                            {hasAndroidBridge ? 'Aplikasi Native Terdeteksi' : 'Bridge Tidak Tersedia'}
                        </p>
                        
                        <p className="text-sm text-gray-400 mt-2">
                            {hasAndroidBridge 
                                ? 'Autentikasi melalui jembatan Android...' 
                                : 'Jembatan Android tidak tersedia. Pastikan aplikasi di-build dengan benar.'
                            }
                        </p>
                        
                        <div className="mt-4 p-3 bg-white/5 rounded-lg text-left">
                            <p className="text-xs text-gray-400">
                                <strong>Status Bridge:</strong> {hasAndroidBridge ? '✅ Tersedia' : '❌ Tidak Tersedia'}
                            </p>
                            {bridgeStatus?.bridgeMethods && (
                                <>
                                    <p className="text-xs text-gray-400 mt-1">
                                        <strong>getAuthToken:</strong> {bridgeStatus.bridgeMethods.getAuthToken ? '✅' : '❌'}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        <strong>showToast:</strong> {bridgeStatus.bridgeMethods.showToast ? '✅' : '❌'}
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Untuk Web: Tampilkan tombol Google Login */
                    <div className="flex flex-col items-center">
                        <GoogleLogin
                            onSuccess={onGoogleRegisterSuccess}
                            onError={() => {
                                console.error('Login Google Gagal');
                                setError('Gagal masuk dengan Google. Silakan coba lagi.');
                            }}
                            theme="outline"
                            text="signup_with"
                            shape="pill"
                            width="320px"
                        />
                        {error && <p className="text-magenta text-sm text-center mt-4">{error}</p>}
                    </div>
                )}
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