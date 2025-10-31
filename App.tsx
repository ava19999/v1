// App.tsx
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  
  // --- TAMBAHKAN IMPOR INI UNTUK NATIVE AUTH ---
  GoogleAuthProvider,
  signInWithCredential
  
} from 'firebase/auth';

// --- IMPOR HOOK BARU ---
import { useNativeAuth } from './hooks/useNativeAuth'; 

// Impor Komponen
import Header from './components/Header';
import Footer from './components/Footer';
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
  NotificationSettings,
  RoomUserCounts,
  TypingStatus,
  TypingUsersMap,
  FirebaseTypingStatusData
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
import { database } from './services/firebaseService'; // Menggunakan instance yang sudah diekspor
import { ref, set, push, onValue, off, update, get, Database, remove, onDisconnect } from 'firebase/database';

const DEFAULT_ROOM_IDS = ['berita-kripto', 'pengumuman-aturan'];
const TYPING_TIMEOUT = 5000; // 5 detik

// Helper function untuk safely menggunakan database
const safeRef = (path: string) => {
  if (!database) {
    throw new Error('Database not initialized');
  }
  return ref(database, path);
};

// Sound notification
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.8; 
    
    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    console.log('Error memutar suara notifikasi:', error);
  }
};

// Komponen Partikel
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

