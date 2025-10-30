// App.tsx - PERBAIKAN COMPLETE UNTUK ANDROID NATIVE
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
  NotificationSettings,
  RoomUserCounts,
  TypingStatus,
  TypingUsersMap,
  FirebaseTypingStatusData,
  NativeAppConfig
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
import { database, getDatabaseInstance, testDatabaseConnection } from './services/firebaseService';
import { ref, set, push, onValue, off, update, get, Database, remove, onDisconnect } from 'firebase/database';

const DEFAULT_ROOM_IDS = ['berita-kripto', 'pengumuman-aturan'];
const TYPING_TIMEOUT = 5000;

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

  // PERBAIKAN CRITICAL: State untuk native app dengan approach yang lebih sederhana
  const [nativeAppConfig, setNativeAppConfig] = useState<NativeAppConfig>({
    isNativeAndroidApp: false,
    authToken: null
  });
  const [isNativeAuthProcessing, setIsNativeAuthProcessing] = useState(false);
  const [hasProcessedNativeAuth, setHasProcessedNativeAuth] = useState(false);

  // PERBAIKAN: Effect untuk deteksi native app - HANYA SEKALI SAAT MOUNT
  useEffect(() => {
    const isNativeApp = (window as any).IS_NATIVE_ANDROID_APP === true;
    
    if (isNativeApp) {
      console.log('📱 Native Android app detected');
      
      const urlParams = new URLSearchParams(window.location.search);
      const authToken = urlParams.get('authToken');
      
      setNativeAppConfig({
        isNativeAndroidApp: true,
        authToken
      });

      console.log('🔐 Token status:', authToken ? 'Token received' : 'No token found');
      
      // Clean URL setelah mendapatkan token
      if (authToken) {
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }
  }, []);

  // PERBAIKAN CRITICAL: Effect terpisah untuk handle native app login - HANYA JALAN SEKALI
  useEffect(() => {
    if (nativeAppConfig.isNativeAndroidApp && 
        nativeAppConfig.authToken && 
        !isNativeAuthProcessing && 
        !hasProcessedNativeAuth &&
        !currentUser) {
      
      console.log('🚀 Starting native app login process...');
      handleNativeAppLogin(nativeAppConfig.authToken);
    }
  }, [nativeAppConfig.isNativeAndroidApp, nativeAppConfig.authToken, isNativeAuthProcessing, hasProcessedNativeAuth, currentUser]);

  // PERBAIKAN CRITICAL: Fungsi handleNativeAppLogin yang lebih sederhana dan reliable
  const handleNativeAppLogin = useCallback(async (idToken: string) => {
    if (!idToken || isNativeAuthProcessing || hasProcessedNativeAuth) {
      console.log('⏸️ Skipping native app login - conditions not met');
      return;
    }

    setIsNativeAuthProcessing(true);
    console.log('🔄 Processing native app login...');

    try {
      const auth = getAuth();
      const credential = GoogleAuthProvider.credential(idToken);
      
      console.log('🔐 Attempting Firebase sign-in with native app token...');
      
      const userCredential = await signInWithCredential(auth, credential);
      const firebaseUser = userCredential.user;
      
      console.log('✅ Firebase auth successful:', firebaseUser.email);
      
      // Decode token untuk mendapatkan profile Google
      const decoded: { email: string; name: string; picture: string } = jwtDecode(idToken) as any;
      const { email, name, picture } = decoded;
      
      console.log('👤 Decoded user profile:', { email, name });
      
      // PERBAIKAN: Cari user di existing users state
      let existingAppUser = Object.values(users).find(u => u.email === email);
      
      if (!existingAppUser) {
        // Load dari localStorage sebagai fallback
        try {
          const savedUsers = localStorage.getItem('cryptoUsers');
          if (savedUsers) {
            const parsedUsers = JSON.parse(savedUsers);
            existingAppUser = Object.values(parsedUsers).find((u: any) => u.email === email) as User | undefined;
          }
        } catch (e) {
          console.error('Error loading users from localStorage:', e);
        }
      }
      
      if (existingAppUser) {
        console.log('✅ Existing user found:', existingAppUser.username);
        setCurrentUser(existingAppUser);
      } else {
        // Untuk native app, buat user otomatis dengan username dari email
        const usernameFromEmail = email.split('@')[0];
        const newUser: User = {
          email,
          username: usernameFromEmail,
          googleProfilePicture: picture,
          createdAt: Date.now()
        };
        
        console.log('👤 Creating new user automatically:', usernameFromEmail);
        
        // PERBAIKAN: Update state secara langsung dan synchronous
        setUsers(prev => ({ ...prev, [newUser.email]: newUser }));
        setCurrentUser(newUser);
        
        // Simpan ke localStorage
        try {
          const updatedUsers = { ...users, [newUser.email]: newUser };
          localStorage.setItem('cryptoUsers', JSON.stringify(updatedUsers));
          localStorage.setItem('currentUser', JSON.stringify(newUser));
        } catch (e) {
          console.error('Error saving user to localStorage:', e);
        }
      }
      
      setPendingGoogleUser(null);
      setAuthError(null);
      setHasProcessedNativeAuth(true);
      
      console.log('🎉 Native app login completed successfully');
      
    } catch (error) {
      console.error('❌ Native app login failed:', error);
      setAuthError('Gagal login dengan aplikasi native. Silakan coba lagi.');
      setHasProcessedNativeAuth(true);
    } finally {
      setIsNativeAuthProcessing(false);
    }
  }, [isNativeAuthProcessing, hasProcessedNativeAuth, users]);

  // ... (kode Firebase listeners dan lainnya tetap sama)

  useEffect(() => {
    if (!lastProcessedTimestampsRef.current) {
      lastProcessedTimestampsRef.current = {};
    }
  }, []);

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

  // ... (kode updateRoomUserCount dan fungsi helper lainnya tetap sama)

  const updateRoomUserCount = useCallback(async (roomId: string, increment: boolean) => {
    if (!database) return;

    if (DEFAULT_ROOM_IDS.includes(roomId)) return;

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
  }, [database]);

  // ... (kode useEffect untuk localStorage dan settings tetap sama)

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

  useEffect(() => {
    localStorage.setItem('roomNotificationSettings', JSON.stringify(notificationSettings));
  }, [notificationSettings]);

  const handleToggleNotification = useCallback((roomId: string, enabled: boolean) => {
    setNotificationSettings(prev => ({
      ...prev,
      [roomId]: enabled
    }));
  }, []);

  // ... (kode fetchTrendingData dan fungsi data fetching tetap sama)

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

  // ... (kode fetchAndStoreNews dan news handling tetap sama)

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

  // ... (kode leaveCurrentRoom dan room management tetap sama)

  const leaveCurrentRoom = useCallback(() => {
    if (!currentRoom?.id) return;
    
    const currentTime = Date.now();
    const roomId = currentRoom.id;
    
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
      remove(typingRef).catch(error => console.error("Error removing typing status on leave:", error));
    }
    
    setCurrentRoom(null);
    
    console.log(`Left room: ${roomId}, reset unread count, updated last visit, removed typing status.`);
  }, [currentRoom, database, firebaseUser]);

  // ... (kode useEffect untuk currentRoom tetap sama)

  useEffect(() => {
    if (currentRoom?.id) {
      const currentTime = Date.now();
      setUserLastVisit(prev => ({
        ...prev,
        [currentRoom.id]: currentTime
      }));
      
      setUnreadCounts(prev => ({
        ...prev,
        [currentRoom.id]: 0
      }));
    }
  }, [currentRoom]);

  // PERBAIKAN: Firebase Auth Listener yang tidak mengganggu native app
  useEffect(() => {
    if (!database) {
      console.warn('Firebase Auth listener skipped: Database not initialized.');
      setIsAuthLoading(false);
      return;
    }

    // Skip Firebase auth listener untuk native app yang sudah berhasil login
    if (nativeAppConfig.isNativeAndroidApp && currentUser) {
      console.log('🔄 Skipping Firebase auth listener for native app - user already logged in');
      setIsAuthLoading(false);
      return;
    }

    const auth = getAuth();
    setIsAuthLoading(true);
    
    console.log('🔥 Setting up Firebase auth state listener...');
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('🔥 Firebase auth state changed:', user ? user.email : 'No user');
      setFirebaseUser(user);
      
      // PERBAIKAN: Untuk native app, jangan proses Firebase auth state change
      if (nativeAppConfig.isNativeAndroidApp && hasProcessedNativeAuth) {
        console.log('🔄 Skipping Firebase auth processing for native app');
        setIsAuthLoading(false);
        return;
      }

      if (user) {
        const appUser = Object.values(users).find(u => u.email === user.email);
        if (appUser) {
          if (!currentUser || currentUser.email !== appUser.email) {
            console.log('✅ Setting current user from Firebase auth state');
            setCurrentUser(appUser);
            setPendingGoogleUser(null);
          }
        } else if (!pendingGoogleUser && !nativeAppConfig.isNativeAndroidApp) {
          console.warn('Auth listener: Firebase user exists but no matching app user found');
        }
      } else {
        // Jangan reset currentUser jika di native app
        if (!nativeAppConfig.isNativeAndroidApp) {
          if (currentUser !== null) setCurrentUser(null);
          setPendingGoogleUser(null);
        }
      }
      setIsAuthLoading(false);
    });

    return () => {
      console.log('🔥 Cleaning up Firebase auth state listener');
      unsubscribe();
    };
  }, [users, currentUser, pendingGoogleUser, database, currentRoom, nativeAppConfig.isNativeAndroidApp, hasProcessedNativeAuth]);

  // ... (kode useEffect untuk localStorage users tetap sama)

  useEffect(() => {
    try {
      const u = localStorage.getItem('cryptoUsers');
      if (u) {
        const parsedUsers = JSON.parse(u);
        setUsers(parsedUsers);
        console.log('👥 Loaded users from localStorage:', Object.keys(parsedUsers).length);
      }
    } catch (e) { console.error('Gagal load users', e); }
  }, []);

  useEffect(() => {
    try { 
      localStorage.setItem('cryptoUsers', JSON.stringify(users)); 
      console.log('💾 Saved users to localStorage:', Object.keys(users).length);
    } catch (e) { console.error('Gagal simpan users', e); }
  }, [users]);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        console.log('💾 Saved current user to localStorage:', currentUser.email);
      }
      else {
        localStorage.removeItem('currentUser');
        console.log('🧹 Removed current user from localStorage');
      }
    } catch (e) { console.error('Gagal simpan currentUser', e); }
  }, [currentUser]);

  // ... (kode useEffect lainnya untuk localStorage tetap sama)

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

  // ... (kode data fetching untuk rates dan coins tetap sama)

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

  // ... (kode messages listeners dan typing listeners tetap sama)

  // PERBAIKAN: Handle Google Register Success untuk web
  const handleGoogleRegisterSuccess = useCallback(async (credentialResponse: CredentialResponse) => {
    // Skip Google OAuth flow jika di native app
    if (nativeAppConfig.isNativeAndroidApp) {
      console.log('🔄 Skipping web Google OAuth - using native app auth');
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
  }, [users, currentUser, nativeAppConfig.isNativeAndroidApp]);

  // ... (fungsi handleProfileComplete, handleLogout, dan lainnya tetap sama)

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
    leaveCurrentRoom();
    
    const auth = getAuth();
    signOut(auth)
      .then(() => {
        setCurrentUser(null);
        setFirebaseUser(null);
        setPendingGoogleUser(null);
        setActivePage('home');
        setHasProcessedNativeAuth(false);
      })
      .catch((error) => {
        console.error('Firebase signOut error:', error);
        setCurrentUser(null);
        setFirebaseUser(null);
        setPendingGoogleUser(null);
        setActivePage('home');
        setHasProcessedNativeAuth(false);
      });
  }, [leaveCurrentRoom]);

  // ... (fungsi handleIncrementAnalysisCount, handleNavigate, handleSelectCoin tetap sama)

  const handleIncrementAnalysisCount = useCallback((coinId: string) => {
    setAnalysisCounts(prev => {
      const current = prev[coinId] || baseAnalysisCount;
      const newCounts = { ...prev, [coinId]: current + 1 };
      localStorage.setItem('analysisCounts', JSON.stringify(newCounts));
      return newCounts;
    });
  }, [baseAnalysisCount]);

  const handleNavigate = useCallback((page: Page) => {
    if (currentRoom && (page !== 'forum' || activePage !== 'forum')) {
      leaveCurrentRoom();
    }
    
    if (page === 'home' && activePage === 'home') {
      handleResetToTrending();
    } else if (page === 'forum') {
      if (activePage === 'forum' && currentRoom) {
        setActivePage('forum');
      } else {
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

  // ... (fungsi room management: handleJoinRoom, handleLeaveRoom, handleLeaveJoinedRoom, handleCreateRoom, handleDeleteRoom tetap sama)

  const handleJoinRoom = useCallback((room: Room) => {
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

     if (database && firebaseUser?.uid) {
       try {
        const typingRef = safeRef(`typing/${room.id}/${firebaseUser.uid}`);
        onDisconnect(typingRef).remove();
        console.log(`[JOIN] onDisconnect set for typing status in room ${room.id} on join`);
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
      setHasJoinedRoom(prev => ({
        ...prev,
        [roomId]: false
      }));
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
      
      console.log('Mencoba membuat room dengan data:', roomData);
      
      set(roomRef, roomData)
      .then(() => {
        console.log('Room berhasil dibuat:', newRoom);
        setHasJoinedRoom(prev => ({
          ...prev,
          [roomId]: true
        }));
        handleJoinRoom(newRoom);
      })
      .catch((error) => {
        console.error('Gagal membuat room di Firebase:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        let errorMessage = 'Gagal membuat room. Coba lagi.';
        
        if (error.code === 'PERMISSION_DENIED') {
          errorMessage = 'Izin ditolak. Periksa Firebase Rules.';
        }
        
        alert(errorMessage);
      });
      
    } catch (error) {
      console.error('Error dalam handleCreateRoom:', error);
      alert('Terjadi kesalahan saat membuat room.');
    }
  }, [handleJoinRoom, rooms, currentUser, database, firebaseUser]);

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
          const roomRef = safeRef(`rooms/${roomId}`);
          remove(roomRef)
            .then(() => {
              console.log(`Room ${roomId} deleted.`);
              const messagesRef = safeRef(`messages/${roomId}`);
              return remove(messagesRef);
            })
            .then(() => {
              console.log(`Messages for room ${roomId} deleted.`);
              setHasJoinedRoom(prev => {
                const newState = {...prev};
                delete newState[roomId];
                return newState;
              });
              if (currentRoom?.id === roomId) {
                leaveCurrentRoom();
                setActivePage('rooms');
              }
            })
            .catch(error => {
              console.error(`Gagal menghapus room ${roomId}:`, error);
              alert('Gagal menghapus room. Periksa koneksi atau izin Anda.');
            });
        }
      }).catch(error => {
        console.error('Gagal memeriksa status admin:', error);
        alert('Gagal memverifikasi izin penghapusan.');
      });
    } catch (error) {
      console.error('Error in handleDeleteRoom:', error);
      alert('Terjadi kesalahan saat menghapus room.');
    }
  }, [currentUser, rooms, firebaseUser, currentRoom, leaveCurrentRoom]);

  // ... (fungsi handleSendMessage, handleReaction, handleDeleteMessage, handleStartTyping, handleStopTyping tetap sama)

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
      remove(messageRef).then(() => {
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

  const handleStartTyping = useCallback(() => {
    if (!database || !currentRoom?.id || !firebaseUser?.uid || !currentUser?.username || currentUser?.createdAt === undefined || currentUser?.createdAt === null) {
      console.warn("[handleStartTyping] Prerequisites not met:", { db: !!database, room: currentRoom?.id, fbUid: firebaseUser?.uid, appUser: currentUser?.username, createdAtExists: currentUser?.hasOwnProperty('createdAt') });
      return;
    }

    const typingRef = safeRef(`typing/${currentRoom.id}/${firebaseUser.uid}`);
    const status: TypingStatus = {
      username: currentUser.username,
      userCreationDate: currentUser.createdAt,
      timestamp: Date.now()
    };
    console.log(`[handleStartTyping] Attempting to set status for user ${firebaseUser.uid} in room ${currentRoom.id}:`, status);

    set(typingRef, status)
    .then(() => {
      console.log(`[handleStartTyping] Status successfully set for ${firebaseUser.uid}. Setting onDisconnect.`);
      return onDisconnect(typingRef).remove();
    })
    .then(() => {
         console.log(`[handleStartTyping] onDisconnect set successfully for ${firebaseUser.uid}`);
    })
    .catch(error => console.error("[handleStartTyping] Error setting status or onDisconnect:", error));

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      console.log(`[handleStartTyping] Typing timeout reached for ${firebaseUser?.uid}. Attempting to remove status.`);
      if (database && currentRoom?.id && firebaseUser?.uid) {
          const timeoutTypingRef = safeRef(`typing/${currentRoom.id}/${firebaseUser.uid}`);
          remove(timeoutTypingRef).catch(error => console.error("[handleStartTyping] Error removing status on timeout:", error));
      } else {
          console.warn("[handleStartTyping] Cannot remove status on timeout - DB or context missing.");
      }
      typingTimeoutRef.current = null;
    }, TYPING_TIMEOUT);
  }, [database, currentRoom, firebaseUser, currentUser]);

  const handleStopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      console.log(`[handleStopTyping] Clearing typing timeout for ${firebaseUser?.uid}.`);
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    if (!database || !currentRoom?.id || !firebaseUser?.uid) {
         console.warn("[handleStopTyping] Prerequisites not met for removal:", { db: !!database, room: currentRoom?.id, fbUid: firebaseUser?.uid });
        return;
    }
    const typingRef = safeRef(`typing/${currentRoom.id}/${firebaseUser.uid}`);
    console.log(`[handleStopTyping] Attempting to remove status for ${firebaseUser.uid} in room ${currentRoom.id}.`);
    remove(typingRef).catch(error => console.error("[handleStopTyping] Error removing status:", error));
  }, [database, currentRoom, firebaseUser]);

  // ... (kode useMemo untuk updatedRooms, totalUsers, heroCoin, dll tetap sama)

  const updatedRooms = useMemo(() => {
    return rooms.map(room => ({
      ...room,
      userCount: roomUserCounts[room.id] || room.userCount || 0
    }));
  }, [rooms, roomUserCounts]);

  const totalUsers = useMemo(() => updatedRooms.reduce((sum, r) => sum + (r.userCount || 0), 0), [updatedRooms]);
  const heroCoin = useMemo(() => searchedCoin || trendingCoins[0] || null, [searchedCoin, trendingCoins]);
  const otherTrendingCoins = useMemo(() => searchedCoin ? [] : trendingCoins.slice(1), [searchedCoin, trendingCoins]);
  const hotCoinForHeader = useMemo(() => trendingCoins.length > 1 ? { name: trendingCoins[1].name, logo: trendingCoins[1].image, price: trendingCoins[1].price, change: trendingCoins[1].change } : null, [trendingCoins]);

  const currentTypingUsers = useMemo(() => {
    const currentRoomId = currentRoom?.id;
    if (!currentRoomId || !typingUsers || typeof typingUsers !== 'object') {
        return [];
    }

    const roomTypingData = typingUsers[currentRoomId];
    if (!roomTypingData || typeof roomTypingData !== 'object') {
        return [];
    }

    const now = Date.now();
    const filteredUsers = Object.entries(roomTypingData)
        .filter(([userId, status]) => {
            const isNotSelf = userId !== firebaseUser?.uid;
            const isValidStatus = status && typeof status.timestamp === 'number';
            const isNotTimedOut = isValidStatus && (now - status.timestamp < TYPING_TIMEOUT);
            return isNotSelf && isValidStatus && isNotTimedOut;
        })
        .map(([userId, status]) => ({
            username: status.username,
            userCreationDate: status.userCreationDate ?? null,
            timestamp: status.timestamp
        }));

    return filteredUsers;

  }, [typingUsers, currentRoom, firebaseUser?.uid]);

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
          if (currentRoom.id === 'berita-kripto') {
            displayMessages = newsArticles;
          } else {
            displayMessages = firebaseMessages[currentRoom.id] || [];
          }
        }
        const messagesToPass = Array.isArray(displayMessages) ? displayMessages : [];
        
        return <ForumPage 
          room={currentRoom} 
          messages={messagesToPass} 
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

  // PERBAIKAN CRITICAL: Loading state yang lebih sederhana
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-transparent text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric mx-auto"></div>
          <p className="mt-4">Memverifikasi sesi...</p>
        </div>
      </div>
    );
  }

  // PERBAIKAN CRITICAL: Logic render yang sangat sederhana
  let contentToRender;

  // Untuk native app: langsung cek currentUser
  if (nativeAppConfig.isNativeAndroidApp) {
    if (currentUser) {
      // Native app berhasil login
      contentToRender = (
        <>
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
        </>
      );
    } else {
      // Native app gagal login atau masih loading
      if (isNativeAuthProcessing) {
        contentToRender = (
          <div className="min-h-screen bg-transparent text-white flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric mx-auto"></div>
              <p className="mt-4">Memproses login dari aplikasi...</p>
            </div>
          </div>
        );
      } else {
        // Fallback error
        contentToRender = (
          <div className="min-h-screen bg-transparent text-white flex items-center justify-center">
            <div className="text-center">
              <div className="text-electric text-6xl mb-4">⚠️</div>
              <h2 className="text-xl font-bold mb-2">Gagal Login</h2>
              <p className="text-gray-400 mb-4">Tidak dapat memproses login dari aplikasi.</p>
              <button 
                onClick={() => window.location.reload()}
                className="bg-electric hover:bg-electric/80 text-white font-bold py-2 px-4 rounded"
              >
                Coba Lagi
              </button>
              {authError && (
                <p className="text-magenta mt-4 text-sm">Error: {authError}</p>
              )}
            </div>
          </div>
        );
      }
    }
  } else {
    // Untuk web: gunakan logic original
    if (firebaseUser) {
      if (pendingGoogleUser) {
        contentToRender = <CreateIdPage onProfileComplete={handleProfileComplete} googleProfile={pendingGoogleUser} />;
      } else if (currentUser && currentUser.username) {
        contentToRender = (
          <>
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
          </>
        );
      } else {
        // Fallback ke login page
        contentToRender = <LoginPage onGoogleRegisterSuccess={handleGoogleRegisterSuccess} />;
      }
    } else {
      contentToRender = <LoginPage onGoogleRegisterSuccess={handleGoogleRegisterSuccess} />;
    }
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
  const isNativeApp = (window as any).IS_NATIVE_ANDROID_APP === true;

  if (!database && !isNativeApp) {
    return (
      <div style={{ color: 'white', backgroundColor: '#0A0A0A', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
        <div style={{ border: '1px solid #FF00FF', padding: '20px', borderRadius: '8px', textAlign: 'center', maxWidth: '500px' }}>
          <h1 style={{ color: '#FF00FF', fontSize: '24px' }}>Kesalahan Koneksi Database</h1>
          <p style={{ marginTop: '10px', lineHeight: '1.6' }}>
            Gagal terhubung ke Firebase Realtime Database.
          </p>
        </div>
      </div>
    );
  }

  if (!googleClientId && !isNativeApp) {
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

  // Untuk native app, tidak perlu GoogleOAuthProvider
  if (isNativeApp) {
    return (
      <React.StrictMode>
        <AppContent />
      </React.StrictMode>
    );
  }

  // Untuk web, gunakan GoogleOAuthProvider seperti biasa
  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <React.StrictMode>
        <AppContent />
      </React.StrictMode>
    </GoogleOAuthProvider>
  );
};

export default App;