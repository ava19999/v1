import React, { useState } from 'react';
import type { CreateIdPageProps } from '../types';

const CreateIdPage: React.FC<CreateIdPageProps> = ({ onIdCreated }) => {
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
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
        onIdCreated(trimmedUsername);
    };

    return (
        <div className="min-h-screen bg-transparent text-white font-sans flex flex-col items-center justify-center p-4">
             <div className="w-full max-w-sm text-center animate-fade-in-up">
                 <div className="flex items-center justify-center space-x-3 mb-4">
                    <svg className="h-10 w-10 text-electric" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-electric to-magenta text-transparent bg-clip-text">
                        Buat ID Forum Anda
                    </h1>
                </div>

                <p className="text-md text-gray-400 mt-2 mb-5">
                    Pilih nama yang akan menjadi identitas Anda di dalam forum. Nama ini tidak dapat diubah nanti.
                </p>
                
                <form onSubmit={handleSubmit} className="w-full space-y-4">
                    <div>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Contoh: TraderCuan_99"
                            className="w-full bg-white/5 border border-white/10 rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-electric transition-all text-center"
                            aria-label="Nama ID Forum"
                        />
                         {error && <p className="text-magenta text-sm mt-2">{error}</p>}
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-electric hover:bg-electric/80 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-electric disabled:bg-gray-600 disabled:cursor-not-allowed"
                        disabled={!username.trim()}
                    >
                        Simpan dan Masuk Forum
                    </button>
                </form>
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

export default CreateIdPage;