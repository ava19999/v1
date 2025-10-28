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
import { ref, set, push, onValue, off, update, get, Database } from "firebase/database"; // Import Database type

const DEFAULT_ROOM_IDS = ['berita-kripto', 'pengumuman-aturan'];

const defaultMessages: { [key: string]: ForumMessageItem[] } = { /* ... data defaultMessages ... */ };
const Particles = () => { /* ... JSX Partikel ... */ };

// Komponen Utama Aplikasi
const AppContent = () => {
    // --- State Variables ---
    // ... (state lainnya tetap sama) ...
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
    const fetchTrendingData = useCallback(/* ... kode ... */);
    const handleResetToTrending = useCallback(/* ... kode ... */);

    // --- Effects ---
    // ... (semua effect tetap sama, termasuk listener auth Firebase, local storage, data fetch) ...
    // Firebase Messages Listener Effect (Tambahkan pengecekan database)
     useEffect(() => {
         // --- TAMBAHKAN PENGECEKAN INI ---
         if (!database) {
             console.warn("Messages listener skipped: Database not initialized.");
             if (currentRoom?.id) setFirebaseMessages(prev => ({ ...prev, [currentRoom.id]: [] }));
             return () => {}; // Kembalikan fungsi kosong untuk cleanup
         }
         // --- AKHIR PENGECEKAN ---

         // Lanjutkan hanya jika database ada
         if (!currentRoom?.id) {
             // Bersihkan pesan jika room tidak ada tapi DB ada
              if (currentRoom?.id) setFirebaseMessages(prev => ({ ...prev, [currentRoom.id]: [] }));
             return () => {};
         }

         const messagesRef = ref(database, `messages/${currentRoom.id}`); // Aman digunakan karena sudah dicek
         const listener = onValue(messagesRef, (snapshot) => {
             // ... (logika onValue tetap sama) ...
             const data = snapshot.val();
             const messagesArray: ForumMessageItem[] = [];
             if (data) {
                 Object.keys(data).forEach(key => { /* ... logika parsing ... */ });
             }
             let finalMessages = messagesArray;
             if (messagesArray.length === 0 && currentRoom?.id) { /* ... logika default message ... */ }
             setFirebaseMessages(prev => ({
                 ...prev,
                 [currentRoom!.id]: finalMessages.sort((a, b) => { /* ... logika sort ... */ })
             }));
         }, (error) => {
             console.error(`Firebase listener error room ${currentRoom?.id}:`, error);
             if (currentRoom?.id) setFirebaseMessages(prev => ({ ...prev, [currentRoom.id]: [] }));
         });

         // Cleanup tetap sama
         return () => {
             // Tidak perlu cek database lagi di cleanup off()
             off(messagesRef, 'value', listener);
         };
     }, [currentRoom, currentUser, database]); // database tetap dependency

     // News Fetch Effect (Tambahkan pengecekan database)
     useEffect(() => {
       // --- TAMBAHKAN PENGECEKAN INI ---
       if (!database) { console.warn("News fetch skipped: Database not initialized."); return; }
       // --- AKHIR PENGECEKAN ---

       const currentDb = database; // Capture current instance (sekarang pasti Database)
       const NEWS_ROOM_ID = 'berita-kripto';
       const NEWS_FETCH_INTERVAL = 20 * 60 * 1000;
       const LAST_FETCH_KEY = 'lastNewsFetchTimestamp';
       let isMounted = true;
       const fetchAndProcessNews = async () => { /* ... kode fetch news ... */ };
       fetchAndProcessNews();
       const intervalId = setInterval(fetchAndProcessNews, NEWS_FETCH_INTERVAL);
       return () => { isMounted = false; clearInterval(intervalId); };
     }, [currentRoom, database]);

    // --- Auth Handlers ---
    // ... (handleGoogleRegisterSuccess, handleLogin, handleProfileComplete, handleLogout tetap sama) ...
    const handleGoogleRegisterSuccess = useCallback(async (credentialResponse: CredentialResponse) => { /* ... kode ... */ }, [users, currentUser]);
    const handleLogin = useCallback(async (usernameOrEmail: string, password: string): Promise<string | void> => { /* ... kode ... */ }, [users]);
    const handleProfileComplete = useCallback(async (username: string, password: string): Promise<string | void> => { /* ... kode ... */ }, [users, pendingGoogleUser, firebaseUser]);
    const handleLogout = useCallback(() => { /* ... kode ... */ }, []);


    // --- App Logic Handlers (Tambahkan pengecekan database) ---
    const handleIncrementAnalysisCount = useCallback(/* ... kode ... */);
    const handleNavigate = useCallback(/* ... kode ... */);
    const handleSelectCoin = useCallback(/* ... kode ... */);
    const handleJoinRoom = useCallback(/* ... kode ... */);
    const handleLeaveRoom = useCallback(/* ... kode ... */);
    const handleLeaveJoinedRoom = useCallback(/* ... kode ... */);
    const handleCreateRoom = useCallback(/* ... kode ... */);

    // handleDeleteRoom (Tambahkan pengecekan database)
    const handleDeleteRoom = useCallback((roomId: string) => {
        // --- TAMBAHKAN PENGECEKAN DATABASE ---
        if (!currentUser?.username || !database || !firebaseUser) {
             console.warn("Delete room prerequisites failed."); return;
        }
        // --- AKHIR PENGECEKAN ---

        const roomToDelete = rooms.find(r => r.id === roomId);
        if (!roomToDelete || DEFAULT_ROOM_IDS.includes(roomId)) return;

        // Cek admin pakai get() - database di sini sudah pasti bukan null
        const adminsRef = ref(database, 'admins/' + firebaseUser.uid);
        get(adminsRef).then((snapshot) => {
            const isAdmin = snapshot.exists() && snapshot.val() === true;
            const isCreator = roomToDelete.createdBy === currentUser.username;

            if (!isAdmin && !isCreator) { alert("Hanya admin/pembuat yang bisa hapus."); return; }

            if (window.confirm(`Hapus room "${roomToDelete.name}"?`)) {
                setRooms(prev => prev.filter(r => r.id !== roomId));
                setJoinedRoomIds(prev => { const n = new Set(prev); n.delete(roomId); return n; });
                if (currentRoom?.id === roomId) { setCurrentRoom(null); setActivePage('rooms'); }
                // Gunakan database langsung karena sudah dicek di awal
                const messagesRef = ref(database, `messages/${roomId}`);
                set(messagesRef, null).catch(error => console.error(`Gagal hapus pesan room ${roomId}:`, error));
            }
        }).catch(error => console.error("Gagal memeriksa status admin:", error));

    }, [currentUser, rooms, currentRoom, database, firebaseUser]); // database tetap dependency

    // handleSendMessage (Tambahkan pengecekan database)
    const handleSendMessage = useCallback((message: Partial<ChatMessage>) => {
        // --- PENGECEKAN DATABASE SUDAH ADA DARI SEBELUMNYA ---
        if (!database || !currentRoom?.id || !firebaseUser?.uid || !currentUser?.username) {
             console.error("Prasyarat kirim pesan gagal", { db: !!database, room: currentRoom?.id, fbUid: firebaseUser?.uid, appUser: currentUser?.username });
             alert("Gagal mengirim: Belum login atau data tidak lengkap."); return;
        }
        // --- AKHIR PENGECEKAN ---

        const messageToSend: Omit<ChatMessage, 'id'> = { /* ... data pesan ... */ };
        if (!messageToSend.text && !messageToSend.fileURL) { console.warn("Pesan kosong."); return; }

        // Gunakan database langsung
        const messageListRef = ref(database, `messages/${currentRoom.id}`);
        const newMessageRef = push(messageListRef);
        set(newMessageRef, messageToSend).catch((error) => { /* ... error handling ... */ });

    }, [currentRoom, currentUser, database, firebaseUser]); // database tetap dependency

    // handleReaction (Tambahkan pengecekan database)
    const handleReaction = useCallback((messageId: string, emoji: string) => {
        // --- PENGECEKAN DATABASE SUDAH ADA DARI SEBELUMNYA ---
        if (!database || !currentRoom?.id || !firebaseUser?.uid || !messageId) { console.warn("React prerequisites failed"); return; }
        // --- AKHIR PENGECEKAN ---
        const username = currentUser?.username;
        if (!username) { console.warn("Cannot react: Missing app username"); return; }

        // Gunakan database langsung
        const reactionUserListRef = ref(database, `messages/${currentRoom.id}/${messageId}/reactions/${emoji}`);
        get(reactionUserListRef).then((snapshot) => {
            // ... (logika update reaksi) ...
            const usersForEmoji: string[] = snapshot.val() || [];
            let updatedUsers: string[] | null = usersForEmoji.includes(username) ? usersForEmoji.filter(u => u !== username) : [...usersForEmoji, username];
            if (updatedUsers.length === 0) updatedUsers = null;
            set(reactionUserListRef, updatedUsers).catch(error => console.error("Update reaction failed:", error));
        }).catch(error => console.error("Get reaction failed:", error));
    }, [currentRoom, currentUser, database, firebaseUser]); // database tetap dependency

    // handleDeleteMessage (Tambahkan pengecekan database)
    const handleDeleteMessage = useCallback((roomId: string, messageId: string) => {
        // --- PENGECEKAN DATABASE SUDAH ADA DARI SEBELUMNYA ---
        if (!database || !roomId || !messageId) { console.error("Cannot delete message."); return; }
        // --- AKHIR PENGECEKAN ---

        // Gunakan database langsung
        const messageRef = ref(database, `messages/${roomId}/${messageId}`);
        set(messageRef, null).catch((error) => { /* ... error handling ... */ });
    }, [database]); // database tetap dependency

    // --- Memoized Values ---
    // ... (memoized values tetap sama) ...
    const totalUsers = useMemo(/* ... */);
    const heroCoin = useMemo(/* ... */);
    const otherTrendingCoins = useMemo(/* ... */);
    const hotCoinForHeader = useMemo(/* ... */);


    // --- Render Logic ---
    const renderActivePage = () => { /* ... (kode renderActivePage tetap sama) ... */ };

    // --- Render Utama ---
    if (isAuthLoading) {
        return ( <div className="min-h-screen bg-transparent text-white flex items-center justify-center"> Memverifikasi sesi... </div> );
    }

    // Alur Render Autentikasi
    let contentToRender;
    if (firebaseUser) { // Pengguna sudah login ke Firebase
        if (pendingGoogleUser && (!currentUser || currentUser.email !== pendingGoogleUser.email )) {
             contentToRender = <CreateIdPage onProfileComplete={handleProfileComplete} googleProfile={pendingGoogleUser} />;
        } else if (currentUser && currentUser.username) {
             contentToRender = ( /* ... Render Aplikasi Utama ... */ );
        } else if (currentUser && !currentUser.username && pendingGoogleUser) {
             contentToRender = <CreateIdPage onProfileComplete={handleProfileComplete} googleProfile={pendingGoogleUser} />;
        } else {
             console.error("Invalid state for logged in user:", { firebaseUser, currentUser, pendingGoogleUser });
             handleLogout(); // Coba reset
             contentToRender = <LoginPage onGoogleRegisterSuccess={handleGoogleRegisterSuccess} onLogin={handleLogin} />;
        }
    } else { // Pengguna tidak login ke Firebase
        contentToRender = <LoginPage onGoogleRegisterSuccess={handleGoogleRegisterSuccess} onLogin={handleLogin} />;
    }

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