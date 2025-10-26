import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef, useMemo } from 'react';
import UserTag from './UserTag';
// --- Helper Functions & Type Guards ---
const isNewsArticle = (item) => 'source' in item;
const isChatMessage = (item) => 'sender' in item;
const formatDate = (unixTimestamp) => new Date(unixTimestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
const EMOJIS = ['👍', '❤️', '🚀', '🔥', '😂', '🤯'];
// --- Sub-components ---
const Reactions = ({ message, username, onReact }) => {
    const reactions = message.reactions || {};
    if (Object.keys(reactions).length === 0)
        return null;
    return (_jsx("div", { className: "flex items-center gap-1.5 mt-1.5 flex-wrap", children: Object.entries(reactions).map(([emoji, users]) => {
            const userList = users;
            if (userList.length === 0)
                return null;
            return (_jsxs("button", { onClick: () => onReact(emoji), className: `flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-all duration-200 ${userList.includes(username) ? 'bg-electric/80 text-white' : 'bg-gray-600/50 hover:bg-gray-600/80 text-gray-300'}`, children: [_jsx("span", { children: emoji }), _jsx("span", { children: userList.length })] }, emoji));
        }) }));
};
const MessageContainer = ({ children, className }) => (_jsx("div", { className: `relative group ${className}`, children: children }));
const ReactionPicker = ({ onSelect }) => (_jsx("div", { className: "absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gray-900/80 backdrop-blur-md border border-white/10 rounded-full p-1 flex items-center gap-1 z-10", children: EMOJIS.map(emoji => (_jsx("button", { onClick: () => onSelect(emoji), className: "text-xl hover:scale-125 transition-transform p-1 rounded-full hover:bg-white/10", children: emoji }, emoji))) }));
const NewsMessage = ({ article, username, onReact }) => (_jsxs(MessageContainer, { className: "my-2 animate-fade-in-up", children: [_jsxs("div", { className: "text-center text-xs text-gray-500 py-1", children: ["Pembaruan Pasar · ", formatDate(article.published_on * 1000)] }), _jsxs("div", { className: "relative w-full sm:w-4/5 md:w-3/5 mx-auto", children: [_jsx("a", { href: article.url, target: "_blank", rel: "noopener noreferrer", className: "block p-3 bg-gray-800/50 hover:bg-gray-800/80 rounded-lg transition-colors duration-200", children: _jsxs("div", { className: "flex items-start space-x-3", children: [_jsx("img", { src: article.imageurl, alt: article.title, className: "w-20 h-14 object-cover rounded-md flex-shrink-0 bg-gray-700", loading: "lazy" }), _jsxs("div", { className: "flex-1", children: [_jsx("h3", { className: "font-semibold text-gray-100 text-sm leading-snug", children: article.title }), _jsxs("p", { className: "text-xs text-gray-400 mt-1", children: ["Oleh ", article.source] })] })] }) }), _jsx(Reactions, { message: article, username: username, onReact: (emoji) => onReact(article.id, emoji) }), _jsx(ReactionPicker, { onSelect: (emoji) => onReact(article.id, emoji) })] })] }));
const UserMessage = ({ message, userProfile, onReact }) => {
    const currentUsername = userProfile?.username || '';
    const isCurrentUser = message.sender === currentUsername;
    return (_jsx(MessageContainer, { className: `my-1 animate-fade-in-up py-1 flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`, children: _jsxs("div", { className: "max-w-md", children: [_jsx("div", { className: `flex items-start gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`, children: _jsxs("div", { className: "flex-1 overflow-hidden", children: [_jsxs("div", { className: `flex items-center gap-2 flex-wrap ${isCurrentUser ? 'flex-row-reverse' : ''}`, children: [_jsx("span", { className: `font-bold text-sm break-all font-heading ${isCurrentUser ? 'text-electric' : 'text-magenta'}`, children: message.sender }), _jsx(UserTag, { sender: message.sender, userCreationDate: userProfile?.createdAt ?? null })] }), _jsxs("div", { className: `relative text-sm text-gray-200 break-words mt-1 px-3 pt-2.5 pb-5 rounded-xl ${isCurrentUser ? 'bg-gradient-to-br from-electric/20 to-gray-900/10' : 'bg-gradient-to-bl from-magenta/10 to-gray-900/10'}`, children: [message.fileURL && _jsx("img", { src: message.fileURL, alt: message.fileName || 'Gambar', className: "rounded-lg max-h-48 mt-1 mb-2" }), message.text, _jsx("span", { className: "text-xs text-gray-500 absolute bottom-1 right-2.5", children: formatDate(message.timestamp) })] }), _jsx(Reactions, { message: message, username: currentUsername, onReact: (emoji) => onReact(message.id, emoji) })] }) }), !isCurrentUser && (_jsx("div", { className: "relative h-full", children: _jsx(ReactionPicker, { onSelect: (emoji) => onReact(message.id, emoji) }) }))] }) }));
};
const SystemMessage = ({ message }) => (_jsx("div", { className: "text-center text-xs text-gray-500 py-2 italic animate-fade-in-up", children: message.text }));
const AnnouncementMessage = ({ message }) => {
    const text = message.text || '';
    const parts = text.split(':');
    const title = parts.length > 1 ? parts[0] : '';
    const content = parts.length > 1 ? parts.slice(1).join(':').trim() : text;
    let icon;
    let titleColor = 'text-electric';
    let borderColor = 'border-electric/50';
    if (title.includes('Aturan')) {
        icon = _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-6 w-6", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" }) });
        titleColor = 'text-magenta';
        borderColor = 'border-magenta/50';
    }
    else if (title.includes('Misi')) {
        icon = _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-6 w-6", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" }) });
        titleColor = 'text-lime';
        borderColor = 'border-lime/50';
    }
    else {
        icon = _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-6 w-6", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" }) });
    }
    return (_jsx("div", { className: `bg-gray-800/50 border-l-4 ${borderColor} rounded-r-lg p-4 my-3 animate-fade-in-up`, children: _jsxs("div", { className: "flex items-start gap-4", children: [_jsx("div", { className: `flex-shrink-0 ${titleColor}`, children: icon }), _jsxs("div", { className: "flex-1", children: [title && _jsx("h3", { className: `text-lg font-bold ${titleColor} mb-1`, children: title }), _jsx("p", { className: "text-gray-300 leading-relaxed text-sm", children: content })] })] }) }));
};
const ForumPage = ({ room, messages, userProfile, onSendMessage, onLeaveRoom, onReact }) => {
    const [newMessage, setNewMessage] = useState('');
    const [attachment, setAttachment] = useState(null);
    const chatEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const username = userProfile?.username || '';
    const sortedMessages = useMemo(() => {
        return [...messages].sort((a, b) => {
            const timestampA = isNewsArticle(a) ? a.published_on * 1000 : a.timestamp;
            const timestampB = isNewsArticle(b) ? b.published_on * 1000 : b.timestamp;
            return timestampA - timestampB;
        });
    }, [messages]);
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [sortedMessages]);
    const handleSendMessage = (e) => {
        e.preventDefault();
        if ((newMessage.trim() === '' && !attachment) || !username)
            return;
        const userMessage = {
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
        if (fileInputRef.current)
            fileInputRef.current.value = "";
    };
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (reader.result) {
                    setAttachment({
                        dataUrl: reader.result,
                        name: file.name
                    });
                }
            };
            reader.readAsDataURL(file);
        }
        else {
            setAttachment(null);
        }
    };
    if (!room) {
        return (_jsxs("div", { className: "container mx-auto flex flex-col flex-grow items-center justify-center text-center", children: [_jsx("h2", { className: "text-xl font-bold text-gray-300", children: "Room tidak ditemukan" }), _jsx("p", { className: "text-gray-500 mt-2", children: "Silakan kembali dan pilih room untuk bergabung." }), _jsx("button", { onClick: onLeaveRoom, className: "mt-4 bg-electric hover:bg-electric/80 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-300", children: "Kembali ke Daftar Room" })] }));
    }
    const isDefaultRoom = ['berita-kripto', 'pengumuman-aturan'].includes(room.id);
    return (_jsxs("div", { className: "container mx-auto px-2 sm:px-4 py-3 animate-fade-in flex flex-col flex-grow h-[calc(100vh-56px)]", children: [_jsxs("div", { className: "mb-3 flex-shrink-0", children: [_jsxs("div", { className: "flex items-center justify-between gap-4 mb-3", children: [_jsxs("button", { onClick: onLeaveRoom, className: "flex items-center gap-2 text-gray-400 hover:text-electric transition-colors", children: [_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M15 19l-7-7 7-7" }) }), _jsx("span", { className: "text-sm font-semibold", children: "Semua Room" })] }), _jsxs("div", { className: "flex items-center gap-2.5", children: [_jsxs("div", { className: "relative flex h-2.5 w-2.5", children: [_jsx("span", { className: "animate-ping absolute inline-flex h-full w-full rounded-full bg-lime opacity-75" }), _jsx("span", { className: "relative inline-flex rounded-full h-2.5 w-2.5 bg-lime" })] }), _jsxs("p", { className: "text-sm font-semibold", children: [_jsx("span", { className: "text-white", children: room.userCount.toLocaleString('id-ID') }), _jsx("span", { className: "text-gray-400 ml-1.5", children: "Online" })] })] })] }), _jsx("div", { className: "flex items-center", children: _jsxs("div", { children: [_jsx("h1", { className: "text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-electric to-magenta text-transparent bg-clip-text truncate font-heading", children: room.name }), _jsx("p", { className: "text-gray-400 text-xs mt-1", children: "Diskusikan pasar dengan pengguna lain. Berita terbaru muncul otomatis." })] }) })] }), _jsxs("div", { className: "bg-gray-900 border border-white/10 rounded-xl flex flex-col flex-grow overflow-hidden", children: [_jsxs("div", { className: "p-2 md:p-4 flex-grow overflow-y-auto space-y-1", children: [sortedMessages.length === 0 ? (_jsx("div", { className: "flex items-center justify-center h-full text-gray-500", children: _jsx("p", { children: "Belum ada pesan di sini. Jadilah yang pertama!" }) })) : (sortedMessages.map((item, index) => {
                                if (room.id === 'pengumuman-aturan' && isChatMessage(item) && item.type === 'system') {
                                    return _jsx(AnnouncementMessage, { message: item }, item.id);
                                }
                                if (isNewsArticle(item))
                                    return _jsx(NewsMessage, { article: item, username: username, onReact: onReact }, item.id + index);
                                if (isChatMessage(item)) {
                                    if (item.type === 'system')
                                        return _jsx(SystemMessage, { message: item }, item.id);
                                    return _jsx(UserMessage, { message: item, userProfile: userProfile, onReact: onReact }, item.id);
                                }
                                return null;
                            })), _jsx("div", { ref: chatEndRef })] }), _jsx("div", { className: "p-3 bg-gray-900/80 border-t border-white/10 flex-shrink-0", children: isDefaultRoom ? (_jsxs("div", { className: "text-center text-sm text-gray-500 py-2 flex items-center justify-center gap-2", children: [_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" }) }), "Room ini hanya untuk membaca."] })) : (_jsxs("div", { className: "space-y-2", children: [attachment && (_jsxs("div", { className: "relative inline-block", children: [_jsx("img", { src: attachment.dataUrl, alt: "Pratinjau", className: "max-h-24 rounded-lg" }), _jsx("button", { onClick: () => { setAttachment(null); if (fileInputRef.current)
                                                fileInputRef.current.value = ""; }, className: "absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold", children: "×" })] })), _jsxs("form", { onSubmit: handleSendMessage, className: "flex items-center space-x-2", children: [_jsx("input", { type: "file", ref: fileInputRef, onChange: handleFileChange, accept: "image/*", className: "hidden" }), _jsx("button", { type: "button", onClick: () => fileInputRef.current?.click(), className: "text-gray-400 hover:text-electric p-2 rounded-full transition-colors flex-shrink-0", children: _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-6 w-6", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" }) }) }), _jsx("div", { className: "relative flex-1", children: _jsx("input", { type: "text", value: newMessage, onChange: (e) => setNewMessage(e.target.value), placeholder: "Ketik pesan Anda...", className: "w-full bg-gray-800 border border-gray-700 rounded-full py-2.5 pl-4 pr-12 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-electric transition-all", disabled: !username }) }), _jsx("button", { type: "submit", className: "bg-electric text-white rounded-full p-2.5 hover:bg-electric/80 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex-shrink-0", disabled: (!newMessage.trim() && !attachment) || !username, children: _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5", viewBox: "0 0 20 20", fill: "currentColor", children: _jsx("path", { d: "M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" }) }) })] })] })) })] }), _jsx("style", { children: `
                @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes fade-in-up { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
                .animate-fade-in-up { animation: fade-in-up 0.4s ease-out forwards; }
            ` })] }));
};
export default ForumPage;
//# sourceMappingURL=ForumPage.js.map