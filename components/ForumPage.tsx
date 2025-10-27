// components/ForumPage.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import UserTag from './UserTag';
import type { NewsArticle, ChatMessage, ForumPageProps, ForumMessageItem, User } from '../types';

// --- Helper Functions & Type Guards ---
const isNewsArticle = (item: ForumMessageItem): item is NewsArticle => 'source' in item;
const isChatMessage = (item: ForumMessageItem): item is ChatMessage => 'sender' in item;
const formatDate = (unixTimestamp: number): string => new Date(unixTimestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
const EMOJIS = ['👍', '❤️', '🚀', '🔥', '😂', '🤯'];

// --- Sub-components ---

const ReactionPicker = ({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void; }) => (
    <div className="absolute left-0 mt-1 bg-gray-900/80 backdrop-blur-md border border-white/10 rounded-lg p-1 flex items-center gap-1 z-20 shadow-lg">
        {EMOJIS.map(emoji => (
            <button key={emoji} onClick={() => { onSelect(emoji); onClose(); }} className="text-xl hover:scale-125 transition-transform p-1 rounded-full hover:bg-white/10">
                {emoji}
            </button>
        ))}
         {/* Tombol close kecil */}
        <button onClick={onClose} className="text-gray-400 hover:text-white ml-1 p-0.5 rounded-full hover:bg-white/10">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
             </svg>
        </button>
    </div>
);

const Reactions = ({
    message,
    username,
    onReact,
    onAddReactionClick, // Prop baru untuk handle klik tombol '+'
}: {
    message: NewsArticle | ChatMessage;
    username: string;
    onReact: (emoji: string) => void;
    onAddReactionClick: () => void; // Tipe prop baru
}) => {
    const reactions = message.reactions || {};
    const hasReactions = Object.keys(reactions).length > 0;

    return (
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {hasReactions && Object.entries(reactions).map(([emoji, users]) => {
                const userList = users as string[];
                if (userList.length === 0) return null;
                return (
                    <button
                        key={emoji}
                        onClick={() => onReact(emoji)}
                        className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-all duration-200 ${userList.includes(username) ? 'bg-electric/80 text-white' : 'bg-gray-600/50 hover:bg-gray-600/80 text-gray-300'}`}
                    >
                        <span>{emoji}</span>
                        <span>{userList.length}</span>
                    </button>
                );
            })}
            {/* Tombol Add Reaction */}
            <button
                onClick={onAddReactionClick} // Panggil handler saat diklik
                className="flex items-center justify-center text-xs px-1.5 py-0.5 rounded-full bg-gray-600/50 hover:bg-gray-600/80 text-gray-400 hover:text-gray-200 transition-all duration-200"
                title="Tambah Reaksi"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
            </button>
        </div>
    );
};


// Komponen Message Container Utama (untuk User dan News)
const MessageWrapper: React.FC<{
    messageId: string;
    username: string;
    onReact: (messageId: string, emoji: string) => void;
    children: React.ReactNode;
    className?: string;
    reactionContainerClassName?: string; // Class tambahan untuk container reaksi
}> = ({ messageId, username, onReact, children, className, reactionContainerClassName }) => {
    const [showPicker, setShowPicker] = useState(false);
    const pickerRef = useRef<HTMLDivElement>(null); // Ref untuk picker

     // Menutup picker jika klik di luar
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setShowPicker(false);
            }
        };
        if (showPicker) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showPicker]);


    return (
        <div className={`relative ${className}`}>
            {children}
            {/* Container untuk Reactions dan Picker */}
            <div ref={pickerRef} className={`relative ${reactionContainerClassName || ''}`}>
                 {/* Reactions component now needs onAddReactionClick */}
                <Reactions
                    message={children.props.message || children.props.article} // Pass message/article data
                    username={username}
                    onReact={(emoji) => onReact(messageId, emoji)}
                    onAddReactionClick={() => setShowPicker(prev => !prev)} // Toggle picker visibility
                />
                 {/* Conditionally render ReactionPicker */}
                 {showPicker && (
                    <ReactionPicker
                        onSelect={(emoji) => onReact(messageId, emoji)}
                        onClose={() => setShowPicker(false)} // Prop untuk menutup
                    />
                 )}
            </div>
        </div>
    );
};


const NewsMessage: React.FC<{ article: NewsArticle; username: string; onReact: (messageId: string, emoji: string) => void; }> = ({ article, username, onReact }) => (
    // Gunakan MessageWrapper
    <MessageWrapper
        messageId={article.id}
        username={username}
        onReact={onReact}
        className="my-2 animate-fade-in-up"
        reactionContainerClassName="w-full sm:w-4/5 md:w-3/5 mx-auto" // Atur posisi container reaksi
    >
        {/* Konten asli NewsMessage */}
        <>
            <div className="text-center text-xs text-gray-500 py-1">
                Pembaruan Pasar · {formatDate(article.published_on * 1000)}
            </div>
            <div className="w-full sm:w-4/5 md:w-3/5 mx-auto">
                <a href={article.url} target="_blank" rel="noopener noreferrer" className="block p-3 bg-gray-800/50 hover:bg-gray-800/80 rounded-lg transition-colors duration-200">
                    <div className="flex items-start space-x-3">
                        <img src={article.imageurl} alt={article.title} className="w-20 h-14 object-cover rounded-md flex-shrink-0 bg-gray-700" loading="lazy" />
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-100 text-sm leading-snug">{article.title}</h3>
                            <p className="text-xs text-gray-400 mt-1">Oleh {article.source}</p>
                        </div>
                    </div>
                </a>
                {/* Reactions dan ReactionPicker sekarang dihandle oleh MessageWrapper */}
            </div>
        </>
    </MessageWrapper>
);


const UserMessage: React.FC<{ message: ChatMessage; userProfile: User | null; onReact: (messageId: string, emoji: string) => void; }> = ({ message, userProfile, onReact }) => {
    const currentUsername = userProfile?.username || '';
    const isCurrentUser = message.sender === currentUsername;

    return (
        // Gunakan MessageWrapper
        <MessageWrapper
            messageId={message.id}
            username={currentUsername}
            onReact={onReact}
            className={`my-1 animate-fade-in-up py-1 flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
            reactionContainerClassName={`max-w-md ${isCurrentUser ? 'ml-auto' : ''}`} // Atur posisi container reaksi
        >
            {/* Konten asli UserMessage */}
            <>
                <div className={`flex items-start gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                    <div className="flex-1 overflow-hidden">
                        <div className={`flex items-center gap-2 flex-wrap ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                            <span className={`font-bold text-sm break-all font-heading ${isCurrentUser ? 'text-electric' : 'text-magenta'}`}>{message.sender}</span>
                             {/* Teruskan userCreationDate yang mungkin null */}
                            <UserTag sender={message.sender} userCreationDate={message.sender === userProfile?.username ? userProfile?.createdAt : null} />
                        </div>
                        <div className={`relative text-sm text-gray-200 break-words mt-1 px-3 pt-2.5 pb-5 rounded-xl ${isCurrentUser ? 'bg-gradient-to-br from-electric/20 to-gray-900/10' : 'bg-gradient-to-bl from-magenta/10 to-gray-900/10'}`}>
                            {message.fileURL && <img src={message.fileURL} alt={message.fileName || 'Gambar'} className="rounded-lg max-h-48 mt-1 mb-2" />}
                            {message.text}
                            <span className="text-xs text-gray-500 absolute bottom-1 right-2.5">{formatDate(message.timestamp)}</span>
                        </div>
                         {/* Reactions dan ReactionPicker sekarang dihandle oleh MessageWrapper */}
                    </div>
                </div>
            </>
        </MessageWrapper>
    );
};


const SystemMessage: React.FC<{ message: ChatMessage; }> = ({ message }) => ( /* ... (kode tetap sama) ... */
    <div className="text-center text-xs text-gray-500 py-2 italic animate-fade-in-up">
        {message.text}
    </div>
);

const AnnouncementMessage: React.FC<{ message: ChatMessage; }> = ({ message }) => { /* ... (kode tetap sama) ... */
    const text = message.text || '';
    const parts = text.split(':');
    const title = parts.length > 1 ? parts[0] : '';
    const content = parts.length > 1 ? parts.slice(1).join(':').trim() : text;

    let icon;
    let titleColor = 'text-electric';
    let borderColor = 'border-electric/50';

    if (title.includes('Aturan')) {
        icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
        titleColor = 'text-magenta';
        borderColor = 'border-magenta/50';
    } else if (title.includes('Misi')) {
        icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
        titleColor = 'text-lime';
        borderColor = 'border-lime/50';
    } else {
         icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>;
    }

    return (
        <div className={`bg-gray-800/50 border-l-4 ${borderColor} rounded-r-lg p-4 my-3 animate-fade-in-up`}>
            <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 ${titleColor}`}>{icon}</div>
                <div className="flex-1">
                    {title && <h3 className={`text-lg font-bold ${titleColor} mb-1`}>{title}</h3>}
                    <p className="text-gray-300 leading-relaxed text-sm">{content}</p>
                </div>
            </div>
        </div>
    );
};


const ForumPage: React.FC<ForumPageProps> = ({
    room, messages, userProfile, onSendMessage, onLeaveRoom, onReact
}) => {
    const [newMessage, setNewMessage] = useState('');
    const [attachment, setAttachment] = useState<{dataUrl: string; name: string} | null>(null);

    const chatEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const username = userProfile?.username || '';

     // Cari data user untuk setiap pengirim pesan (hanya sekali saat messages berubah)
     const messageUsersData = useMemo(() => {
        const usersData: { [sender: string]: User | null } = {};
        if (!userProfile) return usersData; // Butuh userProfile untuk cari user lain (asumsi semua data ada di state `users` di App.tsx)

        messages.forEach(msg => {
            if (isChatMessage(msg) && !(msg.sender in usersData)) {
                 // Di aplikasi nyata, Anda mungkin perlu mengambil data user dari state global atau API
                 // Di sini kita asumsikan userProfile adalah user saat ini,
                 // dan untuk user lain kita butuh cara untuk mendapatkan datanya
                 // Jika Anda menyimpan semua user di state App.tsx (misal `allUsers`), Anda bisa mencarinya di sini.
                 // Untuk sekarang, kita hanya bisa mendapatkan data user saat ini.
                 if (msg.sender === userProfile.username) {
                    usersData[msg.sender] = userProfile;
                 } else {
                    // TODO: Cari user lain jika memungkinkan
                    // Contoh: usersData[msg.sender] = findUserByUsername(msg.sender, allUsers);
                    usersData[msg.sender] = null; // Default jika user lain tidak ditemukan
                 }
            }
        });
        return usersData;
     }, [messages, userProfile]); // Recalculate if messages or userProfile change

    const sortedMessages = useMemo(() => { /* ... (kode sorting tetap sama) ... */
        return [...messages].sort((a, b) => {
            const timestampA = isNewsArticle(a) ? a.published_on * 1000 : a.timestamp;
            const timestampB = isNewsArticle(b) ? b.published_on * 1000 : b.timestamp;
            return timestampA - timestampB;
        });
    }, [messages]);

    useEffect(() => { /* ... (kode scroll tetap sama) ... */
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [sortedMessages]);

    const handleSendMessage = (e: React.FormEvent<HTMLFormElement>) => { /* ... (kode tetap sama) ... */
        e.preventDefault();
        if ((newMessage.trim() === '' && !attachment) || !username) return;

        const userMessage: ChatMessage = {
            id: new Date().toISOString() + Math.random(),
            type: 'user',
            text: newMessage.trim() ? newMessage.trim() : undefined,
            sender: username,
            timestamp: Date.now(),
            fileURL: attachment?.dataUrl,
            fileName: attachment?.name,
            reactions: {}
        };

        onSendMessage(userMessage);

        setNewMessage('');
        setAttachment(null);
        if(fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { /* ... (kode tetap sama) ... */
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (reader.result) {
                    setAttachment({
                        dataUrl: reader.result as string,
                        name: file.name
                    });
                }
            };
            reader.readAsDataURL(file);
        } else {
            setAttachment(null);
        }
    };

    if (!room) { /* ... (kode tetap sama) ... */
        return (
            <div className="container mx-auto flex flex-col flex-grow items-center justify-center text-center">
                <h2 className="text-xl font-bold text-gray-300">Room tidak ditemukan</h2>
                <p className="text-gray-500 mt-2">Silakan kembali dan pilih room untuk bergabung.</p>
                <button onClick={onLeaveRoom} className="mt-4 bg-electric hover:bg-electric/80 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-300">
                    Kembali ke Daftar Room
                </button>
            </div>
        )
    }

    const isDefaultRoom = ['berita-kripto', 'pengumuman-aturan'].includes(room.id);

    return (
        <div className="container mx-auto px-2 sm:px-4 py-3 animate-fade-in flex flex-col flex-grow h-[calc(100vh-56px)]">
             {/* Header Room */}
            <div className="mb-3 flex-shrink-0">
                {/* ... (kode header room tetap sama) ... */}
                <div className="flex items-center justify-between gap-4 mb-3">
                    <button onClick={onLeaveRoom} className="flex items-center gap-2 text-gray-400 hover:text-electric transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                        <span className="text-sm font-semibold">Semua Room</span>
                    </button>
                     <div className="flex items-center gap-2.5">
                        <div className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-lime"></span>
                        </div>
                        <p className="text-sm font-semibold">
                            <span className="text-white">{room.userCount.toLocaleString('id-ID')}</span>
                            <span className="text-gray-400 ml-1.5">Online</span>
                        </p>
                    </div>
                </div>
                 <div className="flex items-center">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-electric to-magenta text-transparent bg-clip-text truncate font-heading">{room.name}</h1>
                        <p className="text-gray-400 text-xs mt-1">Diskusikan pasar dengan pengguna lain. Berita terbaru muncul otomatis.</p>
                    </div>
                </div>
            </div>

            {/* Kontainer Chat */}
            <div className="bg-gray-900 border border-white/10 rounded-xl flex flex-col flex-grow overflow-hidden">
                {/* Area Pesan */}
                <div className="p-2 md:p-4 flex-grow overflow-y-auto space-y-1 custom-scrollbar"> {/* Add custom-scrollbar */}
                     {sortedMessages.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            <p>Belum ada pesan di sini. Jadilah yang pertama!</p>
                        </div>
                     ) : (
                        sortedMessages.map((item, index) => {
                           if (room.id === 'pengumuman-aturan' && isChatMessage(item) && item.type === 'system') {
                               return <AnnouncementMessage key={item.id} message={item} />;
                           }
                           if (isNewsArticle(item)) {
                               return <NewsMessage key={item.id + index} article={item} username={username} onReact={onReact} />;
                           }
                           if (isChatMessage(item)) {
                               if (item.type === 'system') return <SystemMessage key={item.id} message={item} />;
                                // Dapatkan data user untuk pesan ini
                               const senderProfile = messageUsersData[item.sender] ?? null;
                               return <UserMessage key={item.id} message={item} userProfile={senderProfile} onReact={onReact} />;
                           }
                           return null;
                        })
                    )}
                    <div ref={chatEndRef} />
                </div>

                 {/* Input Area */}
                 <div className="p-3 bg-gray-900/80 border-t border-white/10 flex-shrink-0">
                   {/* ... (kode input area tetap sama) ... */}
                    {isDefaultRoom ? (
                         <div className="text-center text-sm text-gray-500 py-2 flex items-center justify-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            Room ini hanya untuk membaca.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {attachment && (
                                <div className="relative inline-block">
                                    <img src={attachment.dataUrl} alt="Pratinjau" className="max-h-24 rounded-lg" />
                                    <button onClick={() => { setAttachment(null); if(fileInputRef.current) fileInputRef.current.value = ""; }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold">&times;</button>
                                </div>
                            )}
                            <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="text-gray-400 hover:text-electric p-2 rounded-full transition-colors flex-shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                </button>
                                <div className="relative flex-1">
                                    <input
                                        type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Ketik pesan Anda..."
                                        className="w-full bg-gray-800 border border-gray-700 rounded-full py-2.5 pl-4 pr-12 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-electric transition-all"
                                        disabled={!username}
                                    />
                                </div>
                                <button type="submit" className="bg-electric text-white rounded-full p-2.5 hover:bg-electric/80 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex-shrink-0" disabled={(!newMessage.trim() && !attachment) || !username}>
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
             {/* Style untuk animasi dan scrollbar */}
             <style>{`
                @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes fade-in-up { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
                .animate-fade-in-up { animation: fade-in-up 0.4s ease-out forwards; }
                /* Custom Scrollbar */
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 3px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0, 191, 255, 0.4); }
            `}</style>
        </div>
    );
};

export default ForumPage;