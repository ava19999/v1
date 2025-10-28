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
    const fetchTrendingData = useCallback(async (showSkeleton = true) => { /* ... kode ... */ }, []);
    const handleResetToTrending = useCallback(() => { /* ... kode ... */ }, [fetchTrendingData]);

    // --- Effects ---
    // Load users from Local Storage on mount
    useEffect(() => { /* ... kode ... */ }, []);
    // Firebase Auth State Listener
    useEffect(() => { /* ... kode ... */ }, [users, currentUser, pendingGoogleUser]);
    // Persist users & currentUser to Local Storage
    useEffect(() => { /* ... save users ... */ }, [users]);
    useEffect(() => { /* ... save current user ... */ }, [currentUser]);
    // Other Effects
    useEffect(() => { /* ... load/save unread counts ... */ }, []);
    useEffect(() => { /* ... save unread counts ... */ }, [unreadCounts]);
    useEffect(() => { /* ... load/reset analysis counts ... */ }, []);
    useEffect(() => { /* ... fetch IDR rate ... */ }, []);
    useEffect(() => { /* ... fetch coin list ... */ }, []);
    useEffect(() => { /* ... fetch initial trending data ... */ }, [fetchTrendingData]);

    // Firebase Messages Listener Effect
     useEffect(() => {
         if (!database) { console.warn("Messages listener skipped: DB not initialized."); if (currentRoom?.id) setFirebaseMessages(prev => ({ ...prev, [currentRoom.id]: [] })); return () => {}; }
         if (!currentRoom?.id) { return () => {}; }
         const messagesRef = ref(database, `messages/${currentRoom.id}`);
         const listener = onValue(messagesRef, (snapshot) => { /* ... kode listener ... */ });
         return () => { off(messagesRef, 'value', listener); };
     }, [currentRoom, currentUser, database]);

     // News Fetch Effect
     useEffect(() => {
       if (!database) { console.warn("News fetch skipped: DB not initialized."); return; }
       const currentDb = database;
       const NEWS_ROOM_ID = 'berita-kripto'; const NEWS_FETCH_INTERVAL = 20 * 60 * 1000; const LAST_FETCH_KEY = 'lastNewsFetchTimestamp';
       let isMounted = true;
       const fetchAndProcessNews = async () => { /* ... kode fetch news ... */ };
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

    const handleDeleteRoom = useCallback((roomId: string) => {
        // --- PERBAIKAN: Pengecekan database DITAMBAHKAN di awal ---
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

    }, [currentUser, rooms, currentRoom, database, firebaseUser]); // database tetap dependency

    const handleSendMessage = useCallback((message: Partial<ChatMessage>) => {
        // Pengecekan database sudah ada di versi sebelumnya dan seharusnya benar
        if (!database || !currentRoom?.id || !firebaseUser?.uid || !currentUser?.username) {
             console.error("Prasyarat kirim pesan gagal", { db: !!database, room: currentRoom?.id, fbUid: firebaseUser?.uid, appUser: currentUser?.username });
             alert("Gagal mengirim: Belum login atau data tidak lengkap."); return;
        }
        const messageToSend: Omit<ChatMessage, 'id'> = { type: 'user', uid: firebaseUser.uid, sender: currentUser.username, timestamp: Date.now(), reactions: {}, ...(message.text && { text: message.text }), ...(message.fileURL && { fileURL: message.fileURL }), ...(message.fileName && { fileName: message.fileName }), };
        if (!messageToSend.text && !messageToSend.fileURL) { console.warn("Pesan kosong."); return; }
        const messageListRef = ref(database, `messages/${currentRoom.id}`); // Aman
        const newMessageRef = push(messageListRef);
        set(newMessageRef, messageToSend).catch((error) => { console.error("Firebase send error:", error); alert(`Gagal mengirim pesan.${error.code === 'PERMISSION_DENIED' ? ' Akses ditolak.' : ''}`); });
    }, [currentRoom, currentUser, database, firebaseUser]);

    const handleReaction = useCallback((messageId: string, emoji: string) => {
        // Pengecekan database sudah ada di versi sebelumnya dan seharusnya benar
        if (!database || !currentRoom?.id || !firebaseUser?.uid || !messageId) { console.warn("React prerequisites failed"); return; }
        const username = currentUser?.username;
        if (!username) { console.warn("Cannot react: Missing app username"); return; }
        const reactionUserListRef = ref(database, `messages/${currentRoom.id}/${messageId}/reactions/${emoji}`); // Aman
        get(reactionUserListRef).then((snapshot) => { /* ... logika update reaksi ... */ }).catch(error => console.error("Get reaction failed:", error));
    }, [currentRoom, currentUser, database, firebaseUser]);

    const handleDeleteMessage = useCallback((roomId: string, messageId: string) => {
        // Pengecekan database sudah ada di versi sebelumnya dan seharusnya benar
        if (!database || !roomId || !messageId) { console.error("Cannot delete message."); return; }
        const messageRef = ref(database, `messages/${roomId}/${messageId}`); // Aman
        set(messageRef, null).catch((error) => { /* ... error handling ... */ });
    }, [database]);

    // --- Memoized Values ---
    const totalUsers = useMemo(() => rooms.reduce((sum, room) => sum + (room.userCount || 0), 0), [rooms]);
    const heroCoin = useMemo(() => searchedCoin || trendingCoins[0] || null, [searchedCoin, trendingCoins]);
    const otherTrendingCoins = useMemo(() => searchedCoin ? [] : trendingCoins.slice(1), [searchedCoin, trendingCoins]);
    const hotCoinForHeader: { name: string; logo: string; price: number; change: number; } | null = useMemo(() => trendingCoins.length > 1 ? { name: trendingCoins[1].name, logo: trendingCoins[1].image, price: trendingCoins[1].price, change: trendingCoins[1].change } : null, [trendingCoins]);


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