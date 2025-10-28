// components/ForumPage.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import UserTag, { ADMIN_USERNAMES } from './UserTag';
import type { NewsArticle, ChatMessage, ForumPageProps, User } from '../types';
import { isNewsArticle, isChatMessage } from '../types';

const DEFAULT_ROOM_IDS = ['berita-kripto', 'pengumuman-aturan'];

const formatDate = (unixTimestamp: number): string =>
  new Date(unixTimestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

const EMOJIS = ['👍', '❤️', '🚀', '🔥', '😂', '🤯'];

// Simple Reaction Picker
const ReactionPicker: React.FC<{ onSelect: (emoji: string) => void; onClose: () => void }> = ({ onSelect, onClose }) => (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose} data-message-interactive="true">
    <div className="bg-gray-900/90 p-2 rounded-lg flex gap-2" onClick={(e) => e.stopPropagation()}>
      {EMOJIS.map(e => <button key={e} onClick={() => { onSelect(e); onClose(); }} className="text-2xl p-1">{e}</button>)}
    </div>
  </div>
);

const ForumPage: React.FC<ForumPageProps> = ({ room, messages = [], userProfile, onSendMessage, onLeaveRoom, onReact, onDeleteMessage, usersMap }) => {
  const [newMessage, setNewMessage] = useState('');
  const [attachment, setAttachment] = useState<{ dataUrl: string; name: string } | null>(null);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const username = userProfile?.username ?? '';

  const sorted = useMemo(() => {
    const list = Array.isArray(messages) ? [...messages] : [];
    return list.sort((a, b) => {
      const ta = isNewsArticle(a) ? a.published_on * 1000 : isChatMessage(a) ? a.timestamp : 0;
      const tb = isNewsArticle(b) ? b.published_on * 1000 : isChatMessage(b) ? b.timestamp : 0;
      if (!ta && !tb) return 0;
      if (!ta) return 1;
      if (!tb) return -1;
      return ta - tb;
    });
  }, [messages]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [sorted.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newMessage.trim();
    if (!trimmed && !attachment) return;
    onSendMessage({ text: trimmed, fileURL: attachment?.dataUrl, fileName: attachment?.name } as Partial<ChatMessage>);
    setNewMessage(''); setAttachment(null);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const fr = new FileReader();
      fr.onloadend = () => { if (fr.result) setAttachment({ dataUrl: fr.result as string, name: file.name }); };
      fr.readAsDataURL(file);
    }
  };

  if (!room) return <div className="flex items-center justify-center text-gray-400">Pilih room untuk memulai.</div>;

  const isAdmin = userProfile?.username ? ADMIN_USERNAMES.map(n => n.toLowerCase()).includes(userProfile.username.toLowerCase()) : false;

  return (
    <div className="container mx-auto p-3 flex flex-col h-[calc(100vh-56px)]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-2xl font-bold">{room.name}</h2>
          <p className="text-xs text-gray-400">Diskusi pasar; disclaimer akan muncul sekali per room.</p>
        </div>
        <div>
          <button onClick={onLeaveRoom} className="text-sm text-gray-300">Kembali</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 bg-gray-900 rounded-xl space-y-2 custom-scrollbar">
        {sorted.length === 0 ? (
          <div className="text-center text-gray-500 py-6">Belum ada pesan.</div>
        ) : sorted.map((m) => {
          const key = m.id;
          if (isNewsArticle(m)) {
            return (
              <div key={key} className="bg-gray-800 p-3 rounded-lg">
                <a href={m.url} target="_blank" rel="noreferrer" className="font-semibold text-sm text-white">{m.title}</a>
                <div className="text-xs text-gray-400 mt-1">Oleh {m.source} · {formatDate(m.published_on * 1000)}</div>
              </div>
            );
          }
          // chat message
          const senderProfile: User | null = usersMap && usersMap[m.sender] ? usersMap[m.sender] : null;
          const isOwn = m.sender === username;
          return (
            <div key={key} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`${isOwn ? 'bg-electric/10' : 'bg-magenta/5'} p-3 rounded-lg max-w-xl`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-bold text-xs ${isOwn ? 'text-electric' : 'text-magenta'}`}>{m.sender}</span>
                  <UserTag sender={m.sender} userCreationDate={senderProfile ? senderProfile.createdAt : null} />
                </div>
                <div className="text-sm text-gray-200">{m.text}</div>
                <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                  <div>{formatDate(m.timestamp)}</div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPickerFor(m.id)} title="Reaksi" className="text-gray-400">😀</button>
                    {(isAdmin || isOwn) && <button onClick={() => { if (confirm('Yakin hapus pesan ini?')) onDeleteMessage(room.id, m.id); }} className="text-red-500">Hapus</button>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="mt-3 flex items-center gap-2">
        <input type="file" accept="image/*" onChange={handleFile} className="hidden" id="attach" />
        <label htmlFor="attach" className="text-gray-400 p-2 rounded-full hover:text-electric cursor-pointer">📎</label>
        {attachment && <div className="relative"><img src={attachment.dataUrl} alt="att" className="h-16 rounded" /><button type="button" onClick={() => setAttachment(null)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 leading-4">×</button></div>}
        <input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Ketik pesan..." className="flex-1 bg-gray-800 p-2 rounded-full text-white outline-none" />
        <button type="submit" className="bg-electric text-black px-3 py-2 rounded-full" disabled={!userProfile}>Kirim</button>
      </form>

      {pickerFor && <ReactionPicker onSelect={(emoji) => { onReact(pickerFor, emoji); setPickerFor(null); }} onClose={() => setPickerFor(null)} />}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 8px; }
      `}</style>
    </div>
  );
};

export default ForumPage;
