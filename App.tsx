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
} from "firebase/auth";

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
import type { ForumMessageItem, Room, CoinListItem, CryptoData, ChatMessage, Page, Currency, NewsArticle, User, GoogleProfile, ExtendedRoomsListPageProps } from './types';
import { isNewsArticle, isChatMessage } from './types';
import { fetchIdrRate, fetchNewsArticles, fetchTop500Coins, fetchTrendingCoins, fetchCoinDetails } from './services/mockData';
import { ADMIN_USERNAMES } from './components/UserTag';
import { database } from './services/firebaseService'; // database bisa jadi null
import { ref, set, push, onValue, off, update, get, Database } from "firebase/database";

const DEFAULT_ROOM_IDS = ['berita-kripto', 'pengumuman-aturan'];

const defaultMessages: { [key: string]: ForumMessageItem[] } = {
    'pengumuman-aturan': [
        { id: 'rule1', type: 'system', text: 'Selamat datang di RT Crypto! Diskusi & analisis.', sender: 'system', timestamp: Date.now() - 2000 },
        { id: 'rule2', type: 'system', text: 'Aturan: Dilarang share sinyal. DYOR. Risiko ditanggung sendiri.', sender: 'system', timestamp: Date.now() - 1000 },
        { id: 'mission1', type: 'system', text: 'Misi: Jadi trader cerdas bareng, bukan ikut-ikutan. Ayo menang bareng!', sender: 'system', timestamp: Date.now() }
    ],
};

// Komponen Partikel
const Particles = () => (
    <div className="particles fixed top-0 left-0 w-full h-full -z-10 pointer-events-none">
        <div className="particle absolute bg-electric/50 rounded-full opacity-0 animate-[drift_20s_infinite_linear]" style={{ width: '3px', height: '3px', left: '10%', animationDelay: '-1s' }}></div>
        <div className="particle absolute bg-magenta/50 rounded-full opacity-0 animate-[drift_25s_infinite_linear_-5s]" style={{ width: '2px', height: '2px', left: '25%'}}></div>
        <div className="particle absolute bg-lime/50 rounded-full opacity-0 animate-[drift_15s_infinite_linear_-10s]" style={{ width: '4px', height: '4px', left: '50%'}}></div>
        <div className="particle absolute bg-electric/30 rounded-full opacity-0 animate-[drift_18s_infinite_linear_-7s]" style={{ width: '2px', height: '2px', left: '75%'}}></div>
        <div className="particle absolute bg-lime/40 rounded-full opacity-0 animate-[drift_22s_infinite_linear_-3s]" style={{ width: '3px', height: '3px', left: '90%'}}></div>
    </div>
);

