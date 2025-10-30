// App.tsx - Versi Lengkap dengan Android Bridge Support
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

// Impor Tipe
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
  NotificationSettings,
  RoomUserCounts,
  TypingStatus
} from './types';
import { isNewsArticle, isChatMessage } from './types';

// Import services
import {
  fetchIdrRate,
  fetchNewsArticles,
  fetchTop500Coins,
  fetchTrendingCoins,
  fetchCoinDetails
} from './services/mockData';
import { database } from './services/firebaseService';
import { ref, set, push, onValue, off, get, remove, onDisconnect } from 'firebase/database';

// Import Android Bridge
import { useAndroidAuth } from './hooks/useAndroidAuth';
import { AndroidBridgeService } from './services/androidBridgeService';

const DEFAULT_ROOM_IDS = ['berita-kripto', 'pengumuman-aturan'];
const TYPING_TIMEOUT = 5000;

// Helper function
const safeRef = (path: string) => {
  if (!database) throw new Error('Database not initialized');
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
  // State dasar
  const [activePage, setActivePage] = useState<Page>('home');
  const [currency, setCurrency] = useState<Currency>('usd');
  const [idrRate, setIdrRate] = useState<number | null>(null);
  const [isRateLoading, setIsRateLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [pendingGoogleUser, setPendingGoogleUser] = useState<GoogleProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // State data aplikasi
  const [trendingCoins, setTrendingCoins] = useState<CryptoData[]>([]);
  const [isTrendingLoading, setIsTrendingLoading] = useState(true);
  const [trendingError, setTrendingError] = useState<string | null>(null);
  const [fullCoinList, setFullCoinList] = useState<CoinListItem[]>([]);
  const [isCoinListLoading, setIsCoinListLoading] = useState(true);
  const [coinListError, setCoinListError] = useState<string | null>(null);
  const [searchedCoin, setSearchedCoin] = useState<CryptoData | null>(null);
  
  const [rooms, setRooms] = useState<Room[]>([
    { id: 'berita-kripto', name: 'Berita Kripto', userCount: 0, isDefaultRoom: true },
    { id: 'pengumuman-aturan', name: 'Pengumuman & Aturan', userCount: 0, isDefaultRoom: true }
  ]);
  
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [joinedRoomIds, setJoinedRoomIds] = useState<Set<string>>(new Set(DEFAULT_ROOM_IDS));
  const [unreadCounts, setUnreadCounts] = useState<{ [key: string]: number }>({});
  const [firebaseMessages, setFirebaseMessages] = useState<{ [roomId: string]: ForumMessageItem[] }>({});
  const [userLastVisit, setUserLastVisit] = useState<{ [roomId: string]: number }>({});
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({});
  const [roomUserCounts, setRoomUserCounts] = useState<RoomUserCounts>({});
  const [typingUsers, setTypingUsers] = useState<TypingStatus[]>([]);

  const [hasJoinedRoom, setHasJoinedRoom] = useState<{[roomId: string]: boolean}>({});
  const [analysisCounts, setAnalysisCounts] = useState<{ [key: string]: number }>({});
  const baseAnalysisCount = 1904;

  // Refs
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const roomListenersRef = useRef<{ [roomId: string]: () => void }>({});
  const userSentMessagesRef = useRef<Set<string>>(new Set());
  const nativeAuthProcessed = useRef(false);

  // Android Bridge Hook
  const { isChecking, authStatus, error, checkAndroidAuth, isNativeApp, hasAndroidBridge, bridgeStatus } = useAndroidAuth();

  // **INISIALISASI APLIKASI - EFEK UTAMA**
  useEffect(() => {
    console.log('🚀 Initializing application...');
    console.log('📱 Android Bridge Status:', bridgeStatus);
    
    const initializeApp = async () => {
      try {
        // 1. Load data dari localStorage
        loadFromLocalStorage();
        
        // 2. Cek native app dan proses login jika ada token
        await checkNativeAppLogin();
        
        // 3. Setup Firebase auth listener (untuk web dan fallback native)
        setupFirebaseAuth();
        
        // 4. Load data aplikasi
        await loadAppData();
        
      } catch (error) {
        console.error('❌ App initialization failed:', error);
        setAuthError('Gagal menginisialisasi aplikasi');
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Load data dari localStorage
  const loadFromLocalStorage = () => {
    try {
      // Load current user
      const savedCurrentUser = localStorage.getItem('currentUser');
      if (savedCurrentUser) {
        const user = JSON.parse(savedCurrentUser);
        setCurrentUser(user);
        console.log('👤 Loaded current user from localStorage:', user.email);
      }

      // Load joined rooms
      const savedJoinedRooms = localStorage.getItem('joinedRoomIds');
      if (savedJoinedRooms) {
        setJoinedRoomIds(new Set(JSON.parse(savedJoinedRooms)));
      }

      // Load unread counts
      const savedUnreadCounts = localStorage.getItem('unreadCounts');
      if (savedUnreadCounts) {
        setUnreadCounts(JSON.parse(savedUnreadCounts));
      }

      // Load user last visit
      const savedUserLastVisit = localStorage.getItem('userLastVisit');
      if (savedUserLastVisit) {
        setUserLastVisit(JSON.parse(savedUserLastVisit));
      }

      // Load notification settings
      const savedNotificationSettings = localStorage.getItem('roomNotificationSettings');
      if (savedNotificationSettings) {
        setNotificationSettings(JSON.parse(savedNotificationSettings));
      }

      // Load has joined room
      const savedHasJoinedRoom = localStorage.getItem('hasJoinedRoom');
      if (savedHasJoinedRoom) {
        setHasJoinedRoom(JSON.parse(savedHasJoinedRoom));
      }

      // Load analysis counts
      const lastReset = localStorage.getItem('lastAnalysisResetDate');
      const today = new Date().toISOString().split('T')[0];
      if (lastReset !== today) {
        localStorage.setItem('analysisCounts', '{}');
        localStorage.setItem('lastAnalysisResetDate', today);
      } else {
        const savedAnalysisCounts = localStorage.getItem('analysisCounts');
        if (savedAnalysisCounts) {
          setAnalysisCounts(JSON.parse(savedAnalysisCounts));
        }
      }

      // Load news
      const savedNews = localStorage.getItem('cryptoNews');
      if (savedNews) {
        setNewsArticles(JSON.parse(savedNews));
      }

    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  };

  // Cek native app dan proses login
  const checkNativeAppLogin = async () => {
    console.log('📱 Native app check:', { 
      isNativeApp, 
      hasAndroidBridge,
      urlToken: !!new URLSearchParams(window.location.search).get('authToken')
    });

    if (!isNativeApp) {
      console.log('🔄 Not a native app, skipping Android auth');
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const authToken = urlParams.get('authToken');

    // Jika sudah diproses, skip
    if (nativeAuthProcessed.current) {
      console.log('⏭️ Native auth already processed, skipping');
      return;
    }

    console.log('🚀 Starting native app login process...');
    nativeAuthProcessed.current = true;

    // Prioritas 1: Token dari URL (deep link)
    if (authToken) {
      console.log('🔐 Using auth token from URL');
      await processNativeAuthToken(authToken);
      return;
    }

    // Prioritas 2: Token dari Android Bridge
    if (hasAndroidBridge) {
      console.log('🌉 Using Android bridge for authentication');
      const success = await checkAndroidAuth();
      if (success) {
        console.log('✅ Android bridge auth completed');
        return;
      }
    }

    // Jika kedua metode gagal
    console.log('❌ No authentication method available for native app');
    setAuthError('Tidak dapat melakukan autentikasi pada aplikasi native');
  };

  // Process token untuk native auth
  const processNativeAuthToken = async (token: string) => {
    try {
      const bridgeService = AndroidBridgeService.getInstance();
      const result = await bridgeService.handleAndroidAuth(token);
      
      if (result.success) {
        // Clean URL setelah berhasil
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        console.log('🎉 Native app login completed successfully');
      } else {
        setAuthError(result.error || 'Gagal login dengan aplikasi native');
      }
    } catch (error) {
      console.error('❌ Native app login failed:', error);
      setAuthError('Gagal login dengan aplikasi native');
    }
  };

  // Setup Firebase auth listener
  const setupFirebaseAuth = () => {
    if (!database) {
      console.warn('Firebase Auth skipped: Database not initialized');
      return;
    }

    const auth = getAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('🔥 Firebase auth state changed:', user ? user.email : 'No user');
      setFirebaseUser(user);

      // Skip processing untuk native app yang sudah login
      if (isNativeApp && nativeAuthProcessed.current) {
        console.log('🔄 Skipping Firebase auth processing for native app');
        return;
      }

      if (user) {
        // Cari user di localStorage
        try {
          const savedUsers = localStorage.getItem('cryptoUsers');
          if (savedUsers) {
            const users = JSON.parse(savedUsers);
            const foundUser = Object.values(users).find((u: any) => u.email === user.email) as User;
            if (foundUser && (!currentUser || currentUser.email !== foundUser.email)) {
              console.log('✅ Setting current user from Firebase auth');
              setCurrentUser(foundUser);
              setPendingGoogleUser(null);
            }
          }
        } catch (error) {
          console.error('Error finding user in localStorage:', error);
        }
      } else {
        // Reset hanya untuk web (bukan native app)
        if (!isNativeApp) {
          setCurrentUser(null);
          setPendingGoogleUser(null);
        }
      }
    });

    return unsubscribe;
  };

  // Load data aplikasi
  const loadAppData = async () => {
    // Load IDR rate
    try {
      setIsRateLoading(true);
      const rate = await fetchIdrRate();
      setIdrRate(rate);
    } catch (error) {
      console.error('Failed to load IDR rate:', error);
      setIdrRate(16000);
    } finally {
      setIsRateLoading(false);
    }

    // Load coin list
    try {
      setIsCoinListLoading(true);
      const coins = await fetchTop500Coins();
      setFullCoinList(coins);
    } catch (error) {
      console.error('Failed to load coin list:', error);
      setCoinListError('Gagal memuat daftar koin');
    } finally {
      setIsCoinListLoading(false);
    }

    // Load trending coins
    try {
      setIsTrendingLoading(true);
      const trending = await fetchTrendingCoins();
      setTrendingCoins(trending);
    } catch (error) {
      console.error('Failed to load trending coins:', error);
      setTrendingError('Gagal memuat data trending');
    } finally {
      setIsTrendingLoading(false);
    }

    // Load news
    try {
      const lastFetch = localStorage.getItem('lastNewsFetch');
      const now = Date.now();
      const twentyMinutes = 20 * 60 * 1000;

      if (!lastFetch || (now - parseInt(lastFetch)) > twentyMinutes) {
        const articles = await fetchNewsArticles();
        const articlesWithIds: NewsArticle[] = articles.map((article, index) => ({
          ...article,
          id: `news-${Date.now()}-${index}`,
          type: 'news' as const
        }));
        setNewsArticles(articlesWithIds);
        localStorage.setItem('cryptoNews', JSON.stringify(articlesWithIds));
        localStorage.setItem('lastNewsFetch', now.toString());
      }
    } catch (error) {
      console.error('Failed to load news:', error);
    }

    // Setup Firebase listeners
    setupFirebaseListeners();
  };

  // Setup Firebase listeners
  const setupFirebaseListeners = () => {
    if (!database) return;

    // Rooms listener
    const roomsRef = safeRef('rooms');
    const roomsListener = onValue(roomsRef, (snapshot) => {
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
    });

    // Cleanup function
    return () => {
      if (database) {
        off(roomsRef, 'value', roomsListener);
        Object.values(roomListenersRef.current).forEach(unsubscribe => {
          if (typeof unsubscribe === 'function') unsubscribe();
        });
      }
    };
  };

  // **HANDLERS UTAMA**

  // Google Login untuk web
  const handleGoogleRegisterSuccess = async (credentialResponse: CredentialResponse) => {
    // Skip untuk native app
    if (isNativeApp) {
      console.log('🔄 Skipping web Google OAuth for native app');
      return;
    }

    setAuthError(null);
    
    if (!credentialResponse.credential) {
      setAuthError('Credential Google tidak ditemukan.');
      return;
    }

    try {
      const decoded: { email: string; name: string; picture: string } = jwtDecode(credentialResponse.credential) as any;
      const { email, name, picture } = decoded;
      
      const auth = getAuth();
      const googleCredential = GoogleAuthProvider.credential(credentialResponse.credential);
      
      const userCredential = await signInWithCredential(auth, googleCredential);
      
      // Cek apakah user sudah ada
      let existingUser: User | null = null;
      try {
        const savedUsers = localStorage.getItem('cryptoUsers');
        if (savedUsers) {
          const users = JSON.parse(savedUsers);
          existingUser = Object.values(users).find((u: any) => u.email === email) as User || null;
        }
      } catch (error) {
        console.error('Error checking existing user:', error);
      }

      if (existingUser) {
        // User sudah ada, langsung login
        setCurrentUser(existingUser);
        localStorage.setItem('currentUser', JSON.stringify(existingUser));
      } else {
        // User baru, tampilkan form CreateId
        setPendingGoogleUser({ email, name, picture });
      }
      
    } catch (error) {
      console.error('Google login error:', error);
      setAuthError('Gagal login dengan Google.');
    }
  };

  // Complete profile setelah login Google
  const handleProfileComplete = async (username: string, password: string): Promise<string | void> => {
    if (!pendingGoogleUser) {
      return 'Data Google tidak ditemukan.';
    }

    // Cek ketersediaan username
    try {
      const savedUsers = localStorage.getItem('cryptoUsers');
      if (savedUsers) {
        const users = JSON.parse(savedUsers);
        if (Object.values(users).some((u: any) => u.username.toLowerCase() === username.toLowerCase())) {
          return 'Username sudah digunakan. Pilih username lain.';
        }
      }
    } catch (error) {
      console.error('Error checking username:', error);
    }

    // Buat user baru
    const newUser: User = {
      email: pendingGoogleUser.email,
      username,
      password,
      googleProfilePicture: pendingGoogleUser.picture,
      createdAt: Date.now()
    };

    // Simpan user
    try {
      const savedUsers = localStorage.getItem('cryptoUsers');
      const updatedUsers = savedUsers ? { ...JSON.parse(savedUsers), [newUser.email]: newUser } : { [newUser.email]: newUser };
      localStorage.setItem('cryptoUsers', JSON.stringify(updatedUsers));
      localStorage.setItem('currentUser', JSON.stringify(newUser));
      
      setCurrentUser(newUser);
      setPendingGoogleUser(null);
      setActivePage('home');
    } catch (error) {
      console.error('Error saving user:', error);
      return 'Gagal menyimpan data user.';
    }
  };

  // Logout
  const handleLogout = () => {
    const auth = getAuth();
    signOut(auth)
      .then(() => {
        setCurrentUser(null);
        setPendingGoogleUser(null);
        setFirebaseUser(null);
        localStorage.removeItem('currentUser');
        setActivePage('home');
        nativeAuthProcessed.current = false;
      })
      .catch((error) => {
        console.error('Logout error:', error);
      });
  };

  // Navigation
  const handleNavigate = (page: Page) => {
    if (currentRoom && (page !== 'forum')) {
      setCurrentRoom(null);
    }
    
    if (page === 'home' && activePage === 'home') {
      handleResetToTrending();
    } else {
      setActivePage(page);
    }
  };

  const handleResetToTrending = () => {
    setSearchedCoin(null);
    setActivePage('home');
    fetchTrendingData(true);
  };

  const fetchTrendingData = async (showSkeleton = true) => {
    if (showSkeleton) {
      setIsTrendingLoading(true);
      setTrendingError(null);
    }
    
    try {
      const trending = await fetchTrendingCoins();
      setTrendingCoins(trending);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal memuat data tren.';
      if (showSkeleton) setTrendingError(errorMessage);
      else console.error('Gagal menyegarkan data tren:', errorMessage);
    } finally {
      if (showSkeleton) setIsTrendingLoading(false);
    }
  };

  // Coin selection
  const handleSelectCoin = async (coinId: string) => {
    setIsTrendingLoading(true);
    setTrendingError(null);
    setSearchedCoin(null);
    
    try {
      const coinDetails = await fetchCoinDetails(coinId);
      setSearchedCoin(coinDetails);
    } catch (err) {
      setTrendingError(err instanceof Error ? err.message : 'Gagal memuat detail koin.');
    } finally {
      setIsTrendingLoading(false);
    }
  };

  // Analysis counts
  const handleIncrementAnalysisCount = (coinId: string) => {
    setAnalysisCounts(prev => {
      const current = prev[coinId] || baseAnalysisCount;
      const newCounts = { ...prev, [coinId]: current + 1 };
      localStorage.setItem('analysisCounts', JSON.stringify(newCounts));
      return newCounts;
    });
  };

  // Room management
  const handleJoinRoom = (room: Room) => {
    setCurrentRoom(room);
    
    const isFirstTimeJoin = !hasJoinedRoom[room.id];
    
    setJoinedRoomIds(prev => new Set(prev).add(room.id));
    setActivePage('forum');
    
    if (!room.isDefaultRoom && isFirstTimeJoin) {
      updateRoomUserCount(room.id, true);
      setHasJoinedRoom(prev => ({
        ...prev,
        [room.id]: true
      }));
    }
    
    setUnreadCounts(prev => ({
      ...prev,
      [room.id]: 0
    }));
    
    const currentTime = Date.now();
    setUserLastVisit(prev => ({
      ...prev,
      [room.id]: currentTime
    }));

    // Setup typing indicator disconnect
    if (database && firebaseUser?.uid) {
      try {
        const typingRef = safeRef(`typing/${room.id}/${firebaseUser.uid}`);
        onDisconnect(typingRef).remove();
      } catch(e) {
        console.error("Error setting typing disconnect:", e);
      }
    }
  };

  const handleLeaveRoom = () => {
    if (!currentRoom?.id) return;
    
    const roomId = currentRoom.id;
    const currentTime = Date.now();
    
    setUserLastVisit(prev => ({
      ...prev,
      [roomId]: currentTime
    }));
    
    setUnreadCounts(prev => ({
      ...prev,
      [roomId]: 0
    }));
    
    if (database && firebaseUser?.uid) {
      const typingRef = safeRef(`typing/${roomId}/${firebaseUser.uid}`);
      remove(typingRef).catch(error => console.error("Error removing typing status:", error));
    }
    
    setCurrentRoom(null);
    setActivePage('rooms');
  };

  const updateRoomUserCount = async (roomId: string, increment: boolean) => {
    if (!database || DEFAULT_ROOM_IDS.includes(roomId)) return;

    try {
      const roomRef = safeRef(`rooms/${roomId}/userCount`);
      const snapshot = await get(roomRef);
      const currentCount = snapshot.val() || 0;
      const newCount = increment ? currentCount + 1 : Math.max(0, currentCount - 1);
      
      await set(roomRef, newCount);
      
      setRoomUserCounts(prev => ({
        ...prev,
        [roomId]: newCount
      }));
    } catch (error) {
      console.error('Error updating room user count:', error);
    }
  };

  const handleLeaveJoinedRoom = (roomId: string) => {
    if (DEFAULT_ROOM_IDS.includes(roomId)) return;
    
    if (hasJoinedRoom[roomId]) {
      updateRoomUserCount(roomId, false);
      setHasJoinedRoom(prev => ({
        ...prev,
        [roomId]: false
      }));
    }
    
    setJoinedRoomIds(prev => {
      const newIds = new Set(prev);
      newIds.delete(roomId);
      return newIds;
    });
    
    setUnreadCounts(prev => {
      const newCounts = { ...prev };
      delete newCounts[roomId];
      return newCounts;
    });
    
    setUserLastVisit(prev => {
      const newVisits = { ...prev };
      delete newVisits[roomId];
      return newVisits;
    });
    
    setNotificationSettings(prev => {
      const newSettings = { ...prev };
      delete newSettings[roomId];
      return newSettings;
    });
    
    if (currentRoom?.id === roomId) {
      handleLeaveRoom();
    }
  };

  const handleCreateRoom = (roomName: string) => {
    if (!currentUser?.username || !firebaseUser) {
      alert('Anda harus login untuk membuat room.');
      return;
    }
    
    const trimmedName = roomName.trim();
    
    if (trimmedName.length > 25) {
      alert('Nama room maksimal 25 karakter.');
      return;
    }
    
    if (trimmedName.length < 3) {
      alert('Nama room minimal 3 karakter.');
      return;
    }
    
    if (rooms.some(r => r.name.toLowerCase() === trimmedName.toLowerCase())) {
      alert('Nama room sudah ada. Silakan pilih nama lain.');
      return;
    }
    
    if (!database) {
      alert('Database tidak tersedia. Coba lagi nanti.');
      return;
    }

    const roomId = `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newRoom: Room = {
      id: roomId,
      name: trimmedName,
      userCount: 1,
      createdBy: currentUser.username,
      isDefaultRoom: false
    };
    
    try {
      const roomRef = safeRef(`rooms/${roomId}`);
      
      const roomData = {
        name: trimmedName,
        userCount: 1,
        createdBy: currentUser.username,
        createdAt: Date.now(),
        isDefaultRoom: false
      };
      
      set(roomRef, roomData)
        .then(() => {
          setHasJoinedRoom(prev => ({
            ...prev,
            [roomId]: true
          }));
          handleJoinRoom(newRoom);
        })
        .catch((error) => {
          console.error('Gagal membuat room:', error);
          alert('Gagal membuat room. Coba lagi.');
        });
      
    } catch (error) {
      console.error('Error creating room:', error);
      alert('Terjadi kesalahan saat membuat room.');
    }
  };

  const handleDeleteRoom = (roomId: string) => {
    if (!currentUser?.username || !firebaseUser) {
      alert('Gagal menghapus: Anda belum login.');
      return;
    }
    
    const roomToDelete = rooms.find(r => r.id === roomId);
    if (!roomToDelete || DEFAULT_ROOM_IDS.includes(roomId)) {
      return;
    }
    
    if (!database) {
      alert('Gagal menghapus room: Koneksi database bermasalah.');
      return;
    }

    // Untuk sederhananya, kita izinkan penghapusan oleh siapapun yang login
    // Dalam production, Anda mungkin ingin menambahkan pengecekan admin/creator
    if (window.confirm(`Anda yakin ingin menghapus room "${roomToDelete.name}"?`)) {
      const roomRef = safeRef(`rooms/${roomId}`);
      remove(roomRef)
        .then(() => {
          const messagesRef = safeRef(`messages/${roomId}`);
          return remove(messagesRef);
        })
        .then(() => {
          setHasJoinedRoom(prev => {
            const newState = {...prev};
            delete newState[roomId];
            return newState;
          });
          
          if (currentRoom?.id === roomId) {
            handleLeaveRoom();
          }
        })
        .catch(error => {
          console.error('Gagal menghapus room:', error);
          alert('Gagal menghapus room.');
        });
    }
  };

  // Message handling
  const handleSendMessage = (message: Partial<ChatMessage>) => {
    if (!database || !currentRoom?.id || !firebaseUser?.uid || !currentUser?.username) {
      alert('Gagal mengirim: Belum login atau tidak ada room.');
      return;
    }
    
    if (!message.text?.trim() && !message.fileURL) {
      return;
    }

    const messageToSend = {
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
      
      set(newMessageRef, messageToSend).catch((error) => {
        console.error('Send message error:', error);
        alert('Gagal mengirim pesan.');
      });
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Gagal mengirim pesan.');
    }
  };

  const handleReaction = (messageId: string, emoji: string) => {
    if (!database || !currentRoom?.id || !firebaseUser?.uid || !messageId || !emoji) {
      return;
    }
    
    const username = currentUser?.username;
    if (!username) return;

    try {
      const reactionUserListRef = safeRef(`messages/${currentRoom.id}/${messageId}/reactions/${emoji}`);
      get(reactionUserListRef).then((snapshot) => {
        const usersForEmoji: string[] = snapshot.val() || [];
        let updatedUsers: string[] | null;
        
        if (!Array.isArray(usersForEmoji)) {
          updatedUsers = [username];
        } else if (usersForEmoji.includes(username)) {
          updatedUsers = usersForEmoji.filter(u => u !== username);
          if (updatedUsers.length === 0) updatedUsers = null;
        } else {
          updatedUsers = [...usersForEmoji, username];
        }
        
        set(reactionUserListRef, updatedUsers).catch(error => 
          console.error(`Failed to update reaction:`, error)
        );
      }).catch(error => console.error(`Failed to get reaction data:`, error));
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  };

  const handleDeleteMessage = (roomId: string, messageId: string) => {
    if (!database || !roomId || !messageId) {
      alert('Gagal menghapus pesan: Informasi tidak lengkap.');
      return;
    }
    
    try {
      const messageRef = safeRef(`messages/${roomId}/${messageId}`);
      remove(messageRef).catch(error => {
        console.error('Failed to delete message:', error);
        alert('Gagal menghapus pesan.');
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Gagal menghapus pesan.');
    }
  };

  // Typing indicators
  const handleStartTyping = () => {
    if (!database || !currentRoom?.id || !firebaseUser?.uid || !currentUser?.username) {
      return;
    }

    const typingRef = safeRef(`typing/${currentRoom.id}/${firebaseUser.uid}`);
    const status: TypingStatus = {
      username: currentUser.username,
      userCreationDate: currentUser.createdAt,
      timestamp: Date.now()
    };

    set(typingRef, status).catch(error => 
      console.error("Error setting typing status:", error)
    );

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      if (database && currentRoom?.id && firebaseUser?.uid) {
        const timeoutTypingRef = safeRef(`typing/${currentRoom.id}/${firebaseUser.uid}`);
        remove(timeoutTypingRef).catch(error => 
          console.error("Error removing typing status:", error)
        );
      }
      typingTimeoutRef.current = null;
    }, TYPING_TIMEOUT);
  };

  const handleStopTyping = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    if (!database || !currentRoom?.id || !firebaseUser?.uid) {
      return;
    }
    
    const typingRef = safeRef(`typing/${currentRoom.id}/${firebaseUser.uid}`);
    remove(typingRef).catch(error => 
      console.error("Error removing typing status:", error)
    );
  };

  // Notification settings
  const handleToggleNotification = (roomId: string, enabled: boolean) => {
    setNotificationSettings(prev => ({
      ...prev,
      [roomId]: enabled
    }));
  };

  // **RENDER LOGIC**

  // Simpan ke localStorage ketika state berubah
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('joinedRoomIds', JSON.stringify(Array.from(joinedRoomIds)));
  }, [joinedRoomIds]);

  useEffect(() => {
    localStorage.setItem('unreadCounts', JSON.stringify(unreadCounts));
  }, [unreadCounts]);

  useEffect(() => {
    localStorage.setItem('userLastVisit', JSON.stringify(userLastVisit));
  }, [userLastVisit]);

  useEffect(() => {
    localStorage.setItem('roomNotificationSettings', JSON.stringify(notificationSettings));
  }, [notificationSettings]);

  useEffect(() => {
    localStorage.setItem('hasJoinedRoom', JSON.stringify(hasJoinedRoom));
  }, [hasJoinedRoom]);

  // Loading state
  if (isLoading || (isNativeApp && isChecking)) {
    return (
      <div className="min-h-screen bg-transparent text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric mx-auto"></div>
          <p className="mt-4">
            {isNativeApp 
              ? `Autentikasi Android... (${authStatus})` 
              : 'Memuat aplikasi...'
            }
          </p>
          {error && (
            <p className="text-magenta text-sm mt-2 max-w-xs mx-auto">
              Error: {error}
            </p>
          )}
          {isNativeApp && bridgeStatus && (
            <div className="mt-4 p-3 bg-white/5 rounded-lg text-xs text-left max-w-xs mx-auto">
              <p>Bridge: {bridgeStatus.hasAndroidBridge ? '✅ Tersedia' : '❌ Tidak Tersedia'}</p>
              <p>Status: {authStatus}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Jika ada pending Google user (setelah login Google di web), tampilkan CreateIdPage
  if (pendingGoogleUser) {
    return <CreateIdPage onProfileComplete={handleProfileComplete} googleProfile={pendingGoogleUser} />;
  }

  // Jika user sudah login, tampilkan aplikasi utama
  if (currentUser) {
    const heroCoin = searchedCoin || trendingCoins[0] || null;
    const otherTrendingCoins = searchedCoin ? [] : trendingCoins.slice(1);
    const hotCoinForHeader = trendingCoins.length > 1 ? {
      name: trendingCoins[1].name,
      logo: trendingCoins[1].image,
      price: trendingCoins[1].price,
      change: trendingCoins[1].change
    } : null;

    const updatedRooms = rooms.map(room => ({
      ...room,
      userCount: roomUserCounts[room.id] || room.userCount || 0
    }));

    const totalUsers = updatedRooms.reduce((sum, r) => sum + (r.userCount || 0), 0);

    const renderActivePage = () => {
      switch (activePage) {
        case 'home':
          return (
            <HomePage 
              idrRate={idrRate}
              isRateLoading={isRateLoading}
              currency={currency}
              onIncrementAnalysisCount={handleIncrementAnalysisCount}
              fullCoinList={fullCoinList}
              isCoinListLoading={isCoinListLoading}
              coinListError={coinListError}
              heroCoin={heroCoin}
              otherTrendingCoins={otherTrendingCoins}
              isTrendingLoading={isTrendingLoading}
              trendingError={trendingError}
              onSelectCoin={handleSelectCoin}
              onReloadTrending={handleResetToTrending}
            />
          );
        case 'rooms':
          return (
            <RoomsListPage
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
            />
          );
        case 'forum':
          let displayMessages: ForumMessageItem[] = [];
          if (currentRoom) {
            if (currentRoom.id === 'berita-kripto') {
              displayMessages = newsArticles;
            } else {
              displayMessages = firebaseMessages[currentRoom.id] || [];
            }
          }
          
          return (
            <ForumPage
              room={currentRoom}
              messages={displayMessages}
              userProfile={currentUser}
              onSendMessage={handleSendMessage}
              onLeaveRoom={handleLeaveRoom}
              onReact={handleReaction}
              onDeleteMessage={handleDeleteMessage}
              typingUsers={typingUsers}
              onStartTyping={handleStartTyping}
              onStopTyping={handleStopTyping}
            />
          );
        case 'about':
          return <AboutPage />;
        default:
          return (
            <HomePage 
              idrRate={idrRate}
              isRateLoading={isRateLoading}
              currency={currency}
              onIncrementAnalysisCount={handleIncrementAnalysisCount}
              fullCoinList={fullCoinList}
              isCoinListLoading={isCoinListLoading}
              coinListError={coinListError}
              heroCoin={heroCoin}
              otherTrendingCoins={otherTrendingCoins}
              isTrendingLoading={isTrendingLoading}
              trendingError={trendingError}
              onSelectCoin={handleSelectCoin}
              onReloadTrending={handleResetToTrending}
            />
          );
      }
    };

    return (
      <div className="min-h-screen bg-transparent text-white font-sans flex flex-col">
        <Particles />
        <Header 
          userProfile={currentUser}
          onLogout={handleLogout}
          activePage={activePage}
          onNavigate={handleNavigate}
          currency={currency}
          onCurrencyChange={setCurrency}
          hotCoin={hotCoinForHeader}
          idrRate={idrRate}
        />
        <main className="flex-grow">{renderActivePage()}</main>
        <Footer />
        {authError && (
          <div className="fixed bottom-4 right-4 bg-red-600 text-white p-3 rounded-lg shadow-lg z-50">
            Error: {authError} 
            <button onClick={() => setAuthError(null)} className="ml-2 text-sm underline">
              Tutup
            </button>
          </div>
        )}
      </div>
    );
  }

  // Jika tidak ada user yang login, tampilkan LoginPage
  return (
    <div className="min-h-screen bg-transparent text-white font-sans flex flex-col">
      <Particles />
      <LoginPage onGoogleRegisterSuccess={handleGoogleRegisterSuccess} />
      {authError && (
        <div className="fixed bottom-4 right-4 bg-red-600 text-white p-3 rounded-lg shadow-lg z-50">
          Error: {authError} 
          <button onClick={() => setAuthError(null)} className="ml-2 text-sm underline">
            Tutup
          </button>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
  const isNativeApp = (window as any).IS_NATIVE_ANDROID_APP === true;

  // Check database connection
  if (!database && !isNativeApp) {
    return (
      <div style={{ 
        color: 'white', 
        backgroundColor: '#0A0A0A', 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '20px', 
        fontFamily: 'sans-serif' 
      }}>
        <div style={{ 
          border: '1px solid #FF00FF', 
          padding: '20px', 
          borderRadius: '8px', 
          textAlign: 'center', 
          maxWidth: '500px' 
        }}>
          <h1 style={{ color: '#FF00FF', fontSize: '24px' }}>Kesalahan Koneksi Database</h1>
          <p style={{ marginTop: '10px', lineHeight: '1.6' }}>
            Gagal terhubung ke Firebase Realtime Database. Periksa koneksi internet dan konfigurasi Firebase.
          </p>
        </div>
      </div>
    );
  }

  // Check Google Client ID untuk web
  if (!googleClientId && !isNativeApp) {
    return (
      <div style={{ 
        color: 'white', 
        backgroundColor: '#0A0A0A', 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '20px', 
        fontFamily: 'sans-serif' 
      }}>
        <div style={{ 
          border: '1px solid #FF00FF', 
          padding: '20px', 
          borderRadius: '8px', 
          textAlign: 'center', 
          maxWidth: '500px' 
        }}>
          <h1 style={{ color: '#FF00FF', fontSize: '24px' }}>Kesalahan Konfigurasi</h1>
          <p style={{ marginTop: '10px', lineHeight: '1.6' }}>
            Variabel lingkungan <strong>GOOGLE_CLIENT_ID</strong> tidak ditemukan.
            Harap konfigurasikan variabel ini untuk mengaktifkan login Google.
          </p>
        </div>
      </div>
    );
  }

  // Untuk native app, tidak perlu GoogleOAuthProvider
  if (isNativeApp) {
    return (
      <React.StrictMode>
        <AppContent />
      </React.StrictMode>
    );
  }

  // Untuk web, gunakan GoogleOAuthProvider
  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <React.StrictMode>
        <AppContent />
      </React.StrictMode>
    </GoogleOAuthProvider>
  );
};

export default App;