// App.tsx
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { GoogleOAuthProvider, CredentialResponse } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
  signInWithCredential,
  User as FirebaseUser
} from 'firebase/auth';

// Impor Komponen
import Header from './components/Header';
import Footer from './components/Footer';
import LoginPage from './components/LoginPage';
import CreateIdPage from './components/CreateIdPage';
import HomePage from './components/HomePage';
import ForumPage from './components/ForumPage';
import AboutPage from './components/AboutPage';
import RoomsListPage from './components/RoomsListPage';

// Impor Tipe dan Fungsi Helper
import type {
  ForumMessageItem,
  Room,
  CoinListItem,
  CryptoData,
  ChatMessage,
  Page,
  Currency,
  NewsArticle,
  User,
  GoogleProfile
} from './types';
import { isNewsArticle, isChatMessage } from './types';
import {
  fetchIdrRate,
  fetchNewsArticles,
  fetchTop500Coins,
  fetchTrendingCoins,
  fetchCoinDetails
} from './services/mockData';
import { ADMIN_USERNAMES } from './components/UserTag';
import { database } from './services/firebaseService';
import { ref, set, push, onValue, off, update, get } from 'firebase/database';

const DEFAULT_ROOM_IDS = ['berita-kripto', 'pengumuman-aturan'];

const defaultMessages: { [key: string]: ForumMessageItem[] } = {
  'pengumuman-aturan': [
    { id: 'rule1', type: 'system', text: 'Selamat datang di RT Crypto! Diskusi & analisis.', sender: 'system', timestamp: Date.now() - 2000 },
    { id: 'rule2', type: 'system', text: 'Aturan: Dilarang Mengajak Membeli koin. DYOR. Risiko ditanggung sendiri.', sender: 'system', timestamp: Date.now() - 1000 },
    { id: 'mission1', type: 'system', text: 'Misi: Jadi trader cerdas bareng, bukan ikut-ikutan. Ayo menang bareng!', sender: 'system', timestamp: Date.now() }
  ]
};

const DISCLAIMER_MESSAGE_TEXT =
  '⚠️ Penting Gengs: Jangan ngajak beli suatu koin ygy! Analisis & obrolan di sini cuma buat nambah wawasan, bukan suruhan beli. Market kripto itu ganas 📈📉, risikonya gede. Wajib DYOR (Do Your Own Research) & tanggung jawab sendiri ya! Jangan nelen info bulet-bulet 🙅‍♂️.';

const Particles: React.FC = () => (
  <div className="particles fixed top-0 left-0 w-full h-full -z-10 pointer-events-none">
    <div className="particle absolute bg-electric/50 rounded-full opacity-0" style={{ width: '3px', height: '3px', left: '10%', animation: 'drift 20s linear infinite', animationDelay: '-1s' }} />
    <div className="particle absolute bg-magenta/50 rounded-full opacity-0" style={{ width: '2px', height: '2px', left: '25%', animation: 'drift 25s linear infinite', animationDelay: '-5s' }} />
    <div className="particle absolute bg-lime/50 rounded-full opacity-0" style={{ width: '4px', height: '4px', left: '50%', animation: 'drift 15s linear infinite', animationDelay: '-10s' }} />
    <div className="particle absolute bg-electric/30 rounded-full opacity-0" style={{ width: '2px', height: '2px', left: '75%', animation: 'drift 18s linear infinite', animationDelay: '-7s' }} />
    <div className="particle absolute bg-lime/40 rounded-full opacity-0" style={{ width: '3px', height: '3px', left: '90%', animation: 'drift 22s linear infinite', animationDelay: '-3s' }} />
    <style>{`
      @keyframes drift {
        from { transform: translateY(-10vh) translateX(0); opacity: 0; }
        10% { opacity: 0.6; }
        50% { transform: translateY(50vh) translateX(10px); opacity: 0.3; }
        to { transform: translateY(110vh) translateX(-10px); opacity: 0; }
      }
    `}</style>
  </div>
);