// Komponen Utama Aplikasi
const AppContent = () => {
    // --- State Variables ---
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
      { id: 'umum', name: 'Kripto Naik/Turun Hari Ini', userCount: 134 + Math.floor(Math.random() * 20), createdBy: 'Admin_RTC'},
      { id: 'meme', name: 'Meme Coin Mania', userCount: 88 + Math.floor(Math.random() * 20)},
      { id: 'xrp-army', name: 'Xrp Army', userCount: 73 + Math.floor(Math.random() * 20)},
      { id: 'roblox-tuker-kripto', name: 'Roblox Tuker Kripto', userCount: 42 + Math.floor(Math.random() * 20)},
    ]);
    const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
    const [joinedRoomIds, setJoinedRoomIds] = useState<Set<string>>( () => new Set(DEFAULT_ROOM_IDS) );
    const [unreadCounts, setUnreadCounts] = useState<{ [key: string]: { count: number; lastUpdate: number } }>({});
    const [firebaseMessages, setFirebaseMessages] = useState<{ [roomId: string]: ForumMessageItem[] }>({});

    // --- Helper Functions ---
    const fetchTrendingData = useCallback(async (showSkeleton = true) => {
        if (showSkeleton) { setIsTrendingLoading(true); setTrendingError(null); }
        try { setTrendingCoins(await fetchTrendingCoins()); }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Gagal memuat data tren.";
            if (showSkeleton) { setTrendingError(errorMessage); }
            else { console.error("Gagal menyegarkan data tren:", errorMessage); }
        } finally {
            if (showSkeleton) { setIsTrendingLoading(false); }
        }
    }, []);

    const handleResetToTrending = useCallback(() => {
        setSearchedCoin(null);
        setActivePage('home');
        fetchTrendingData(true);
    }, [fetchTrendingData]);

    // --- Effects ---
    // Load users from Local Storage on mount
    useEffect(() => {
        try {
            const u = localStorage.getItem('cryptoUsers');
            if (u) setUsers(JSON.parse(u));
        } catch (e) { console.error("Gagal load users", e); }
    }, []);

    // Firebase Auth State Listener
    useEffect(() => {
        const auth = getAuth();
        setIsAuthLoading(true);
        console.log("Setting up Firebase Auth listener...");
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            console.log("onAuthStateChanged triggered. User:", user ? user.uid : 'null');
            setFirebaseUser(user);
            if (user) {
                const appUser = Object.values(users).find(u => u.email === user.email);
                if (appUser) {
                    if (!currentUser || currentUser.email !== appUser.email) {
                        console.log("Auth listener: Found matching app user, setting currentUser:", appUser);
                        setCurrentUser(appUser);
                        setPendingGoogleUser(null);
                    }
                } else if (!pendingGoogleUser) {
                    console.warn("Auth listener: Firebase user exists but no matching app user found and not pending. Forcing app logout.");
                    setCurrentUser(null);
                }
            } else {
                 if (currentUser !== null) {
                    console.log("Auth listener: Firebase user logged out, clearing currentUser.");
                    setCurrentUser(null);
                 }
                 setPendingGoogleUser(null);
            }
            setIsAuthLoading(false);
        });
        return () => {
             console.log("Cleaning up Firebase Auth listener.");
             unsubscribe();
        };
    }, [users, currentUser, pendingGoogleUser]);

    // Persist users & currentUser to Local Storage
    useEffect(() => { try { localStorage.setItem('cryptoUsers', JSON.stringify(users)); } catch (e) { console.error("Gagal simpan users", e); } }, [users]);
    useEffect(() => { try { if (currentUser) localStorage.setItem('currentUser', JSON.stringify(currentUser)); else localStorage.removeItem('currentUser'); } catch (e) { console.error("Gagal simpan currentUser", e); } }, [currentUser]);

    // Other Effects
    useEffect(() => { const saved = localStorage.getItem('unreadCounts'); if (saved) try { setUnreadCounts(JSON.parse(saved)); } catch (e) { console.error("Gagal parse unreadCounts", e); } }, []);
    useEffect(() => { localStorage.setItem('unreadCounts', JSON.stringify(unreadCounts)); }, [unreadCounts]);
    useEffect(() => { const lastReset = localStorage.getItem('lastAnalysisResetDate'); const today = new Date().toISOString().split('T')[0]; if (lastReset !== today) { localStorage.setItem('analysisCounts', '{}'); localStorage.setItem('lastAnalysisResetDate', today); setAnalysisCounts({}); } else { const saved = localStorage.getItem('analysisCounts'); if (saved) try { setAnalysisCounts(JSON.parse(saved)); } catch (e) { console.error("Gagal parse analysis counts", e); } } }, []);
    useEffect(() => { const getRate = async () => { setIsRateLoading(true); try { setIdrRate(await fetchIdrRate()); } catch (error) { console.error("Gagal ambil kurs IDR:", error); setIdrRate(16000); } finally { setIsRateLoading(false); } }; getRate(); }, []);
    useEffect(() => { const fetchList = async () => { setIsCoinListLoading(true); setCoinListError(null); try { setFullCoinList(await fetchTop500Coins()); } catch (err) { setCoinListError("Gagal ambil daftar koin."); } finally { setIsCoinListLoading(false); } }; fetchList(); }, []);
    useEffect(() => { fetchTrendingData(); }, [fetchTrendingData]);

    // Firebase Messages Listener Effect
     useEffect(() => {
         if (!database) { console.warn("Messages listener skipped: DB not initialized."); if (currentRoom?.id) setFirebaseMessages(prev => ({ ...prev, [currentRoom.id]: [] })); return () => {}; }
         if (!currentRoom?.id) { return () => {}; }

         const messagesRef = ref(database, `messages/${currentRoom.id}`);
         const listener = onValue(messagesRef, (snapshot) => {
             const data = snapshot.val();
             const messagesArray: ForumMessageItem[] = [];
             if (data) {
                 Object.keys(data).forEach(key => {
                    const msgData = data[key];
                    if (msgData && typeof msgData === 'object' && msgData.timestamp && typeof msgData.timestamp === 'number') {
                         let type: 'news' | 'user' | 'system' | undefined = msgData.type;
                         if (!type) { // Infer type
                             if ('published_on' in msgData && 'source' in msgData) type = 'news';
                             else if (msgData.sender === 'system') type = 'system';
                             else if ('sender' in msgData) type = 'user';
                         }
                         if (type === 'news' || type === 'user' || type === 'system') {
                             const reactions = typeof msgData.reactions === 'object' && msgData.reactions !== null ? msgData.reactions : {};
                             const uid = type === 'user' ? msgData.uid : undefined;
                             messagesArray.push({ ...msgData, id: key, type, reactions, uid });
                         } else { console.warn("Invalid message type:", key, msgData); }
                     } else { console.warn("Invalid message structure:", key, msgData); }
                 });
             }
             let finalMessages = messagesArray;
             if (messagesArray.length === 0 && currentRoom?.id) {
                 if (defaultMessages[currentRoom.id]) {
                     finalMessages = [...defaultMessages[currentRoom.id]];
                 } else if (!DEFAULT_ROOM_IDS.includes(currentRoom.id) && currentUser?.username) {
                     const welcomeMsg: ChatMessage = { id: `${currentRoom.id}-welcome-${Date.now()}`, type: 'system', text: `Selamat datang di room "${currentRoom.name}".`, sender: 'system', timestamp: Date.now() };
                     const adminMsg: ChatMessage = { id: `${currentRoom.id}-admin-${Date.now()}`, type: 'user', uid: 'ADMIN_UID_PLACEHOLDER', text: 'Ingat DYOR!', sender: 'Admin_RTC', timestamp: Date.now() + 1, reactions: {'👍': []} };
                     finalMessages = [welcomeMsg, adminMsg];
                 }
             }

             setFirebaseMessages(prev => ({
                 ...prev,
                 [currentRoom!.id]: finalMessages.sort((a, b) => {
                      const timeA = isNewsArticle(a) ? (a.published_on * 1000) : (isChatMessage(a) ? a.timestamp : 0);
                      const timeB = isNewsArticle(b) ? (b.published_on * 1000) : (isChatMessage(b) ? b.timestamp : 0);
                      return timeA - timeB;
                  })
             }));
         }, (error) => {
             console.error(`Firebase listener error room ${currentRoom?.id}:`, error);
             if (currentRoom?.id) setFirebaseMessages(prev => ({ ...prev, [currentRoom.id]: [] }));
         });
         return () => { if (database) { off(messagesRef, 'value', listener); } };
     }, [currentRoom, currentUser, database]);

     // News Fetch Effect
     useEffect(() => {
       if (!database) { console.warn("News fetch skipped: DB not initialized."); return; }
       const currentDb = database;
       const NEWS_ROOM_ID = 'berita-kripto'; const NEWS_FETCH_INTERVAL = 20 * 60 * 1000; const LAST_FETCH_KEY = 'lastNewsFetchTimestamp';
       let isMounted = true;
       const fetchAndProcessNews = async () => {
           const currentTime = Date.now();
           const lastFetch = parseInt(localStorage.getItem(LAST_FETCH_KEY) || '0', 10);
           // if (currentTime - lastFetch < NEWS_FETCH_INTERVAL) return;
           try {
               const fetchedArticles = await fetchNewsArticles();
               if (!isMounted || !fetchedArticles || fetchedArticles.length === 0) return;
               if (!currentDb) { console.warn("DB became null during news fetch"); return; }
               const newsRoomRef = ref(currentDb, `messages/${NEWS_ROOM_ID}`);
               const snapshot = await get(newsRoomRef);
               const existingNewsData = snapshot.val() || {};
               const existingNewsValues = typeof existingNewsData === 'object' && existingNewsData !== null ? Object.values<any>(existingNewsData) : [];
               const existingNewsUrls = new Set(existingNewsValues.map(news => news.url).filter(url => typeof url === 'string'));
               let newArticleAdded = false;
               const updates: { [key: string]: Omit<NewsArticle, 'id'> } = {};
               fetchedArticles.forEach(article => {
                   if (article.url && article.title && article.published_on && article.source && !existingNewsUrls.has(article.url)) {
                       const newsRef = push(newsRoomRef);
                       if (newsRef.key) {
                           const articleData: Omit<NewsArticle, 'id'> = { type: 'news', title: article.title, url: article.url, imageurl: article.imageurl || '', published_on: article.published_on, source: article.source, body: article.body || '', reactions: {}, };
                           updates[newsRef.key] = articleData;
                           newArticleAdded = true;
                       }
                   }
               });
               if (newArticleAdded && isMounted) {
                   await update(newsRoomRef, updates);
                   localStorage.setItem(LAST_FETCH_KEY, currentTime.toString());
                   if (currentRoom?.id !== NEWS_ROOM_ID) { setUnreadCounts(prev => ({ ...prev, [NEWS_ROOM_ID]: { count: (prev[NEWS_ROOM_ID]?.count || 0) + Object.keys(updates).length, lastUpdate: currentTime } })); }
               } else if (isMounted) { console.log("No new unique articles."); }
           } catch (err: unknown) {
               let errorMessage = 'Unknown news fetch error';
               if (err instanceof Error) { errorMessage = err.message; }
               else if (typeof err === 'string') { errorMessage = err; }
               if (isMounted) { console.error("News fetch failed:", errorMessage); }
           }
       };
       fetchAndProcessNews();
       const intervalId = setInterval(fetchAndProcessNews, NEWS_FETCH_INTERVAL);
       return () => { isMounted = false; clearInterval(intervalId); };
     }, [currentRoom, database]);

    // --- Auth Handlers ---
    const handleGoogleRegisterSuccess = useCallback(async (credentialResponse: CredentialResponse) => {
        setAuthError(null);
        if (!credentialResponse.credential) { setAuthError("Credential Google tidak ditemukan."); return; }
        try {
            const decoded: { email: string; name: string; picture: string; } = jwtDecode(credentialResponse.credential);
            const { email, name, picture } = decoded;
            console.log("Google Sign-In Success, attempting Firebase link...");
            const auth = getAuth();
            const googleCredential = GoogleAuthProvider.credential(credentialResponse.credential);
            signInWithCredential(auth, googleCredential)
              .then((userCredential) => {
                 const fbUser = userCredential.user;
                 console.log("Firebase signInWithCredential success:", fbUser);
                 const existingAppUser = Object.values(users).find(u => u.email === email);
                 if (existingAppUser) {
                      console.log("Existing user found, setting currentUser.");
                      setCurrentUser(existingAppUser);
                      setPendingGoogleUser(null);
                 } else {
                      console.log("New user via Google, setting pendingGoogleUser.");
                      setPendingGoogleUser({ email, name, picture });
                      if (currentUser) setCurrentUser(null);
                 }
              })
              .catch((error) => {
                 console.error("Firebase signInWithCredential error:", error);
                 let errMsg = "Gagal menghubungkan login Google ke Firebase.";
                 if (error.code === 'auth/account-exists-with-different-credential') { errMsg = "Akun dengan email ini sudah ada."; }
                 else if (error.message) { errMsg += ` (${error.message})`; }
                 setAuthError(errMsg);
                 if (currentUser) setCurrentUser(null);
              });
        } catch (error) {
            console.error("Google login decode/Firebase error:", error);
            setAuthError("Error memproses login Google.");
            if (currentUser) setCurrentUser(null);
        }
    }, [users, currentUser]);

    const handleLogin = useCallback(async (usernameOrEmail: string, password: string): Promise<string | void> => {
        setAuthError(null);
        const user = Object.values(users).find(u => u.username.toLowerCase() === usernameOrEmail.toLowerCase() || u.email.toLowerCase() === usernameOrEmail.toLowerCase());
        if (user && user.password === password) {
            console.log("Manual login successful, setting currentUser:", user);
            // TODO: Implement Firebase sign-in with email/password if needed
            setCurrentUser(user);
        } else {
            const errorMsg = 'Username/email atau kata sandi salah.';
            setAuthError(errorMsg);
            return errorMsg;
        }
    }, [users]);

    const handleProfileComplete = useCallback(async (username: string, password: string): Promise<string | void> => {
        setAuthError(null);
        if (!pendingGoogleUser) { setAuthError('Data Google tidak ditemukan.'); return 'Data Google tidak ditemukan.';}
        if (!firebaseUser) { setAuthError('Sesi login Firebase tidak aktif.'); return 'Sesi login Firebase tidak aktif.';}
        if (Object.values(users).some(u => u.username.toLowerCase() === username.toLowerCase())) {
            const errorMsg = 'Username sudah digunakan.'; setAuthError(errorMsg); return errorMsg;
        }
        const newUser: User = { email: pendingGoogleUser.email, username: username, password: password, googleProfilePicture: pendingGoogleUser.picture, createdAt: Date.now() };
        console.log("Profile complete, creating new user:", newUser);
        setUsers(prev => ({ ...prev, [newUser.email]: newUser }));
        setCurrentUser(newUser);
        setPendingGoogleUser(null);
    }, [users, pendingGoogleUser, firebaseUser]);

    const handleLogout = useCallback(() => {
        console.log("handleLogout called");
        const auth = getAuth();
        signOut(auth).catch((error) => { console.error("Firebase signOut error:", error); });
        setActivePage('home');
    }, []);

    // --- App Logic Handlers ---
    const handleIncrementAnalysisCount = useCallback((coinId: string) => { setAnalysisCounts(prev => { const current = prev[coinId] || baseAnalysisCount; const newCounts = { ...prev, [coinId]: current + 1 }; localStorage.setItem('analysisCounts', JSON.stringify(newCounts)); return newCounts; }); }, []);
    const handleNavigate = useCallback((page: Page) => { if (page === 'home' && activePage === 'home') { handleResetToTrending(); } else if (page === 'forum') { setActivePage('rooms'); } else { setActivePage(page); } }, [activePage, handleResetToTrending]);
    const handleSelectCoin = useCallback(async (coinId: string) => { setIsTrendingLoading(true); setTrendingError(null); setSearchedCoin(null); try { setSearchedCoin(await fetchCoinDetails(coinId)); } catch (err) { setTrendingError(err instanceof Error ? err.message : "Gagal muat detail koin."); } finally { setIsTrendingLoading(false); } }, []);
    const handleJoinRoom = useCallback((room: Room) => { setCurrentRoom(room); setJoinedRoomIds(prev => new Set(prev).add(room.id)); setUnreadCounts(prev => ({ ...prev, [room.id]: { count: 0, lastUpdate: Date.now() } })); setActivePage('forum'); }, []);
    const handleLeaveRoom = useCallback(() => { setCurrentRoom(null); setActivePage('rooms'); }, []);
    const handleLeaveJoinedRoom = useCallback((roomId: string) => { if (DEFAULT_ROOM_IDS.includes(roomId)) return; setJoinedRoomIds(prev => { const newIds = new Set(prev); newIds.delete(roomId); return newIds; }); if (currentRoom?.id === roomId) { setCurrentRoom(null); setActivePage('rooms'); } }, [currentRoom]);
    const handleCreateRoom = useCallback((roomName: string) => { if (!currentUser?.username) { alert("Login dulu."); return; } const trimmedName = roomName.trim(); if (rooms.some(r => r.name.toLowerCase() === trimmedName.toLowerCase())) { alert('Nama room sudah ada.'); return; } const newRoom: Room = { id: trimmedName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(), name: trimmedName, userCount: 1, createdBy: currentUser.username }; setRooms(prev => [newRoom, ...prev]); handleJoinRoom(newRoom); }, [handleJoinRoom, rooms, currentUser]);

    const handleDeleteRoom = useCallback((roomId: string) => {
        // --- PERBAIKAN DI SINI (Error TS2345 baris ~371) ---
        // Pastikan database tidak null SEBELUM memanggil ref
        if (!currentUser?.username || !database || !firebaseUser) {
             console.warn("Delete room prerequisites failed.");
             return; // Hentikan eksekusi jika database null
        }
        // --- AKHIR PERBAIKAN ---

        const roomToDelete = rooms.find(r => r.id === roomId);
        if (!roomToDelete || DEFAULT_ROOM_IDS.includes(roomId)) return;

        // database di sini sudah pasti tidak null
        const adminsRef = ref(database, 'admins/' + firebaseUser.uid);
        get(adminsRef).then((snapshot) => {
            const isAdmin = snapshot.exists() && snapshot.val() === true;
            const isCreator = roomToDelete.createdBy === currentUser.username;

            if (!isAdmin && !isCreator) { alert("Hanya admin/pembuat yang bisa hapus."); return; }

            if (window.confirm(`Hapus room "${roomToDelete.name}"?`)) {
                setRooms(prev => prev.filter(r => r.id !== roomId));
                setJoinedRoomIds(prev => { const n = new Set(prev); n.delete(roomId); return n; });
                if (currentRoom?.id === roomId) { setCurrentRoom(null); setActivePage('rooms'); }
                // database di sini sudah pasti tidak null
                const messagesRef = ref(database, `messages/${roomId}`);
                set(messagesRef, null).catch(error => console.error(`Gagal hapus pesan room ${roomId}:`, error));
            }
        }).catch(error => console.error("Gagal memeriksa status admin:", error));

    }, [currentUser, rooms, currentRoom, database, firebaseUser]);

    const handleSendMessage = useCallback((message: Partial<ChatMessage>) => {
        if (!database || !currentRoom?.id || !firebaseUser?.uid || !currentUser?.username) { console.error("Prasyarat kirim pesan gagal", { db: !!database, room: currentRoom?.id, fbUid: firebaseUser?.uid, appUser: currentUser?.username }); alert("Gagal mengirim: Belum login atau data tidak lengkap."); return; }
        const messageToSend: Omit<ChatMessage, 'id'> = { type: 'user', uid: firebaseUser.uid, sender: currentUser.username, timestamp: Date.now(), reactions: {}, ...(message.text && { text: message.text }), ...(message.fileURL && { fileURL: message.fileURL }), ...(message.fileName && { fileName: message.fileName }), };
        if (!messageToSend.text && !messageToSend.fileURL) { console.warn("Pesan kosong."); return; }
        const messageListRef = ref(database, `messages/${currentRoom.id}`);
        const newMessageRef = push(messageListRef);
        set(newMessageRef, messageToSend).catch((error) => { console.error("Firebase send error:", error); alert(`Gagal mengirim pesan.${error.code === 'PERMISSION_DENIED' ? ' Akses ditolak.' : ''}`); });
    }, [currentRoom, currentUser, database, firebaseUser]);

    const handleReaction = useCallback((messageId: string, emoji: string) => {
        if (!database || !currentRoom?.id || !firebaseUser?.uid || !messageId) { console.warn("React prerequisites failed"); return; }
        const username = currentUser?.username;
        if (!username) { console.warn("Cannot react: Missing app username"); return; }
        const reactionUserListRef = ref(database, `messages/${currentRoom.id}/${messageId}/reactions/${emoji}`);
        get(reactionUserListRef).then((snapshot) => {
            const usersForEmoji: string[] = snapshot.val() || [];
            let updatedUsers: string[] | null = usersForEmoji.includes(username) ? usersForEmoji.filter(u => u !== username) : [...usersForEmoji, username];
            if (updatedUsers.length === 0) updatedUsers = null;
            set(reactionUserListRef, updatedUsers).catch(error => console.error("Update reaction failed:", error));
        }).catch(error => console.error("Get reaction failed:", error));
    }, [currentRoom, currentUser, database, firebaseUser]);

    const handleDeleteMessage = useCallback((roomId: string, messageId: string) => {
        if (!database || !roomId || !messageId) { console.error("Cannot delete message."); return; }
        const messageRef = ref(database, `messages/${roomId}/${messageId}`);
        set(messageRef, null).catch((error) => { console.error(`Failed to delete msg ${messageId}:`, error); alert("Gagal hapus pesan."); });
    }, [database]);

    // --- Memoized Values ---
    const totalUsers = useMemo(() => rooms.reduce((sum, room) => sum + (room.userCount || 0), 0), [rooms]);
    const heroCoin = useMemo(() => searchedCoin || trendingCoins[0] || null, [searchedCoin, trendingCoins]);
    const otherTrendingCoins = useMemo(() => searchedCoin ? [] : trendingCoins.slice(1), [searchedCoin, trendingCoins]);
    const hotCoinForHeader: { name: string; logo: string; price: number; change: number; } | null = useMemo(() => trendingCoins.length > 1 ? { name: trendingCoins[1].name, logo: trendingCoins[1].image, price: trendingCoins[1].price, change: trendingCoins[1].change } : null, [trendingCoins]);

    // --- Render Logic ---
    const renderActivePage = () => {
         switch (activePage) {
          case 'home': return <HomePage idrRate={idrRate} isRateLoading={isRateLoading} currency={currency} onIncrementAnalysisCount={handleIncrementAnalysisCount} fullCoinList={fullCoinList} isCoinListLoading={isCoinListLoading} coinListError={coinListError} heroCoin={heroCoin} otherTrendingCoins={otherTrendingCoins} isTrendingLoading={isTrendingLoading} trendingError={trendingError} onSelectCoin={handleSelectCoin} onReloadTrending={handleResetToTrending} />;
          case 'rooms': return <RoomsListPage rooms={rooms} onJoinRoom={handleJoinRoom} onCreateRoom={handleCreateRoom} totalUsers={totalUsers} hotCoin={hotCoinForHeader} userProfile={currentUser} currentRoomId={currentRoom?.id || null} joinedRoomIds={joinedRoomIds} onLeaveJoinedRoom={handleLeaveJoinedRoom} unreadCounts={unreadCounts} onDeleteRoom={handleDeleteRoom} />;
          case 'forum':
                const currentMessages = currentRoom ? (firebaseMessages[currentRoom.id] || []) : [];
                const displayMessages = (currentMessages.length === 0 && currentRoom && defaultMessages[currentRoom.id]) ? defaultMessages[currentRoom.id] : currentMessages;
                const messagesToPass = Array.isArray(displayMessages) ? displayMessages : [];
                return <ForumPage room={currentRoom} messages={messagesToPass} userProfile={currentUser} onSendMessage={handleSendMessage} onLeaveRoom={handleLeaveRoom} onReact={handleReaction} onDeleteMessage={handleDeleteMessage} />;
          case 'about': return <AboutPage />;
          default: return <HomePage idrRate={idrRate} isRateLoading={isRateLoading} currency={currency} onIncrementAnalysisCount={handleIncrementAnalysisCount} fullCoinList={fullCoinList} isCoinListLoading={isCoinListLoading} coinListError={coinListError} heroCoin={heroCoin} otherTrendingCoins={otherTrendingCoins} isTrendingLoading={isTrendingLoading} trendingError={trendingError} onSelectCoin={handleSelectCoin} onReloadTrending={handleResetToTrending} />;
        }
    };

    // --- Render Utama ---
    if (isAuthLoading) {
        return ( <div className="min-h-screen bg-transparent text-white flex items-center justify-center"> Memverifikasi sesi... </div> );
    }

    // Alur Render Autentikasi
    let contentToRender;
    if (firebaseUser) {
        if (pendingGoogleUser && (!currentUser || currentUser.email !== pendingGoogleUser.email )) {
             console.log("Rendering CreateIdPage (pendingGoogleUser exists)");
             contentToRender = <CreateIdPage onProfileComplete={handleProfileComplete} googleProfile={pendingGoogleUser} />;
        } else if (currentUser && currentUser.username) {
             console.log("Rendering Main App (currentUser complete)");
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
                     <main className="flex-grow">
                         {renderActivePage()}
                     </main>
                     <Footer />
                 </>
             );
        } else if (currentUser && !currentUser.username && pendingGoogleUser) {
             console.log("Rendering CreateIdPage (currentUser exists but incomplete, pendingGoogleUser exists)");
             contentToRender = <CreateIdPage onProfileComplete={handleProfileComplete} googleProfile={pendingGoogleUser} />;
        }
         else {
             console.error("Invalid state for logged in user:", { firebaseUser, currentUser, pendingGoogleUser });
             handleLogout();
             contentToRender = <LoginPage onGoogleRegisterSuccess={handleGoogleRegisterSuccess} onLogin={handleLogin} />;
        }
    } else {
        console.log("Rendering LoginPage (firebaseUser is null)");
        contentToRender = <LoginPage onGoogleRegisterSuccess={handleGoogleRegisterSuccess} onLogin={handleLogin} />;
    }

    // Render container utama
    return (
        <div className="min-h-screen bg-transparent text-white font-sans flex flex-col">
            <Particles />
            {contentToRender}
            {authError && ( <div className="fixed bottom-4 right-4 bg-red-600 text-white p-3 rounded-lg shadow-lg z-50"> Error: {authError} <button onClick={() => setAuthError(null)} className="ml-2 text-sm underline">X</button> </div> )}
        </div>
    );
};

// Komponen App Wrapper
const App = () => {
    const googleClientId = process.env.GOOGLE_CLIENT_ID;

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