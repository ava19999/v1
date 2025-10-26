import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
const CreateIdPage = ({ onIdCreated, email }) => {
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const handleSubmit = (e) => {
        e.preventDefault();
        const trimmedUsername = username.trim();
        if (!trimmedUsername) {
            setError('Nama ID tidak boleh kosong.');
            return;
        }
        if (trimmedUsername.length < 3) {
            setError('Nama ID minimal harus 3 karakter.');
            return;
        }
        if (trimmedUsername.length > 15) {
            setError('Nama ID maksimal 15 karakter.');
            return;
        }
        if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
            setError('Nama ID hanya boleh berisi huruf, angka, dan garis bawah (_).');
            return;
        }
        setError('');
        onIdCreated(trimmedUsername, email);
    };
    return (_jsxs("div", { className: "min-h-screen bg-transparent text-white font-sans flex flex-col items-center justify-center p-4", children: [_jsxs("div", { className: "w-full max-w-sm text-center animate-fade-in-up", children: [_jsxs("div", { className: "flex items-center justify-center space-x-3 mb-4", children: [_jsx("svg", { className: "h-10 w-10 text-electric", viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: _jsx("path", { d: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" }) }), _jsx("h1", { className: "text-3xl font-black tracking-tight bg-gradient-to-r from-electric to-magenta text-transparent bg-clip-text font-heading", children: "Buat ID Forum Anda" })] }), _jsx("p", { className: "text-md text-gray-400 mt-2 mb-5", children: "Pilih nama yang akan menjadi identitas Anda di dalam forum. Nama ini tidak dapat diubah nanti." }), _jsxs("form", { onSubmit: handleSubmit, className: "w-full space-y-4", children: [_jsxs("div", { children: [_jsx("input", { type: "text", value: username, onChange: (e) => setUsername(e.target.value), placeholder: "Contoh: TraderCuan_99", className: "w-full bg-white/5 border border-white/10 rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-electric transition-all text-center", "aria-label": "Nama ID Forum" }), error && _jsx("p", { className: "text-magenta text-sm mt-2", children: error })] }), _jsx("button", { type: "submit", className: "w-full bg-electric hover:bg-electric/80 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-electric disabled:bg-gray-600 disabled:cursor-not-allowed", disabled: !username.trim(), children: "Simpan dan Masuk Forum" })] })] }), _jsx("style", { children: `
                @keyframes fade-in-up { 
                    from { opacity: 0; transform: translateY(20px); } 
                    to { opacity: 1; transform: translateY(0); } 
                }
                .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; }
            ` })] }));
};
export default CreateIdPage;
//# sourceMappingURL=CreateIdPage.js.map