const AppContent: React.FC = () => {
  const [activePage, setActivePage] = useState<Page>('home');
  const [currency, setCurrency] = useState<Currency>('usd');
  const [idrRate, setIdrRate] = useState<number | null>(null);
  const [isRateLoading, setIsRateLoading] = useState(true);
  const [users, setUsers] = useState<{ [email: string]: User }>({});
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [pendingGoogleUser, setPendingGoogleUser] = useState<GoogleProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [analysisCounts, setAnalysisCounts] = useState<{ [key: string]: number }>({});
  const baseAnalysisCount = 1904;
  const [fullCoinList, setFullCoinList] = useState<CoinListItem[]>([]);
  const [isCoinListLoading, setIsCoinListLoading] = useState(true);
  const [coinListError, setCoinListError] = useState<string | null>(null);
  const [trendingCoins, setTrendingCoins] = useState<CryptoData[]>([]);
  const [isTrendingLoading, setIsTrendingLoading] = useState(true);
  const [trendingError, setTrendingError] = useState<string | null>(null);
  const [searchedCoin, setSearchedCoin] = useState<CryptoData | null>(null);
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

  const fetchTrendingData = useCallback(async (showSkeleton = true) => {
    if (showSkeleton) { setIsTrendingLoading(true); setTrendingError(null); }
    try { setTrendingCoins(await fetchTrendingCoins()); }
    catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal memuat data tren.';
      if (showSkeleton) setTrendingError(errorMessage);
      else console.error('Gagal menyegarkan data tren:', errorMessage);
    } finally { if (showSkeleton) setIsTrendingLoading(false); }
  }, []);

  const handleResetToTrending = useCallback(() => {
    setSearchedCoin(null);
    setActivePage('home');
    fetchTrendingData(true);
  }, [fetchTrendingData]);

  useEffect(() => {
    try {
      const u = localStorage.getItem('cryptoUsers');
      if (u) setUsers(JSON.parse(u));
    } catch (e) { console.error('Gagal load users', e); }
  }, []);

  useEffect(() => {
    if (!database) {
      console.warn('Firebase Auth listener skipped: Database not initialized.');
      setIsAuthLoading(false);
      return;
    }
    const auth = getAuth();
    setIsAuthLoading(true);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (user) {
        const appUser = Object.values(users).find(u => u.email === user.email);
        if (appUser) {
          if (!currentUser || currentUser.email !== appUser.email) {
            setCurrentUser(appUser);
            setPendingGoogleUser(null);
          }
        } else if (!pendingGoogleUser) {
          console.warn('Auth listener: Firebase user exists but no matching app user found and not pending.');
        }
      } else {
        if (currentUser !== null) setCurrentUser(null);
        setPendingGoogleUser(null);
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, [users, currentUser, pendingGoogleUser]);

  useEffect(() => {
    try { localStorage.setItem('cryptoUsers', JSON.stringify(users)); } catch (e) { console.error('Gagal simpan users', e); }
  }, [users]);

  useEffect(() => {
    try {
      if (currentUser) localStorage.setItem('currentUser', JSON.stringify(currentUser));
      else localStorage.removeItem('currentUser');
    } catch (e) { console.error('Gagal simpan currentUser', e); }
  }, [currentUser]);

  useEffect(() => {
    try { localStorage.setItem('joinedRoomIds', JSON.stringify(Array.from(joinedRoomIds))); } catch (e) { console.error('Gagal simpan joined rooms', e); }
  }, [joinedRoomIds]);

  useEffect(() => { const saved = localStorage.getItem('unreadCounts'); if (saved) try { setUnreadCounts(JSON.parse(saved)); } catch (e) { console.error('Gagal parse unreadCounts', e); } }, []);
  useEffect(() => { localStorage.setItem('unreadCounts', JSON.stringify(unreadCounts)); }, [unreadCounts]);
  useEffect(() => {
    const lastReset = localStorage.getItem('lastAnalysisResetDate');
    const today = new Date().toISOString().split('T')[0];
    if (lastReset !== today) {
      localStorage.setItem('analysisCounts', '{}');
      localStorage.setItem('lastAnalysisResetDate', today);
      setAnalysisCounts({});
    } else {
      const saved = localStorage.getItem('analysisCounts');
      if (saved) try { setAnalysisCounts(JSON.parse(saved)); } catch (e) { console.error('Gagal parse analysis counts', e); }
    }
  }, []);
  useEffect(() => {
    const getRate = async () => {
      setIsRateLoading(true);
      try { setIdrRate(await fetchIdrRate()); }
      catch (error) { console.error('Gagal ambil kurs IDR:', error); setIdrRate(16000); }
      finally { setIsRateLoading(false); }
    };
    getRate();
  }, []);
  useEffect(() => {
    const fetchList = async () => {
      setIsCoinListLoading(true);
      setCoinListError(null);
      try { setFullCoinList(await fetchTop500Coins()); }
      catch (err) { setCoinListError('Gagal ambil daftar koin.'); }
      finally { setIsCoinListLoading(false); }
    };
    fetchList();
  }, []);
  useEffect(() => { fetchTrendingData(); }, [fetchTrendingData]);

  useEffect(() => {
    if (!database) {
      console.warn('Messages listener skipped: DB not initialized.');
      if (currentRoom?.id) setFirebaseMessages(prev => ({ ...prev, [currentRoom.id]: [] }));
      return;
    }
    if (!currentRoom?.id) return;

    const messagesRef = ref(database, `messages/${currentRoom.id}`);
    const listener = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      const messagesArray: ForumMessageItem[] = [];
      if (data) {
        Object.keys(data).forEach(key => {
          const msgData = data[key];
          if (msgData && typeof msgData === 'object' && ((msgData.timestamp && typeof msgData.timestamp === 'number') || (msgData.published_on && typeof msgData.published_on === 'number'))) {
            let type: 'news' | 'user' | 'system' | undefined = msgData.type;
            if (!type) {
              if ('published_on' in msgData && 'source' in msgData) type = 'news';
              else if (msgData.sender === 'system') type = 'system';
              else if ('sender' in msgData) type = 'user';
            }
            if (type === 'news' || type === 'user' || type === 'system') {
              const reactions = typeof msgData.reactions === 'object' && msgData.reactions !== null ? msgData.reactions : {};
              const uid = type === 'user' ? msgData.uid : undefined;
              const timestamp = type === 'news' ? msgData.published_on * 1000 : msgData.timestamp;
              messagesArray.push({ ...msgData, id: key, type, reactions, uid, timestamp });
            } else {
              console.warn('Invalid or missing message type:', key, msgData);
            }
          } else {
            console.warn('Invalid message structure or missing timestamp/published_on:', key, msgData);
          }
        });
      }

      let finalMessages = messagesArray.sort((a, b) => {
        const timeA = isNewsArticle(a) ? (a.published_on * 1000) : (isChatMessage(a) ? a.timestamp : 0);
        const timeB = isNewsArticle(b) ? (b.published_on * 1000) : (isChatMessage(b) ? b.timestamp : 0);
        if (!timeA && !timeB) return 0;
        if (!timeA) return 1;
        if (!timeB) return -1;
        return timeA - timeB;
      });

      if (finalMessages.length === 0 && currentRoom?.id && defaultMessages[currentRoom.id]) {
        finalMessages = [...defaultMessages[currentRoom.id]];
      }

      setFirebaseMessages(prev => ({ ...prev, [currentRoom.id]: finalMessages }));
    }, (error) => {
      console.error(`Firebase listener error room ${currentRoom?.id}:`, error);
      if (currentRoom?.id) setFirebaseMessages(prev => ({ ...prev, [currentRoom.id]: [] }));
    });

    return () => {
      if (database) off(messagesRef, 'value', listener);
    };
  }, [currentRoom, database]);

  useEffect(() => {
    if (!database) {
      console.warn('News fetch skipped: DB not initialized.');
      return;
    }
    const currentDb = database;
    const NEWS_ROOM_ID = 'berita-kripto';
    const NEWS_FETCH_INTERVAL = 20 * 60 * 1000;
    const LAST_FETCH_KEY = 'lastNewsFetchTimestamp';
    let isMounted = true;

    const fetchAndProcessNews = async () => {
      const currentTime = Date.now();
      try {
        const fetchedArticles = await fetchNewsArticles();
        if (!isMounted || !fetchedArticles || fetchedArticles.length === 0) return;
        if (!currentDb) return;

        const newsRoomRef = ref(currentDb, `messages/${NEWS_ROOM_ID}`);
        const snapshot = await get(newsRoomRef);
        const existingNewsData = snapshot.val() || {};
        const existingNewsValues = (typeof existingNewsData === 'object' && existingNewsData !== null) ? Object.values<any>(existingNewsData) : [];
        const existingNewsUrls = new Set(existingNewsValues.map(news => news?.url).filter(url => typeof url === 'string'));

        let newArticleAdded = false;
        const updates: { [key: string]: Omit<NewsArticle, 'id'> } = {};

        fetchedArticles.forEach(article => {
          if (article.url && article.title && article.published_on && article.source && !existingNewsUrls.has(article.url)) {
            const newsRef = push(newsRoomRef);
            if (newsRef.key) {
              const articleData: Omit<NewsArticle, 'id'> & { type: 'news' } = {
                type: 'news',
                title: article.title,
                url: article.url,
                imageurl: article.imageurl || '',
                published_on: article.published_on,
                source: article.source,
                body: article.body || '',
                reactions: {}
              };
              updates[newsRef.key] = articleData;
              newArticleAdded = true;
            }
          }
        });

        if (newArticleAdded && isMounted) {
          await update(newsRoomRef, updates);
          localStorage.setItem(LAST_FETCH_KEY, currentTime.toString());
          if (currentRoom?.id !== NEWS_ROOM_ID) {
            setUnreadCounts(prev => ({
              ...prev,
              [NEWS_ROOM_ID]: {
                count: (prev[NEWS_ROOM_ID]?.count || 0) + Object.keys(updates).length,
                lastUpdate: currentTime
              }
            }));
          }
        }
      } catch (err: unknown) {
        let errorMessage = 'Unknown error during news fetch';
        if (err instanceof Error) errorMessage = err.message;
        else if (typeof err === 'string') errorMessage = err;
        console.error('News fetch failed:', errorMessage);
      }
    };

    fetchAndProcessNews();
    const intervalId = setInterval(fetchAndProcessNews, NEWS_FETCH_INTERVAL);
    return () => { isMounted = false; clearInterval(intervalId); };
  }, [currentRoom, database]);

  const handleGoogleRegisterSuccess = useCallback(async (credentialResponse: CredentialResponse) => {
    setAuthError(null);
    if (!credentialResponse.credential) { setAuthError('Credential Google tidak ditemukan.'); return; }
    try {
      const decoded: { email: string; name: string; picture: string } = jwtDecode(credentialResponse.credential) as any;
      const { email, name, picture } = decoded;
      const auth = getAuth();
      const googleCredential = GoogleAuthProvider.credential(credentialResponse.credential);
      signInWithCredential(auth, googleCredential)
        .then((userCredential) => {
          const existingAppUser = Object.values(users).find(u => u.email === email);
          if (existingAppUser) {
            setCurrentUser(existingAppUser);
            setPendingGoogleUser(null);
          } else {
            setPendingGoogleUser({ email, name, picture });
            if (currentUser) setCurrentUser(null);
          }
        })
        .catch((error) => {
          console.error('Firebase signInWithCredential error:', error);
          let errMsg = 'Gagal menghubungkan login Google ke Firebase.';
          if ((error as any).code === 'auth/account-exists-with-different-credential') errMsg = 'Akun dengan email ini sudah ada, gunakan metode login lain.';
          else if ((error as any).message) errMsg += ` (${(error as any).message})`;
          setAuthError(errMsg);
          if (currentUser) setCurrentUser(null);
        });
    } catch (error) {
      console.error('Google login decode/Firebase error:', error);
      setAuthError('Error memproses login Google.');
      if (currentUser) setCurrentUser(null);
    }
  }, [users, currentUser]);

  const handleProfileComplete = useCallback(async (username: string, password: string): Promise<string | void> => {
    setAuthError(null);
    if (!pendingGoogleUser) { setAuthError('Data Google tidak ditemukan untuk melengkapi profil.'); return 'Data Google tidak ditemukan.'; }
    if (!firebaseUser) { setAuthError('Sesi login Firebase tidak aktif untuk melengkapi profil.'); return 'Sesi login Firebase tidak aktif.'; }
    if (Object.values(users).some(u => u.username.toLowerCase() === username.toLowerCase())) {
      const errorMsg = 'Username sudah digunakan. Pilih username lain.';
      setAuthError(errorMsg);
      return errorMsg;
    }

    const newUser: User = {
      email: pendingGoogleUser.email,
      username,
      password,
      googleProfilePicture: pendingGoogleUser.picture,
      createdAt: Date.now()
    };

    setUsers(prev => ({ ...prev, [newUser.email]: newUser }));
    setCurrentUser(newUser);
    setPendingGoogleUser(null);
    setActivePage('home');
  }, [users, pendingGoogleUser, firebaseUser]);

  const handleLogout = useCallback(() => {
    const auth = getAuth();
    signOut(auth)
      .then(() => {
        setActivePage('home');
        setCurrentRoom(null);
      })
      .catch((error) => {
        console.error('Firebase signOut error:', error);
        setCurrentUser(null);
        setFirebaseUser(null);
        setActivePage('home');
        setCurrentRoom(null);
      });
  }, []);

  const handleIncrementAnalysisCount = useCallback((coinId: string) => {
    setAnalysisCounts(prev => {
      const current = prev[coinId] || baseAnalysisCount;
      const newCounts = { ...prev, [coinId]: current + 1 };
      localStorage.setItem('analysisCounts', JSON.stringify(newCounts));
      return newCounts;
    });
  }, []);

  const handleNavigate = useCallback((page: Page) => {
    if (page === 'home' && activePage === 'home') handleResetToTrending();
    else if (page === 'forum') setActivePage('rooms');
    else setActivePage(page);
  }, [activePage, handleResetToTrending]);

  const handleSelectCoin = useCallback(async (coinId: string) => {
    setIsTrendingLoading(true); setTrendingError(null); setSearchedCoin(null);
    try { setSearchedCoin(await fetchCoinDetails(coinId)); }
    catch (err) { setTrendingError(err instanceof Error ? err.message : 'Gagal muat detail koin.'); }
    finally { setIsTrendingLoading(false); }
  }, []);

  const handleJoinRoom = useCallback((room: Room) => {
    setCurrentRoom(room);
    setJoinedRoomIds(prev => new Set(prev).add(room.id));
    setUnreadCounts(prev => ({ ...prev, [room.id]: { count: 0, lastUpdate: Date.now() } }));
    setActivePage('forum');
  }, []);

  const handleLeaveRoom = useCallback(() => { setCurrentRoom(null); setActivePage('rooms'); }, []);
  const handleLeaveJoinedRoom = useCallback((roomId: string) => {
    if (DEFAULT_ROOM_IDS.includes(roomId)) return;
    setJoinedRoomIds(prev => { const newIds = new Set(prev); newIds.delete(roomId); return newIds; });
    setUnreadCounts(prev => { const newCounts = { ...prev }; delete newCounts[roomId]; return newCounts; });
    if (currentRoom?.id === roomId) { setCurrentRoom(null); setActivePage('rooms'); }
  }, [currentRoom]);

  const handleCreateRoom = useCallback((roomName: string) => {
    if (!currentUser?.username) { alert('Anda harus login untuk membuat room.'); return; }
    const trimmedName = roomName.trim();
    if (rooms.some(r => r.name.toLowerCase() === trimmedName.toLowerCase())) { alert('Nama room sudah ada. Silakan pilih nama lain.'); return; }
    const newRoom: Room = { id: trimmedName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(), name: trimmedName, userCount: 1, createdBy: currentUser.username };
    setRooms(prev => [newRoom, ...prev]);
    handleJoinRoom(newRoom);
  }, [handleJoinRoom, rooms, currentUser]);

  const handleDeleteRoom = useCallback((roomId: string) => {
    if (!currentUser?.username || !firebaseUser) { console.warn('Delete room prerequisites failed (user).'); alert('Gagal menghapus: Anda belum login.'); return; }
    const roomToDelete = rooms.find(r => r.id === roomId);
    if (!roomToDelete || DEFAULT_ROOM_IDS.includes(roomId)) { console.warn('Cannot delete default or non-existent room.'); return; }
    if (!database) { console.error('Cannot delete room: Database not initialized.'); alert('Gagal menghapus room: Koneksi database bermasalah.'); return; }

    const currentDb = database;
    const adminsRef = ref(currentDb, 'admins/' + firebaseUser.uid);
    get(adminsRef).then((snapshot) => {
      const isAdmin = snapshot.exists() && snapshot.val() === true;
      const isCreator = roomToDelete.createdBy === currentUser.username;
      if (!isAdmin && !isCreator) { alert('Hanya admin atau pembuat room yang dapat menghapus room ini.'); return; }

      if (window.confirm(`Anda yakin ingin menghapus room "${roomToDelete.name}" secara permanen? Semua pesan di dalamnya akan hilang.`)) {
        setRooms(prev => prev.filter(r => r.id !== roomId));
        handleLeaveJoinedRoom(roomId);
        const messagesRef = ref(currentDb, `messages/${roomId}`);
        set(messagesRef, null).then(() => console.log(`Messages for room ${roomId} deleted.`)).catch(error => console.error(`Gagal menghapus pesan untuk room ${roomId}:`, error));
      }
    }).catch(error => {
      console.error('Gagal memeriksa status admin:', error);
      alert('Gagal memverifikasi izin penghapusan.');
    });
  }, [currentUser, rooms, currentRoom, database, firebaseUser, handleLeaveJoinedRoom]);

  const handleSendMessage = useCallback((message: Partial<ChatMessage>) => {
    if (!database || !currentRoom?.id || !firebaseUser?.uid || !currentUser?.username) {
      console.error('Prasyarat kirim pesan gagal', { db: !!database, room: currentRoom?.id, fbUid: firebaseUser?.uid, appUser: currentUser?.username });
      alert('Gagal mengirim: Belum login, data tidak lengkap, atau masalah koneksi.');
      return;
    }
    if (!message.text?.trim() && !message.fileURL) {
      console.warn('Attempted to send an empty message.');
      return;
    }

    const messageToSend: Omit<ChatMessage, 'id'> & { type: 'user' } = {
      type: 'user',
      uid: firebaseUser.uid,
      sender: currentUser.username,
      timestamp: Date.now(),
      reactions: {},
      ...(message.text && { text: message.text.trim() }),
      ...(message.fileURL && { fileURL: message.fileURL }),
      ...(message.fileName && { fileName: message.fileName }),
    };

    const messageListRef = ref(database, `messages/${currentRoom.id}`);
    const newMessageRef = push(messageListRef);
    set(newMessageRef, messageToSend).catch((error) => {
      console.error('Firebase send message error:', error);
      alert(`Gagal mengirim pesan.${(error as any).code === 'PERMISSION_DENIED' ? ' Akses ditolak. Periksa aturan database.' : ''}`);
    });
  }, [currentRoom, currentUser, database, firebaseUser]);

  const handleReaction = useCallback((messageId: string, emoji: string) => {
    if (!database || !currentRoom?.id || !firebaseUser?.uid || !messageId || !emoji) {
      console.warn('React prerequisites failed', { db: !!database, room: currentRoom?.id, fbUid: firebaseUser?.uid, msgId: messageId, emoji });
      return;
    }
    const username = currentUser?.username;
    if (!username) { console.warn('Cannot react: Missing app username'); return; }

    const reactionUserListRef = ref(database, `messages/${currentRoom.id}/${messageId}/reactions/${emoji}`);
    get(reactionUserListRef).then((snapshot) => {
      const usersForEmoji: string[] = snapshot.val() || [];
      let updatedUsers: string[] | null;
      if (!Array.isArray(usersForEmoji)) {
        console.error('Invalid data format for reactions, expected array or null:', usersForEmoji);
        updatedUsers = [username];
      } else if (usersForEmoji.includes(username)) {
        updatedUsers = usersForEmoji.filter(u => u !== username);
        if (updatedUsers.length === 0) updatedUsers = null;
      } else {
        updatedUsers = [...usersForEmoji, username];
      }
      set(reactionUserListRef, updatedUsers).catch(error => console.error(`Failed to update reaction for emoji ${emoji}:`, error));
    }).catch(error => console.error(`Failed to get reaction data for emoji ${emoji}:`, error));
  }, [currentRoom, currentUser, database, firebaseUser]);

  const handleDeleteMessage = useCallback((roomId: string, messageId: string) => {
    if (!database || !roomId || !messageId) {
      console.error('Cannot delete message: Missing database, roomId, or messageId.');
      alert('Gagal menghapus pesan: Informasi tidak lengkap.');
      return;
    }
    const messageRef = ref(database, `messages/${roomId}/${messageId}`);
    set(messageRef, null).then(() => {
      console.log(`Message ${messageId} in room ${roomId} deleted successfully.`);
    }).catch(error => {
      console.error(`Failed to delete message ${messageId} in room ${roomId}:`, error);
      alert('Gagal menghapus pesan. Periksa koneksi atau izin Anda.');
    });
  }, [database]);

  const totalUsers = useMemo(() => rooms.reduce((sum, r) => sum + (r.userCount || 0), 0), [rooms]);
  const heroCoin = useMemo(() => searchedCoin || trendingCoins[0] || null, [searchedCoin, trendingCoins]);
  const otherTrendingCoins = useMemo(() => searchedCoin ? [] : trendingCoins.slice(1), [searchedCoin, trendingCoins]);
  const hotCoinForHeader = useMemo(() => trendingCoins.length > 1 ? { name: trendingCoins[1].name, logo: trendingCoins[1].image, price: trendingCoins[1].price, change: trendingCoins[1].change } : null, [trendingCoins]);

  const renderActivePage = () => {
    switch (activePage) {
      case 'home':
        return <HomePage idrRate={idrRate} isRateLoading={isRateLoading} currency={currency} onIncrementAnalysisCount={handleIncrementAnalysisCount} fullCoinList={fullCoinList} isCoinListLoading={isCoinListLoading} coinListError={coinListError} heroCoin={heroCoin} otherTrendingCoins={otherTrendingCoins} isTrendingLoading={isTrendingLoading} trendingError={trendingError} onSelectCoin={handleSelectCoin} onReloadTrending={handleResetToTrending} />;
      case 'rooms':
        return <RoomsListPage rooms={rooms} onJoinRoom={handleJoinRoom} onCreateRoom={handleCreateRoom} totalUsers={totalUsers} hotCoin={hotCoinForHeader} userProfile={currentUser} currentRoomId={currentRoom?.id || null} joinedRoomIds={joinedRoomIds} onLeaveJoinedRoom={handleLeaveJoinedRoom} unreadCounts={unreadCounts} onDeleteRoom={handleDeleteRoom} />;
      case 'forum': {
        let displayMessages = currentRoom ? (firebaseMessages[currentRoom.id] || []) : [];

        if (displayMessages.length === 0 && currentRoom && defaultMessages[currentRoom.id]) {
          displayMessages = defaultMessages[currentRoom.id];
        }

        if (currentRoom && !DEFAULT_ROOM_IDS.includes(currentRoom.id) && displayMessages.length > 0) {
          const hasDisclaimer = displayMessages.some(msg => isChatMessage(msg) && msg.type === 'system' && msg.text === DISCLAIMER_MESSAGE_TEXT);
          if (!hasDisclaimer) {
            const earliestTimestamp = displayMessages.reduce((minTs, msg) => {
              const currentTs = isNewsArticle(msg) ? msg.published_on * 1000 : (isChatMessage(msg) ? msg.timestamp : Infinity);
              return Math.min(minTs, currentTs);
            }, Infinity);
            const disclaimerMsg: ChatMessage = {
              id: `${currentRoom.id}-disclaimer-${Date.now()}`,
              type: 'system',
              text: DISCLAIMER_MESSAGE_TEXT,
              sender: 'system',
              timestamp: earliestTimestamp === Infinity ? Date.now() : earliestTimestamp - 1,
              reactions: {}
            };
            displayMessages = [disclaimerMsg, ...displayMessages];
          }
        }

        const messagesToPass = Array.isArray(displayMessages) ? displayMessages : [];
        return <ForumPage room={currentRoom} messages={messagesToPass} userProfile={currentUser} onSendMessage={handleSendMessage} onLeaveRoom={handleLeaveRoom} onReact={handleReaction} onDeleteMessage={handleDeleteMessage} />;
      }
      case 'about':
        return <AboutPage />;
      default:
        return <HomePage idrRate={idrRate} isRateLoading={isRateLoading} currency={currency} onIncrementAnalysisCount={handleIncrementAnalysisCount} fullCoinList={fullCoinList} isCoinListLoading={isCoinListLoading} coinListError={coinListError} heroCoin={heroCoin} otherTrendingCoins={otherTrendingCoins} isTrendingLoading={isTrendingLoading} trendingError={trendingError} onSelectCoin={handleSelectCoin} onReloadTrending={handleResetToTrending} />;
    }
  };

  if (isAuthLoading) {
    return <div className="min-h-screen bg-transparent text-white flex items-center justify-center">Memverifikasi sesi Anda...</div>;
  }

  let contentToRender;
  if (firebaseUser) {
    if (pendingGoogleUser) {
      contentToRender = <CreateIdPage onProfileComplete={handleProfileComplete} googleProfile={pendingGoogleUser} />;
    } else if (currentUser && currentUser.username) {
      contentToRender = (
        <>
          <Header userProfile={currentUser} onLogout={handleLogout} activePage={activePage} onNavigate={handleNavigate} currency={currency} onCurrencyChange={setCurrency} hotCoin={hotCoinForHeader} idrRate={idrRate} />
          <main className="flex-grow">{renderActivePage()}</main>
          <Footer />
        </>
      );
    } else if (currentUser && !currentUser.username) {
      console.warn('User logged in but missing username, showing CreateIdPage again.');
      if (currentUser.googleProfilePicture && currentUser.email) {
        contentToRender = <CreateIdPage onProfileComplete={handleProfileComplete} googleProfile={{ email: currentUser.email, name: currentUser.email, picture: currentUser.googleProfilePicture }} />;
      } else {
        console.error('Cannot show CreateIdPage: missing Google profile data. Forcing logout.');
        handleLogout();
        contentToRender = <LoginPage onGoogleRegisterSuccess={handleGoogleRegisterSuccess} />;
      }
    } else {
      console.error('Invalid state: Firebase user exists but no local user or pending Google user. Forcing logout.');
      handleLogout();
      contentToRender = <LoginPage onGoogleRegisterSuccess={handleGoogleRegisterSuccess} />;
    }
  } else {
    contentToRender = <LoginPage onGoogleRegisterSuccess={handleGoogleRegisterSuccess} />;
  }

  return (
    <div className="min-h-screen bg-transparent text-white font-sans flex flex-col">
      <Particles />
      {contentToRender}
      {authError && (
        <div className="fixed bottom-4 right-4 bg-red-600 text-white p-3 rounded-lg shadow-lg z-50">
          Error: {authError} <button onClick={() => setAuthError(null)} className="ml-2 text-sm underline">Tutup</button>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const googleClientId = process.env.GOOGLE_CLIENT_ID || '';

  if (!database && googleClientId) {
    return (
      <div style={{ color: 'white', backgroundColor: '#0A0A0A', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
        <div style={{ border: '1px solid #FF00FF', padding: '20px', borderRadius: '8px', textAlign: 'center', maxWidth: '500px' }}>
          <h1 style={{ color: '#FF00FF', fontSize: '24px' }}>Kesalahan Koneksi Database</h1>
          <p style={{ marginTop: '10px', lineHeight: '1.6' }}>
            Gagal terhubung ke Firebase Realtime Database. Periksa konfigurasi Firebase Anda (terutama <code>FIREBASE_DATABASE_URL</code>) dan koneksi internet.
          </p>
        </div>
      </div>
    );
  }

  if (!googleClientId) {
    return (
      <div style={{ color: 'white', backgroundColor: '#0A0A0A', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
        <div style={{ border: '1px solid #FF00FF', padding: '20px', borderRadius: '8px', textAlign: 'center', maxWidth: '500px' }}>
          <h1 style={{ color: '#FF00FF', fontSize: '24px' }}>Kesalahan Konfigurasi</h1>
          <p style={{ marginTop: '10px', lineHeight: '1.6' }}>
            Variabel lingkungan <strong>GOOGLE_CLIENT_ID</strong> tidak ditemukan.
          </p>
        </div>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AppContent />
    </GoogleOAuthProvider>
  );
};

export default App;
