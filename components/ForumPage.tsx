// ava19999/v1/v1-bd6bb89086392f465ed88da023587c34863020f2/components/ForumPage.tsx
// (Bagian import dan helper functions tetap sama)
import React, { useState, useEffect, useRef, useMemo } from 'react';
import UserTag, { ADMIN_USERNAMES } from './UserTag';
import type { NewsArticle, ChatMessage, ForumPageProps, ForumMessageItem, User } from '../types';
import { isNewsArticle, isChatMessage } from '../types';

const DEFAULT_ROOM_IDS = ['berita-kripto', 'pengumuman-aturan'];
const formatDate = (unixTimestamp: number): string => new Date(unixTimestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
const EMOJIS = ['👍', '❤️', '🚀', '🔥', '😂', '🤯'];


// Reaction Picker
const ReactionPicker = ({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void; }) => (
    // Positioned absolutely - specific positioning classes added in parent components
    <div className="absolute bg-gray-900/80 backdrop-blur-md border border-white/10 rounded-lg p-1 flex items-center gap-1 z-20 shadow-lg animate-fade-in-fast whitespace-nowrap">
        {EMOJIS.map(emoji => (
            <button key={emoji} onClick={() => { onSelect(emoji); onClose(); }} className="text-xl hover:scale-125 transition-transform p-1 rounded-full hover:bg-white/10"> {emoji} </button>
        ))}
        <button onClick={onClose} className="text-gray-400 hover:text-white ml-1 p-0.5 rounded-full hover:bg-white/10">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /> </svg>
        </button>
    </div>
);

// Reactions (No changes)
const Reactions = ({ message, username, onReact }: { message: NewsArticle | ChatMessage | undefined | null; username: string; onReact: (emoji: string) => void; }) => {
    // ... (kode Reactions tetap sama) ...
    const reactions = message?.reactions || {};
    const hasReactions = Object.keys(reactions).length > 0;
    if (!hasReactions) return null;
    // ... (kode mapping reaksi tetap sama) ...
    return (
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {Object.entries(reactions).map(([emoji, users]) => {
                const userList = users as string[];
                if (!Array.isArray(userList) || userList.length === 0) return null;
                const currentUserReacted = userList.includes(username);
                return (
                    <button key={emoji} onClick={() => onReact(emoji)} className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-all duration-200 ${ currentUserReacted ? 'bg-electric/80 text-white' : 'bg-gray-600/50 hover:bg-gray-600/80 text-gray-300' }`} title={currentUserReacted ? `Anda dan ${userList.length - 1} lainnya` : `${userList.length} orang`} >
                        <span>{emoji}</span>
                        <span>{userList.length}</span>
                    </button>
                );
            })}
        </div>
    );
};

// Delete Button (No changes)
const DeleteButton: React.FC<{ onClick: (e: React.MouseEvent) => void }> = ({ onClick }) => (
     <button onClick={onClick} className="p-1 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors" title="Hapus Pesan">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
    </button>
);
// React Button (No changes)
const ReactButton: React.FC<{ onClick: (e: React.MouseEvent) => void }> = ({ onClick }) => (
    <button onClick={onClick} className="p-1 text-gray-500 hover:text-electric hover:bg-electric/10 rounded-full transition-colors" title="Beri Reaksi">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    </button>
);

// News Message Component
const NewsMessage: React.FC<{ /* ...props... */
    article: NewsArticle; username: string; onReact: (messageId: string, emoji: string) => void; onDeleteClick: () => void; canDelete: boolean; isActive: boolean; showActions: boolean; showPicker: boolean; onMessageClick: () => void; onReactButtonClick: (e: React.MouseEvent) => void; onClosePicker: () => void;
}> = ({ article, username, onReact, onDeleteClick, canDelete, isActive, showActions, showPicker, onMessageClick, onReactButtonClick, onClosePicker }) => {
    return (
        <div className="my-2 animate-fade-in-up relative">
            <div onClick={onMessageClick} className={`relative cursor-pointer rounded-lg p-1 ${isActive ? 'bg-gray-800/30' : 'bg-transparent'} transition-colors duration-150`} >
                <div className="relative w-full sm:w-4/5 md:w-3/5 mx-auto">
                    <div className="text-center text-xs text-gray-500 pt-1"> Pasar · {formatDate(article.published_on * 1000)} </div>

                    {/* Action Buttons Container - Make it relative */}
                    <div className={`absolute top-0 right-1 z-10 transition-opacity duration-200 ${showActions ? 'opacity-100 animate-fade-in-fast' : 'opacity-0 pointer-events-none'} relative`}> {/* Added relative */}
                        <div className="flex items-center bg-gray-900 border border-white/10 rounded-full px-1 shadow-lg"> {/* Inner div for bg */}
                            <ReactButton onClick={onReactButtonClick} />
                            {canDelete && <DeleteButton onClick={(e) => { e.stopPropagation(); onDeleteClick(); }} />}
                        </div>
                        {/* Picker - Positioned absolutely relative to the action buttons container */}
                        {/* Positioned slightly above and to the left */}
                        {showPicker && (
                            <div className="absolute bottom-full right-0 mb-1"> {/* Adjusted position */}
                                <ReactionPicker
                                    onSelect={(emoji) => { onReact(article.id, emoji); onClosePicker(); }}
                                    onClose={onClosePicker}
                                />
                            </div>
                         )}
                     </div>

                    {/* Content */}
                    <div className={`block p-3 bg-gray-800/50 rounded-lg transition-colors mt-6 ${isActive ? 'bg-gray-800/60' : ''}`}>
                         {/* ... (konten berita) ... */}
                         <a href={article.url} target="_blank" rel="noopener noreferrer" onClick={(e)=> e.stopPropagation()}>
                             <div className="flex items-start space-x-3">
                                <img src={article.imageurl} alt={article.title} className="w-20 h-14 object-cover rounded-md flex-shrink-0 bg-gray-700" loading="lazy" />
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-100 text-sm leading-snug hover:underline">{article.title}</h3>
                                    <p className="text-xs text-gray-400 mt-1">Oleh {article.source}</p>
                                </div>
                            </div>
                        </a>
                    </div>
                    {/* Reactions */}
                    <div className="relative mt-1 px-3 pb-1">
                        <Reactions message={article} username={username} onReact={(emoji) => onReact(article.id, emoji)} />
                    </div>
                </div>
            </div>
        </div>
    );
};


// User Message Component
const UserMessage: React.FC<{ /* ...props... */
    message: ChatMessage; userProfile: User | null; onReact: (messageId: string, emoji: string) => void; onDeleteClick: () => void; canDelete: boolean; isActive: boolean; showActions: boolean; showPicker: boolean; onMessageClick: () => void; onReactButtonClick: (e: React.MouseEvent) => void; onClosePicker: () => void;
}> = ({ message, userProfile, onReact, onDeleteClick, canDelete, isActive, showActions, showPicker, onMessageClick, onReactButtonClick, onClosePicker }) => {
    const currentUsername = userProfile?.username || '';
    const isCurrentUser = message.sender === currentUsername && !!currentUsername;
    const creationDate = isCurrentUser ? (userProfile?.createdAt ?? null) : null;

    return (
        <div className={`my-1 py-1 flex relative ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
            {/* Inner container for flex ordering */}
            <div className={`flex items-start gap-2 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>

                 {/* Action Buttons & Picker Container - Add 'relative' */}
                 <div className={`relative flex-shrink-0 self-start mt-1 z-10 transition-opacity duration-200 ${showActions ? 'opacity-100 animate-fade-in-fast' : 'opacity-0 pointer-events-none'}`}>
                     {/* Inner div for background and actual buttons */}
                     <div className="flex items-center bg-gray-900 border border-white/10 rounded-full px-1 shadow-lg">
                        <ReactButton onClick={onReactButtonClick} />
                        {canDelete && <DeleteButton onClick={(e) => { e.stopPropagation(); onDeleteClick(); }} />}
                     </div>

                    {/* Picker - Positioned absolutely relative to the outer container */}
                    {/* Position: top-0, beside the buttons using left/right full */}
                    {showPicker && (
                         <div className={`absolute top-0 ${isCurrentUser ? 'right-full mr-1' : 'left-full ml-1'}`}> {/* Precise side positioning */}
                            <ReactionPicker
                                onSelect={(emoji) => { onReact(message.id, emoji); onClosePicker(); }}
                                onClose={onClosePicker}
                            />
                        </div>
                     )}
                 </div>

                {/* Message Content Container */}
                <div className={`max-w-xs sm:max-w-sm md:max-w-md ${isCurrentUser ? 'ml-auto' : ''}`} onClick={onMessageClick}>
                    <div className="flex-1 overflow-hidden">
                        {/* Sender Info */}
                        <div className={`flex items-center gap-2 flex-wrap ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                            <span className={`font-bold text-sm break-all font-heading ${isCurrentUser ? 'text-electric' : 'text-magenta'}`}>{message.sender}</span>
                            <UserTag sender={message.sender} userCreationDate={creationDate} />
                        </div>
                        {/* Message Bubble */}
                        <div className={`relative text-sm text-gray-200 break-words mt-1 px-3 pt-2.5 pb-5 rounded-xl cursor-pointer ${isActive ? (isCurrentUser ? 'bg-electric/15' : 'bg-magenta/5') : (isCurrentUser ? 'bg-gradient-to-br from-electric/20 to-gray-900/10' : 'bg-gradient-to-bl from-magenta/10 to-gray-900/10')} transition-colors`}>
                             {message.fileURL && <img src={message.fileURL} alt={message.fileName || 'Gambar'} className="rounded-lg max-h-48 mt-1 mb-2" />} {message.text} <span className="text-xs text-gray-500 absolute bottom-1 right-2.5">{formatDate(message.timestamp)}</span>
                         </div>
                        {/* Reactions below the bubble */}
                        <div className="relative mt-1">
                            <Reactions message={message} username={currentUsername} onReact={(emoji) => onReact(message.id, emoji)} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- SystemMessage & AnnouncementMessage (No changes needed) ---
const SystemMessage: React.FC<{ message: ChatMessage; }> = ({ message }) => ( /* ... code ... */ <div className="text-center text-xs text-gray-500 py-2 italic animate-fade-in-up"> {message.text} </div> );
const AnnouncementMessage: React.FC<{ message: ChatMessage; }> = ({ message }) => { /* ... code ... */ return ( <div className={`bg-gray-800/50 border-l-4 ${borderColor} rounded-r-lg p-4 my-3 animate-fade-in-up`}> <div className="flex items-start gap-4"> <div className={`flex-shrink-0 ${titleColor}`}>{icon}</div> <div className="flex-1"> {title && <h3 className={`text-lg font-bold ${titleColor} mb-1`}>{title}</h3>} <p className="text-gray-300 leading-relaxed text-sm">{content}</p> </div> </div> </div> ); };

// --- ForumPage Component (Main Logic) ---
const ForumPage: React.FC<ForumPageProps> = ({
    // ... (props tetap sama) ...
    room, messages = [], userProfile, onSendMessage, onLeaveRoom, onReact, onDeleteMessage
}) => {
    // ... (state dan handlers lainnya tetap sama) ...
    const [newMessage, setNewMessage] = useState('');
    const [attachment, setAttachment] = useState<{dataUrl: string; name: string} | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const username = userProfile?.username ?? '';
    const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
    const [showActions, setShowActions] = useState(false);
    const [showPickerForMsgId, setShowPickerForMsgId] = useState<string | null>(null);

    const handleMessageClick = (messageId: string) => { setActiveMessageId(currentId => { if (currentId === messageId) { const newShowActions = !showActions; setShowActions(newShowActions); setShowPickerForMsgId(null); return newShowActions ? currentId : null; } else { setShowActions(true); setShowPickerForMsgId(null); return messageId; } }); };
    const handleReactButtonClick = (e: React.MouseEvent, messageId: string) => { e.stopPropagation(); setShowPickerForMsgId(currentPickerId => currentPickerId === messageId ? null : messageId ); if (activeMessageId === messageId && !showActions) { setShowActions(true); } else if (activeMessageId !== messageId) { setActiveMessageId(messageId); setShowActions(true); } };
    const handleChatAreaClick = (e: React.MouseEvent<HTMLDivElement>) => { if (e.target === e.currentTarget && (showActions || activeMessageId || showPickerForMsgId)) { setShowActions(false); setActiveMessageId(null); setShowPickerForMsgId(null); } };
    const safeMessages = Array.isArray(messages) ? messages : [];
    const sortedMessages = useMemo(() => { return [...safeMessages].sort((a, b) => { const timeA = isNewsArticle(a) ? (a.published_on * 1000) : (isChatMessage(a) ? a.timestamp : 0); const timeB = isNewsArticle(b) ? (b.published_on * 1000) : (isChatMessage(b) ? b.timestamp : 0); if (!timeA && !timeB) return 0; if (!timeA) return 1; if (!timeB) return -1; return timeA - timeB; }); }, [safeMessages]);
    useEffect(() => { if(activeMessageId === null && chatEndRef.current) { chatEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' }); } }, [sortedMessages, activeMessageId]);
    const handleSendMessageSubmit = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); const currentMessageText = newMessage.trim(); const currentAttachment = attachment; if ((!currentMessageText && !currentAttachment) || !username) { return; } const messageData: Partial<ChatMessage> & { type: 'user'; sender: string; timestamp: number } = { type: 'user', sender: username, timestamp: Date.now(), reactions: {}, ...(currentMessageText && { text: currentMessageText }), ...(currentAttachment && { fileURL: currentAttachment.dataUrl, fileName: currentAttachment.name }), }; onSendMessage(messageData as ChatMessage); setNewMessage(''); setAttachment(null); if(fileInputRef.current) fileInputRef.current.value = ""; };
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file && file.type.startsWith('image/')) { const reader = new FileReader(); reader.onloadend = () => { if (reader.result) { setAttachment({ dataUrl: reader.result as string, name: file.name }); } }; reader.readAsDataURL(file); } else { setAttachment(null); } };

    if (!room) { return (<div className="flex flex-col flex-grow items-center justify-center text-gray-500">Pilih room untuk memulai.</div>); }

    const isDefaultRoom = DEFAULT_ROOM_IDS.includes(room.id);
    const isSendDisabled = (!newMessage.trim() && !attachment) || !username;
    const isAdmin = userProfile?.username ? ADMIN_USERNAMES.map(n => n.toLowerCase()).includes(userProfile.username.toLowerCase()) : false;


    return (
        <div className="container mx-auto px-2 sm:px-4 py-3 animate-fade-in flex flex-col flex-grow h-[calc(100vh-56px)]">
             {/* Header Room */}
             <div className="mb-3 flex-shrink-0">
                 {/* ... (Room header content remains the same) ... */}
                 <div className="flex items-center justify-between gap-4 mb-3"> <button onClick={onLeaveRoom} className="flex items-center gap-2 text-gray-400 hover:text-electric transition-colors"> <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg> <span className="text-sm font-semibold">Semua Room</span> </button> <div className="flex items-center gap-2.5"> <div className="relative flex h-2.5 w-2.5"> <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime opacity-75"></span> <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-lime"></span> </div> <p className="text-sm font-semibold"> <span className="text-white">{room.userCount.toLocaleString('id-ID')}</span> <span className="text-gray-400 ml-1.5">Online</span> </p> </div> </div>
                  <div className="flex items-center"> <div> <h1 className="text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-electric to-magenta text-transparent bg-clip-text truncate font-heading">{room.name}</h1> <p className="text-gray-400 text-xs mt-1">Diskusikan pasar. Berita terbaru muncul otomatis.</p> </div> </div>
             </div>

            {/* Main Chat Area Container */}
            <div className="bg-gray-900 border border-white/10 rounded-xl flex flex-col flex-grow overflow-hidden">
                {/* Message List Area */}
                <div className="p-2 md:p-4 flex-grow overflow-y-auto space-y-1 custom-scrollbar" onClick={handleChatAreaClick}>
                     {sortedMessages.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-500"><p>Belum ada pesan.</p></div>
                     ) : (
                         sortedMessages.map((item, index) => {
                            {/* ... (render logic remains the same) ... */}
                             const isActive = activeMessageId === item.id;
                            const showPicker = showPickerForMsgId === item.id;
                            const messageKey = item.id || `fallback-${item.type}-${index}`;

                            if (isChatMessage(item)) {
                                if (item.type === 'system') {
                                    return room.id === 'pengumuman-aturan'
                                        ? <AnnouncementMessage key={messageKey} message={item} />
                                        : <SystemMessage key={messageKey} message={item} />;
                                }
                                const isOwnMessage = item.sender === username && !!username;
                                const canDelete = isAdmin || (isOwnMessage && item.type === 'user');
                                const senderProfile = isOwnMessage ? userProfile : null;
                                return <UserMessage
                                            key={messageKey}
                                            message={item}
                                            userProfile={senderProfile}
                                            onReact={onReact}
                                            onDeleteClick={() => {if (window.confirm('Yakin hapus pesan ini?')) {onDeleteMessage(room.id, item.id);}}}
                                            canDelete={canDelete}
                                            isActive={isActive}
                                            showActions={showActions && isActive}
                                            showPicker={showPicker}
                                            onMessageClick={() => handleMessageClick(item.id)}
                                            onReactButtonClick={(e) => handleReactButtonClick(e, item.id)}
                                            onClosePicker={() => setShowPickerForMsgId(null)}
                                        />;
                            } else if (isNewsArticle(item)) {
                                const canDeleteNews = isAdmin;
                                return <NewsMessage
                                            key={messageKey}
                                            article={item}
                                            username={username}
                                            onReact={onReact}
                                            onDeleteClick={() => {if (window.confirm('Yakin hapus berita ini?')) {onDeleteMessage(room.id, item.id);}}}
                                            canDelete={canDeleteNews}
                                            isActive={isActive}
                                            showActions={showActions && isActive}
                                            showPicker={showPicker}
                                            onMessageClick={() => handleMessageClick(item.id)}
                                            onReactButtonClick={(e) => handleReactButtonClick(e, item.id)}
                                            onClosePicker={() => setShowPickerForMsgId(null)}
                                        />;
                            }
                            console.warn("Unknown item type in messages:", item);
                            return null;
                        })
                    )}
                    <div ref={chatEndRef} />
                </div>

                 {/* Input Area */}
                 <div className="p-3 bg-gray-900/80 border-t border-white/10 flex-shrink-0">
                     {/* ... (Input area code remains the same) ... */}
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
                                     <button onClick={() => { setAttachment(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold hover:bg-red-700 transition-colors" title="Hapus lampiran"> × </button>
                                </div>
                             )}
                             <form onSubmit={handleSendMessageSubmit} className="flex items-center space-x-2">
                                 <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                                 <button type="button" onClick={() => fileInputRef.current?.click()} className="text-gray-400 hover:text-electric p-2 rounded-full transition-colors flex-shrink-0" title="Lampirkan gambar">
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                 </button>
                                 <div className="relative flex-1">
                                     <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Ketik pesan Anda..." className="w-full bg-gray-800 border border-gray-700 rounded-full py-2.5 pl-4 pr-12 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-electric transition-all" disabled={!username} />
                                 </div>
                                 <button type="submit" className="bg-electric text-white rounded-full p-2.5 hover:bg-electric/80 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex-shrink-0" disabled={isSendDisabled} title="Kirim">
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                                 </button>
                             </form>
                         </div>
                     )}
                 </div>
            </div>
             {/* Styles */}
             <style>{`
                /* ... (Styles lainnya tetap sama) ... */
                .opacity-0 { opacity: 0; pointer-events: none; }
                .opacity-100 { opacity: 1; pointer-events: auto; }
                .z-10 { z-index: 10; }
                .z-20 { z-index: 20; }
                @keyframes fade-in-fast { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                .animate-fade-in-fast { animation: fade-in-fast 0.15s ease-out forwards; }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 3px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0, 191, 255, 0.5); }
                .custom-scrollbar { scrollbar-width: thin; scrollbar-color: rgba(255, 255, 255, 0.2) transparent; }
                 @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                 @keyframes fade-in-up { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
                 .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
                 .animate-fade-in-up { animation: fade-in-up 0.4s ease-out forwards; }
                 @keyframes pulse-notification {
                   0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 0, 255, 0.7); }
                   50% { transform: scale(1.05); box-shadow: 0 0 0 5px rgba(255, 0, 255, 0); }
                 }
                 .animate-pulse-notification { animation: pulse-notification 1.5s infinite; }
                 @keyframes drift { 0% { transform: translateY(100vh) scale(0); opacity: 0; } 10% { opacity: 0.5; } 90% { opacity: 0.5; } 100% { transform: translateY(-100vh) scale(1.2); opacity: 0; } }

            `}</style>
        </div>
    );
};

export default ForumPage;