// Komponen Konten Utama
const AppContent: React.FC = () => {

  // --- PANGGIL HOOK NATIVE AUTH ---
  // Hook ini akan mendengarkan token dari Android WebView
  useNativeAuth();
  // --- AKHIR PANGGILAN HOOK ---

  const [activePage, setActivePage] = useState<Page>('home');
  const [currency, setCurrency] = useState<Currency>('usd');
  const [idrRate, setIdrRate] = useState<number | null>(null);
  const [isRateLoading, setIsRateLoading] = useState(true);
  const [users, setUsers] = useState<{ [email: string]: User }>({});
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
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
    { id: 'berita-kripto', name: 'Berita Kripto', userCount: 0, isDefaultRoom: true },
    { id: 'pengumuman-aturan', name: 'Pengumuman & Aturan', userCount: 0, isDefaultRoom: true }
  ]);
  
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [joinedRoomIds, setJoinedRoomIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('joinedRoomIds');
    if (saved) {
      try { return new Set(JSON.parse(saved)); } catch (e) { console.error('Gagal load joined rooms', e); }
    }
    return new Set(DEFAULT_ROOM_IDS);
  });
  const [unreadCounts, setUnreadCounts] = useState<{ [key: string]: number }>({});
  const [firebaseMessages, setFirebaseMessages] = useState<{ [roomId: string]: ForumMessageItem[] }>({});
  const [lastMessageTimestamps, setLastMessageTimestamps] = useState<{ [roomId: string]: number }>({});
  const [userLastVisit, setUserLastVisit] = useState<{ [roomId: string]: number }>({});
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({});
  const [roomUserCounts, setRoomUserCounts] = useState<RoomUserCounts>({});
  
  const [hasJoinedRoom, setHasJoinedRoom] = useState<{[roomId: string]: boolean}>(() => {
    const saved = localStorage.getItem('hasJoinedRoom');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error('Gagal load hasJoinedRoom', e); }
    }
    return {};
  });

  const [typingUsers, setTypingUsers] = useState<TypingUsersMap>({});
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingListenersRef = useRef<{ [roomId: string]: () => void }>({});

  const prevTotalUnreadRef = useRef<number>(0);
  const lastSoundPlayTimeRef = useRef<number>(0);
  const roomListenersRef = useRef<{ [roomId: string]: () => void }>({});
  const lastProcessedTimestampsRef = useRef<{ [roomId: string]: number }>({});
  const userSentMessagesRef = useRef<Set<string>>(new Set());

  // Inisialisasi lastProcessedTimestampsRef
  useEffect(() => {
    if (!lastProcessedTimestampsRef.current) {
      lastProcessedTimestampsRef.current = {};
    }
  }, []);

  // Listener untuk data Rooms dari Firebase
  useEffect(() => {
    if (!database) {
      console.warn('Firebase rooms listener skipped: Database not initialized.');
      return;
    }
    const roomsRef = safeRef('rooms');
    const listener = onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const roomsArray: Room[] = [];
        const userCounts: RoomUserCounts = {};
        Object.keys(data).forEach(key => {
          const roomData = data[key];
          if (roomData && typeof roomData === 'object') {
            const userCount = roomData.userCount || 0;
            roomsArray.push({
              id: key,
              name: roomData.name,
              userCount: userCount,
              createdBy: roomData.createdBy,
              isDefaultRoom: roomData.isDefaultRoom || false
            });
            userCounts[key] = userCount;
          }
        });
        setRoomUserCounts(userCounts);
        const defaultRooms = [
          { id: 'berita-kripto', name: 'Berita Kripto', userCount: 0, isDefaultRoom: true },
          { id: 'pengumuman-aturan', name: 'Pengumuman & Aturan', userCount: 0, isDefaultRoom: true }
        ];
        const combinedRooms = [...defaultRooms, ...roomsArray.filter(r => !DEFAULT_ROOM_IDS.includes(r.id))];
        setRooms(combinedRooms);
      }
    }, (error) => {
      console.error('Firebase rooms listener error:', error);
    });
    return () => {
      if (database) off(roomsRef, 'value', listener);
    };
  }, [database]);

  // Fungsi untuk update jumlah user di room
  const updateRoomUserCount = useCallback(async (roomId: string, increment: boolean) => {
    if (!database || DEFAULT_ROOM_IDS.includes(roomId)) return;
    try {
      const roomRef = safeRef(`rooms/${roomId}/userCount`);
      const snapshot = await get(roomRef);
      const currentCount = snapshot.val() || 0;
      const newCount = increment ? currentCount + 1 : Math.max(0, currentCount - 1);
      await set(roomRef, newCount);
      setRoomUserCounts(prev => ({ ...prev, [roomId]: newCount }));
    } catch (error) {
      console.error('Error updating room user count:', error);
    }
  }, [database]);

  // Load/Save pengaturan notifikasi
  useEffect(() => {
    const savedSettings = localStorage.getItem('roomNotificationSettings');
    if (savedSettings) {
      try { setNotificationSettings(JSON.parse(savedSettings)); } catch (e) { console.error('Gagal load pengaturan notifikasi', e); }
    }
  }, []);
  useEffect(() => {
    localStorage.setItem('roomNotificationSettings', JSON.stringify(notificationSettings));
  }, [notificationSettings]);
  const handleToggleNotification = useCallback((roomId: string, enabled: boolean) => {
    setNotificationSettings(prev => ({ ...prev, [roomId]: enabled }));
  }, []);

  // Fetch data trending
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

  // Fetch berita
  const fetchAndStoreNews = useCallback(async () => {
    try {
      const fetchedArticles = await fetchNewsArticles();
      if (fetchedArticles && fetchedArticles.length > 0) {
        const articlesWithIds: NewsArticle[] = fetchedArticles.map((article, index) => ({
          ...article, id: `news-${Date.now()}-${index}`, type: 'news' as const
        }));
        setNewsArticles(articlesWithIds);
        localStorage.setItem('cryptoNews', JSON.stringify(articlesWithIds));
        localStorage.setItem('lastNewsFetch', Date.now().toString());
        if (currentRoom?.id !== 'berita-kripto') {
          setUnreadCounts(prev => ({ ...prev, 'berita-kripto': (prev['berita-kripto'] || 0) + 1 }));
        }
      }
    } catch (error) {
      console.error('Gagal mengambil berita kripto:', error);
    }
  }, [currentRoom]);

  // Logika saat meninggalkan room
  const leaveCurrentRoom = useCallback(() => {
    if (!currentRoom?.id) return;
    const currentTime = Date.now();
    const roomId = currentRoom.id;
    setUserLastVisit(prev => ({ ...prev, [roomId]: currentTime }));
    setUnreadCounts(prev => ({ ...prev, [roomId]: 0 }));
    if (database && firebaseUser?.uid) {
      const typingRef = safeRef(`typing/${roomId}/${firebaseUser.uid}`);
      remove(typingRef).catch(error => console.error("Error removing typing status on leave:", error));
    }
    setCurrentRoom(null);
    console.log(`Left room: ${roomId}, reset unread count, updated last visit, removed typing status.`);
  }, [currentRoom, database, firebaseUser]);

  // Update last visit & reset unread saat masuk room
  useEffect(() => {
    if (currentRoom?.id) {
      const currentTime = Date.now();
      setUserLastVisit(prev => ({ ...prev, [currentRoom.id]: currentTime }));
      setUnreadCounts(prev => ({ ...prev, [currentRoom.id]: 0 }));
    }
  }, [currentRoom]);

  // Load 'users' dari localStorage saat start
  useEffect(() => {
    try {
      const u = localStorage.getItem('cryptoUsers');
      if (u) setUsers(JSON.parse(u));
    } catch (e) { console.error('Gagal load users', e); }
  }, []);

  // --- onAuthStateChanged (Sudah dimodifikasi) ---
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
        // User terdeteksi di Firebase
        const appUser = Object.values(users).find(u => u.email === user.email);
        
        if (appUser) {
          // --- KASUS 1: User lokal sudah ada (login email/pass ATAU Google yg sudah ada) ---
          if (!currentUser || currentUser.email !== appUser.email) {
            setCurrentUser(appUser);
             if (database && currentRoom?.id) {
               try {
                 const typingRef = safeRef(`typing/${currentRoom.id}/${user.uid}`);
                 onDisconnect(typingRef).remove();
               } catch(e) { console.error("[AUTH] Error setting onDisconnect:", e); }
             }
          }
        } else {
          // --- KASUS 2: User Firebase ada, tapi user lokal TIDAK (Ini adalah kasus Native Google Login) ---
          console.log("Firebase user terdeteksi, tapi data user lokal tidak ada. Membuat user lokal dari data Google...");

          // Buat user baru dari data Firebase Auth (yang didapat dari Google)
          const newAppUser: User = {
            email: user.email || "no-email@google.com",
            // Gunakan displayName dari Firebase (diatur oleh Google login)
            username: user.displayName || user.email?.split('@')[0] || `User${Date.now().toString().slice(-4)}`,
            // Gunakan foto profil Google dari Firebase
            googleProfilePicture: user.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.email}`,
            // Dapatkan tanggal pembuatan dari metadata Firebase jika ada
            createdAt: user.metadata.creationTime ? new Date(user.metadata.creationTime).getTime() : Date.now(),
            // Password bisa dikosongkan karena mereka login via Google
          };

          // Simpan user baru ini ke state 'users'
          setUsers(prev => ({ ...prev, [newAppUser.email]: newAppUser }));
          
          // Set sebagai currentUser
          setCurrentUser(newAppUser);
          
          if (database && currentRoom?.id) {
            try {
              const typingRef = safeRef(`typing/${currentRoom.id}/${user.uid}`);
              onDisconnect(typingRef).remove();
            } catch(e) { console.error("[AUTH] Error setting onDisconnect (new user):", e); }
          }
        }
      } else {
        // --- KASUS 3: User logged out ---
        if (currentUser !== null) setCurrentUser(null);
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, [users, currentUser, database, currentRoom]); // dependensi tetap


  // --- Persistence useEffects ---
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
  useEffect(() => { 
    const saved = localStorage.getItem('unreadCounts'); 
    if (saved) try { setUnreadCounts(JSON.parse(saved)); } catch (e) { console.error('Gagal parse unreadCounts', e); } 
  }, []);
  useEffect(() => { 
    localStorage.setItem('unreadCounts', JSON.stringify(unreadCounts)); 
  }, [unreadCounts]);
  useEffect(() => { 
    const saved = localStorage.getItem('userLastVisit'); 
    if (saved) try { setUserLastVisit(JSON.parse(saved)); } catch (e) { console.error('Gagal parse userLastVisit', e); } 
  }, []);
  useEffect(() => { 
    localStorage.setItem('userLastVisit', JSON.stringify(userLastVisit)); 
  }, [userLastVisit]);
  useEffect(() => {
    try { localStorage.setItem('hasJoinedRoom', JSON.stringify(hasJoinedRoom)); } catch (e) { console.error('Gagal simpan hasJoinedRoom', e); }
  }, [hasJoinedRoom]);
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

  // --- Data Fetching useEffects ---
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
    const savedNews = localStorage.getItem('cryptoNews');
    const lastFetch = localStorage.getItem('lastNewsFetch');
    const now = Date.now();
    const twentyMinutes = 20 * 60 * 1000;
    if (savedNews) {
      try { setNewsArticles(JSON.parse(savedNews)); } catch (e) { console.error('Gagal load berita dari localStorage:', e); }
    }
    if (!lastFetch || (now - parseInt(lastFetch)) > twentyMinutes) {
      fetchAndStoreNews();
    }
    const newsInterval = setInterval(fetchAndStoreNews, twentyMinutes);
    return () => clearInterval(newsInterval);
  }, [fetchAndStoreNews]);

  // --- Notification Sound Effect ---
  const totalUnreadCount = useMemo(() => {
    return Object.entries(unreadCounts).reduce((total, [roomId, count]) => {
      if (notificationSettings[roomId] !== false && roomId !== currentRoom?.id) {
        return total + count;
      }
      return total;
    }, 0);
  }, [unreadCounts, notificationSettings, currentRoom]);
  useEffect(() => {
    const currentTotal = totalUnreadCount;
    const previousTotal = prevTotalUnreadRef.current;
    const now = Date.now();
    if (currentTotal > previousTotal && previousTotal > 0 && (now - lastSoundPlayTimeRef.current) > 1000) {
      playNotificationSound();
      lastSoundPlayTimeRef.current = now;
    }
    prevTotalUnreadRef.current = currentTotal;
  }, [totalUnreadCount]);

  // --- Firebase Message Listeners ---
  useEffect(() => {
    if (!database || !currentRoom?.id) {
      if (currentRoom?.id) setFirebaseMessages(prev => ({ ...prev, [currentRoom.id]: [] }));
      return;
    }
    if (currentRoom.id === 'berita-kripto') {
      setFirebaseMessages(prev => ({ ...prev, [currentRoom.id]: [] }));
      return;
    }
    const messagesRef = safeRef(`messages/${currentRoom.id}`);
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
              const userCreationDate = type === 'user' ? msgData.userCreationDate : undefined;
              messagesArray.push({ ...msgData, id: key, type, reactions, uid, timestamp, ...(userCreationDate && { userCreationDate }) });
            } else { console.warn('Invalid or missing message type:', key, msgData); }
          } else { console.warn('Invalid message structure or missing timestamp/published_on:', key, msgData); }
        });
      }
      const finalMessages = messagesArray.sort((a, b) => {
        const timeA = isNewsArticle(a) ? (a.published_on * 1000) : (isChatMessage(a) ? a.timestamp : 0);
        const timeB = isNewsArticle(b) ? (b.published_on * 1000) : (isChatMessage(b) ? b.timestamp : 0);
        if (!timeA && !timeB) return 0; if (!timeA) return 1; if (!timeB) return -1;
        return timeA - timeB;
      });
      setFirebaseMessages(prev => ({ ...prev, [currentRoom.id!]: finalMessages }));
    }, (error) => {
      console.error(`Firebase listener error room ${currentRoom?.id}:`, error);
      if (currentRoom?.id) setFirebaseMessages(prev => ({ ...prev, [currentRoom.id]: [] }));
    });
    return () => { if (database) off(messagesRef, 'value', listener); };
  }, [currentRoom, database]);

  // Unread count listener
  useEffect(() => {
    if (!database) return;
    Object.values(roomListenersRef.current).forEach(unsubscribe => { if (typeof unsubscribe === 'function') unsubscribe(); });
    roomListenersRef.current = {};
    joinedRoomIds.forEach(roomId => {
      if (roomId === 'berita-kripto' || roomId === currentRoom?.id) return;
      const messagesRef = safeRef(`messages/${roomId}`);
      const listener = onValue(messagesRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) { setUnreadCounts(prev => ({ ...prev, [roomId]: 0 })); return; }
        const lastVisit = userLastVisit[roomId] || 0;
        let newMessagesCount = 0;
        let hasNewMessageFromOthers = false;
        Object.values(data).forEach((msgData: any) => {
          if (!msgData) return;
          const timestamp = msgData.published_on ? msgData.published_on * 1000 : msgData.timestamp;
          const sender = msgData.sender;
          const isCurrentUser = sender === currentUser?.username;
          if (timestamp > lastVisit && !isCurrentUser && roomId !== currentRoom?.id) {
            newMessagesCount++;
            hasNewMessageFromOthers = true;
          }
        });
        if (hasNewMessageFromOthers && roomId !== currentRoom?.id) {
          setUnreadCounts(prev => ({ ...prev, [roomId]: newMessagesCount }));
        } else {
          setUnreadCounts(prev => ({ ...prev, [roomId]: 0 }));
        }
      }, (error) => { console.error(`Listener error untuk room ${roomId}:`, error); });
      roomListenersRef.current[roomId] = () => off(messagesRef, 'value', listener);
    });
    return () => {
      Object.values(roomListenersRef.current).forEach(unsubscribe => { if (typeof unsubscribe === 'function') unsubscribe(); });
      roomListenersRef.current = {};
    };
  }, [joinedRoomIds, currentRoom, database, userLastVisit, currentUser]);

  // Typing indicator listener
  useEffect(() => {
    if (!database) { console.warn("Typing listener skipped: DB not initialized."); return; }
    Object.values(typingListenersRef.current).forEach(unsubscribe => unsubscribe());
    typingListenersRef.current = {};
    joinedRoomIds.forEach(roomId => {
      if (roomId === 'berita-kripto') return;
      const typingRoomRef = safeRef(`typing/${roomId}`);
      const listener = onValue(typingRoomRef, (snapshot) => {
        const typingData = snapshot.val() as FirebaseTypingStatusData[string] | null;
        setTypingUsers(prev => {
          const updatedRoomTyping: { [userId: string]: TypingStatus } = {};
          const now = Date.now();
          let changed = false;
          if (typingData) {
            Object.entries(typingData).forEach(([userId, status]) => {
              if (status && status.timestamp && now - status.timestamp < TYPING_TIMEOUT && userId !== firebaseUser?.uid) {
                updatedRoomTyping[userId] = { username: status.username ?? 'Unknown', userCreationDate: status.userCreationDate ?? null, timestamp: status.timestamp };
              }
            });
          }
          const oldRoomData = prev[roomId] || {};
          if (JSON.stringify(oldRoomData) !== JSON.stringify(updatedRoomTyping)) changed = true;
          if (changed) return { ...prev, [roomId]: updatedRoomTyping };
          return prev;
        });
      }, (error) => {
        console.error(`[Typing Listener] Firebase error for room ${roomId}:`, error);
        setTypingUsers(prev => ({ ...prev, [roomId]: {} }));
      });
      typingListenersRef.current[roomId] = () => { if(database) off(typingRoomRef, 'value', listener); };
    });
    return () => {
      Object.values(typingListenersRef.current).forEach(unsubscribe => unsubscribe());
      typingListenersRef.current = {};
    };
  }, [database, joinedRoomIds, firebaseUser?.uid, currentUser]);

  
  // --- Auth Handlers (untuk login email/pass) ---
  const handleLogin = useCallback(async (username: string, password: string): Promise<string | void> => {
    setAuthError(null);
    const appUser = Object.values(users).find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!appUser) {
      const errMsg = 'Username atau kata sandi salah.';
      setAuthError(errMsg);
      return errMsg;
    }
    const email = appUser.email;
    const auth = getAuth();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error('Firebase signIn error:', error);
      let errMsg = 'Login gagal.';
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errMsg = 'Username atau kata sandi salah.';
      }
      setAuthError(errMsg);
      return errMsg;
    }
  }, [users]);

  const handleRegister = useCallback(async (username: string, email: string, password: string): Promise<string | void> => {
    setAuthError(null);
    if (Object.values(users).some(u => u.username.toLowerCase() === username.toLowerCase())) {
      const errorMsg = 'Username sudah digunakan. Pilih username lain.';
      setAuthError(errorMsg);
      return errorMsg;
    }
    const auth = getAuth();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName: username });
      }
      const newUser: User = {
        email: email,
        username: username,
        password: password, 
        googleProfilePicture: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}`,
        createdAt: Date.now()
      };
      setUsers(prev => ({ ...prev, [newUser.email]: newUser }));
      setCurrentUser(newUser);
    } catch (error: any) {
      console.error('Firebase register error:', error);
      let errMsg = 'Registrasi gagal.';
      if (error.code === 'auth/email-already-in-use') errMsg = 'Email ini sudah terdaftar. Silakan login.';
      else if (error.code === 'auth/weak-password') errMsg = 'Kata sandi terlalu lemah.';
      setAuthError(errMsg);
      return errMsg;
    }
  }, [users]);

  // --- General App Handlers ---
  const handleLogout = useCallback(() => {
    leaveCurrentRoom();
    const auth = getAuth();
    signOut(auth).catch((error) => console.error('Firebase signOut error:', error));
    // State (currentUser, firebaseUser) akan di-null-kan oleh onAuthStateChanged
    setActivePage('home');
  }, [leaveCurrentRoom]);

  const handleIncrementAnalysisCount = useCallback((coinId: string) => {
    setAnalysisCounts(prev => {
      const current = prev[coinId] || baseAnalysisCount;
      const newCounts = { ...prev, [coinId]: current + 1 };
      localStorage.setItem('analysisCounts', JSON.stringify(newCounts));
      return newCounts;
    });
  }, [baseAnalysisCount]);

  const handleNavigate = useCallback((page: Page) => {
    if (currentRoom && (page !== 'forum' || activePage !== 'forum')) leaveCurrentRoom();
    if (page === 'home' && activePage === 'home') handleResetToTrending();
    else if (page === 'forum') setActivePage(activePage === 'forum' && currentRoom ? 'forum' : 'rooms');
    else setActivePage(page);
  }, [activePage, handleResetToTrending, currentRoom, leaveCurrentRoom]);

  const handleSelectCoin = useCallback(async (coinId: string) => {
    setIsTrendingLoading(true); setTrendingError(null); setSearchedCoin(null);
    try { setSearchedCoin(await fetchCoinDetails(coinId)); }
    catch (err) { setTrendingError(err instanceof Error ? err.message : 'Gagal muat detail koin.'); }
    finally { setIsTrendingLoading(false); }
  }, []);

  // --- Room Handlers ---
  const handleJoinRoom = useCallback((room: Room) => {
    setCurrentRoom(room);
    const isFirstTimeJoin = !hasJoinedRoom[room.id];
    setJoinedRoomIds(prev => new Set(prev).add(room.id));
    setActivePage('forum');
    if (!room.isDefaultRoom && isFirstTimeJoin) {
      updateRoomUserCount(room.id, true);
      setHasJoinedRoom(prev => ({ ...prev, [room.id]: true }));
    }
    setUnreadCounts(prev => ({ ...prev, [room.id]: 0 }));
    const currentTime = Date.now();
    setUserLastVisit(prev => ({ ...prev, [room.id]: currentTime }));
     if (database && firebaseUser?.uid) {
       try {
        const typingRef = safeRef(`typing/${room.id}/${firebaseUser.uid}`);
        onDisconnect(typingRef).remove();
       } catch(e) { console.error("[JOIN] Error setting onDisconnect on join:", e); }
     }
  }, [updateRoomUserCount, hasJoinedRoom, database, firebaseUser]);
  
  const handleLeaveRoom = useCallback(() => { 
    leaveCurrentRoom();
    setActivePage('rooms'); 
  }, [leaveCurrentRoom]);
  
  const handleLeaveJoinedRoom = useCallback((roomId: string) => {
    if (DEFAULT_ROOM_IDS.includes(roomId)) return;
    if (hasJoinedRoom[roomId]) {
      updateRoomUserCount(roomId, false);
      setHasJoinedRoom(prev => ({ ...prev, [roomId]: false }));
    }
    setJoinedRoomIds(prev => { const newIds = new Set(prev); newIds.delete(roomId); return newIds; });
    setUnreadCounts(prev => { const newCounts = { ...prev }; delete newCounts[roomId]; return newCounts; });
    setUserLastVisit(prev => { const newVisits = { ...prev }; delete newVisits[roomId]; return newVisits; });
    setNotificationSettings(prev => { const newSettings = { ...prev }; delete newSettings[roomId]; return newSettings; });
    if (roomListenersRef.current[roomId]) {
      roomListenersRef.current[roomId]();
      delete roomListenersRef.current[roomId];
    }
     if (database && firebaseUser?.uid) {
       try {
        const typingRef = safeRef(`typing/${roomId}/${firebaseUser.uid}`);
        remove(typingRef).catch(error => console.error("Error removing typing status on leave joined:", error));
       } catch(e) { console.error("Error removing typing status on leave joined (outer):", e); }
     }
    if (currentRoom?.id === roomId) { 
      leaveCurrentRoom();
      setActivePage('rooms'); 
    }
  }, [currentRoom, leaveCurrentRoom, updateRoomUserCount, hasJoinedRoom, database, firebaseUser]);

  const handleCreateRoom = useCallback((roomName: string) => {
    if (!currentUser?.username || !firebaseUser) { alert('Anda harus login untuk membuat room.'); return; }
    const trimmedName = roomName.trim();
    if (trimmedName.length > 25) { alert('Nama room maksimal 25 karakter.'); return; }
    if (trimmedName.length < 3) { alert('Nama room minimal 3 karakter.'); return; }
    if (rooms.some(r => r.name.toLowerCase() === trimmedName.toLowerCase())) { alert('Nama room sudah ada.'); return; }
    if (!database) { alert('Database tidak tersedia. Coba lagi nanti.'); return; }
    const roomId = `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newRoom: Room = { id: roomId, name: trimmedName, userCount: 1, createdBy: currentUser.username, isDefaultRoom: false };
    try {
      const roomRef = safeRef(`rooms/${roomId}`);
      const roomData = { name: trimmedName, userCount: 1, createdBy: currentUser.username, createdAt: Date.now(), isDefaultRoom: false };
      set(roomRef, roomData)
      .then(() => {
        setHasJoinedRoom(prev => ({ ...prev, [roomId]: true }));
        handleJoinRoom(newRoom);
      })
      .catch((error) => {
        console.error('Gagal membuat room di Firebase:', error);
        alert(error.code === 'PERMISSION_DENIED' ? 'Izin ditolak. Periksa Firebase Rules.' : 'Gagal membuat room.');
      });
    } catch (error) {
      console.error('Error dalam handleCreateRoom:', error);
      alert('Terjadi kesalahan saat membuat room.');
    }
  }, [handleJoinRoom, rooms, currentUser, database, firebaseUser]);

  const handleDeleteRoom = useCallback((roomId: string) => {
    if (!currentUser?.username || !firebaseUser) { alert('Gagal menghapus: Anda belum login.'); return; }
    const roomToDelete = rooms.find(r => r.id === roomId);
    if (!roomToDelete || DEFAULT_ROOM_IDS.includes(roomId)) return; 
    if (!database) { alert('Gagal menghapus room: Koneksi database bermasalah.'); return; }
    try {
      const adminsRef = safeRef('admins/' + firebaseUser.uid);
      get(adminsRef).then((snapshot) => {
        const isAdmin = snapshot.exists() && snapshot.val() === true;
        const isCreator = roomToDelete.createdBy === currentUser.username;
        if (!isAdmin && !isCreator) { alert('Hanya admin atau pembuat room yang dapat menghapus room ini.'); return; }
        if (window.confirm(`Yakin ingin menghapus room "${roomToDelete.name}"?`)) {
          remove(safeRef(`rooms/${roomId}`))
            .then(() => remove(safeRef(`messages/${roomId}`)))
            .then(() => {
              setHasJoinedRoom(prev => { const newState = {...prev}; delete newState[roomId]; return newState; });
              if (currentRoom?.id === roomId) { leaveCurrentRoom(); setActivePage('rooms'); }
            })
            .catch(error => alert('Gagal menghapus room.'));
        }
      }).catch(error => alert('Gagal memverifikasi izin penghapusan.'));
    } catch (error) { alert('Terjadi kesalahan saat menghapus room.'); }
  }, [currentUser, rooms, firebaseUser, currentRoom, leaveCurrentRoom]);

  // --- Message Handlers ---
  const handleSendMessage = useCallback((message: Partial<ChatMessage>) => {
    if (!database || !currentRoom?.id || !firebaseUser?.uid || !currentUser?.username) {
      alert('Gagal mengirim: Belum login atau masalah koneksi.');
      return;
    }
    if (!message.text?.trim() && !message.fileURL) return;

    const messageToSend: Omit<ChatMessage, 'id'> & { type: 'user'; sender: string; timestamp: number; userCreationDate: number } = {
      type: 'user',
      uid: firebaseUser.uid,
      sender: currentUser.username,
      timestamp: Date.now(),
      reactions: {},
      userCreationDate: currentUser.createdAt,
      ...(message.text && { text: message.text.trim() }),
      ...(message.fileURL && { fileURL: message.fileURL }),
      ...(message.fileName && { fileName: message.fileName }),
    };

    try {
      const messageListRef = safeRef(`messages/${currentRoom.id}`);
      const newMessageRef = push(messageListRef);
      userSentMessagesRef.current.add(newMessageRef.key!);
      set(newMessageRef, messageToSend).catch((error) => alert(`Gagal mengirim pesan.`));
    } catch (error) { alert('Gagal mengirim pesan.'); }
  }, [currentRoom, currentUser, firebaseUser]);

  const handleReaction = useCallback((messageId: string, emoji: string) => {
    if (!database || !currentRoom?.id || !firebaseUser?.uid || !messageId || !emoji) return;
    const username = currentUser?.username;
    if (!username) return;

    try {
      const reactionUserListRef = safeRef(`messages/${currentRoom.id}/${messageId}/reactions/${emoji}`);
      get(reactionUserListRef).then((snapshot) => {
        const usersForEmoji: string[] = snapshot.val() || [];
        let updatedUsers: string[] | null;
        if (!Array.isArray(usersForEmoji)) updatedUsers = [username];
        else if (usersForEmoji.includes(username)) {
          updatedUsers = usersForEmoji.filter(u => u !== username);
          if (updatedUsers.length === 0) updatedUsers = null;
        } else updatedUsers = [...usersForEmoji, username];
        set(reactionUserListRef, updatedUsers).catch(error => console.error(`Failed to update reaction:`, error));
      }).catch(error => console.error(`Failed to get reaction data:`, error));
    } catch (error) { console.error('Error handling reaction:', error); }
  }, [currentRoom, currentUser, firebaseUser]);

  const handleDeleteMessage = useCallback((roomId: string, messageId: string) => {
    if (!database || !roomId || !messageId) { alert('Gagal menghapus pesan: Informasi tidak lengkap.'); return; }
    try {
      remove(safeRef(`messages/${roomId}/${messageId}`)).catch(error => alert('Gagal menghapus pesan.'));
    } catch (error) { alert('Gagal menghapus pesan.'); }
  }, []);

  // --- Typing Handlers ---
  const handleStartTyping = useCallback(() => {
    if (!database || !currentRoom?.id || !firebaseUser?.uid || !currentUser?.username || currentUser?.createdAt === undefined) return;
    const typingRef = safeRef(`typing/${currentRoom.id}/${firebaseUser.uid}`);
    const status: TypingStatus = { username: currentUser.username, userCreationDate: currentUser.createdAt, timestamp: Date.now() };
    set(typingRef, status)
    .then(() => onDisconnect(typingRef).remove())
    .catch(error => console.error("[handleStartTyping] Error:", error));
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (database && currentRoom?.id && firebaseUser?.uid) {
          remove(safeRef(`typing/${currentRoom.id}/${firebaseUser.uid}`)).catch(error => console.error("[Typing Timeout] Error:", error));
      }
      typingTimeoutRef.current = null;
    }, TYPING_TIMEOUT);
  }, [database, currentRoom, firebaseUser, currentUser]);

  const handleStopTyping = useCallback(() => {
    if (typingTimeoutRef.current) { clearTimeout(typingTimeoutRef.current); typingTimeoutRef.current = null; }
    if (!database || !currentRoom?.id || !firebaseUser?.uid) return;
    remove(safeRef(`typing/${currentRoom.id}/${firebaseUser.uid}`)).catch(error => console.error("[handleStopTyping] Error:", error));
  }, [database, currentRoom, firebaseUser]);

  // --- Memoized Values ---
  const updatedRooms = useMemo(() => rooms.map(room => ({ ...room, userCount: roomUserCounts[room.id] || room.userCount || 0 })), [rooms, roomUserCounts]);
  const totalUsers = useMemo(() => updatedRooms.reduce((sum, r) => sum + (r.userCount || 0), 0), [updatedRooms]);
  const heroCoin = useMemo(() => searchedCoin || trendingCoins[0] || null, [searchedCoin, trendingCoins]);
  const otherTrendingCoins = useMemo(() => searchedCoin ? [] : trendingCoins.slice(1), [searchedCoin, trendingCoins]);
  const hotCoinForHeader = useMemo(() => trendingCoins.length > 1 ? { name: trendingCoins[1].name, logo: trendingCoins[1].image, price: trendingCoins[1].price, change: trendingCoins[1].change } : null, [trendingCoins]);
  const currentTypingUsers = useMemo(() => {
    const currentRoomId = currentRoom?.id;
    if (!currentRoomId || !typingUsers || typeof typingUsers !== 'object') return [];
    const roomTypingData = typingUsers[currentRoomId];
    if (!roomTypingData || typeof roomTypingData !== 'object') return [];
    const now = Date.now();
    return Object.entries(roomTypingData)
        .filter(([userId, status]) => 
            userId !== firebaseUser?.uid && 
            status && typeof status.timestamp === 'number' && 
            (now - status.timestamp < TYPING_TIMEOUT)
        )
        .map(([_, status]) => ({
            username: status.username,
            userCreationDate: status.userCreationDate ?? null,
            timestamp: status.timestamp
        }));
  }, [typingUsers, currentRoom, firebaseUser?.uid]);

  // --- Render Function ---
  const renderActivePage = () => {
    switch (activePage) {
      case 'home':
        return <HomePage idrRate={idrRate} isRateLoading={isRateLoading} currency={currency} onIncrementAnalysisCount={handleIncrementAnalysisCount} fullCoinList={fullCoinList} isCoinListLoading={isCoinListLoading} coinListError={coinListError} heroCoin={heroCoin} otherTrendingCoins={otherTrendingCoins} isTrendingLoading={isTrendingLoading} trendingError={trendingError} onSelectCoin={handleSelectCoin} onReloadTrending={handleResetToTrending} />;
      case 'rooms':
        return <RoomsListPage 
          rooms={updatedRooms} 
          onJoinRoom={handleJoinRoom} 
          onCreateRoom={handleCreateRoom} 
          totalUsers={totalUsers} 
          hotCoin={hotCoinForHeader} 
          userProfile={currentUser} 
          currentRoomId={currentRoom?.id || null} 
          joinedRoomIds={joinedRoomIds} 
          onLeaveJoinedRoom={handleLeaveJoinedRoom} 
          unreadCounts={unreadCounts} 
          onDeleteRoom={handleDeleteRoom}
          onToggleNotification={handleToggleNotification}
          notificationSettings={notificationSettings}
        />;
      case 'forum': {
        let displayMessages: ForumMessageItem[] = [];
        if (currentRoom) {
          if (currentRoom.id === 'berita-kripto') displayMessages = newsArticles;
          else displayMessages = firebaseMessages[currentRoom.id] || [];
        }
        return <ForumPage 
          room={currentRoom} 
          messages={Array.isArray(displayMessages) ? displayMessages : []} 
          userProfile={currentUser} 
          onSendMessage={handleSendMessage} 
          onLeaveRoom={handleLeaveRoom} 
          onReact={handleReaction} 
          onDeleteMessage={handleDeleteMessage} 
          typingUsers={currentTypingUsers} 
          onStartTyping={handleStartTyping} 
          onStopTyping={handleStopTyping} 
        />;
      }
      case 'about':
        return <AboutPage />;
      default:
        return <HomePage idrRate={idrRate} isRateLoading={isRateLoading} currency={currency} onIncrementAnalysisCount={handleIncrementAnalysisCount} fullCoinList={fullCoinList} isCoinListLoading={isCoinListLoading} coinListError={coinListError} heroCoin={heroCoin} otherTrendingCoins={otherTrendingCoins} isTrendingLoading={isTrendingLoading} trendingError={trendingError} onSelectCoin={handleSelectCoin} onReloadTrending={handleResetToTrending} />;
    }
  };

  // --- Main Return ---
  if (isAuthLoading) {
    return <div className="min-h-screen bg-transparent text-white flex items-center justify-center">Memverifikasi sesi Anda...</div>;
  }

  // --- LOGIKA RENDER (Tidak menampilkan LoginPage) ---
  let contentToRender = (
    <>
      <Header userProfile={currentUser} onLogout={handleLogout} activePage={activePage} onNavigate={handleNavigate} currency={currency} onCurrencyChange={setCurrency} hotCoin={hotCoinForHeader} idrRate={idrRate} />
      <main className="flex-grow">{renderActivePage()}</main>
      <Footer />
    </>
  );

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

// Komponen App utama
const App: React.FC = () => {
  if (!database) {
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

  // Render AppContent secara langsung tanpa GoogleOAuthProvider
  return (
    <AppContent />
  );
};

export default App;
