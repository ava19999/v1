// App.tsx
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { GoogleOAuthProvider, CredentialResponse } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { getAuth, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithCredential, User as FirebaseUser } from 'firebase/auth';
import { ref, set, push, onValue, off, update, get } from 'firebase/database';

import Header from './components/Header';
import Footer from './components/Footer';
import LoginPage from './components/LoginPage';
import CreateIdPage from './components/CreateIdPage';
import HomePage from './components/HomePage';
import ForumPage from './components/ForumPage';
import AboutPage from './components/AboutPage';
import RoomsListPage from './components/RoomsListPage';

import type {
  ForumMessageItem, Room, CoinListItem, CryptoData, ChatMessage,
  Page, Currency, NewsArticle, User, GoogleProfile
} from './types';
import { isNewsArticle, isChatMessage } from './types';
import { fetchIdrRate, fetchNewsArticles, fetchTop500Coins, fetchTrendingCoins, fetchCoinDetails } from './services/mockData';
import { database } from './services/firebaseService';

const DEFAULT_ROOM_IDS = ['berita-kripto', 'pengumuman-aturan'];

const defaultMessages: { [key: string]: ForumMessageItem[] } = {
  'pengumuman-aturan': [
    { id: 'rule1', type: 'system', text: 'Selamat datang di RT Crypto! Diskusi & analisis.', sender: 'system', timestamp: Date.now() - 2000 },
    { id: 'rule2', type: 'system', text: 'Aturan: Dilarang Mengajak Membeli koin. DYOR. Risiko ditanggung sendiri.', sender: 'system', timestamp: Date.now() - 1000 },
    { id: 'mission1', type: 'system', text: 'Misi: Jadi trader cerdas bareng, bukan ikut-ikutan. Ayo menang bareng!', sender: 'system', timestamp: Date.now() }
  ],
};

const DISCLAIMER_MESSAGE_TEXT =
  '⚠️ Penting Gengs: Jangan ngajak beli suatu koin ygy! Analisis & obrolan di sini cuma buat nambah wawasan, bukan suruhan beli. Market kripto itu ganas 📈📉, risikonya gede. Wajib DYOR (Do Your Own Research) & tanggung jawab sendiri ya! Jangan nelen info bulet-bulet 🙅‍♂️.';

