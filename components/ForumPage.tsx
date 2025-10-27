// ava19999/v1/v1-e9d21554693c716e0e65bad33afe7587274395eb/components/ForumPage.tsx
import React, { useState, useEffect, useRef, useMemo, ReactElement, JSXElementConstructor, ReactNode, ReactPortal } from 'react';
import UserTag, { ADMIN_USERNAMES } from './UserTag'; // Import ADMIN_USERNAMES
import type { NewsArticle, ChatMessage, ForumPageProps, ForumMessageItem, User } from '../types';
import { isNewsArticle, isChatMessage } from '../types';

const formatDate = (unixTimestamp: number): string => new Date(unixTimestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
const EMOJIS = ['👍', '❤️', '🚀', '🔥', '😂', '🤯'];

// --- Sub-components ---

const ReactionPicker = ({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void; }) => ( /* ... (kode tetap sama) ... */ );
const Reactions = ({ message, username, onReact, onAddReactionClick, }: { /* ... */ }) => { /* ... (kode tetap sama) ... */ };
// ReactionPicker component
const ReactionPicker = ({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void; }) => ( <div className="absolute right-full top-0 mr-2 bg-gray-900/80 backdrop-blur-md border border-white/10 rounded-lg p-1 flex items-center gap-1 z-20 shadow-lg animate-fade-in-fast"> {EMOJIS.map(emoji => ( <button key={emoji} onClick={() => { onSelect(emoji); onClose(); }} className="text-xl hover:scale-125 transition-transform p-1 rounded-full hover:bg-white/10"> {emoji} </button> ))} </div> );
// Reactions component (Hapus tombol Add dari sini)
const Reactions = ({ message, username, onReact }: { message: NewsArticle | ChatMessage | undefined | null; username: string; onReact: (emoji: string) => void; }) => { const reactions = message?.reactions || {}; const hasReactions = Object.keys(reactions).length > 0; if (!hasReactions) return null; return ( <div className="flex items-center gap-1.5 mt-1.5 flex-wrap"> {Object.entries(reactions).map(([emoji, users]) => { const userList = users as string[]; if (!Array.isArray(userList) || userList.length === 0) return null; return ( <button key={emoji} onClick={() => onReact(emoji)} className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-all duration-200 ${userList.includes(username) ? 'bg-electric/80 text-white' : 'bg-gray-600/50 hover:bg-gray-600/80 text-gray-300'}`}> <span>{emoji}</span> <span>{userList.length}</span> </button> ); })} </div> ); };
// Tombol Hapus Baru
const DeleteButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <button
        onClick={onClick}
        className="absolute top-0 right-0 p-1 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors animate-fade-in-fast"
        title="Hapus Pesan"
    >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
    </button>
);

// Tombol React Baru (Emoji biasa)
const ReactButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
     <button
        onClick={onClick}
        className="absolute top-0 right-6 p-1 text-gray-500 hover:text-electric hover:bg-electric/10 rounded-full transition-colors animate-fade-in-fast"
        title="Beri Reaksi"
    >
         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
         </svg>
    </button>
);


// NewsMessage component
const NewsMessage: React.FC<{
    article: NewsArticle;
    username: string;
    onReact: (messageId: string, emoji: string) => void;
    onDeleteClick: () => void; // Prop untuk hapus
    canDelete: boolean; // Prop penanda bisa hapus
    isActive: boolean; // Prop penanda actions aktif
    onMessageClick: () => void; // Prop untuk trigger timer
}> = ({ article, username, onReact, onDeleteClick, canDelete, isActive, onMessageClick }) => {
    const [showPicker, setShowPicker] = useState(false);

    // Tutup picker jika isActive berubah menjadi false
    useEffect(() => {
        if (!isActive) {
            setShowPicker(false);
        }
    }, [isActive]);

    return (
        <div className="my-2 animate-fade-in-up relative group/message"> {/* Tambah group/message */}
             {/* Tombol aksi muncul saat isActive */}
             {isActive && (
                <>
                    <ReactButton onClick={() => setShowPicker(prev => !prev)} />
                    {canDelete && <DeleteButton onClick={onDeleteClick} />}
                    {showPicker && <ReactionPicker onSelect={(emoji) => onReact(article.id, emoji)} onClose={() => setShowPicker(false)} />}
                </>
             )}
            <div onClick={onMessageClick} className="cursor-pointer"> {/* Bungkus konten dengan div onClick */}
                <div className="text-center text-xs text-gray-500 py-1"> Pasar · {formatDate(article.published_on * 1000)} </div>
                <div className="w-full sm:w-4/5 md:w-3/5 mx-auto">
                    <a href={article.url} target="_blank" rel="noopener noreferrer" className="block p-3 bg-gray-800/50 group-hover/message:bg-gray-800/70 rounded-lg transition-colors duration-200"> {/* Efek hover */}
                        <div className="flex items-start space-x-3"> <img src={article.imageurl} alt={article.title} className="w-20 h-14 object-cover rounded-md flex-shrink-0 bg-gray-700" loading="lazy" /> <div className="flex-1"> <h3 className="font-semibold text-gray-100 text-sm leading-snug">{article.title}</h3> <p className="text-xs text-gray-400 mt-1">Oleh {article.source}</p> </div> </div>
                    </a>
                    {/* Reactions dipindah ke bawah konten utama */}
                    <div className="relative mt-1">
                        <Reactions message={article} username={username} onReact={(emoji) => onReact(article.id, emoji)} />
                    </div>
                </div>
            </div>
        </div>
    );
};

// UserMessage component
const UserMessage: React.FC<{
    message: ChatMessage;
    userProfile: User | null;
    onReact: (messageId: string, emoji: string) => void;
    onDeleteClick: () => void; // Prop untuk hapus
    canDelete: boolean; // Prop penanda bisa hapus
    isActive: boolean; // Prop penanda actions aktif
    onMessageClick: () => void; // Prop untuk trigger timer
}> = ({ message, userProfile, onReact, onDeleteClick, canDelete, isActive, onMessageClick }) => {
    const [showPicker, setShowPicker] = useState(false);
     // Tutup picker jika isActive berubah menjadi false
     useEffect(() => {
        if (!isActive) {
            setShowPicker(false);
        }
    }, [isActive]);

    const currentUsername = userProfile?.username || '';
    const isCurrentUser = message.sender === currentUsername && !!currentUsername;
    const creationDate = isCurrentUser ? (userProfile?.createdAt ?? null) : null;

    return (
        <div className={`my-1 animate-fade-in-up py-1 flex group/message relative ${isCurrentUser ? 'justify-end' : 'justify-start'}`}> {/* Tambah group/message & relative */}
             {/* Tombol aksi muncul saat isActive */}
             {isActive && (
                <>
                    {/* Posisikan tombol reaksi/hapus */}
                    <div className={`absolute top-1 z-10 ${isCurrentUser ? 'left-0' : 'right-0'} flex gap-1`}>
                         <ReactButton onClick={() => setShowPicker(prev => !prev)} />
                         {canDelete && <DeleteButton onClick={onDeleteClick} />}
                    </div>
                     {/* Posisikan Picker Reaksi */}
                     {showPicker && (
                         <div className={`absolute top-8 z-10 ${isCurrentUser ? 'left-0' : 'right-0'}`}>
                              <ReactionPicker onSelect={(emoji) => onReact(message.id, emoji)} onClose={() => setShowPicker(false)} />
                         </div>
                     )}
                </>
             )}
            <div className={`max-w-md ${isCurrentUser ? 'ml-auto' : ''}`} onClick={onMessageClick} > {/* Tambah onClick di sini */}
                <div className={`flex items-start gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                    <div className="flex-1 overflow-hidden">
                        <div className={`flex items-center gap-2 flex-wrap ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                            <span className={`font-bold text-sm break-all font-heading ${isCurrentUser ? 'text-electric' : 'text-magenta'}`}>{message.sender}</span>
                            <UserTag sender={message.sender} userCreationDate={creationDate} />
                        </div>
                        <div className={`relative text-sm text-gray-200 break-words mt-1 px-3 pt-2.5 pb-5 rounded-xl cursor-pointer group-hover/message:bg-opacity-70 transition-colors ${isCurrentUser ? 'bg-gradient-to-br from-electric/20 to-gray-900/10' : 'bg-gradient-to-bl from-magenta/10 to-gray-900/10'}`}> {/* Tambah cursor & hover effect */}
                            {message.fileURL && <img src={message.fileURL} alt={message.fileName || 'Gambar'} className="rounded-lg max-h-48 mt-1 mb-2" />}
                            {message.text}
                            <span className="text-xs text-gray-500 absolute bottom-1 right-2.5">{formatDate(message.timestamp)}</span>
                        </div>
                        {/* Reactions dipindah ke bawah konten utama */}
                        <div className="relative mt-1">
                            <Reactions message={message} username={currentUsername} onReact={(emoji) => onReact(message.id, emoji)} />
                        </div>
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
    room, messages = [], userProfile, onSendMessage, onLeaveRoom, onReact, onDeleteMessage // Terima prop onDeleteMessage
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
         console.log(`[ForumPage] Clicked message: ${messageId}`);
         if (actionTimerRef.current) {
             clearTimeout(actionTimerRef.current); // Hapus timer lama
             actionTimerRef.current = null;
             console.log("[ForumPage] Cleared existing action timer");
         }
         setShowActions(false); // Sembunyikan actions lama

         // Jika mengklik pesan yang sudah aktif, jangan set timer lagi (efek toggle sederhana)
         if (messageId === activeMessageId) {
              console.log("[ForumPage] Clicked active message, toggling off.");
              setActiveMessageId(null); // Nonaktifkan pesan
              // setShowActions tetap false
              return;
         }


         setActiveMessageId(messageId); // Set pesan aktif baru
         console.log(`[ForumPage] Set active message: ${messageId}`);

         // Set timer untuk menampilkan actions
         actionTimerRef.current = setTimeout(() => {
             console.log(`[ForumPage] Timer fired for message: ${messageId}`);
             setShowActions(true); // Tampilkan actions setelah delay
             actionTimerRef.current = null; // Reset ref timer setelah selesai
         }, 700); // Delay 700ms
         console.log(`[ForumPage] Action timer set for message: ${messageId}`);
    };

    // Efek untuk membersihkan timer saat unmount
    useEffect(() => {
        return () => {
            if (actionTimerRef.current) {
                clearTimeout(actionTimerRef.current);
                console.log("[ForumPage] Cleaned up action timer on unmount.");
            }
        };
    }, []);

    // Memastikan username ada (penting untuk isCurrentUser dan disabled state)
    useEffect(() => { console.log("[ForumPage] Username:", username); }, [username]);

    const safeMessages = Array.isArray(messages) ? messages : [];
    const sortedMessages = useMemo(() => { /* Sorting messages */ return [...safeMessages].sort((a, b) => { const timeA = isNewsArticle(a) ? a.published_on * 1000 : (isChatMessage(a) ? a.timestamp : 0); const timeB = isNewsArticle(b) ? b.published_on * 1000 : (isChatMessage(b) ? b.timestamp : 0); if (timeA === 0 && timeB !== 0) return 1; if (timeA !== 0 && timeB === 0) return -1; return timeA - timeB; }); }, [safeMessages]);
    useEffect(() => { /* Scroll to bottom */ if(activeMessageId === null) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [sortedMessages, activeMessageId]); // Jangan scroll jika action aktif

    const handleSendMessage = (e: React.FormEvent<HTMLFormElement>) => { /* Kirim pesan */ e.preventDefault(); const currentMessageText = newMessage.trim(); const currentAttachment = attachment; if ((!currentMessageText && !currentAttachment) || !username) { console.warn("[ForumPage] Send conditions not met."); return; } const userMessage: Partial<ChatMessage> & { sender: string; timestamp: number; type: 'user' } = { id: `local-${Date.now()}-${Math.random()}`, type: 'user', sender: username, timestamp: Date.now(), reactions: {} }; if (currentMessageText) { userMessage.text = currentMessageText; } if (currentAttachment) { userMessage.fileURL = currentAttachment.dataUrl; userMessage.fileName = currentAttachment.name; } if (userMessage.text || userMessage.fileURL) { console.log("[ForumPage] Calling onSendMessage:", userMessage); onSendMessage(userMessage as ChatMessage); } else { console.warn("[ForumPage] Empty message object."); return; } setNewMessage(''); setAttachment(null); if(fileInputRef.current) fileInputRef.current.value = ""; console.log("[ForumPage] State reset."); };
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { /* Pilih file */ const file = e.target.files?.[0]; if (file && file.type.startsWith('image/')) { const reader = new FileReader(); reader.onloadend = () => { if (reader.result) { setAttachment({ dataUrl: reader.result as string, name: file.name }); } }; reader.readAsDataURL(file); } else { setAttachment(null); } };

    if (!room) { /* Handle jika room null */ return ( <div className="container mx-auto flex flex-col flex-grow items-center justify-center text-center"> <h2 className="text-xl font-bold text-gray-300">Room tidak ditemukan</h2> <p className="text-gray-500 mt-2">Pilih room untuk bergabung.</p> <button onClick={onLeaveRoom} className="mt-4 bg-electric hover:bg-electric/80 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-300"> Kembali </button> </div> ) }

    const isDefaultRoom = ['berita-kripto', 'pengumuman-aturan'].includes(room.id);
    const isSendDisabled = (!newMessage.trim() && !attachment) || !username;

     // Cek apakah user saat ini adalah admin
     const isAdmin = userProfile?.username ? ADMIN_USERNAMES.map(n => n.toLowerCase()).includes(userProfile.username.toLowerCase()) : false;


    return (
        <div className="container mx-auto px-2 sm:px-4 py-3 animate-fade-in flex flex-col flex-grow h-[calc(100vh-56px)]">
             {/* Header Room */}
            <div className="mb-3 flex-shrink-0"> {/* ... header ... */} </div>

            {/* Kontainer Chat */}
            <div className="bg-gray-900 border border-white/10 rounded-xl flex flex-col flex-grow overflow-hidden">
                {/* Area Pesan */}
                <div className="p-2 md:p-4 flex-grow overflow-y-auto space-y-1 custom-scrollbar">
                     {sortedMessages.length === 0 ? ( <div className="flex items-center justify-center h-full text-gray-500"><p>Belum ada pesan.</p></div> )
                     : ( sortedMessages.map((item, index) => {
                           // Tentukan apakah actions harus aktif untuk item ini
                           const isActive = activeMessageId === item.id && showActions;

                           if (isChatMessage(item)) {
                               if (item.type === 'system') { if (room.id === 'pengumuman-aturan') { return <AnnouncementMessage key={item.id || `sys-${index}`} message={item} />; } return <SystemMessage key={item.id || `sys-${index}`} message={item} />; }

                               // Tentukan apakah bisa dihapus
                               const isOwnMessage = item.sender === username && !!username;
                               const canDelete = isAdmin || (isOwnMessage && item.type === 'user'); // Admin bisa hapus semua, user hanya pesan 'user' miliknya

                               const senderProfile = isOwnMessage ? userProfile : null; // Hanya pass profile jika itu user saat ini

                               return <UserMessage
                                          key={item.id || `user-${index}`}
                                          message={item}
                                          userProfile={senderProfile} // Pass profile yang relevan
                                          onReact={onReact}
                                          onDeleteClick={() => onDeleteMessage(room.id, item.id)} // Pass handler hapus
                                          canDelete={canDelete} // Pass flag bisa hapus
                                          isActive={isActive} // Pass status aktif
                                          onMessageClick={() => handleMessageClick(item.id)} // Pass handler klik
                                       />;
                           } else if (isNewsArticle(item)) {
                               // Admin bisa hapus berita juga
                               const canDeleteNews = isAdmin;
                               return <NewsMessage
                                          key={item.id || `news-${index}`}
                                          article={item}
                                          username={username}
                                          onReact={onReact}
                                          onDeleteClick={() => onDeleteMessage(room.id, item.id)} // Pass handler hapus
                                          canDelete={canDeleteNews} // Pass flag bisa hapus
                                          isActive={isActive} // Pass status aktif
                                          onMessageClick={() => handleMessageClick(item.id)} // Pass handler klik
                                      />;
                           }
                           return null;
                        })
                    )}
                    <div ref={chatEndRef} />
                </div>

                 {/* Input Area */}
                 <div className="p-3 bg-gray-900/80 border-t border-white/10 flex-shrink-0">
                    {isDefaultRoom ? ( <div className="text-center text-sm text-gray-500 py-2 flex items-center justify-center gap-2"> {/* ... Read only message ... */} </div> )
                    : ( <div className="space-y-2"> {attachment && ( <div className="relative inline-block"> {/* ... Attachment preview ... */} </div> )}
                        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                            {/* ... Attachment Button ... */}
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                             <button type="button" onClick={() => fileInputRef.current?.click()} className="text-gray-400 hover:text-electric p-2 rounded-full transition-colors flex-shrink-0"> <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg> </button>
                            {/* Input Teks */}
                            <div className="relative flex-1"> <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Ketik pesan Anda..." className="w-full bg-gray-800 border border-gray-700 rounded-full py-2.5 pl-4 pr-12 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-electric transition-all" disabled={!username} /> </div>
                            {/* Tombol Submit */}
                            <button type="submit" className="bg-electric text-white rounded-full p-2.5 hover:bg-electric/80 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex-shrink-0" disabled={isSendDisabled} > <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg> </button>
                        </form>
                    </div> )}
                </div>
            </div>
             {/* Style */}
             <style>{`
                /* ... Tambahkan animasi fade-in-fast jika belum ada ... */
                @keyframes fade-in-fast { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in-fast { animation: fade-in-fast 0.2s ease-out forwards; }
                /* ... (styles lainnya tetap sama) ... */
            `}</style>
        </div>
    );
};

export default ForumPage;