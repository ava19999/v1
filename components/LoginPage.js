import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
const InitialStep = ({ onContinue, onGoogleLogin }) => (_jsxs("div", { className: "w-full max-w-md text-center animate-fade-in-up", children: [_jsxs("div", { className: "flex items-center justify-center space-x-3 mb-4", children: [_jsxs("svg", { className: "h-12 w-12 text-electric", viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: [_jsx("path", { d: "M8 6L5 3", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M16 6L19 3", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("rect", { x: "3", y: "8", width: "18", height: "13", rx: "2", stroke: "currentColor", strokeWidth: "2" }), _jsx("path", { d: "M7 12H10L12 16L14 12H17", stroke: "magenta", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" })] }), _jsx("h1", { className: "text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-electric to-magenta text-transparent bg-clip-text font-heading", children: "RT Crypto" })] }), _jsx("p", { className: "text-lg text-gray-400 mt-2 max-w-xl mx-auto", children: "Selamat datang di basecamp para pejuang cuan. Masuk untuk mulai analisis pasar dan diskusi bareng komunitas." }), _jsxs("button", { onClick: onGoogleLogin, className: "mt-8 flex items-center justify-center gap-3 w-full max-w-xs mx-auto bg-white/10 border border-white/20 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 hover:bg-electric/20 hover:border-electric focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-electric", children: [_jsxs("svg", { className: "w-5 h-5", viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg", children: [_jsx("path", { d: "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z", fill: "#4285F4" }), _jsx("path", { d: "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z", fill: "#34A853" }), _jsx("path", { d: "M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z", fill: "#FBBC05" }), _jsx("path", { d: "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z", fill: "#EA4335" }), _jsx("path", { d: "M1 1h22v22H1z", fill: "none" })] }), _jsx("span", { children: "Masuk dengan Google" })] }), _jsx("button", { onClick: onContinue, className: "mt-4 text-sm text-gray-400 hover:text-white transition-colors", children: "Atau masuk dengan email" })] }));
const FormStep = ({ onLogin, onRegister, onCodeSent }) => {
    const [activeTab, setActiveTab] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        if (activeTab === 'login') {
            const result = await onLogin(email, password);
            if (result)
                setError(result);
        }
        else {
            const result = await onRegister(email, password);
            if (typeof result === 'string') {
                setError(result);
            }
            else {
                onCodeSent(email, result.code);
            }
        }
        setIsLoading(false);
    };
    return (_jsxs("div", { className: "w-full max-w-sm bg-gray-900/50 border border-white/10 rounded-2xl p-6 backdrop-blur-md animate-fade-in-up", children: [_jsxs("div", { className: "flex justify-center mb-5 border-b border-white/10", children: [_jsx("button", { onClick: () => setActiveTab('login'), className: `px-4 py-2 text-sm font-bold transition-colors w-1/2 ${activeTab === 'login' ? 'text-electric border-b-2 border-electric' : 'text-gray-400'}`, children: "Login" }), _jsx("button", { onClick: () => setActiveTab('register'), className: `px-4 py-2 text-sm font-bold transition-colors w-1/2 ${activeTab === 'register' ? 'text-electric border-b-2 border-electric' : 'text-gray-400'}`, children: "Daftar" })] }), _jsx("h2", { className: "text-xl font-bold text-white text-center mb-1", children: activeTab === 'login' ? 'Selamat Datang Kembali' : 'Buat Akun Baru' }), _jsx("p", { className: "text-center text-gray-400 text-sm mb-5", children: activeTab === 'login' ? 'Masuk untuk melanjutkan ke forum.' : 'Daftar untuk bergabung dengan komunitas.' }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsx("div", { children: _jsx("input", { type: "email", value: email, onChange: e => setEmail(e.target.value), placeholder: "Email", required: true, className: "w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-electric transition-all" }) }), _jsx("div", { children: _jsx("input", { type: "password", value: password, onChange: e => setPassword(e.target.value), placeholder: "Kata Sandi", required: true, className: "w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-electric transition-all" }) }), error && _jsx("p", { className: "text-magenta text-sm text-center", children: error }), _jsx("button", { type: "submit", disabled: isLoading, className: "w-full bg-electric hover:bg-electric/80 text-white font-bold py-2.5 px-6 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-electric disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center", children: isLoading ? (_jsxs("svg", { className: "animate-spin h-5 w-5 text-white", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", children: [_jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), _jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })] })) : (activeTab === 'login' ? 'Lanjutkan' : 'Daftar Sekarang') })] })] }));
};
const VerifyStep = ({ email, mockCode, onVerify, onBack }) => {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        const result = await onVerify(email, code);
        if (result)
            setError(result);
        setIsLoading(false);
    };
    return (_jsxs("div", { className: "w-full max-w-sm bg-gray-900/50 border border-white/10 rounded-2xl p-6 backdrop-blur-md animate-fade-in-up", children: [_jsx("h2", { className: "text-xl font-bold text-white text-center mb-1", children: "Verifikasi Email Anda" }), _jsxs("p", { className: "text-center text-gray-400 text-sm mb-3", children: ["Kami telah mengirimkan kode ke ", _jsx("strong", { className: "text-electric", children: email }), "."] }), _jsx("div", { className: "text-center bg-lime/10 border border-lime/50 rounded-lg p-2 mb-4", children: _jsxs("p", { className: "text-xs text-lime", children: ["Untuk simulasi, kode Anda adalah: ", _jsx("strong", { className: "text-lg tracking-widest", children: mockCode })] }) }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsx("div", { children: _jsx("input", { type: "text", value: code, onChange: e => setCode(e.target.value), placeholder: "Masukkan kode 6 digit", required: true, className: "w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-electric transition-all text-center tracking-[0.5em]", maxLength: 6 }) }), error && _jsx("p", { className: "text-magenta text-sm text-center", children: error }), _jsx("button", { type: "submit", disabled: isLoading || code.length !== 6, className: "w-full bg-electric hover:bg-electric/80 text-white font-bold py-2.5 px-6 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-electric disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center", children: isLoading ? 'Memverifikasi...' : 'Verifikasi & Selesaikan' })] }), _jsx("button", { onClick: onBack, className: "text-sm text-gray-500 hover:text-white mt-4 w-full", children: "Kembali" })] }));
};
const LoginPage = ({ onLogin, onRegister, onVerify, onGoogleLogin }) => {
    const [step, setStep] = useState('initial');
    const [verificationData, setVerificationData] = useState(null);
    const handleCodeSent = (email, code) => {
        setVerificationData({ email, code });
        setStep('verify');
    };
    const handleBackToForm = () => {
        setVerificationData(null);
        setStep('form');
    };
    const handleGoogleLogin = async () => {
        try {
            const response = await fetch('/.netlify/functions/auth-url');
            const { url } = await response.json();
            const width = 500;
            const height = 600;
            const left = (window.screen.width - width) / 2;
            const top = (window.screen.height - height) / 2;
            const authWindow = window.open(url, 'Google Login', `width=${width},height=${height},left=${left},top=${top}`);
            const handleMessage = async (event) => {
                if (event.origin !== window.location.origin)
                    return;
                if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
                    window.removeEventListener('message', handleMessage);
                    const { email, name, picture } = event.data.user;
                    await onGoogleLogin(email, name, picture);
                }
            };
            window.addEventListener('message', handleMessage);
            const checkWindow = setInterval(() => {
                if (authWindow?.closed) {
                    clearInterval(checkWindow);
                    window.removeEventListener('message', handleMessage);
                }
            }, 500);
        }
        catch (error) {
            console.error('Google login error:', error);
        }
    };
    return (_jsxs("div", { className: "min-h-screen bg-transparent text-white font-sans flex flex-col items-center justify-center p-4", children: [step === 'initial' && _jsx(InitialStep, { onContinue: () => setStep('form'), onGoogleLogin: handleGoogleLogin }), step === 'form' && _jsx(FormStep, { onLogin: onLogin, onRegister: onRegister, onCodeSent: handleCodeSent }), step === 'verify' && verificationData && (_jsx(VerifyStep, { email: verificationData.email, mockCode: verificationData.code, onVerify: onVerify, onBack: handleBackToForm })), _jsx("style", { children: `
                @keyframes fade-in-up { 
                    from { opacity: 0; transform: translateY(20px); } 
                    to { opacity: 1; transform: translateY(0); } 
                }
                .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; }
            ` })] }));
};
export default LoginPage;
//# sourceMappingURL=LoginPage.js.map