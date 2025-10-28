// components/ForumPage.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import UserTag, { ADMIN_USERNAMES } from './UserTag';
import type { NewsArticle, ChatMessage, ForumPageProps, ForumMessageItem, User } from '../types';
import { isNewsArticle, isChatMessage } from '../types';

const DEFAULT_ROOM_IDS = ['berita-kripto', 'pengumuman-aturan'];

const formatDate = (unixTimestamp: number): string => new Date(unixTimestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
const EMOJIS = ['👍', '❤️', '🚀', '🔥', '😂', '🤯'];

// --- Sub-komponen ---

// Reaction Picker (Emoji Selector) - Centralized Modal
const ReactionPicker = ({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void; }) => (
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


// Display Existing Reactions
const Reactions = ({ message, username, onReact }: { message: NewsArticle | ChatMessage | undefined | null; username: string; onReact: (emoji: string) => void; }) => {
    const reactions = message?.reactions || {};
    const hasReactions = Object.keys(reactions).length > 0 && Object.values(reactions).some(users => Array.isArray(users) && users.length > 0);
    if (!hasReactions) return null;

    return (
        <div className="flex items-center gap-1 mt-1 flex-wrap"> {/* Reduced margin-top */}
            {Object.entries(reactions).map(([emoji, users]) => {
                const userList = users as string[];
                if (!Array.isArray(userList) || userList.length === 0) return null;
                const currentUserReacted = userList.includes(username);
                const userListPreview = userList.slice(0, 10).join(', ') + (userList.length > 10 ? '...' : '');
                const tooltipText = currentUserReacted
                    ? `Anda${userList.length > 1 ? ` & ${userList.length - 1} lainnya` : ''} bereaksi dengan ${emoji}`
                    : `${userList.length} orang (${userListPreview}) bereaksi dengan ${emoji}`;

                return (
                    <button
                        key={emoji}
                        onClick={(e) => { e.stopPropagation(); onReact(emoji); }}
                        className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0 rounded-full transition-all duration-200 ${ /* Smaller text, padding */
                            currentUserReacted ? 'bg-electric/80 text-white' : 'bg-gray-600/50 hover:bg-gray-600/80 text-gray-300'
                        }`}
                        title={tooltipText}
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

// Delete Button Component
const DeleteButton: React.FC<{ onClick: (e: React.MouseEvent) => void }> = ({ onClick }) => (
    <button onClick={onClick} className="p-1 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors" title="Hapus Pesan" data-message-interactive="true">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
    </button>
);
// React Button Component
const ReactButton: React.FC<{ onClick: (e: React.MouseEvent) => void }> = ({ onClick }) => (
    <button onClick={onClick} className="p-1 text-gray-500 hover:text-electric hover:bg-electric/10 rounded-full transition-colors" title="Beri Reaksi" data-message-interactive="true">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    </button>
);


// News Message Component
const NewsMessage: React.FC<{
    article: NewsArticle;
    username: string;
    onReact: (messageId: string, emoji: string) => void;
    onDeleteClick: () => void;
    canDelete: boolean;
    isActive: boolean;
    showActions: boolean;
    onMessageClick: () => void;
    onReactButtonClick: (e: React.MouseEvent) => void;
}> = ({
    article, username, onReact, onDeleteClick, canDelete,
    isActive, showActions, onMessageClick, onReactButtonClick
}) => {

    return (
        <div className="my-1.5 animate-fade-in-up"> {/* Reduced margin */}
            <div className="w-full sm:w-4/5 md:w-3/5 mx-auto relative">
                 <div
                    onClick={onMessageClick}
                    className={`block p-2.5 bg-gray-800/50 rounded-lg transition-colors cursor-pointer ${isActive ? 'bg-gray-800/60 ring-1 ring-electric/30' : 'hover:bg-gray-800/70'}`} {/* Reduced padding */}
                    data-message-interactive="true"
                 >
                    {/* Konten Berita */}
                    <a href={article.url} target="_blank" rel="noopener noreferrer" onClick={(e)=> e.stopPropagation()}>
                        <div className="flex items-start space-x-2.5"> {/* Reduced spacing */}
                            <img src={article.imageurl} alt={article.title} className="w-16 h-12 object-cover rounded flex-shrink-0 bg-gray-700" loading="lazy" /> {/* Adjusted size */}
                            <div className="flex-1">
                                <h3 className="font-semibold text-gray-100 text-xs leading-snug hover:underline">{article.title}</h3> {/* Smaller text */}
                                <p className="text-[11px] text-gray-400 mt-0.5">Oleh {article.source}</p> {/* Smaller text, margin */}
                            </div>
                        </div>
                     </a>
                 </div>
                 {/* Timestamp moved below */}
                 <div className="text-[10px] text-gray-500 mt-1 text-center"> Pasar · {formatDate(article.published_on * 1000)} </div>

                 <div className="relative mt-1 px-1 flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                        <Reactions message={article} username={username} onReact={(emoji) => onReact(article.id, emoji)} />
                    </div>

                    {/* Tombol Aksi */}
                    <div className="relative flex-shrink-0">
                         {/* ✨ ADDED transition-opacity for smoother appearance */}
                         <div className={`flex items-center gap-1 transition-opacity duration-200 ${showActions ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                             <ReactButton onClick={onReactButtonClick} />
                             {canDelete && <DeleteButton onClick={(e) => { e.stopPropagation(); onDeleteClick(); }} />}
                         </div>
                    </div>
                 </div>
            </div>
        </div>
    );
};


// User Message Component
const UserMessage: React.FC<{
    message: ChatMessage;
    userProfile: User | null;
    onReact: (messageId: string, emoji: string) => void;
    onDeleteClick: () => void;
    canDelete: boolean;
    isActive: boolean;
    showActions: boolean;
    onMessageClick: () => void;
    onReactButtonClick: (e: React.MouseEvent) => void;
    onImageClick: (url: string) => void; // Added prop for image click
}> = ({
    message, userProfile, onReact, onDeleteClick, canDelete,
    isActive, showActions, onMessageClick, onReactButtonClick, onImageClick // Added onImageClick
}) => {

    const currentUsername = userProfile?.username || '';
    const isCurrentUser = message.sender === currentUsername && !!currentUsername;
    const creationDate = (isCurrentUser && userProfile) ? userProfile.createdAt : null;

    return (
        <div className={`my-0.5 py-0.5 flex relative ${isCurrentUser ? 'justify-end' : 'justify-start'}`}> {/* Reduced margin/padding */}
            <div className={`max-w-[70%] sm:max-w-[65%] md:max-w-[60%] ${isCurrentUser ? 'ml-auto' : ''}`}> {/* Adjusted max-width */}
                 {/* Username/Tag Info */}
                 <div className={`flex items-center gap-1.5 flex-wrap mb-0.5 ${isCurrentUser ? 'justify-end' : ''}`}> {/* Reduced gap/margin */}
                    <span className={`font-bold text-xs break-all font-heading ${isCurrentUser ? 'text-electric' : 'text-magenta'}`}>{message.sender}</span> {/* Smaller text */}
                    <UserTag sender={message.sender} userCreationDate={creationDate} />
                 </div>

                {/* Message Bubble */}
                <div
                    onClick={onMessageClick}
                     className={`relative text-xs text-gray-200 break-words px-2.5 py-1.5 rounded-xl cursor-pointer ${ /* Smaller text, padding */
                        isActive ? (isCurrentUser ? 'bg-electric/15 ring-1 ring-electric/30' : 'bg-magenta/5 ring-1 ring-magenta/30') :
                        (isCurrentUser ? 'bg-gradient-to-br from-electric/20 to-gray-900/10' : 'bg-gradient-to-bl from-magenta/10 to-gray-900/10')
                    } transition-colors`}
                    data-message-interactive="true"
                >
                    {/* Konten Pesan */}
                    {message.fileURL && (
                         <img
                           src={message.fileURL}
                           alt={message.fileName || 'Gambar'}
                           className="rounded-lg max-h-40 mt-1 mb-1.5 cursor-pointer hover:opacity-80 transition-opacity" // Adjusted margins, added cursor/hover
                           onClick={(e) => { e.stopPropagation(); onImageClick(message.fileURL!); }} // Call onImageClick
                         />
                     )}
                    {message.text}
                     {/* Timestamp removed from here */}
                </div>
                {/* Timestamp moved below */}
                <div className={`text-[10px] text-gray-500 mt-0.5 ${isCurrentUser ? 'text-right' : 'text-left'}`}>{formatDate(message.timestamp)}</div>


                 <div className="relative mt-1 px-1 flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                        <Reactions message={message} username={currentUsername} onReact={(emoji) => onReact(message.id, emoji)} />
                    </div>

                    {/* Tombol Aksi */}
                    <div className={`relative flex-shrink-0 ${isCurrentUser ? 'ml-1' : 'mr-1'}`}> {/* Reduced margin */}
                          {/* ✨ ADDED transition-opacity for smoother appearance */}
                         <div className={`flex items-center gap-0.5 transition-opacity duration-200 ${showActions ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}> {/* Reduced gap */}
                             <ReactButton onClick={onReactButtonClick} />
                             {canDelete && <DeleteButton onClick={(e) => { e.stopPropagation(); onDeleteClick(); }} />}
                         </div>
                    </div>
                 </div>
            </div>
        </div>
    );
};

// --- Komponen Lainnya (SystemMessage, AnnouncementMessage tetap sama) ---
const SystemMessage: React.FC<{ message: ChatMessage; }> = ({ message }) => ( <div className="text-center text-[11px] text-gray-500 py-1.5 italic animate-fade-in-up"> {message.text} </div> ); // Smaller text/padding
const AnnouncementMessage: React.FC<{ message: ChatMessage; }> = ({ message }) => {
    const text = message.text || ''; const parts = text.split(':'); const title = parts.length > 1 ? parts[0] : ''; const content = parts.length > 1 ? parts.slice(1).join(':').trim() : text;
    let icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>; // Smaller icon
    let titleColor = 'text-electric'; let borderColor = 'border-electric/50';
    if (title.includes('Aturan')) { icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>; titleColor = 'text-magenta'; borderColor = 'border-magenta/50'; }
    else if (title.includes('Misi')) { icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>; titleColor = 'text-lime'; borderColor = 'border-lime/50'; }
    return ( <div className={`bg-gray-800/50 border-l-4 ${borderColor} rounded-r-lg p-3 my-2 animate-fade-in-up`}> {/* Adjusted padding/margin */} <div className="flex items-start gap-3"> <div className={`flex-shrink-0 ${titleColor}`}>{icon}</div> <div className="flex-1"> {title && <h3 className={`text-base font-bold ${titleColor} mb-1`}>{title}</h3>} <p className="text-gray-300 leading-relaxed text-xs">{content}</p> </div> </div> </div> ); // Smaller text
};

// Image Modal Component
const ImageModal: React.FC<{ imageUrl: string | null; onClose: () => void }> = ({ imageUrl, onClose }) => {
    if (!imageUrl) return null;
    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-fade-in-fast" // Higher z-index than picker
            onClick={onClose}
        >
            <img
                src={imageUrl}
                alt="Enlarged view"
                className="max-w-full max-h-full object-contain rounded-lg shadow-xl"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking image itself
            />
            <button
                className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/80 transition-colors"
                title="Tutup"
                onClick={onClose}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
    );
};


// ForumPage Component Utama
const ForumPage: React.FC<ForumPageProps> = ({
    room, messages = [], userProfile, onSendMessage, onLeaveRoom, onReact, onDeleteMessage
}) => {
    const [newMessage, setNewMessage] = useState('');
    const [attachment, setAttachment] = useState<{dataUrl: string; name: string} | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const username = userProfile?.username ?? '';

    // State untuk interaksi pesan
    const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
    const [showPickerForMsgId, setShowPickerForMsgId] = useState<string | null>(null);
    const [enlargedImageUrl, setEnlargedImageUrl] = useState<string | null>(null); // State for image modal

    // Handler klik pesan: toggle state aktif
    const handleMessageClick = (messageId: string) => {
        setActiveMessageId(currentId => {
            const isCurrentlyActive = currentId === messageId;
            const nextActiveId = isCurrentlyActive ? null : messageId;
            if (showPickerForMsgId) { setShowPickerForMsgId(null); } // Selalu tutup picker saat pesan diklik
            return nextActiveId;
        });
    };

    // Handler klik tombol React: tampilkan picker terpusat
    const handleReactButtonClick = (e: React.MouseEvent, messageId: string) => {
        e.stopPropagation(); // Hentikan event agar tidak trigger handleMessageClick
        setShowPickerForMsgId(messageId); // Set ID pesan untuk picker
         if (activeMessageId !== messageId) { setActiveMessageId(messageId); } // Aktifkan pesan jika belum aktif
    };

     // Handler untuk menutup picker/actions saat klik di area chat
     const handleChatAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const targetElement = e.target as Element;
        // Hanya tutup jika klik BUKAN pada elemen interaktif pesan
        if (!targetElement.closest('[data-message-interactive="true"]')) {
             if (activeMessageId !== null) { setActiveMessageId(null); }
             if (showPickerForMsgId !== null) { setShowPickerForMsgId(null); }
        }
    };

    // --- (Sisa kode useEffect, useMemo, handleSendMessageSubmit, handleFileChange, render tidak berubah) ---
    const safeMessages = Array.isArray(messages) ? messages : [];
    const sortedMessages = useMemo(() => { return [...safeMessages].sort((a, b) => { const timeA = isNewsArticle(a) ? (a.published_on * 1000) : (isChatMessage(a) ? a.timestamp : 0); const timeB = isNewsArticle(b) ? (b.published_on * 1000) : (isChatMessage(b) ? b.timestamp : 0); if (!timeA && !timeB) return 0; if (!timeA) return 1; if (!timeB) return -1; return timeA - timeB; }); }, [safeMessages]);
    useEffect(() => { if(activeMessageId === null && chatEndRef.current) { chatEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' }); } }, [sortedMessages, activeMessageId]); // Changed behavior to 'auto' for less jarring scroll

    const handleSendMessageSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const currentMessageText = newMessage.trim();
        const currentAttachment = attachment;
        if ((!currentMessageText && !currentAttachment) || !username) { return; }
        const messageData: Partial<ChatMessage> & { type: 'user'; sender: string; timestamp: number } = {
            type: 'user', sender: username, timestamp: Date.now(), reactions: {},
            ...(currentMessageText && { text: currentMessageText }),
            ...(currentAttachment && { fileURL: currentAttachment.dataUrl, fileName: currentAttachment.name }),
        };
        onSendMessage(messageData as ChatMessage);
        setNewMessage(''); setAttachment(null);
        if(fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file && file.type.startsWith('image/')) { const reader = new FileReader(); reader.onloadend = () => { if (reader.result) { setAttachment({ dataUrl: reader.result as string, name: file.name }); } }; reader.readAsDataURL(file); } else { setAttachment(null); } };

    if (!room) { return (<div className="flex flex-col flex-grow items-center justify-center text-gray-500">Pilih room untuk memulai.</div>); }

    const isDefaultRoom = DEFAULT_ROOM_IDS.includes(room.id);
    const isSendDisabled = (!newMessage.trim() && !attachment) || !username;
    const isAdmin = userProfile?.username ? ADMIN_USERNAMES.map(n => n.toLowerCase()).includes(userProfile.username.toLowerCase()) : false;

    return (
        <div className="container mx-auto px-1 sm:px-2 py-2 animate-fade-in flex flex-col flex-grow h-[calc(100vh-56px)]"> {/* Reduced padding */}
             {/* Header Room */}
             <div className="mb-2 flex-shrink-0"> {/* Reduced margin */}
                 <div className="flex items-center justify-between gap-3 mb-2"> <button onClick={onLeaveRoom} className="flex items-center gap-1.5 text-gray-400 hover:text-electric transition-colors"> <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg> <span className="text-xs font-semibold">Semua Room</span> </button> <div className="flex items-center gap-2"> <div className="relative flex h-2 w-2"> <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime opacity-75"></span> <span className="relative inline-flex rounded-full h-2 w-2 bg-lime"></span> </div> <p className="text-xs font-semibold"> <span className="text-white">{room.userCount.toLocaleString('id-ID')}</span> <span className="text-gray-400 ml-1">Online</span> </p> </div> </div> {/* Reduced size/spacing */}
                  <div className="flex items-center"> <div> <h1 className="text-xl md:text-2xl font-black tracking-tight bg-gradient-to-r from-electric to-magenta text-transparent bg-clip-text truncate font-heading">{room.name}</h1> <p className="text-gray-400 text-[11px] mt-0.5">Diskusikan pasar. Berita terbaru muncul otomatis.</p> </div> </div> {/* Reduced size/spacing */}
             </div>

            {/* Main Chat Area Container */}
            <div className="bg-gray-900 border border-white/10 rounded-xl flex flex-col flex-grow overflow-hidden">
                {/* Message List Area */}
                {/* ✨ ADDED onClick={handleChatAreaClick} */}
                <div className="p-1.5 md:p-2 flex-grow overflow-y-auto space-y-0.5 custom-scrollbar" onClick={handleChatAreaClick}> {/* Reduced padding/spacing */}
                     {sortedMessages.length === 0 ? (
                         <div className="flex items-center justify-center h-full text-gray-500 text-sm"><p>Belum ada pesan.</p></div>
                     ) : (
                         sortedMessages.map((item, index) => {
                           const isActive = activeMessageId === item.id;
                           const messageKey = item.id || `fallback-${item.type}-${index}`;
                           const showActions = isActive; // Show actions only if message is active

                           // Render berdasarkan tipe pesan
                           if (isChatMessage(item)) {
                               if (item.type === 'system') {
                                   return room.id === 'pengumuman-aturan'
                                       ? <AnnouncementMessage key={messageKey} message={item} />
                                       : <SystemMessage key={messageKey} message={item} />;
                               }
                               // Pesan User
                               const isOwnMessage = item.sender === username && !!username;
                               const canDelete = isAdmin || (isOwnMessage && item.type === 'user');
                               const senderProfile = isOwnMessage ? userProfile : null;
                               return <UserMessage
                                          key={messageKey}
                                          message={item}
                                          userProfile={senderProfile}
                                          onReact={onReact}
                                          onDeleteClick={() => {
                                              if (window.confirm('Yakin hapus pesan ini?')) {
                                                  onDeleteMessage(room.id, item.id);
                                              }
                                          }}
                                          canDelete={canDelete}
                                          isActive={isActive}
                                          showActions={showActions} // Pass showActions state
                                          onMessageClick={() => handleMessageClick(item.id)}
                                          onReactButtonClick={(e) => handleReactButtonClick(e, item.id)}
                                          onImageClick={setEnlargedImageUrl} // Pass setter function
                                      />;
                           } else if (isNewsArticle(item)) {
                               // Pesan Berita
                               const canDeleteNews = isAdmin;
                               return <NewsMessage
                                          key={messageKey}
                                          article={item}
                                          username={username}
                                          onReact={onReact}
                                          onDeleteClick={() => {
                                              if (window.confirm('Yakin hapus berita ini?')) {
                                                  onDeleteMessage(room.id, item.id);
                                              }
                                          }}
                                          canDelete={canDeleteNews}
                                          isActive={isActive}
                                          showActions={showActions} // Pass showActions state
                                          onMessageClick={() => handleMessageClick(item.id)}
                                          onReactButtonClick={(e) => handleReactButtonClick(e, item.id)}
                                      />;
                           }
                           console.warn("Unknown item type in messages:", item);
                           return null;
                        })
                    )}
                    {/* Element to scroll to */}
                    <div ref={chatEndRef} />
                </div>

                 {/* Input Area */}
                 <div className="p-2 bg-gray-900/80 border-t border-white/10 flex-shrink-0"> {/* Reduced padding */}
                       {isDefaultRoom ? (
                         <div className="text-center text-xs text-gray-500 py-1 flex items-center justify-center gap-1.5"> {/* Reduced padding/gap */}
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg> {/* Smaller icon */}
                             Room ini hanya untuk membaca.
                         </div>
                     ) : (
                         <div className="space-y-1.5"> {/* Reduced spacing */}
                             {attachment && (
                                <div className="relative inline-block">
                                     <img src={attachment.dataUrl} alt="Pratinjau" className="max-h-20 rounded-md" /> {/* Reduced max-height */}
                                     <button onClick={() => { setAttachment(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full h-4.5 w-4.5 flex items-center justify-center text-[10px] font-bold hover:bg-red-700 transition-colors" title="Hapus lampiran"> × </button> {/* Adjusted size/pos */}
                                </div>
                             )}
                             <form onSubmit={handleSendMessageSubmit} className="flex items-center space-x-1.5"> {/* Reduced spacing */}
                                 <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                                 <button type="button" onClick={() => fileInputRef.current?.click()} className="text-gray-400 hover:text-electric p-1.5 rounded-full transition-colors flex-shrink-0" title="Lampirkan gambar"> {/* Reduced padding */}
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg> {/* Smaller icon */}
                                 </button>
                                 <div className="relative flex-1">
                                     <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Ketik pesan..." className="w-full bg-gray-800 border border-gray-700 rounded-full py-2 pl-3.5 pr-10 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-electric transition-all" disabled={!username} /> {/* Smaller text/padding */}
                                 </div>
                                 <button type="submit" className="bg-electric text-white rounded-full p-2 hover:bg-electric/80 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex-shrink-0" disabled={isSendDisabled} title="Kirim"> {/* Reduced padding */}
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg> {/* Smaller icon */}
                                 </button>
                             </form>
                         </div>
                     )}
                 </div>
            </div>
             {/* Render Picker Emoji Terpusat jika showPickerForMsgId tidak null */}
             {showPickerForMsgId && (
                 <ReactionPicker
                    onSelect={(emoji) => {
                        onReact(showPickerForMsgId, emoji); // Gunakan ID pesan yang tersimpan
                        setShowPickerForMsgId(null); // Tutup picker setelah memilih
                    }}
                    onClose={() => setShowPickerForMsgId(null)} // Tutup picker
                 />
             )}
              {/* Image Modal */}
             <ImageModal imageUrl={enlargedImageUrl} onClose={() => setEnlargedImageUrl(null)} />

             {/* Styles */}
             <style>{`
                  /* ✨ ADDED: Z-index classes */
                  .z-10 { z-index: 10; }
                  .z-20 { z-index: 20; }
                  .z-50 { z-index: 50; } /* Untuk picker */
                  .z-\\[60\\] { z-index: 60; } /* Untuk image modal */


                 /* ✨ ADDED: Animation for picker */
                 @keyframes fade-in-fast { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                 .animate-fade-in-fast { animation: fade-in-fast 0.15s ease-out forwards; }

                /* Custom Scrollbar */
                .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; } /* Thinner scrollbar */
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 2px; } /* Slightly more subtle */
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0, 191, 255, 0.4); } /* Adjusted hover */
                /* Firefox scrollbar */
                .custom-scrollbar { scrollbar-width: thin; scrollbar-color: rgba(255, 255, 255, 0.15) transparent; }

                 /* General Animations */
                 @keyframes fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } } /* Adjusted transform */
                 @keyframes fade-in-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } /* Adjusted transform */
                 .animate-fade-in { animation: fade-in 0.4s ease-out forwards; } /* Adjusted duration */
                 .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; } /* Adjusted duration */
                 @keyframes pulse-notification {
                   0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 0, 255, 0.6); } /* Adjusted alpha */
                   50% { transform: scale(1.05); box-shadow: 0 0 0 4px rgba(255, 0, 255, 0); } /* Adjusted size */
                 }
                 .animate-pulse-notification { animation: pulse-notification 1.5s infinite; }
            `}</style>
        </div>
    );
};

export default ForumPage;