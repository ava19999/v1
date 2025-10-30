// App.tsx - PERBAIKAN UNTUK ANDROID NATIVE LOGIN
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

  // PERBAIKAN: State untuk native app config dan status
  const [nativeAppConfig, setNativeAppConfig] = useState<NativeAppConfig>({
    isNativeAndroidApp: false,
    authToken: null
  });
  const [isNativeAuthProcessing, setIsNativeAuthProcessing] = useState(false);

  // PERBAIKAN: Effect untuk deteksi native app - dipisah dari login logic
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
    }
  }, []);

  // PERBAIKAN: Effect terpisah untuk handle native app login
  useEffect(() => {
    if (nativeAppConfig.isNativeAndroidApp && nativeAppConfig.authToken && !isNativeAuthProcessing) {
      console.log('🚀 Starting native app login process...');
      handleNativeAppLogin(nativeAppConfig.authToken);
    }
  }, [nativeAppConfig.isNativeAndroidApp, nativeAppConfig.authToken, isNativeAuthProcessing]);

  // PERBAIKAN: Fungsi handleNativeAppLogin yang lebih robust
  const handleNativeAppLogin = useCallback(async (idToken: string) => {
    if (!idToken || isNativeAuthProcessing) {
      console.log('⏸️ Skipping native app login - no token or already processing');
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
      
      // PERBAIKAN: Gunakan functional update untuk state users
      setUsers(prevUsers => {
        const existingAppUser = Object.values(prevUsers).find(u => u.email === email);
        
        if (existingAppUser) {
          console.log('✅ Existing user found, setting current user');
          setCurrentUser(existingAppUser);
          return prevUsers;
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
          
          // PERBAIKAN: Update state secara synchronous
          setTimeout(() => {
            setCurrentUser(newUser);
          }, 0);
          
          return { ...prevUsers, [newUser.email]: newUser };
        }
      });
      
      setPendingGoogleUser(null);
      setAuthError(null);
      
    } catch (error) {
      console.error('❌ Native app login failed:', error);
      setAuthError('Gagal login dengan aplikasi native. Silakan coba lagi.');
    } finally {
      setIsNativeAuthProcessing(false);
    }
  }, [isNativeAuthProcessing]);

  // ... (kode lainnya tetap sama, tidak berubah)

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

  // ... (kode Firebase listeners lainnya tetap sama)

  useEffect(() => {
    if (!database) {
      console.warn('Firebase Auth listener skipped: Database not initialized.');
      setIsAuthLoading(false);
      return;
    }
    const auth = getAuth();
    setIsAuthLoading(true);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('🔥 Firebase auth state changed:', user ? user.email : 'No user');
      setFirebaseUser(user);
      
      // PERBAIKAN: Jangan reset currentUser jika sudah ada dari native app
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
        // PERBAIKAN: Jangan reset currentUser jika di native app dan sedang processing
        if (!nativeAppConfig.isNativeAndroidApp || !isNativeAuthProcessing) {
          if (currentUser !== null) setCurrentUser(null);
          setPendingGoogleUser(null);
        }
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, [users, currentUser, pendingGoogleUser, database, currentRoom, nativeAppConfig.isNativeAndroidApp, isNativeAuthProcessing]);

  // PERBAIKAN: Handle Google Register Success - skip untuk native app
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

  // ... (fungsi lainnya tetap sama)

  // PERBAIKAN: Render logic dengan penanganan native app yang lebih baik
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

  // PERBAIKAN: Loading state untuk native app
  if (isAuthLoading || (nativeAppConfig.isNativeAndroidApp && isNativeAuthProcessing)) {
    return (
      <div className="min-h-screen bg-transparent text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric mx-auto"></div>
          <p className="mt-4">
            {nativeAppConfig.isNativeAndroidApp ? 'Menyiapkan sesi dari aplikasi...' : 'Memverifikasi sesi Anda...'}
          </p>
          {nativeAppConfig.isNativeAndroidApp && (
            <p className="text-sm text-gray-400 mt-2">Token: {nativeAppConfig.authToken ? '✓ Diterima' : '✗ Tidak ada'}</p>
          )}
        </div>
      </div>
    );
  }

  let contentToRender;
  
  // PERBAIKAN: Logic render yang lebih sederhana untuk native app
  if (nativeAppConfig.isNativeAndroidApp) {
    // Untuk native app, langsung render main app jika currentUser ada
    if (currentUser) {
      contentToRender = (
        <>
          <Header userProfile={currentUser} onLogout={handleLogout} activePage={activePage} onNavigate={handleNavigate} currency={currency} onCurrencyChange={setCurrency} hotCoin={hotCoinForHeader} idrRate={idrRate} />
          <main className="flex-grow">{renderActivePage()}</main>
          <Footer />
        </>
      );
    } else {
      // Fallback jika native app gagal login
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
  } else {
    // Logic original untuk web
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