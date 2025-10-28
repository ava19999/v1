// components/ForumPage.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import UserTag, { ADMIN_USERNAMES } from './UserTag';
import type { NewsArticle, ChatMessage, ForumPageProps, ForumMessageItem, User } from '../types';
import { isNewsArticle, isChatMessage } from '../types';

const DEFAULT_ROOM_IDS = ['berita-kripto', 'pengumuman-aturan'];

const formatDate = (unixTimestamp: number): string => new Date(unixTimestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
const EMOJIS = ['👍', '❤️', '🚀', '🔥', '😂', '🤯'];

// --- Sub-komponen ---

// Reaction Picker (Emoji Selector) - DIPINDAHKAN ke ForumPage, styling diubah
const ReactionPicker = ({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void; }) => (
    // Fixed position, centered, with overlay
    <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-fast"
        onClick={onClose} // Klik overlay untuk menutup
        data-message-interactive="true" // Tandai agar klik di sini tidak menutup via handleChatAreaClick
    >
        <div
            className="bg-gray-900/90 border border-white/10 rounded-lg p-2 flex items-center gap-2 shadow-xl"
            onClick={(e) => e.stopPropagation()} // Cegah penutupan saat klik di dalam picker
        >
            {EMOJIS.map(emoji => (
                <button key={emoji} onClick={() => { onSelect(emoji); onClose(); }} className="text-2xl hover:scale-125 transition-transform p-1.5 rounded-full hover:bg-white/10">
                    {emoji}
                </button>
            ))}
        </div>
    </div>
);


// Display Existing Reactions (Tetap sama)
const Reactions = ({ message, username, onReact }: { message: NewsArticle | ChatMessage | undefined | null; username: string; onReact: (emoji: string) => void; }) => {
    const reactions = message?.reactions || {};
    const hasReactions = Object.keys(reactions).length > 0 && Object.values(reactions).some(users => Array.isArray(users) && users.length > 0); // Pastikan ada user di dalamnya
    if (!hasReactions) return null;

    return (
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {Object.entries(reactions).map(([emoji, users]) => {
                const userList = users as string[];
                if (!Array.isArray(userList) || userList.length === 0) return null;
                const currentUserReacted = userList.includes(username);
                // Batasi jumlah nama yang ditampilkan di tooltip jika terlalu banyak
                const userListPreview = userList.slice(0, 10).join(', ') + (userList.length > 10 ? '...' : '');
                const tooltipText = currentUserReacted
                    ? `Anda${userList.length > 1 ? ` & ${userList.length - 1} lainnya` : ''} bereaksi dengan ${emoji}`
                    : `${userList.length} orang (${userListPreview}) bereaksi dengan ${emoji}`;

                return (
                    <button
                        key={emoji}
                        onClick={(e) => { e.stopPropagation(); onReact(emoji); }} // Hentikan propagasi agar tidak memicu klik pesan
                        className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-all duration-200 ${
                            currentUserReacted ? 'bg-electric/80 text-white' : 'bg-gray-600/50 hover:bg-gray-600/80 text-gray-300'
                        }`}
                        title={tooltipText} // Tooltip lebih informatif
                        data-message-interactive="true" // Tandai tombol ini
                    >
                        <span>{emoji}</span>
                        <span>{userList.length}</span>
                    </button>
                );
            })}
        </div>
    );
};

// Delete Button Component (Tetap sama)
const DeleteButton: React.FC<{ onClick: (e: React.MouseEvent) => void }> = ({ onClick }) => (
    <button onClick={onClick} className="p-1 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors" title="Hapus Pesan" data-message-interactive="true">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
    </button>
);
// React Button Component (Tetap sama)
const ReactButton: React.FC<{ onClick: (e: React.MouseEvent) => void }> = ({ onClick }) => (
    <button onClick={onClick} className="p-1 text-gray-500 hover:text-electric hover:bg-electric/10 rounded-full transition-colors" title="Beri Reaksi" data-message-interactive="true">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    </button>
);


// News Message Component (UI Aksi diperbarui)
const NewsMessage: React.FC<{
    article: NewsArticle;
    username: string;
    onReact: (messageId: string, emoji: string) => void;
    onDeleteClick: () => void;
    canDelete: boolean;
    isActive: boolean;
    showActions: boolean; // Hanya perlu showActions, tidak perlu showPicker di sini
    onMessageClick: () => void;
    onReactButtonClick: (e: React.MouseEvent) => void; // Tidak perlu onClosePicker
}> = ({
    article, username, onReact, onDeleteClick, canDelete,
    isActive, showActions, onMessageClick, onReactButtonClick
}) => {

    return (
        <div className="my-2 animate-fade-in-up">
            <div className="w-full sm:w-4/5 md:w-3/5 mx-auto relative"> {/* Hapus group jika tidak diperlukan hover */}
                 <div
                    onClick={onMessageClick}
                    className={`block p-3 bg-gray-800/50 rounded-lg transition-colors cursor-pointer ${isActive ? 'bg-gray-800/60 ring-1 ring-electric/30' : 'hover:bg-gray-800/70'}`} // Tambah ring saat aktif
                    data-message-interactive="true" // Tandai bubble
                 >
                    {/* Konten Berita (Tetap sama) */}
                    <a href={article.url} target="_blank" rel="noopener noreferrer" onClick={(e)=> e.stopPropagation()}>
                        <div className="flex items-start space-x-3">
                            <img src={article.imageurl} alt={article.title} className="w-20 h-14 object-cover rounded-md flex-shrink-0 bg-gray-700" loading="lazy" />
                            <div className="flex-1">
                                <h3 className="font-semibold text-gray-100 text-sm leading-snug hover:underline">{article.title}</h3>
                                <p className="text-xs text-gray-400 mt-1">Oleh {article.source}</p>
                            </div>
                        </div>
                     </a>
                     <div className="text-center text-xs text-gray-500 pt-2 mt-2 border-t border-white/5"> Pasar · {formatDate(article.published_on * 1000)} </div>
                 </div>

                 <div className="relative mt-1 px-1 flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                        <Reactions message={article} username={username} onReact={(emoji) => onReact(article.id, emoji)} />
                    </div>

                    {/* Tombol Aksi (HANYA muncul jika showActions true) */}
                    <div className="relative flex-shrink-0">
                         <div className={`flex items-center gap-1 transition-opacity duration-200 ${showActions ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}> {/* Hilangkan group-hover, tambahkan pointer-events-none */}
                             <ReactButton onClick={onReactButtonClick} />
                             {canDelete && <DeleteButton onClick={(e) => { e.stopPropagation(); onDeleteClick(); }} />}
                         </div>
                         {/* Picker Emoji Dihapus dari sini */}
                    </div>
                 </div>
            </div>
        </div>
    );
};


// User Message Component (UI Aksi & Posisi Username diperbarui)
const UserMessage: React.FC<{
    message: ChatMessage;
    userProfile: User | null;
    onReact: (messageId: string, emoji: string) => void;
    onDeleteClick: () => void;
    canDelete: boolean;
    isActive: boolean;
    showActions: boolean; // Hanya perlu showActions
    onMessageClick: () => void;
    onReactButtonClick: (e: React.MouseEvent) => void; // Tidak perlu onClosePicker
}> = ({
    message, userProfile, onReact, onDeleteClick, canDelete,
    isActive, showActions, onMessageClick, onReactButtonClick
}) => {

    const currentUsername = userProfile?.username || '';
    const isCurrentUser = message.sender === currentUsername && !!currentUsername;
    // Dapatkan creation date HANYA jika itu pesan user saat ini & userProfile tersedia
    const creationDate = (isCurrentUser && userProfile) ? userProfile.createdAt : null;

    return (
        <div className={`my-1 py-1 flex relative ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs sm:max-w-sm md:max-w-md ${isCurrentUser ? 'ml-auto' : ''}`}>
                 {/* --- PERUBAHAN POSISI USERNAME/TAG --- */}
                 {/* Tampilkan di atas untuk SEMUA pesan */}
                 <div className={`flex items-center gap-2 flex-wrap mb-1 ${isCurrentUser ? 'justify-end' : ''}`}>
                    <span className={`font-bold text-sm break-all font-heading ${isCurrentUser ? 'text-electric' : 'text-magenta'}`}>{message.sender}</span>
                    {/* Berikan creationDate jika itu pesan user saat ini, jika tidak null */}
                    <UserTag sender={message.sender} userCreationDate={creationDate} />
                 </div>
                 {/* --- AKHIR PERUBAHAN --- */}

                {/* Message Bubble */}
                <div
                    onClick={onMessageClick}
                    className={`relative text-sm text-gray-200 break-words px-3 pt-2.5 pb-2 rounded-xl cursor-pointer ${
                        isActive ? (isCurrentUser ? 'bg-electric/15 ring-1 ring-electric/30' : 'bg-magenta/5 ring-1 ring-magenta/30') : // Tambah ring saat aktif
                        (isCurrentUser ? 'bg-gradient-to-br from-electric/20 to-gray-900/10' : 'bg-gradient-to-bl from-magenta/10 to-gray-900/10')
                    } transition-colors`}
                    data-message-interactive="true" // Tandai bubble
                >
                    {/* Konten Pesan (Tetap sama) */}
                    {message.fileURL && <img src={message.fileURL} alt={message.fileName || 'Gambar'} className="rounded-lg max-h-48 mt-1 mb-2" />}
                    {message.text}
                    <span className="text-xs text-gray-500 absolute bottom-1 right-2.5 opacity-70">{formatDate(message.timestamp)}</span>
                </div>

                 <div className="relative mt-1 px-1 flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                        <Reactions message={message} username={currentUsername} onReact={(emoji) => onReact(message.id, emoji)} />
                    </div>

                    {/* Tombol Aksi (HANYA muncul jika showActions true) */}
                    <div className={`relative flex-shrink-0 ${isCurrentUser ? 'ml-2' : 'mr-2'}`}>
                         <div className={`flex items-center gap-1 transition-opacity duration-200 ${showActions ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}> {/* Hilangkan group-hover, tambahkan pointer-events-none */}
                             <ReactButton onClick={onReactButtonClick} />
                             {canDelete && <DeleteButton onClick={(e) => { e.stopPropagation(); onDeleteClick(); }} />}
                         </div>
                         {/* Picker Emoji Dihapus dari sini */}
                    </div>
                 </div>
                 {/* Info sender di bawah dihapus karena sudah dipindah ke atas */}
            </div>
        </div>
    );
};

// --- Komponen Lainnya (SystemMessage, AnnouncementMessage tetap sama) ---
const SystemMessage: React.FC<{ message: ChatMessage; }> = ({ message }) => ( <div className="text-center text-xs text-gray-500 py-2 italic animate-fade-in-up"> {message.text} </div> );
const AnnouncementMessage: React.FC<{ message: ChatMessage; }> = ({ message }) => {
    const text = message.text || ''; const parts = text.split(':'); const title = parts.length > 1 ? parts[0] : ''; const content = parts.length > 1 ? parts.slice(1).join(':').trim() : text;
    let icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>;
    let titleColor = 'text-electric'; let borderColor = 'border-electric/50';
    if (title.includes('Aturan')) { icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>; titleColor = 'text-magenta'; borderColor = 'border-magenta/50'; }
    else if (title.includes('Misi')) { icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>; titleColor = 'text-lime'; borderColor = 'border-lime/50'; }
    return ( <div className={`bg-gray-800/50 border-l-4 ${borderColor} rounded-r-lg p-4 my-3 animate-fade-in-up`}> <div className="flex items-start gap-4"> <div className={`flex-shrink-0 ${titleColor}`}>{icon}</div> <div className="flex-1"> {title && <h3 className={`text-lg font-bold ${titleColor} mb-1`}>{title}</h3>} <p className="text-gray-300 leading-relaxed text-sm">{content}</p> </div> </div> </div> );
};


// ForumPage Component Utama (State & Handler Aksi diperbarui)
const ForumPage: React.FC<ForumPageProps> = ({
    room, messages = [], userProfile, onSendMessage, onLeaveRoom, onReact, onDeleteMessage
}) => {
    const [newMessage, setNewMessage] = useState('');
    const [attachment, setAttachment] = useState<{dataUrl: string; name: string} | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const username = userProfile?.username ?? '';

    // State untuk mengelola interaksi pesan
    const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
    // State untuk picker emoji terpusat
    const [showPickerForMsgId, setShowPickerForMsgId] = useState<string | null>(null);

    // Handler saat pesan di-klik: toggle state aktif
    const handleMessageClick = (messageId: string) => {
        setActiveMessageId(currentId => {
            const isCurrentlyActive = currentId === messageId;
            // Jika mengklik pesan yang sudah aktif, nonaktifkan
            // Jika mengklik pesan lain, aktifkan
            const nextActiveId = isCurrentlyActive ? null : messageId;
            // Selalu tutup picker saat pesan diklik
            setShowPickerForMsgId(null);
            return nextActiveId;
        });
    };

    // Handler saat tombol React di-klik: tampilkan picker terpusat
    const handleReactButtonClick = (e: React.MouseEvent, messageId: string) => {
        e.stopPropagation(); // Hentikan event agar tidak trigger handleMessageClick
        setShowPickerForMsgId(messageId); // Set ID pesan untuk picker
        // Jika mengklik React pada pesan yang *tidak aktif*, aktifkan juga
         if (activeMessageId !== messageId) {
             setActiveMessageId(messageId);
         }
    };

     // Handler untuk menutup picker/actions saat klik di area chat
     const handleChatAreaClick = (e: React.MouseEvent<HTMLDivElement>) =