const AppContent: React.FC = () => {
  // --- Core state
  const [activePage, setActivePage] = useState<Page>('home');
  const [currency, setCurrency] = useState<Currency>('usd');
  const [idrRate, setIdrRate] = useState<number | null>(null);
  const [isRateLoading, setIsRateLoading] = useState(true);

  const [users, setUsers] = useState<{ [email: string]: User }>({});
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [pendingGoogleUser, setPendingGoogleUser] = useState<GoogleProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [rooms, setRooms] = useState<Room[]>([
    { id: 'berita-kripto', name: 'Berita Kripto', userCount: 150 + Math.floor(Math.random() * 20) },
    { id: 'pengumuman-aturan', name: 'Pengumuman & Aturan', userCount: 150 + Math.floor(Math.random() * 20) },
    { id: 'umum', name: 'Kripto Naik/Turun Hari Ini', userCount: 134 + Math.floor(Math.random() * 20), createdBy: 'Admin_RTC' },
    { id: 'meme', name: 'Meme Coin Mania', userCount: 88 + Math.floor(Math.random() * 20) },
    { id: 'xrp-army', name: 'Xrp Army', userCount: 73 + Math.floor(Math.random() * 20) },
    { id: 'roblox-tuker-kripto', name: 'Roblox Tuker Kripto', userCount: 42 + Math.floor(Math.random() * 20) },
  ]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [joinedRoomIds, setJoinedRoomIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('joinedRoomIds');
    if (saved) {
      try { return new Set(JSON.parse(saved)); } catch (e) { console.error('Gagal load joined rooms', e); }
    }
    return new Set(DEFAULT_ROOM_IDS);
  });
  const [unreadCounts, setUnreadCounts] = useState<{ [key: string]: { count: number; lastUpdate: number } }>({});
  const [firebaseMessages, setFirebaseMessages] = useState<{ [roomId: string]: ForumMessageItem[] }>({});

  // --- Helpers
  const fetchTrendingData = async () => {
    try { const res = await fetchTrendingCoins(); return res; } catch (e) { return []; }
  };

  // persist users / joined rooms / unreadCounts
  useEffect(() => { try { const u = localStorage.getItem('cryptoUsers'); if (u) setUsers(JSON.parse(u)); } catch (e) { console.error(e); } }, []);
  useEffect(() => { try { localStorage.setItem('cryptoUsers', JSON.stringify(users)); } catch (e) { console.error(e); } }, [users]);
  useEffect(() => { try { localStorage.setItem('joinedRoomIds', JSON.stringify(Array.from(joinedRoomIds))); } catch (e) { console.error(e); } }, [joinedRoomIds]);
  useEffect(() => { try { localStorage.setItem('unreadCounts', JSON.stringify(unreadCounts)); } catch (e) { console.error(e); } }, [unreadCounts]);

  // --- Auth listener
  useEffect(() => {
    if (!database) { setIsAuthLoading(false); return; }
    const auth = getAuth();
    setIsAuthLoading(true);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (!user) {
        setCurrentUser(null);
        setPendingGoogleUser(null);
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- Firebase message listener for current room
  useEffect(() => {
    if (!database) { console.warn('DB not initialized'); return; }
    if (!currentRoom?.id) return;

    const messagesRef = ref(database, `messages/${currentRoom.id}`);
    const listener = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val() || {};
      const arr: ForumMessageItem[] = [];

      Object.entries<any>(data).forEach(([key, val]) => {
        if (!val) return;
        if (val.type === 'news') {
          arr.push({ ...val, id: key, type: 'news' } as NewsArticle);
        } else {
          const t = val.type === 'system' ? 'system' : 'user';
          arr.push({ ...val, id: key, type: t, timestamp: val.timestamp } as ChatMessage);
        }
      });

      let final = arr.sort((a, b) => {
        const ta = isNewsArticle(a) ? a.published_on * 1000 : isChatMessage(a) ? a.timestamp : 0;
        const tb = isNewsArticle(b) ? b.published_on * 1000 : isChatMessage(b) ? b.timestamp : 0;
        if (!ta && !tb) return 0;
        if (!ta) return 1;
        if (!tb) return -1;
        return ta - tb;
      });

      if (final.length === 0 && defaultMessages[currentRoom.id]) {
        final = [...defaultMessages[currentRoom.id]];
      }

      setFirebaseMessages(prev => ({ ...prev, [currentRoom.id]: final }));
    }, (err) => {
      console.error('Firebase messages listener error', err);
      if (currentRoom?.id) setFirebaseMessages(prev => ({ ...prev, [currentRoom.id]: [] }));
    });

    return () => off(messagesRef, 'value', listener);
  }, [currentRoom]);

  // --- Global unread tracker: watch root messages and update unreadCounts for rooms not open
  useEffect(() => {
    if (!database) return;
    const rootRef = ref(database, 'messages');
    const onRoot = onValue(rootRef, (snap) => {
      const all = snap.val() || {};
      Object.entries<any>(all).forEach(([roomId, messagesObj]) => {
        if (!messagesObj) return;
        const latestTs = Object.values<any>(messagesObj).reduce((acc: number, m: any) => Math.max(acc, m?.timestamp || (m?.published_on ? m.published_on * 1000 : 0)), 0);
        if (currentRoom?.id !== roomId) {
          setUnreadCounts(prev => {
            const prevLast = prev[roomId]?.lastUpdate || 0;
            if (latestTs > prevLast) {
              return { ...prev, [roomId]: { count: (prev[roomId]?.count || 0) + 1, lastUpdate: latestTs } };
            }
            return prev;
          });
        }
      });
    }, (err) => { console.error('root messages listener err', err); });
    return () => off(rootRef, 'value', onRoot);
  }, [currentRoom]);

  // --- Ensure disclaimer exists in a room (writes to Firebase once if absent)
  const ensureDisclaimerInRoom = useCallback(async (roomId: string) => {
    if (!database || !roomId) return;
    const roomRef = ref(database, `messages/${roomId}`);
    const snap = await get(roomRef);
    const data = snap.val() || {};
    const values = Object.values<any>(data);
    const hasDisclaimer = values.some(v => v && v.text === DISCLAIMER_MESSAGE_TEXT);
    if (!hasDisclaimer) {
      const newRef = push(roomRef);
      await set(newRef, { type: 'system', sender: 'system', text: DISCLAIMER_MESSAGE_TEXT, timestamp: Date.now(), reactions: {} });
    }
  }, []);

  // --- Join room handler (ensures disclaimer)
  const handleJoinRoom = useCallback(async (room: Room) => {
    await ensureDisclaimerInRoom(room.id);
    setCurrentRoom(room);
    setJoinedRoomIds(prev => new Set(prev).add(room.id));
    setUnreadCounts(prev => ({ ...prev, [room.id]: { count: 0, lastUpdate: Date.now() } }));
    setActivePage('forum');
  }, [ensureDisclaimerInRoom]);

  // --- Create room handler (create + write disclaimer)
  const handleCreateRoom = useCallback(async (roomName: string) => {
    if (!currentUser?.username) { alert('Anda harus login untuk membuat room.'); return; }
    const trimmed = roomName.trim();
    if (!trimmed) return;
    const id = trimmed.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
    const newRoom: Room = { id, name: trimmed, userCount: 1, createdBy: currentUser.username };
    setRooms(prev => [newRoom, ...prev]);
    if (database) {
      const roomRef = ref(database, `messages/${id}`);
      const newRef = push(roomRef);
      await set(newRef, { type: 'system', sender: 'system', text: DISCLAIMER_MESSAGE_TEXT, timestamp: Date.now(), reactions: {} });
    }
    setCurrentRoom(newRoom);
    setJoinedRoomIds(prev => new Set(prev).add(id));
    setActivePage('forum');
  }, [currentUser]);

  // --- Send message handler
  const handleSendMessage = useCallback(async (message: Partial<ChatMessage>) => {
    if (!database || !currentRoom?.id || !currentUser?.username) { alert('Gagal mengirim: data tidak lengkap.'); return; }
    if (!message.text?.trim() && !message.fileURL) return;
    const messageToSend = {
      type: 'user',
      uid: firebaseUser?.uid || null,
      sender: currentUser.username,
      text: message.text?.trim() || '',
      fileURL: message.fileURL || null,
      fileName: message.fileName || null,
      timestamp: Date.now(),
      reactions: {}
    };
    const listRef = ref(database, `messages/${currentRoom.id}`);
    const newRef = push(listRef);
    await set(newRef, messageToSend);
    setUnreadCounts(prev => ({ ...prev, [currentRoom.id]: { count: 0, lastUpdate: Date.now() } }));
  }, [currentRoom, currentUser, firebaseUser]);

  // --- Reaction toggling & delete (passed as callbacks to ForumPage)
  const handleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!database || !currentRoom?.id || !currentUser?.username) return;
    const reactionPath = `messages/${currentRoom.id}/${messageId}/reactions/${emoji}`;
    const rRef = ref(database, reactionPath);
    const snap = await get(rRef);
    const list: string[] = snap.val() || [];
    let updated: string[] | null;
    if (!Array.isArray(list)) updated = [currentUser.username];
    else if (list.includes(currentUser.username)) {
      updated = list.filter(u => u !== currentUser.username);
      if (updated.length === 0) updated = null;
    } else updated = [...list, currentUser.username];
    await set(rRef, updated);
  }, [currentRoom, currentUser]);

  const handleDeleteMessage = useCallback(async (roomId: string, messageId: string) => {
    if (!database) return;
    await set(ref(database, `messages/${roomId}/${messageId}`), null);
  }, []);

  // --- usersMap derived (username -> User) for ForumPage
  const usersMap = useMemo(() => {
    const map: { [k: string]: User } = {};
    Object.values(users).forEach(u => { if (u.username) map[u.username] = u; map[u.email] = u; });
    return map;
  }, [users]);

  // --- Render active page
  const renderActivePage = () => {
    switch (activePage) {
      case 'home': return <HomePage idrRate={idrRate} isRateLoading={isRateLoading} currency={currency} onIncrementAnalysisCount={() => {}} fullCoinList={[]} isCoinListLoading={false} coinListError={null} heroCoin={null} otherTrendingCoins={[]} isTrendingLoading={false} trendingError={null} onSelectCoin={() => {}} onReloadTrending={() => {}} />;
      case 'rooms': return <RoomsListPage rooms={rooms} onJoinRoom={handleJoinRoom} onCreateRoom={handleCreateRoom} totalUsers={rooms.reduce((s, r) => s + (r.userCount || 0), 0)} hotCoin={null} userProfile={currentUser} currentRoomId={currentRoom?.id || null} joinedRoomIds={joinedRoomIds} onLeaveJoinedRoom={(id) => setJoinedRoomIds(prev => { const n = new Set(prev); n.delete(id); return n; })} unreadCounts={unreadCounts} onDeleteRoom={() => {}} />;
      case 'forum': {
        const displayMessages = currentRoom ? (firebaseMessages[currentRoom.id] || []) : [];
        return <ForumPage room={currentRoom} messages={displayMessages} userProfile={currentUser} onSendMessage={handleSendMessage} onLeaveRoom={() => { setCurrentRoom(null); setActivePage('rooms'); }} onReact={handleReaction} onDeleteMessage={handleDeleteMessage} usersMap={usersMap} />;
      }
      case 'about': return <AboutPage />;
      default: return <HomePage idrRate={idrRate} isRateLoading={isRateLoading} currency={currency} onIncrementAnalysisCount={() => {}} fullCoinList={[]} isCoinListLoading={false} coinListError={null} heroCoin={null} otherTrendingCoins={[]} isTrendingLoading={false} trendingError={null} onSelectCoin={() => {}} onReloadTrending={() => {}} />;
    }
  };

  if (isAuthLoading) return <div className="min-h-screen flex items-center justify-center text-white">Memverifikasi sesi Anda...</div>;

  return (
    <div className="min-h-screen bg-transparent text-white font-sans flex flex-col">
      <Header userProfile={currentUser} onLogout={() => signOut(getAuth())} activePage={activePage} onNavigate={(p) => setActivePage(p)} currency={currency} onCurrencyChange={setCurrency} hotCoin={null} idrRate={idrRate} />
      <main className="flex-grow">{renderActivePage()}</main>
      <Footer />
      {authError && <div className="fixed bottom-4 right-4 bg-red-600 text-white p-3 rounded-lg z-50">Error: {authError} <button onClick={() => setAuthError(null)}>Tutup</button></div>}
    </div>
  );
};

const App: React.FC = () => {
  const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
  if (!googleClientId) return <div style={{ color: 'white' }}>Missing GOOGLE_CLIENT_ID</div>;
  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AppContent />
    </GoogleOAuthProvider>
  );
};

export default App;
