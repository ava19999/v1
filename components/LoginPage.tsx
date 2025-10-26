import React, { useState } from 'react';
import type { LoginPageProps } from '../types';

const InitialStep = ({ onContinue }: { onContinue: () => void }) => (
    <div className="w-full max-w-md text-center animate-fade-in-up">
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
        <p className="text-lg text-gray-400 mt-2 max-w-xl mx-auto">
            Selamat datang di basecamp para pejuang cuan. Masuk untuk mulai analisis pasar dan diskusi bareng komunitas.
        </p>
        <button
            onClick={onContinue}
            className="mt-8 flex items-center justify-center gap-3 w-full max-w-xs mx-auto bg-white/10 border border-white/20 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 hover:bg-electric/20 hover:border-electric focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-electric"
        >
            <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                <path d="M1 1h22v22H1z" fill="none"/>
            </svg>
            <span>Masuk dengan Google</span>
        </button>
    </div>
);

const FormStep: React.FC<LoginPageProps> = ({ onLogin, onRegister }) => {
    const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        
        const action = activeTab === 'login' ? onLogin : onRegister;
        const result = await action(email, password);

        if (result) {
            setError(result);
        }
        setIsLoading(false);
    };
    
    return (
         <div className="w-full max-w-sm bg-gray-900/50 border border-white/10 rounded-2xl p-6 backdrop-blur-md animate-fade-in-up">
            <div className="flex justify-center mb-5 border-b border-white/10">
                <button 
                    onClick={() => setActiveTab('login')} 
                    className={`px-4 py-2 text-sm font-bold transition-colors w-1/2 ${activeTab === 'login' ? 'text-electric border-b-2 border-electric' : 'text-gray-400'}`}>
                    Login
                </button>
                <button 
                    onClick={() => setActiveTab('register')} 
                    className={`px-4 py-2 text-sm font-bold transition-colors w-1/2 ${activeTab === 'register' ? 'text-electric border-b-2 border-electric' : 'text-gray-400'}`}>
                    Daftar
                </button>
            </div>
            <h2 className="text-xl font-bold text-white text-center mb-1">
                {activeTab === 'login' ? 'Selamat Datang Kembali' : 'Buat Akun Baru'}
            </h2>
            <p className="text-center text-gray-400 text-sm mb-5">
                {activeTab === 'login' ? 'Masuk untuk melanjutkan ke forum.' : 'Daftar untuk bergabung dengan komunitas.'}
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="Email"
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
                        activeTab === 'login' ? 'Lanjutkan' : 'Daftar Sekarang'
                    )}
                </button>
            </form>
        </div>
    );
};

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onRegister }) => {
    const [step, setStep] = useState<'initial' | 'form'>('initial');

    return (
        <div className="min-h-screen bg-transparent text-white font-sans flex flex-col items-center justify-center p-4">
             {step === 'initial' ? (
                <InitialStep onContinue={() => setStep('form')} />
             ) : (
                <FormStep onLogin={onLogin} onRegister={onRegister} />
             )}
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