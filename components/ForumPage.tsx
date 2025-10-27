// ava19999/v1/v1-e9d21554693c716e0e65bad33afe7587274395eb/components/ForumPage.tsx
import React, { useState, useEffect, useRef, useMemo, ReactElement, JSXElementConstructor, ReactNode, ReactPortal } from 'react';
import UserTag, { ADMIN_USERNAMES } from './UserTag'; // Import ADMIN_USERNAMES
import type { NewsArticle, ChatMessage, ForumPageProps, ForumMessageItem, User } from '../types';
import { isNewsArticle, isChatMessage } from '../types';

const formatDate = (unixTimestamp: number): string => new Date(unixTimestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
const EMOJIS = ['👍', '❤️', '🚀', '🔥', '😂', '🤯'];

// --- Sub-components ---

// PERBAIKAN: Memastikan syntax JSX benar, terutama penutup kurung siku ] dan panah fungsi
const ReactionPicker = ({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void; }) => (
    <div className="absolute left-0 -top-10 mt-1 bg-gray-900/80 backdrop-blur-md border border-white/10 rounded-lg p-1 flex items-center gap-1 z-20 shadow-lg animate-fade-in-fast">
        {EMOJIS.map(emoji => (
            <button
                key={emoji}
                onClick={() => { onSelect(emoji); onClose(); }} // Pastikan panah fungsi benar
                className="text-xl hover:scale-125 transition-transform p-1 rounded-full hover:bg-white/10"
            >
                {emoji}
            </button>
        ))}
        {/* Tombol close ditambahkan di sini */}
        <button onClick={onClose} className="text-gray-400 hover:text-white ml-1 p-0.5 rounded-full hover:bg-white/10">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
             </svg>
        </button>
    </div>
);


// DIPERBARUI: Menghapus tombol '+' dari Reactions
const Reactions = ({ message, username, onReact }: { message: NewsArticle | ChatMessage | undefined | null; username: string; onReact: (emoji: string) => void; }) => {
    const reactions = message?.reactions || {};
    const hasReactions = Object.keys(reactions).length > 0;
    if (!hasReactions) return null; // Jangan render apa-apa jika tidak ada reaksi
    return (
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {Object.entries(reactions).map(([emoji, users]) => {
                const userList = users as string[];
                if (!Array.isArray(userList) || userList.length === 0) return null;
                return ( <button key={emoji} onClick={() => onReact(emoji)} className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-all duration-200 ${userList.includes(username) ? 'bg-electric/80 text-white' : 'bg-gray-600/50 hover:bg-gray-600/80 text-gray-300'}`}> <span>{emoji}</span> <span>{userList.length}</span> </button> );
            })}
        </div>
    );
};

// --- Tombol Aksi Baru ---
const DeleteButton: React.FC<{ onClick: () => void }> = ({ onClick }) => ( <button onClick={onClick} className="p-1 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors" title="Hapus Pesan"> <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> </button> );
const ReactButton: React.FC<{ onClick: () => void }> = ({ onClick }) => ( <button onClick={onClick} className="p-1 text-gray-500 hover:text-electric hover:bg-electric/10 rounded-full transition-colors" title="Beri Reaksi"> <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> </button> );

// --- Komponen Pesan yang Dimodifikasi ---

const NewsMessage: React.FC<{ article: NewsArticle; username: string; onReact: (messageId: string, emoji: string) => void; onDeleteClick: () => void; canDelete: boolean; isActive: boolean; onMessageClick: () => void; }> = ({ article, username, onReact, onDeleteClick, canDelete, isActive, onMessageClick }) => {
    const [showPicker, setShowPicker] = useState(false);
    useEffect(() => { if (!isActive) setShowPicker(false); }, [isActive]);
    return (
        <div className="my-2 animate-fade-in-up relative group/message"> {/* Grup untuk hover (opsional) */}
             {/* Tombol Aksi - Muncul saat 'isActive', diposisikan absolut */}
             <div className={`absolute -top-1 right-0 z-10 flex items-center bg-gray-900 border border-white/10 rounded-full px-1 shadow-lg transition-opacity duration-200 ${isActive ? 'opacity-100 animate-fade-in-fast' : 'opacity-0 pointer-events-none'}`}>
                <ReactButton onClick={() => setShowPicker(prev => !prev)} />
                {canDelete && <DeleteButton onClick={onDeleteClick} />}
             </div>
             {/* Picker Emoji - Muncul relatif terhadap tombol aksi */}
             {isActive && showPicker && ( <div className="absolute top-7 right-0 z-20"> <ReactionPicker onSelect={(emoji) => {onReact(article.id, emoji); setShowPicker(false);}} onClose={() => setShowPicker(false)} /> </div> )}
            {/* Konten Pesan - Dibungkus div onClick */}
            <div onClick={onMessageClick} className={`cursor-pointer rounded-lg p-1 ${isActive ? 'bg-gray-800/30' : 'bg-transparent'} transition-colors duration-150`}>
                <div className="text-center text-xs text-gray-500 pt-1"> Pasar · {formatDate(article.published_on * 1000)} </div>
                <div className="w-full sm:w-4/5 md:w-3/5 mx-auto">
                    {/* Link berita tidak lagi membungkus keseluruhan, hanya konten */}
                    <div className="block p-3 bg-gray-800/50 rounded-lg group-hover/message:bg-gray-800/60 transition-colors">
                        <a href={article.url} target="_blank" rel="noopener noreferrer" onClick={(e)=> e.stopPropagation()}> {/* Stop propagation on link click */}
                             <div className="flex items-start space-x-3"> <img src={article.imageurl} alt={article.title} className="w-20 h-14 object-cover rounded-md flex-shrink-0 bg-gray-700" loading="lazy" /> <div className="flex-1"> <h3 className="font-semibold text-gray-100 text-sm leading-snug hover:underline">{article.title}</h3> <p className="text-xs text-gray-400 mt-1">Oleh {article.source}</p> </div> </div>
                        </a>
                     </div>
                    {/* Reaksi ditampilkan di bawah */}
                    <div className="relative mt-1 px-3 pb-1"> <Reactions message={article} username={username} onReact={(emoji) => onReact(article.id, emoji)} /> </div>
                </div>
            </div>
        </div>
    );
};

const UserMessage: React.FC<{ message: ChatMessage; userProfile: User | null; onReact: (messageId: string, emoji: string) => void; onDeleteClick: () => void; canDelete: boolean; isActive: boolean; onMessageClick: () => void; }> = ({ message, userProfile, onReact, onDeleteClick, canDelete, isActive, onMessageClick }) => {
    const [showPicker, setShowPicker] = useState(false);
    useEffect(() => { if (!isActive) setShowPicker(false); }, [isActive]);
    const currentUsername = userProfile?.username || '';
    const isCurrentUser = message.sender === currentUsername && !!currentUsername;
    const creationDate = isCurrentUser ? (userProfile?.createdAt ?? null) : null;

    return (
        <div className={`my-1 animate-fade-in-up py-1 flex group/message relative ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
            {/* Tombol Aksi - Diposisikan berbeda untuk user saat ini */}
             <div className={`absolute top-1 z-10 flex items-center bg-gray-900 border border-white/10 rounded-full px-1 shadow-lg transition-opacity duration-200 ${isActive ? 'opacity-100 animate-fade-in-fast' : 'opacity-0 pointer-events-none'} ${isCurrentUser ? 'left-0 -ml-12 md:-ml-14' : 'right-0 -mr-12 md:-mr-14'}`}>
                <ReactButton onClick={() => setShowPicker(prev => !prev)} />
                {canDelete && <DeleteButton onClick={onDeleteClick} />}
             </div>
             {/* Picker Emoji - Diposisikan berbeda */}
             {isActive && showPicker && ( <div className={`absolute top-8 z-20 ${isCurrentUser ? 'left-0 -ml-12 md:-ml-14' : 'right-0 -mr-12 md:-mr-14'}`}> <ReactionPicker onSelect={(emoji) => {onReact(message.id, emoji); setShowPicker(false);}} onClose={() => setShowPicker(false)} /> </div> )}
            {/* Konten Pesan */}
            <div className={`max-w-md ${isCurrentUser ? 'ml-auto' : ''}`} onClick={onMessageClick}>
                <div className={`flex items-start gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                    <div className="flex-1 overflow-hidden">
                        <div className={`flex items-center gap-2 flex-wrap ${isCurrentUser ? 'flex-row-reverse' : ''}`}> <span className={`font-bold text-sm break-all font-heading ${isCurrentUser ? 'text-electric' : 'text-magenta'}`}>{message.sender}</span> <UserTag sender={message.sender} userCreationDate={creationDate} /> </div>
                        <div className={`relative text-sm text-gray-200 break-words mt-1 px-3 pt-2.5 pb-5 rounded-xl cursor-pointer ${isActive ? (isCurrentUser ? 'bg-electric/15' : 'bg-magenta/5') : (isCurrentUser ? 'bg-gradient-to-br from-electric/20 to-gray-900/10' : 'bg-gradient-to-bl from-magenta/10 to-gray-900/10')} transition-colors`}>
                             {message.fileURL && <img src={message.fileURL} alt={message.fileName || 'Gambar'} className="rounded-lg max-h-48 mt-1 mb-2" />} {message.text} <span className="text-xs text-gray-500 absolute bottom-1 right-2.5">{formatDate(message.timestamp)}</span>
                         </div>
                        <div className="relative mt-1"> <Reactions message={message} username={currentUsername} onReact={(emoji) => onReact(message.id, emoji)} /> </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SystemMessage: React.FC<{ message: ChatMessage; }> = ({ message }) => ( <div className="text-center text-xs text-gray-500 py-2 italic animate-fade-in-up"> {message.text} </div> );
const AnnouncementMessage: React.FC<{ message: ChatMessage; }> = ({ message }) => { /* ... (kode tetap sama) ... */ };


// ForumPage component utama
const ForumPage: React.FC<ForumPageProps> = ({
    room, messages = [], userProfile, onSendMessage, onLeaveRoom, onReact, onDeleteMessage
}) => {
    const [newMessage, setNewMessage] = useState('');
    const [attachment, setAttachment] = useState<{dataUrl: string; name: string} | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const username = userProfile?.username ?? '';

    // State untuk action
    const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
    const [showActions, setShowActions] = useState(false);
    const actionTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Handler klik pesan
    const handleMessageClick = (messageId: string) => {
         if (actionTimerRef.current) {
             clearTimeout(actionTimerRef.current);
             actionTimerRef.current = null;
         }
         // Jika klik pesan yang sama saat action tampil, sembunyikan
         if (messageId === activeMessageId && showActions) {
             setShowActions(false);
             setActiveMessageId(null);
         }
         // Jika klik pesan baru (atau pesan yg sama tapi action belum tampil/timer berjalan)
         else {
             setShowActions(false); // Sembunyikan actions lama (jika ada)
             setActiveMessageId(messageId); // Set pesan aktif baru
             actionTimerRef.current = setTimeout(() => {
                 // Cek lagi apakah ID masih aktif setelah delay
                 if (activeMessageId === messageId) { // Gunakan state saat ini dalam timeout
                      setShowActions(true);
                 }
                 actionTimerRef.current = null;
             }, 300); // Delay 300ms
         }
    };

     // Handler klik area kosong untuk menyembunyikan actions
     const handleChatAreaClick = () => {
         if (showActions || activeMessageId) { // Jika ada action tampil atau pesan aktif
              console.log("[ForumPage] Chat area clicked, hiding actions.");
              setShowActions(false);
              setActiveMessageId(null);
              if (actionTimerRef.current) {
                  clearTimeout(actionTimerRef.current);
                  actionTimerRef.current = null;
              }
         }
     };

    // Efek untuk membersihkan timer saat unmount
    useEffect(() => { return () => { if (actionTimerRef.current) clearTimeout(actionTimerRef.current); }; }, []);

    const safeMessages = Array.isArray(messages) ? messages : [];
    const sortedMessages = useMemo(() => { return [...safeMessages].sort((a, b) => { const timeA = isNewsArticle(a) ? a.published_on * 1000 : (isChatMessage(a) ? a.timestamp : 0); const timeB = isNewsArticle(b) ? b.published_on * 1000 : (isChatMessage(b) ? b.timestamp : 0); if (timeA === 0 && timeB !== 0) return 1; if (timeA !== 0 && timeB === 0) return -1; return timeA - timeB; }); }, [safeMessages]);
    useEffect(() => { /* Scroll to bottom hanya jika tidak ada pesan aktif */ if(activeMessageId === null && chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' }); }, [sortedMessages, activeMessageId]);

    // JANGAN UBAH FUNGSI INI
    const handleSendMessage = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); const currentMessageText = newMessage.trim(); const currentAttachment = attachment; if ((!currentMessageText && !currentAttachment) || !username) { return; } const userMessage: Partial<ChatMessage> & { sender: string; timestamp: number; type: 'user' } = { id: `local-${Date.now()}-${Math.random()}`, type: 'user', sender: username, timestamp: Date.now(), reactions: {} }; if (currentMessageText) { userMessage.text = currentMessageText; } if (currentAttachment) { userMessage.fileURL = currentAttachment.dataUrl; userMessage.fileName = currentAttachment.name; } if (userMessage.text || userMessage.fileURL) { onSendMessage(userMessage as ChatMessage); } setNewMessage(''); setAttachment(null); if(fileInputRef.current) fileInputRef.current.value = ""; };
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { /* Pilih file */ const file = e.target.files?.[0]; if (file && file.type.startsWith('image/')) { const reader = new FileReader(); reader.onloadend = () => { if (reader.result) { setAttachment({ dataUrl: reader.result as string, name: file.name }); } }; reader.readAsDataURL(file); } else { setAttachment(null); } };

    if (!room) { /* Handle jika room null */ return ( <div className="container mx-auto flex flex-col flex-grow items-center justify-center text-center"> <h2 className="text-xl font-bold text-gray-300">Room tidak ditemukan</h2> <p className="text-gray-500 mt-2">Pilih room untuk bergabung.</p> <button onClick={onLeaveRoom} className="mt-4 bg-electric hover:bg-electric/80 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-300"> Kembali </button> </div> ) }

    const isDefaultRoom = ['berita-kripto', 'pengumuman-aturan'].includes(room.id);
    const isSendDisabled = (!newMessage.trim() && !attachment) || !username;
    const isAdmin = userProfile?.username ? ADMIN_USERNAMES.map(n => n.toLowerCase()).includes(userProfile.username.toLowerCase()) : false;

    return (
        <div className="container mx-auto px-2 sm:px-4 py-3 animate-fade-in flex flex-col flex-grow h-[calc(100vh-56px)]">
             <div className="mb-3 flex-shrink-0"> {/* Header Room */}
                  <div className="flex items-center justify-between gap-4 mb-3"> <button onClick={onLeaveRoom} className="flex items-center gap-2 text-gray-400 hover:text-electric transition-colors"> <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg> <span className="text-sm font-semibold">Semua Room</span> </button> <div className="flex items-center gap-2.5"> <div className="relative flex h-2.5 w-2.5"> <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime opacity-75"></span> <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-lime"></span> </div> <p className="text-sm font-semibold"> <span className="text-white">{room.userCount.toLocaleString('id-ID')}</span> <span className="text-gray-400 ml-1.5">Online</span> </p> </div> </div>
                  <div className="flex items-center"> <div> <h1 className="text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-electric to-magenta text-transparent bg-clip-text truncate font-heading">{room.name}</h1> <p className="text-gray-400 text-xs mt-1">Diskusikan pasar. Berita terbaru muncul otomatis.</p> </div> </div>
             </div>

            <div className="bg-gray-900 border border-white/10 rounded-xl flex flex-col flex-grow overflow-hidden">
                {/* Area Pesan - Tambah onClick */}
                <div className="p-2 md:p-4 flex-grow overflow-y-auto space-y-1 custom-scrollbar" onClick={handleChatAreaClick}>
                     {sortedMessages.length === 0 ? ( <div className="flex items-center justify-center h-full text-gray-500"><p>Belum ada pesan.</p></div> )
                     : ( sortedMessages.map((item, index) => {
                           // Cek apakah item ini sedang aktif
                           const isActive = activeMessageId === item.id && showActions;
                           if (isChatMessage(item)) {
                               if (item.type === 'system') { if (room.id === 'pengumuman-aturan') { return <AnnouncementMessage key={item.id || `sys-${index}`} message={item} />; } return <SystemMessage key={item.id || `sys-${index}`} message={item} />; }
                               const isOwnMessage = item.sender === username && !!username;
                               const canDelete = isAdmin || (isOwnMessage && item.type === 'user');
                               const senderProfile = isOwnMessage ? userProfile : null;
                               return <UserMessage key={item.id || `user-${index}`} message={item} userProfile={senderProfile} onReact={onReact} onDeleteClick={() => {if (window.confirm('Yakin hapus pesan ini?')) {onDeleteMessage(room.id, item.id);}}} canDelete={canDelete} isActive={isActive} onMessageClick={(e) => { e.stopPropagation(); handleMessageClick(item.id); }} />;
                           } else if (isNewsArticle(item)) {
                               const canDeleteNews = isAdmin;
                               return <NewsMessage key={item.id || `news-${index}`} article={item} username={username} onReact={onReact} onDeleteClick={() => {if (window.confirm('Yakin hapus berita ini?')) {onDeleteMessage(room.id, item.id);}}} canDelete={canDeleteNews} isActive={isActive} onMessageClick={(e) => { e.stopPropagation(); handleMessageClick(item.id); }} />;
                           }
                           return null;
                        })
                    )}
                    <div ref={chatEndRef} />
                </div>

                 <div className="p-3 bg-gray-900/80 border-t border-white/10 flex-shrink-0">
                    {/* Input Area (Tidak Berubah) */}
                    {isDefaultRoom ? ( <div className="text-center text-sm text-gray-500 py-2 flex items-center justify-center gap-2"> {/* Read only */} </div> )
                    : ( <div className="space-y-2"> {attachment && ( <div className="relative inline-block"> {/* Attachment preview */} </div> )}
                        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="text-gray-400 hover:text-electric p-2 rounded-full transition-colors flex-shrink-0"> <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg> </button>
                            <div className="relative flex-1"> <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Ketik pesan Anda..." className="w-full bg-gray-800 border border-gray-700 rounded-full py-2.5 pl-4 pr-12 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-electric transition-all" disabled={!username} /> </div>
                            <button type="submit" className="bg-electric text-white rounded-full p-2.5 hover:bg-electric/80 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex-shrink-0" disabled={isSendDisabled} > <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg> </button>
                        </form>
                    </div> )}
                </div>
            </div>
             <style>{`
                /* ... (styles lain tetap sama) ... */
                @keyframes fade-in-fast { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                .animate-fade-in-fast { animation: fade-in-fast 0.15s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default ForumPage;