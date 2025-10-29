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
  GoogleProfile,
  NotificationSettings
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
import { ref, set, push, onValue, off, update, get, Database } from 'firebase/database';

const DEFAULT_ROOM_IDS = ['berita-kripto', 'pengumuman-aturan'];

// Helper function untuk safely menggunakan database
const safeRef = (path: string) => {
  if (!database) {
    throw new Error('Database not initialized');
  }
  return ref(database, path);
};

// Sound notification - HANYA FALLBACK WEB AUDIO API
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.5;
    
    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    console.log('Error memutar suara notifikasi:', error);
  }
};

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
    { id: 'berita-kripto', name: 'Berita Kripto', userCount: 150 },
    { id: 'pengumuman-aturan', name: 'Pengumuman & Aturan', userCount: 150 },
    { id: 'umum', name: 'Kripto Naik/Turun Hari Ini', userCount: 134, createdBy: 'Admin_RTC' },
    { id: 'meme', name: 'Meme Coin Mania', userCount: 88 },
    { id: 'xrp-army', name: 'Xrp Army', userCount: 73 },
    { id: 'roblox-tuker-kripto', name: 'Roblox Tuker Kripto', userCount: 42 },
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

  // Ref untuk melacak total unread count sebelumnya dan mencegah suara berulang
  const prevTotalUnreadRef = useRef<number>(0);
  const lastSoundPlayTimeRef = useRef<number>(0);
  const roomListenersRef = useRef<{ [roomId: string]: () => void }>({});
  const lastProcessedTimestampsRef = useRef<{ [roomId: string]: number }>({});

  // Track pesan yang dikirim oleh user sendiri untuk mencegah notifikasi suara
  const userSentMessagesRef = useRef<Set<string>>(new Set());

  // Initialize lastProcessedTimestampsRef
  useEffect(() => {
    if (!lastProcessedTimestampsRef.current) {
      lastProcessedTimestampsRef.current = {};
    }
  }, []);

  // Load notification settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('roomNotificationSettings');
    if (savedSettings) {
      try {
        setNotificationSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Gagal load pengaturan notifikasi', e);
      }
    }
  }, []);

  // Save notification settings to localStorage
  useEffect(() => {
    localStorage.setItem('roomNotificationSettings', JSON.stringify(notificationSettings));
  }, [notificationSettings]);

  const handleToggleNotification = useCallback((roomId: string, enabled: boolean) => {
    setNotificationSettings(prev => ({
      ...prev,
      [roomId]: enabled
    }));
  }, []);

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

  // Fungsi untuk mengambil dan menyimpan berita kripto ke localStorage
  const fetchAndStoreNews = useCallback(async () => {
    try {
      const fetchedArticles = await fetchNewsArticles();
      if (fetchedArticles && fetchedArticles.length > 0) {
        const articlesWithIds: NewsArticle[] = fetchedArticles.map((article, index) => ({
          ...article,
          id: `news-${Date.now()}-${index}`,
          type: 'news' as const
        }));
        
        setNewsArticles(articlesWithIds);
        localStorage.setItem('cryptoNews', JSON.stringify(articlesWithIds));
        localStorage.setItem('lastNewsFetch', Date.now().toString());
        
        // Update unread counts untuk room berita kripto jika tidak sedang aktif
        if (currentRoom?.id !== 'berita-kripto') {
          setUnreadCounts(prev => ({
            ...prev,
            'berita-kripto': (prev['berita-kripto'] || 0) + 1
          }));
        }
      }
    } catch (error) {
      console.error('Gagal mengambil berita kripto:', error);
    }
  }, [currentRoom]);

  // Fungsi untuk keluar dari room - DIPERBAIKI: Konsisten untuk semua navigasi
  const leaveCurrentRoom = useCallback(() => {
    if (!currentRoom?.id) return;
    
    const currentTime = Date.now();
    const roomId = currentRoom.id;
    
    // Update userLastVisit saat meninggalkan room
    setUserLastVisit(prev => ({
      ...prev,
      [roomId]: currentTime
    }));
    
    // Reset unread count untuk room yang ditinggalkan
    setUnreadCounts(prev => ({
      ...prev,
      [roomId]: 0
    }));
    
    // Set currentRoom menjadi null
    setCurrentRoom(null);
    
    console.log(`Left room: ${roomId}, reset unread count and updated last visit`);
  }, [currentRoom]);

  // Update userLastVisit ketika currentRoom berubah - DIPERBAIKI
  useEffect(() => {
    if (currentRoom?.id) {
      const currentTime = Date.now();
      setUserLastVisit(prev => ({
        ...prev,
        [currentRoom.id]: currentTime
      }));
      
      // Reset unread count untuk room yang sedang aktif
      setUnreadCounts(prev => ({
        ...prev,
        [currentRoom.id]: 0
      }));
    }
  }, [currentRoom]);

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

  useEffect(() => { 
    const saved = localStorage.getItem('unreadCounts'); 
    if (saved) try { 
      setUnreadCounts(JSON.parse(saved)); 
    } catch (e) { console.error('Gagal parse unreadCounts', e); } 
  }, []);
  
  useEffect(() => { 
    localStorage.setItem('unreadCounts', JSON.stringify(unreadCounts)); 
  }, [unreadCounts]);

  useEffect(() => { 
    const saved = localStorage.getItem('userLastVisit'); 
    if (saved) try { 
      setUserLastVisit(JSON.parse(saved)); 
    } catch (e) { console.error('Gagal parse userLastVisit', e); } 
  }, []);
  
  useEffect(() => { 
    localStorage.setItem('userLastVisit', JSON.stringify(userLastVisit)); 
  }, [userLastVisit]);
  
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

  // Load berita dari localStorage saat pertama kali
  useEffect(() => {
    const savedNews = localStorage.getItem('cryptoNews');
    const lastFetch = localStorage.getItem('lastNewsFetch');
    const now = Date.now();
    const twentyMinutes = 20 * 60 * 1000;

    if (savedNews) {
      try {
        setNewsArticles(JSON.parse(savedNews));
      } catch (e) {
        console.error('Gagal load berita dari localStorage:', e);
      }
    }

    // Fetch berita jika belum pernah atau sudah lebih dari 20 menit
    if (!lastFetch || (now - parseInt(lastFetch)) > twentyMinutes) {
      fetchAndStoreNews();
    }
    
    // Set interval untuk update berita setiap 20 menit
    const newsInterval = setInterval(fetchAndStoreNews, twentyMinutes);
    return () => clearInterval(newsInterval);
  }, [fetchAndStoreNews]);

  // Hitung total unread counts untuk sound notification - PERBAIKAN: EXCLUDE ROOM YANG SEDANG AKTIF
  const totalUnreadCount = useMemo(() => {
    return Object.entries(unreadCounts).reduce((total, [roomId, count]) => {
      // Hanya hitung jika:
      // 1. Notifikasi untuk room ini aktif
      // 2. Room ini BUKAN room yang sedang aktif
      if (notificationSettings[roomId] !== false && roomId !== currentRoom?.id) {
        return total + count;
      }
      return total;
    }, 0);
  }, [unreadCounts, notificationSettings, currentRoom]);

  // Play sound ketika unread count bertambah - LOGIKA DIPERBAIKI
  useEffect(() => {
    const currentTotal = totalUnreadCount;
    const previousTotal = prevTotalUnreadRef.current;
    const now = Date.now();
    
    // Mainkan sound hanya jika:
    // 1. Ada peningkatan jumlah unread
    // 2. Bukan dari 0 (saat pertama kali load)
    // 3. Minimal 1 detik sejak suara terakhir diputar
    if (currentTotal > previousTotal && 
        previousTotal > 0 && 
        (now - lastSoundPlayTimeRef.current) > 1000) {
      
      playNotificationSound();
      lastSoundPlayTimeRef.current = now;
    }
    
    prevTotalUnreadRef.current = currentTotal;
  }, [totalUnreadCount]);

  // Listener untuk messages di room yang sedang aktif
  useEffect(() => {
    if (!database) {
      console.warn('Messages listener skipped: DB not initialized.');
      if (currentRoom?.id) setFirebaseMessages(prev => ({ ...prev, [currentRoom.id]: [] }));
      return;
    }
    if (!currentRoom?.id) return;

    // Skip listener untuk room berita kripto karena menggunakan localStorage
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
              
              messagesArray.push({ 
                ...msgData, 
                id: key, 
                type, 
                reactions, 
                uid, 
                timestamp,
                ...(userCreationDate && { userCreationDate })
              });
            } else {
              console.warn('Invalid or missing message type:', key, msgData);
            }
          } else {
            console.warn('Invalid message structure or missing timestamp/published_on:', key, msgData);
          }
        });
      }

      const finalMessages = messagesArray.sort((a, b) => {
        const timeA = isNewsArticle(a) ? (a.published_on * 1000) : (isChatMessage(a) ? a.timestamp : 0);
        const timeB = isNewsArticle(b) ? (b.published_on * 1000) : (isChatMessage(b) ? b.timestamp : 0);
        if (!timeA && !timeB) return 0;
        if (!timeA) return 1;
        if (!timeB) return -1;
        return timeA - timeB;
      });

      setFirebaseMessages(prev => ({ ...prev, [currentRoom.id!]: finalMessages }));
    }, (error) => {
      console.error(`Firebase listener error room ${currentRoom?.id}:`, error);
      if (currentRoom?.id) setFirebaseMessages(prev => ({ ...prev, [currentRoom.id]: [] }));
    });

    return () => {
      if (database) off(messagesRef, 'value', listener);
    };
  }, [currentRoom, database]);

  // Listener untuk semua room untuk unread counts - PERBAIKAN: HANYA UNTUK ROOM YANG TIDAK AKTIF DAN BUKAN DARI USER SENDIRI
  useEffect(() => {
    if (!database) return;

    // Cleanup previous listeners
    Object.values(roomListenersRef.current).forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    roomListenersRef.current = {};

    joinedRoomIds.forEach(roomId => {
      // Skip room berita kripto karena menggunakan sistem berbeda
      if (roomId === 'berita-kripto') return;

      // Skip room yang sedang aktif - TIDAK PERLU LISTENER UNTUK ROOM AKTIF
      if (roomId === currentRoom?.id) return;

      const messagesRef = safeRef(`messages/${roomId}`);
      
      const listener = onValue(messagesRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
          // Jika tidak ada data, set unread count ke 0
          setUnreadCounts(prev => ({
            ...prev,
            [roomId]: 0
          }));
          return;
        }

        // Hitung pesan baru berdasarkan last visit time
        const lastVisit = userLastVisit[roomId] || 0;
        let newMessagesCount = 0;
        let hasNewMessageFromOthers = false;

        Object.values(data).forEach((msgData: any) => {
          if (!msgData) return;
          
          const timestamp = msgData.published_on ? msgData.published_on * 1000 : msgData.timestamp;
          const sender = msgData.sender;
          const isCurrentUser = sender === currentUser?.username;
          
          // PERBAIKAN: Pesan dianggap baru jika:
          // 1. Timestamp lebih baru dari last visit
          // 2. BUKAN dikirim oleh user sendiri
          // 3. Room ini BUKAN room yang sedang aktif
          if (timestamp > lastVisit && !isCurrentUser && roomId !== currentRoom?.id) {
            newMessagesCount++;
            hasNewMessageFromOthers = true;
          }
        });

        // Update unread count hanya jika ada pesan dari user lain DAN room tidak aktif
        if (hasNewMessageFromOthers && roomId !== currentRoom?.id) {
          setUnreadCounts(prev => ({
            ...prev,
            [roomId]: newMessagesCount
          }));
        } else {
          // Jika tidak ada pesan baru dari user lain, reset ke 0
          setUnreadCounts(prev => ({
            ...prev,
            [roomId]: 0
          }));
        }
      }, (error) => {
        console.error(`Listener error untuk room ${roomId}:`, error);
      });

      // Store listener untuk cleanup
      roomListenersRef.current[roomId] = () => off(messagesRef, 'value', listener);
    });

    return () => {
      // Cleanup semua listeners
      Object.values(roomListenersRef.current).forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
      roomListenersRef.current = {};
    };
  }, [joinedRoomIds, currentRoom, database, userLastVisit, currentUser]);

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
    // Keluar dari room sebelum logout
    leaveCurrentRoom();
    
    const auth = getAuth();
    signOut(auth)
      .then(() => {
        setActivePage('home');
      })
      .catch((error) => {
        console.error('Firebase signOut error:', error);
        setCurrentUser(null);
        setFirebaseUser(null);
        setActivePage('home');
      });
  }, [leaveCurrentRoom]);

  const handleIncrementAnalysisCount = useCallback((coinId: string) => {
    setAnalysisCounts(prev => {
      const current = prev[coinId] || baseAnalysisCount;
      const newCounts = { ...prev, [coinId]: current + 1 };
      localStorage.setItem('analysisCounts', JSON.stringify(newCounts));
      return newCounts;
    });
  }, [baseAnalysisCount]);

  // PERBAIKAN BESAR: Navigasi yang konsisten untuk semua tombol
  const handleNavigate = useCallback((page: Page) => {
    // Selalu keluar dari room saat navigasi, kecuali jika navigasi ke forum dari dalam room yang sama
    if (currentRoom && (page !== 'forum' || activePage !== 'forum')) {
      leaveCurrentRoom();
    }
    
    if (page === 'home' && activePage === 'home') {
      handleResetToTrending();
    } else if (page === 'forum') {
      // Jika sudah di forum dan ada currentRoom, tetap di forum
      // Jika sudah di forum tanpa currentRoom, pergi ke rooms list
      if (activePage === 'forum' && currentRoom) {
        // Tetap di forum page
        setActivePage('forum');
      } else {
        // Pergi ke rooms list
        setActivePage('rooms');
      }
    } else {
      setActivePage(page);
    }
  }, [activePage, handleResetToTrending, currentRoom, leaveCurrentRoom]);

  const handleSelectCoin = useCallback(async (coinId: string) => {
    setIsTrendingLoading(true); setTrendingError(null); setSearchedCoin(null);
    try { setSearchedCoin(await fetchCoinDetails(coinId)); }
    catch (err) { setTrendingError(err instanceof Error ? err.message : 'Gagal muat detail koin.'); }
    finally { setIsTrendingLoading(false); }
  }, []);

  const handleJoinRoom = useCallback((room: Room) => {
    setCurrentRoom(room);
    setJoinedRoomIds(prev => new Set(prev).add(room.id));
    setActivePage('forum');
    
    // Reset unread count saat masuk room
    setUnreadCounts(prev => ({
      ...prev,
      [room.id]: 0
    }));
    
    // Update last visit time untuk room ini
    const currentTime = Date.now();
    setUserLastVisit(prev => ({
      ...prev,
      [room.id]: currentTime
    }));
  }, []);
  
  // PERBAIKAN: handleLeaveRoom sekarang menggunakan leaveCurrentRoom yang konsisten
  const handleLeaveRoom = useCallback(() => { 
    leaveCurrentRoom();
    setActivePage('rooms'); 
  }, [leaveCurrentRoom]);
  
  const handleLeaveJoinedRoom = useCallback((roomId: string) => {
    if (DEFAULT_ROOM_IDS.includes(roomId)) return;
    setJoinedRoomIds(prev => { const newIds = new Set(prev); newIds.delete(roomId); return newIds; });
    setUnreadCounts(prev => { const newCounts = { ...prev }; delete newCounts[roomId]; return newCounts; });
    setUserLastVisit(prev => { const newVisits = { ...prev }; delete newVisits[roomId]; return newVisits; });
    setNotificationSettings(prev => { const newSettings = { ...prev }; delete newSettings[roomId]; return newSettings; });
    
    // Hapus listener untuk room yang ditinggalkan
    if (roomListenersRef.current[roomId]) {
      roomListenersRef.current[roomId]();
      delete roomListenersRef.current[roomId];
    }
    
    if (currentRoom?.id === roomId) { 
      leaveCurrentRoom();
      setActivePage('rooms'); 
    }
  }, [currentRoom, leaveCurrentRoom]);

  // 🔧 PERBAIKAN: handleCreateRoom dengan validasi 15 karakter
  const handleCreateRoom = useCallback((roomName: string) => {
    if (!currentUser?.username) { 
      alert('Anda harus login untuk membuat room.'); 
      return; 
    }
    
    const trimmedName = roomName.trim();
    
    // Validasi panjang nama room (maksimal 15 karakter)
    if (trimmedName.length > 15) {
      alert('Nama room maksimal 15 karakter.');
      return;
    }
    
    // Validasi panjang minimal
    if (trimmedName.length < 3) {
      alert('Nama room minimal 3 karakter.');
      return;
    }
    
    // Validasi nama room sudah ada
    if (rooms.some(r => r.name.toLowerCase() === trimmedName.toLowerCase())) { 
      alert('Nama room sudah ada. Silakan pilih nama lain.'); 
      return; 
    }
    
    const newRoom: Room = { 
      id: trimmedName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(), 
      name: trimmedName, 
      userCount: 1, 
      createdBy: currentUser.username 
    };
    
    setRooms(prev => [newRoom, ...prev]);
    handleJoinRoom(newRoom);
  }, [handleJoinRoom, rooms, currentUser]);

  const handleDeleteRoom = useCallback((roomId: string) => {
    if (!currentUser?.username || !firebaseUser) { 
      console.warn('Delete room prerequisites failed (user).'); 
      alert('Gagal menghapus: Anda belum login.'); 
      return; 
    }
    const roomToDelete = rooms.find(r => r.id === roomId);
    if (!roomToDelete || DEFAULT_ROOM_IDS.includes(roomId)) { 
      console.warn('Cannot delete default or non-existent room.'); 
      return; 
    }
    if (!database) { 
      console.error('Cannot delete room: Database not initialized.'); 
      alert('Gagal menghapus room: Koneksi database bermasalah.'); 
      return; 
    }

    try {
      const adminsRef = safeRef('admins/' + firebaseUser.uid);
      get(adminsRef).then((snapshot) => {
        const isAdmin = snapshot.exists() && snapshot.val() === true;
        const isCreator = roomToDelete.createdBy === currentUser.username;
        if (!isAdmin && !isCreator) { 
          alert('Hanya admin atau pembuat room yang dapat menghapus room ini.'); 
          return; 
        }

        if (window.confirm(`Anda yakin ingin menghapus room "${roomToDelete.name}" secara permanen? Semua pesan di dalamnya akan hilang.`)) {
          setRooms(prev => prev.filter(r => r.id !== roomId));
          handleLeaveJoinedRoom(roomId);
          const messagesRef = safeRef(`messages/${roomId}`);
          set(messagesRef, null)
            .then(() => console.log(`Messages for room ${roomId} deleted.`))
            .catch(error => console.error(`Gagal menghapus pesan untuk room ${roomId}:`, error));
        }
      }).catch(error => {
        console.error('Gagal memeriksa status admin:', error);
        alert('Gagal memverifikasi izin penghapusan.');
      });
    } catch (error) {
      console.error('Error in handleDeleteRoom:', error);
      alert('Terjadi kesalahan saat menghapus room.');
    }
  }, [currentUser, rooms, firebaseUser, handleLeaveJoinedRoom]);

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
      
      // Tandai pesan ini sebagai dikirim oleh user sendiri
      userSentMessagesRef.current.add(newMessageRef.key!);
      
      set(newMessageRef, messageToSend).catch((error) => {
        console.error('Firebase send message error:', error);
        alert(`Gagal mengirim pesan.${(error as any).code === 'PERMISSION_DENIED' ? ' Akses ditolak. Periksa aturan database.' : ''}`);
      });
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Gagal mengirim pesan.');
    }
  }, [currentRoom, currentUser, firebaseUser]);

  const handleReaction = useCallback((messageId: string, emoji: string) => {
    if (!database || !currentRoom?.id || !firebaseUser?.uid || !messageId || !emoji) {
      console.warn('React prerequisites failed', { db: !!database, room: currentRoom?.id, fbUid: firebaseUser?.uid, msgId: messageId, emoji });
      return;
    }
    const username = currentUser?.username;
    if (!username) { console.warn('Cannot react: Missing app username'); return; }

    try {
      const reactionUserListRef = safeRef(`messages/${currentRoom.id}/${messageId}/reactions/${emoji}`);
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
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  }, [currentRoom, currentUser, firebaseUser]);

  const handleDeleteMessage = useCallback((roomId: string, messageId: string) => {
    if (!database || !roomId || !messageId) {
      console.error('Cannot delete message: Missing database, roomId, or messageId.');
      alert('Gagal menghapus pesan: Informasi tidak lengkap.');
      return;
    }
    try {
      const messageRef = safeRef(`messages/${roomId}/${messageId}`);
      set(messageRef, null).then(() => {
        console.log(`Message ${messageId} in room ${roomId} deleted successfully.`);
      }).catch(error => {
        console.error(`Failed to delete message ${messageId} in room ${roomId}:`, error);
        alert('Gagal menghapus pesan. Periksa koneksi atau izin Anda.');
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Gagal menghapus pesan.');
    }
  }, []);

  const totalUsers = useMemo(() => rooms.reduce((sum, r) => sum + (r.userCount || 0), 0), [rooms]);
  const heroCoin = useMemo(() => searchedCoin || trendingCoins[0] || null, [searchedCoin, trendingCoins]);
  const otherTrendingCoins = useMemo(() => searchedCoin ? [] : trendingCoins.slice(1), [searchedCoin, trendingCoins]);
  const hotCoinForHeader = useMemo(() => trendingCoins.length > 1 ? { name: trendingCoins[1].name, logo: trendingCoins[1].image, price: trendingCoins[1].price, change: trendingCoins[1].change } : null, [trendingCoins]);

  const renderActivePage = () => {
    switch (activePage) {
      case 'home':
        return <HomePage idrRate={idrRate} isRateLoading={isRateLoading} currency={currency} onIncrementAnalysisCount={handleIncrementAnalysisCount} fullCoinList={fullCoinList} isCoinListLoading={isCoinListLoading} coinListError={coinListError} heroCoin={heroCoin} otherTrendingCoins={otherTrendingCoins} isTrendingLoading={isTrendingLoading} trendingError={trendingError} onSelectCoin={handleSelectCoin} onReloadTrending={handleResetToTrending} />;
      case 'rooms':
        return <RoomsListPage 
          rooms={rooms} 
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
          if (currentRoom.id === 'berita-kripto') {
            // Gunakan berita dari localStorage untuk room berita kripto
            displayMessages = newsArticles;
          } else {
            displayMessages = firebaseMessages[currentRoom.id] || [];
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