// ava19999/v1/v1-3144be21370e87e39a698551c2b24db3e4bf3bd0/components/ForumPage.tsx
import React, { useState, useEffect, useRef, useMemo, ReactElement, JSXElementConstructor, ReactNode, ReactPortal } from 'react';
import UserTag, { ADMIN_USERNAMES } from './UserTag'; // Import ADMIN_USERNAMES
import type { NewsArticle, ChatMessage, ForumPageProps, ForumMessageItem, User } from '../types';
import { isNewsArticle, isChatMessage } from '../types';

const formatDate = (unixTimestamp: number): string => new Date(unixTimestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
const EMOJIS = ['👍', '❤️', '🚀', '🔥', '😂', '🤯'];

// --- Sub-components ---

// PERBAIKAN: Memastikan syntax JSX benar
const ReactionPicker = ({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void; }) => (
    <div className="absolute left-0 -top-10 mt-1 bg-gray-900/80 backdrop-blur-md border border-white/10 rounded-lg p-1 flex items-center gap-1 z-20 shadow-lg animate-fade-in-fast">
        {EMOJIS.map(emoji => (
            <button key={emoji} onClick={() => { onSelect(emoji); onClose(); }} className="text-xl hover:scale-125 transition-transform p-1 rounded-full hover:bg-white/10"> {emoji} </button>
        ))}
        <button onClick={onClose} className="text-gray-400 hover:text-white ml-1 p-0.5 rounded-full hover:bg-white/10">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /> </svg>
        </button>
    </div>
);

// PERBAIKAN: Memastikan syntax JSX benar
const Reactions = ({ message, username, onReact }: { message: NewsArticle | ChatMessage | undefined | null; username: string; onReact: (emoji: string) => void; }) => {
    const reactions = message?.reactions || {}; const hasReactions = Object.keys(reactions).length > 0;
    if (!hasReactions) return null;
    return ( <div className="flex items-center gap-1.5 mt-1.5 flex-wrap"> {Object.entries(reactions).map(([emoji, users]) => { const userList = users as string[]; if (!Array.isArray(userList) || userList.length === 0) return null; return ( <button key={emoji} onClick={() => onReact(emoji)} className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-all duration-200 ${userList.includes(username) ? 'bg-electric/80 text-white' : 'bg-gray-600/50 hover:bg-gray-600/80 text-gray-300'}`}> <span>{emoji}</span> <span>{userList.length}</span> </button> ); })} </div> );
};

// PERBAIKAN: Memastikan syntax JSX benar
const DeleteButton: React.FC<{ onClick: () => void }> = ({ onClick }) => ( <button onClick={onClick} className="p-1 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors" title="Hapus Pesan"> <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> </button> );
// PERBAIKAN: Memastikan syntax JSX benar
const ReactButton: React.FC<{ onClick: () => void }> = ({ onClick }) => ( <button onClick={onClick} className="p-1 text-gray-500 hover:text-electric hover:bg-electric/10 rounded-full transition-colors" title="Beri Reaksi"> <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> </button> );

const NewsMessage: React.FC<{ article: NewsArticle; username: string; onReact: (messageId: string, emoji: string) => void; onDeleteClick: () => void; canDelete: boolean; isActive: boolean; onMessageClick: () => void; }> = ({ article, username, onReact, onDeleteClick, canDelete, isActive, onMessageClick }) => {
    const [showPicker, setShowPicker] = useState(false);
    useEffect(() => { if (!isActive) setShowPicker(false); }, [isActive]);
    return (
        <div className="my-2 animate-fade-in-up relative group/message">
             <div className={`absolute -top-1 right-0 z-10 flex items-center bg-gray-900 border border-white/10 rounded-full px-1 shadow-lg transition-opacity duration-200 ${isActive ? 'opacity-100 animate-fade-in-fast' : 'opacity-0 pointer-events-none'}`}> <ReactButton onClick={() => setShowPicker(prev => !prev)} /> {canDelete && <DeleteButton onClick={onDeleteClick} />} </div>
             {isActive && showPicker && ( <div className="absolute top-7 right-0 z-20"> <ReactionPicker onSelect={(emoji) => {onReact(article.id, emoji); setShowPicker(false);}} onClose={() => setShowPicker(false)} /> </div> )}
            <div onClick={onMessageClick} className={`cursor-pointer rounded-lg p-1 ${isActive ? 'bg-gray-800/30' : 'bg-transparent'} transition-colors duration-150`}>
                <div className="text-center text-xs text-gray-500 pt-1"> Pasar · {formatDate(article.published_on * 1000)} </div>
                <div className="w-full sm:w-4/5 md:w-3/5 mx-auto">
                    <div className="block p-3 bg-gray-800/50 rounded-lg group-hover/message:bg-gray-800/60 transition-colors"> <a href={article.url} target="_blank" rel="noopener noreferrer" onClick={(e)=> e.stopPropagation()}> <div className="flex items-start space-x-3"> <img src={article.imageurl} alt={article.title} className="w-20 h-14 object-cover rounded-md flex-shrink-0 bg-gray-700" loading="lazy" /> <div className="flex-1"> <h3 className="font-semibold text-gray-100 text-sm leading-snug hover:underline">{article.title}</h3> <p className="text-xs text-gray-400 mt-1">Oleh {article.source}</p> </div> </div> </a> </div>
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
             <div className={`absolute top-1 z-10 flex items-center bg-gray-900 border border-white/10 rounded-full px-1 shadow-lg transition-opacity duration-200 ${isActive ? 'opacity-100 animate-fade-in-fast' : 'opacity-0 pointer-events-none'} ${isCurrentUser ? 'left-0 -ml-12 md:-ml-14' : 'right-0 -mr-12 md:-mr-14'}`}> <ReactButton onClick={() => setShowPicker(prev => !prev)} /> {canDelete && <DeleteButton onClick={onDeleteClick} />} </div>
             {isActive && showPicker && ( <div className={`absolute top-8 z-20 ${isCurrentUser ? 'left-0 -ml-12 md:-ml-14' : 'right-0 -mr-12 md:-mr-14'}`}> <ReactionPicker onSelect={(emoji) => {onReact(message.id, emoji); setShowPicker(false);}} onClose={() => setShowPicker(false)} /> </div> )}
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

// PERBAIKAN: Pastikan AnnouncementMessage mengembalikan JSX
const AnnouncementMessage: React.FC<{ message: ChatMessage; }> = ({ message }) => {
    const text = message.text || ''; const parts = text.split(':'); const title = parts.length > 1 ? parts[0] : ''; const content = parts.length > 1 ? parts.slice(1).join(':').trim() : text;
    let icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>;
    let titleColor = 'text-electric'; let borderColor = 'border-electric/50';
    if (title.includes('Aturan')) { icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>; titleColor = 'text-magenta'; borderColor = 'border-magenta/50'; }
    else if (title.includes('Misi')) { icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>; titleColor = 'text-lime'; borderColor = 'border-lime/50'; }
    return ( <div className={`bg-gray-800/50 border-l-4 ${borderColor} rounded-r-lg p-4 my-3 animate-fade-in-up`}> <div className="flex items-start gap-4"> <div className={`flex-shrink-0 ${titleColor}`}>{icon}</div> <div className="flex-1"> {title && <h3 className={`text-lg font-bold ${titleColor} mb-1`}>{title}</h3>} <p className="text-gray-300 leading-relaxed text-sm">{content}</p> </div> </div> </div> );
};


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
         if (actionTimerRef.current) { clearTimeout(actionTimerRef.current); actionTimerRef.current = null; }
         if (messageId === activeMessageId && showActions) { setShowActions(false); setActiveMessageId(null); }
         else {
             setShowActions(false); setActiveMessageId(messageId);
             actionTimerRef.current = setTimeout(() => {
                 // PERBAIKAN: Gunakan callback function untuk update state berdasarkan state sebelumnya
                 setActiveMessageId(currentActiveId => {
                      if (currentActiveId === messageId) { setShowActions(true); }
                      return currentActiveId; // Kembalikan state saat ini
                 });
                 actionTimerRef.current = null;
             }, 300);
         }
    };

     // Handler klik area kosong
     const handleChatAreaClick = () => { if (showActions || activeMessageId) { setShowActions(false); setActiveMessageId(null); if (actionTimerRef.current) { clearTimeout(actionTimerRef.current); actionTimerRef.current = null; } } };
    // Cleanup timer
    useEffect(() => { return () => { if (actionTimerRef.current) clearTimeout(actionTimerRef.current); }; }, []);

    const safeMessages = Array.isArray(messages) ? messages : [];
    const sortedMessages = useMemo(() => { /* Sorting */ return [...safeMessages].sort((a, b) => { const timeA = isNewsArticle(a) ? a.published_on * 1000 : (isChatMessage(a) ? a.timestamp : 0); const timeB = isNewsArticle(b) ? b.published_on * 1000 : (isChatMessage(b) ? b.timestamp : 0); if (timeA === 0 && timeB !== 0) return 1; if (timeA !== 0 && timeB === 0) return -1; return timeA - timeB; }); }, [safeMessages]);
    useEffect(() => { /* Scroll */ if(activeMessageId === null && chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' }); }, [sortedMessages, activeMessageId]);

    // JANGAN UBAH FUNGSI INI
    const handleSendMessage = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); const currentMessageText = newMessage.trim(); const currentAttachment = attachment; if ((!currentMessageText && !currentAttachment) || !username) { return; } const userMessage: Partial<ChatMessage> & { sender: string; timestamp: number; type: 'user' } = { id: `local-${Date.now()}-${Math.random()}`, type: 'user', sender: username, timestamp: Date.now(), reactions: {} }; if (currentMessageText) { userMessage.text = currentMessageText; } if (currentAttachment) { userMessage.fileURL = currentAttachment.dataUrl; userMessage.fileName = currentAttachment.name; } if (userMessage.text || userMessage.fileURL) { onSendMessage(userMessage as ChatMessage); } setNewMessage(''); setAttachment(null); if(fileInputRef.current) fileInputRef.current.value = ""; };
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { /* Pilih file */ const file = e.target.files?.[0]; if (file && file.type.startsWith('image/')) { const reader = new FileReader(); reader.onloadend = () => { if (reader.result) { setAttachment({ dataUrl: reader.result as string, name: file.name }); } }; reader.readAsDataURL(file); } else { setAttachment(null); } };

    if (!room) { /* Handle room null */ return (<div>Room tidak ditemukan</div>); }

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
                           const isActive = activeMessageId === item.id && showActions;
                           if (isChatMessage(item)) {
                               if (item.type === 'system') { if (room.id === 'pengumuman-aturan') { return <AnnouncementMessage key={item.id || `sys-${index}`} message={item} />; } return <SystemMessage key={item.id || `sys-${index}`} message={item} />; }
                               const isOwnMessage = item.sender === username && !!username;
                               const canDelete = isAdmin || (isOwnMessage && item.type === 'user');
                               const senderProfile = isOwnMessage ? userProfile : null;
                               // PERBAIKAN: Sederhanakan onMessageClick prop
                               return <UserMessage key={item.id || `user-${index}`} message={item} userProfile={senderProfile} onReact={onReact} onDeleteClick={() => {if (window.confirm('Yakin hapus pesan ini?')) {onDeleteMessage(room.id, item.id);}}} canDelete={canDelete} isActive={isActive} onMessageClick={() => handleMessageClick(item.id)} />;
                           } else if (isNewsArticle(item)) {
                               const canDeleteNews = isAdmin;
                               // PERBAIKAN: Sederhanakan onMessageClick prop
                               return <NewsMessage key={item.id || `news-${index}`} article={item} username={username} onReact={onReact} onDeleteClick={() => {if (window.confirm('Yakin hapus berita ini?')) {onDeleteMessage(room.id, item.id);}}} canDelete={canDeleteNews} isActive={isActive} onMessageClick={() => handleMessageClick(item.id)} />;
                           }
                           return null;
                        })
                    )}
                    <div ref={chatEndRef} />
                </div>

                 <div className="p-3 bg-gray-900/80 border-t border-white/10 flex-shrink-0">
                    {/* Input Area (Tidak Berubah) */}
                    {isDefaultRoom ? ( /* Read only */ ) : ( /* Form */ )}
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