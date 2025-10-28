// components/ForumPage.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import UserTag, { ADMIN_USERNAMES } from './UserTag';
import type { NewsArticle, ChatMessage, ForumPageProps, User } from '../types';
import { isNewsArticle, isChatMessage } from '../types';

const DEFAULT_ROOM_IDS = ['berita-kripto', 'pengumuman-aturan'];

const EMOJIS = ['👍', '❤️', '🚀', '🔥', '😂', '🤯'];

/* ------------------------- Sub-komponen ------------------------- */

const ReactionPicker = ({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void }) => (
  <div
    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-fast"
    onClick={onClose}
    data-message-interactive="true"
  >
    <div
      className="bg-gray-900/90 border border-white/10 rounded-lg p-2 flex items-center gap-2 shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => {
            onSelect(emoji);
            onClose();
          }}
          className="text-2xl hover:scale-125 transition-transform p-1.5 rounded-full hover:bg-white/10"
        >
          {emoji}
        </button>
      ))}
    </div>
  </div>
);

const Reactions = ({
  message,
  username,
  onReact,
}: {
  message: NewsArticle | ChatMessage | undefined | null;
  username: string;
  onReact: (emoji: string) => void;
}) => {
  const reactions = message?.reactions || {};
  const hasReactions =
    Object.keys(reactions).length > 0 && Object.values(reactions).some((users) => Array.isArray(users) && users.length > 0);
  if (!hasReactions) return null;

  return (
    <div className="flex items-center gap-1 mt-1 flex-wrap">
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
            onClick={(e) => {
              e.stopPropagation();
              onReact(emoji);
            }}
            className={`flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full transition-all duration-200 ${
              currentUserReacted ? 'bg-electric/80 text-white' : 'bg-gray-600/50 hover:bg-gray-600/80 text-gray-300'
            }`}
            title={tooltipText}
            data-message-interactive="true"
          >
            <span>{emoji}</span>
            <span>{userList.length}</span>
          </button>
        );
      })}
    </div>
  );
};

const DeleteButton: React.FC<{ onClick: (e: React.MouseEvent) => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="p-1 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
    title="Hapus Pesan"
    data-message-interactive="true"
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  </button>
);

const ReactButton: React.FC<{ onClick: (e: React.MouseEvent) => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="p-1 text-gray-500 hover:text-electric hover:bg-electric/10 rounded-full transition-colors"
    title="Beri Reaksi"
    data-message-interactive="true"
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  </button>
);

