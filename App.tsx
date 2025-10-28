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
         if (!database) { console.warn("Messages listener skipped: Database not initialized."); if (currentRoom?.id) setFirebaseMessages(prev => ({ ...prev, [currentRoom.id]: [] })); return () => {}; }
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
                      // --- PERBAIKAN: Tambahkan return ---
                      return timeA - timeB;
                      // --- AKHIR PERBAIKAN ---
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
       if (!database) { console.warn("News fetch skipped: Database not initialized."); return; }
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
               // --- PERBAIKAN: Sederhanakan catch block ---
               let errorMessage = 'Unknown news fetch error';
               if (err instanceof Error) {
                  errorMessage = err.message;
               } else if (typeof err === 'string') {
                  errorMessage = err;
               }
               // Pastikan isMounted dicek sebelum console.error
               if (isMounted) {
                   console.error("News fetch failed:", errorMessage);
               }
               // --- AKHIR PERBAIKAN ---
           }
       };
       fetchAndProcessNews();
       const intervalId = setInterval(fetchAndProcessNews, NEWS_FETCH_INTERVAL);
       return () => { isMounted = false; clearInterval(intervalId); };
     }, [currentRoom, database]);

    // --- Auth Handlers ---
    const handleGoogleRegisterSuccess = useCallback(/* ... kode ... */);
    const handleLogin = useCallback(/* ... kode ... */);
    const handleProfileComplete = useCallback(/* ... kode ... */);
    const handleLogout = useCallback(/* ... kode ... */);

    // --- App Logic Handlers ---
    const handleIncrementAnalysisCount = useCallback(/* ... kode ... */);
    const handleNavigate = useCallback(/* ... kode ... */);
    const handleSelectCoin = useCallback(/* ... kode ... */);
    const handleJoinRoom = useCallback(/* ... kode ... */);
    const handleLeaveRoom = useCallback(/* ... kode ... */);
    const handleLeaveJoinedRoom = useCallback(/* ... kode ... */);
    const handleCreateRoom = useCallback(/* ... kode ... */);
    const handleDeleteRoom = useCallback(/* ... kode ... */);
    const handleSendMessage = useCallback(/* ... kode ... */);
    const handleReaction = useCallback(/* ... kode ... */);
    const handleDeleteMessage = useCallback(/* ... kode ... */);

    // --- Memoized Values ---
    const totalUsers = useMemo(/* ... */);
    const heroCoin = useMemo(/* ... */);
    const otherTrendingCoins = useMemo(/* ... */);
    const hotCoinForHeader = useMemo(/* ... */);

    // --- Render Logic ---
    const renderActivePage = () => { /* ... kode renderActivePage tetap sama ... */ };

    // --- Render Utama ---
    if (isAuthLoading) { /* ... kode loading ... */ }

    // Alur Render Autentikasi
    let contentToRender;
    if (firebaseUser) { /* ... logika render jika login ... */ }
    else { /* ... logika render jika tidak login ... */ }

    // Render container utama
    return (
        <div className="min-h-screen bg-transparent text-white font-sans flex flex-col">
            <Particles />
            {contentToRender}
            {authError && ( /* ... Render Auth Error ... */ )}
        </div>
    );
}; // Akhir dari AppContent

// Komponen App Wrapper (Tetap sama)
const App = () => { /* ... kode ... */ };
export default App;