/* ------------------------- News Message ------------------------- */
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
  onImageClick: (url: string) => void;
}> = ({
  article,
  username,
  onReact,
  onDeleteClick,
  canDelete,
  isActive,
  showActions,
  onMessageClick,
  onReactButtonClick,
  onImageClick,
}) => {
  return (
    <div className="my-2 animate-fade-in-up">
      <div className="w-full sm:w-4/5 md:w-3/5 mx-auto relative">
        <div
          onClick={onMessageClick}
          className={`block p-3 bg-gray-800/50 rounded-lg transition-colors cursor-pointer ${
            isActive ? 'bg-gray-800/60 ring-1 ring-electric/30' : 'hover:bg-gray-800/70'
          }`}
          data-message-interactive="true"
        >
          <div className="flex items-start space-x-3">
            <img
              src={article.imageurl}
              alt={article.title}
              className="w-20 h-14 object-cover rounded-md flex-shrink-0 bg-gray-700 cursor-zoom-in"
              loading="lazy"
              onClick={(e) => {
                e.stopPropagation();
                onImageClick(article.imageurl);
              }}
            />
            <div className="flex-1">
              <a href={article.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-semibold text-gray-100 text-sm leading-snug hover:underline">{article.title}</h3>
              </a>
              <p className="text-xs text-gray-400 mt-1">Oleh {article.source}</p>
            </div>
          </div>
          <div className="text-center text-xs text-gray-500 pt-2 mt-2 border-t border-white/5">
            Pasar · {new Date(article.published_on * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        <div className="relative mt-1 px-1 flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <Reactions message={article} username={username} onReact={(emoji) => onReact(article.id, emoji)} />
          </div>

          <div className="relative flex-shrink-0">
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

/* ------------------------- User Message ------------------------- */
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
  onImageClick: (url: string) => void;
}> = ({
  message,
  userProfile,
  onReact,
  onDeleteClick,
  canDelete,
  isActive,
  showActions,
  onMessageClick,
  onReactButtonClick,
  onImageClick,
}) => {
  const currentUsername = userProfile?.username || '';
  const isCurrentUser = message.sender === currentUsername && !!currentUsername;
  
  // Gunakan userCreationDate dari pesan untuk menentukan tag
  const creationDate = message.userCreationDate ?? null;

  return (
    <div className={`my-0.5 flex relative ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs sm:max-w-sm md:max-w-md ${isCurrentUser ? 'ml-auto' : ''}`}>
        {/* Username/Tag Info - TAMPILKAN UNTUK SEMUA USER */}
        <div className={`flex items-center gap-1 flex-wrap mb-0.5 ${isCurrentUser ? 'justify-end' : ''}`}>
          <span className={`font-bold text-[11px] break-all font-heading ${isCurrentUser ? 'text-electric' : 'text-magenta'}`}>
            {message.sender}
          </span>
          {/* UserTag ditampilkan untuk semua pesan dengan creationDate dari pesan */}
          <UserTag sender={message.sender} userCreationDate={creationDate} />
        </div>

        {/* Message Bubble */}
        <div
          onClick={onMessageClick}
          className={`relative text-xs text-gray-200 break-words px-2.5 py-2 rounded-lg cursor-pointer ${
            isActive
              ? isCurrentUser
                ? 'bg-electric/15 ring-1 ring-electric/30'
                : 'bg-magenta/5 ring-1 ring-magenta/30'
              : isCurrentUser
              ? 'bg-electric/10'
              : 'bg-magenta/5'
          } transition-colors`}
          data-message-interactive="true"
        >
          {message.fileURL && (
            <img
              src={message.fileURL}
              alt={message.fileName || 'Gambar'}
              className="rounded-md max-h-36 mb-1 cursor-zoom-in"
              onClick={(e) => {
                e.stopPropagation();
                onImageClick(message.fileURL!);
              }}
            />
          )}
          {message.text}
        </div>

        <div className={`text-[10px] text-gray-500 mt-0.5 ${isCurrentUser ? 'text-right' : 'text-left'}`}>
          {new Date(message.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
        </div>

        <div className="relative mt-0.5 px-1 flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <Reactions message={message} username={currentUsername} onReact={(emoji) => onReact(message.id, emoji)} />
          </div>

          <div className={`relative flex-shrink-0 ${isCurrentUser ? 'ml-1' : 'mr-1'}`}>
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

/* ------------------------- System & Announcement ------------------------- */
const SystemMessage: React.FC<{ message: ChatMessage }> = ({ message }) => {  
  return (
    <div className="text-center py-3 animate-fade-in-up">
      <div className="text-gray-500 italic text-xs">
        {message.text}
      </div>
    </div>
  );
};

const AnnouncementMessage: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const text = message.text || '';
  const parts = text.split(':');
  const title = parts.length > 1 ? parts[0] : '';
  const content = parts.length > 1 ? parts.slice(1).join(':').trim() : text;
  let icon = (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
  let titleColor = 'text-electric';
  let borderColor = 'border-electric/50';
  if (title.includes('Aturan')) {
    icon = (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    );
    titleColor = 'text-magenta';
    borderColor = 'border-magenta/50';
  } else if (title.includes('Misi')) {
    icon = (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    );
    titleColor = 'text-lime';
    borderColor = 'border-lime/50';
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

/* ------------------------- ForumPage Component Utama ------------------------- */
const ForumPage: React.FC<ForumPageProps> = ({
  room,
  messages = [],
  userProfile,
  onSendMessage,
  onLeaveRoom,
  onReact,
  onDeleteMessage,
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [attachment, setAttachment] = useState<{ dataUrl: string; name: string } | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const username = userProfile?.username ?? '';

  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [showPickerForMsgId, setShowPickerForMsgId] = useState<string | null>(null);

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const onImageClick = (url: string) => setPreviewImage(url);

  const handleMessageClick = (messageId: string) => {
    setActiveMessageId((currentId) => {
      const isCurrentlyActive = currentId === messageId;
      const nextActiveId = isCurrentlyActive ? null : messageId;
      if (showPickerForMsgId) setShowPickerForMsgId(null);
      return nextActiveId;
    });
  };

  const handleReactButtonClick = (e: React.MouseEvent, messageId: string) => {
    e.stopPropagation();
    setShowPickerForMsgId(messageId);
    if (activeMessageId !== messageId) setActiveMessageId(messageId);
  };

  const handleChatAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const targetElement = e.target as Element;
    if (!targetElement.closest('[data-message-interactive="true"]')) {
      if (activeMessageId !== null) setActiveMessageId(null);
      if (showPickerForMsgId !== null) setShowPickerForMsgId(null);
    }
  };

  // Filter untuk menghindari duplikasi pesan
  const filteredMessages = useMemo(() => {
    if (!messages || !Array.isArray(messages)) return [];
    
    const seenMessageIds = new Set();
    return messages.filter(message => {
      // Skip jika message id sudah dilihat
      if (seenMessageIds.has(message.id)) {
        return false;
      }
      seenMessageIds.add(message.id);
      return true;
    });
  }, [messages]);

  const safeMessages = Array.isArray(filteredMessages) ? filteredMessages : [];
  const sortedMessages = useMemo(() => {
    return [...safeMessages].sort((a, b) => {
      const timeA = isNewsArticle(a) ? a.published_on * 1000 : isChatMessage(a) ? a.timestamp : 0;
      const timeB = isNewsArticle(b) ? b.published_on * 1000 : isChatMessage(b) ? b.timestamp : 0;
      if (!timeA && !timeB) return 0;
      if (!timeA) return 1;
      if (!timeB) return -1;
      return timeA - timeB;
    });
  }, [safeMessages]);

  useEffect(() => {
    if (activeMessageId === null && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [sortedMessages, activeMessageId]);

  const handleSendMessageSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const currentMessageText = newMessage.trim();
    const currentAttachment = attachment;
    if ((!currentMessageText && !currentAttachment) || !username) return;
    
    const messageData: Partial<ChatMessage> & { type: 'user'; sender: string; timestamp: number; userCreationDate: number } = {
      type: 'user',
      sender: username,
      timestamp: Date.now(),
      reactions: {},
      userCreationDate: userProfile?.createdAt || Date.now(),
      ...(currentMessageText && { text: currentMessageText }),
      ...(currentAttachment && { fileURL: currentAttachment.dataUrl, fileName: currentAttachment.name }),
    };
    
    onSendMessage(messageData);
    setNewMessage('');
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) setAttachment({ dataUrl: reader.result as string, name: file.name });
      };
      reader.readAsDataURL(file);
    } else {
      setAttachment(null);
    }
  };

  if (!room) {
    return <div className="flex flex-col flex-grow items-center justify-center text-gray-500">Pilih room untuk memulai.</div>;
  }

  const isDefaultRoom = DEFAULT_ROOM_IDS.includes(room.id);
  const isSendDisabled = (!newMessage.trim() && !attachment) || !username;
  const isAdmin = userProfile?.username ? ADMIN_USERNAMES.map((n) => n.toLowerCase()).includes(userProfile.username.toLowerCase()) : false;

  return (
    <div className="container mx-auto px-2 sm:px-4 py-3 animate-fade-in flex flex-col flex-grow h-[calc(100vh-56px)]">
      {/* Header Room */}
      <div className="mb-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-4 mb-3">
          <button onClick={onLeaveRoom} className="flex items-center gap-2 text-gray-400 hover:text-electric transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
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
            <h1 className="text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-electric to-magenta text-transparent bg-clip-text truncate font-heading">
              {room.name}
            </h1>
            <p className="text-yellow-400 text-xs mt-1 break-words max-w-2xl">
  ⚠️ Penting Gengs: Jangan ngajak beli suatu koin ygy! Analisis & obrolan di sini cuma buat nambah wawasan, bukan suruhan beli. Market kripto itu ganas 📈📉, risikonya gede. Wajib DYOR (Do Your Own Research) & tanggung jawab sendiri ya! Jangan nelen info bulet-bulet 🙅‍♂️.</p>
          </div>
        </div>
      </div>

      {/* Main Chat Area Container */}
      <div className="bg-gray-900 border border-white/10 rounded-xl flex flex-col flex-grow overflow-hidden">
        {/* Message List Area */}
        <div className="p-2 md:p-4 flex-grow overflow-y-auto space-y-1 custom-scrollbar" onClick={handleChatAreaClick}>
          {sortedMessages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>Belum ada pesan.</p>
            </div>
          ) : (
            sortedMessages.map((item, index) => {
              const isActive = activeMessageId === item.id;
              const messageKey = item.id || `fallback-${item.type}-${index}`;
              const showActions = isActive;

              if (isChatMessage(item)) {
                if (item.type === 'system') {
                  return room.id === 'pengumuman-aturan' ? (
                    <AnnouncementMessage key={messageKey} message={item} />
                  ) : (
                    <SystemMessage key={messageKey} message={item} />
                  );
                }
                const isOwnMessage = item.sender === username && !!username;
                const canDelete = isAdmin || (isOwnMessage && item.type === 'user');
                const senderProfile = isOwnMessage ? userProfile : null;
                return (
                  <UserMessage
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
                    showActions={showActions}
                    onMessageClick={() => handleMessageClick(item.id)}
                    onReactButtonClick={(e) => handleReactButtonClick(e, item.id)}
                    onImageClick={onImageClick}
                  />
                );
              } else if (isNewsArticle(item)) {
                const canDeleteNews = isAdmin;
                return (
                  <NewsMessage
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
                    showActions={showActions}
                    onMessageClick={() => handleMessageClick(item.id)}
                    onReactButtonClick={(e) => handleReactButtonClick(e, item.id)}
                    onImageClick={onImageClick}
                  />
                );
              }
              console.warn('Unknown item type in messages:', item);
              return null;
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 bg-gray-900/80 border-t border-white/10 flex-shrink-0">
          {isDefaultRoom ? (
            <div className="text-center text-sm text-gray-500 py-2 flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Room ini hanya untuk membaca.
            </div>
          ) : (
            <div className="space-y-2">
              {attachment && (
                <div className="relative inline-block">
                  <img src={attachment.dataUrl} alt="Pratinjau" className="max-h-24 rounded-lg" />
                  <button
                    onClick={() => {
                      setAttachment(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold hover:bg-red-700 transition-colors"
                    title="Hapus lampiran"
                  >
                    ×
                  </button>
                </div>
              )}
              <form onSubmit={handleSendMessageSubmit} className="flex items-center space-x-2">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-gray-400 hover:text-electric p-2 rounded-full transition-colors flex-shrink-0"
                  title="Lampirkan gambar"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Ketik pesan Anda..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-full py-2 pl-4 pr-12 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-electric transition-all"
                    disabled={!username}
                  />
                </div>
                <button
                  type="submit"
                  className="bg-electric text-white rounded-full p-2.5 hover:bg-electric/80 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex-shrink-0"
                  disabled={isSendDisabled}
                  title="Kirim"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {showPickerForMsgId && (
        <ReactionPicker
          onSelect={(emoji) => {
            onReact(showPickerForMsgId, emoji);
            setShowPickerForMsgId(null);
          }}
          onClose={() => setShowPickerForMsgId(null)}
        />
      )}

      {previewImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setPreviewImage(null)}
          data-message-interactive="true"
        >
          <img src={previewImage} alt="Preview" className="max-h-[90%] max-w-[90%] rounded-lg shadow-2xl" />
        </div>
      )}

      <style>{`
        .z-10 { z-index: 10; }
        .z-20 { z-index: 20; }
        .z-50 { z-index: 50; }

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
      `}</style>
    </div>
  );
};

export default ForumPage;