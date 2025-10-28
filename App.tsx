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
import RoomsListPage from './components/RoomsListPage'; // Pastikan nama file dan ekspornya benar

// Impor Tipe dan Fungsi Helper
import type { ForumMessageItem, Room, CoinListItem, CryptoData, ChatMessage, Page, Currency, NewsArticle, User, GoogleProfile } from './types';
import { isNewsArticle, isChatMessage } from './types';
import { fetchIdrRate, fetchNewsArticles, fetchTop500Coins, fetchTrendingCoins, fetchCoinDetails } from './services/mockData';
import { ADMIN_USERNAMES } from './components/UserTag'; // Pastikan UserTag.tsx mengekspor ini
import { database } from './services/firebaseService';
import { ref, set, push, onValue, off, update, get } from "firebase/database";

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
    }, [fetchTrendingData]); // fetchTrendingData is stable due to its useCallback

    // --- Effects ---
    // Firebase Auth Listener
    useEffect(() => {
        const auth = getAuth();
        setIsAuthLoading(true);
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            console.log("Firebase Auth State Changed:", user ? `Logged in as ${user.uid}` : "Logged out");
            setFirebaseUser(user);
            if (user) {
                const appUser = Object.values(users).find(u => u.email === user.email);
                if (appUser) {
                    if (!currentUser || currentUser.email !== appUser.email) {
                        console.log("Setting currentUser from Firebase Auth:", appUser);
                        setCurrentUser(appUser);
                    }
                } else {
                    console.warn(`Firebase user ${user.email} not found in local 'users' state.`);
                    if (user.displayName && user.email) {
                        const potentialNewUser: User = { email: user.email, username: user.displayName, createdAt: Date.now() };
                        if (!users[user.email]) {
                            console.log("Creating temporary user entry in 'users' state from Firebase Auth.");
                            setUsers(prev => ({ ...prev, [potentialNewUser.email]: potentialNewUser }));
                        }
                        if (!currentUser) setCurrentUser(potentialNewUser);
                    } else if (!pendingGoogleUser) {
                        if(currentUser) setCurrentUser(null);
                    }
                }
            } else {
                if (currentUser !== null) {
                    console.log("Clearing currentUser due to Firebase Auth logout.");
                    setCurrentUser(null);
                }
                setPendingGoogleUser(null);
            }
            setIsAuthLoading(false);
        });
        return () => unsubscribe();
    }, [users, currentUser, pendingGoogleUser]); // Dependencies for sync logic

    // Local Storage Effects
    useEffect(() => { try { const u = localStorage.getItem('cryptoUsers'); if (u) setUsers(JSON.parse(u)); } catch (e) { console.error("Gagal load users", e); } }, []);
    useEffect(() => { try { localStorage.setItem('cryptoUsers', JSON.stringify(users)); } catch (e) { console.error("Gagal simpan users", e); } }, [users]);
    useEffect(() => { try { if (currentUser) localStorage.setItem('currentUser', JSON.stringify(currentUser)); else localStorage.removeItem('currentUser'); } catch (e) { console.error("Gagal simpan currentUser", e); } }, [currentUser]);
    useEffect(() => { const saved = localStorage.getItem('unreadCounts'); if (saved) try { setUnreadCounts(JSON.parse(saved)); } catch (e) { console.error("Gagal parse unreadCounts", e); } }, []);
    useEffect(() => { localStorage.setItem('unreadCounts', JSON.stringify(unreadCounts)); }, [unreadCounts]);
    useEffect(() => { const lastReset = localStorage.getItem('lastAnalysisResetDate'); const today = new Date().toISOString().split('T')[0]; if (lastReset !== today) { localStorage.setItem('analysisCounts', '{}'); localStorage.setItem('lastAnalysisResetDate', today); setAnalysisCounts({}); } else { const saved = localStorage.getItem('analysisCounts'); if (saved) try { setAnalysisCounts(JSON.parse(saved)); } catch (e) { console.error("Gagal parse analysis counts", e); } } }, []);

    // Initial Data Fetch Effects
    useEffect(() => { const getRate = async () => { setIsRateLoading(true); try { setIdrRate(await fetchIdrRate()); } catch (error) { console.error("Gagal ambil kurs IDR:", error); setIdrRate(16000); } finally { setIsRateLoading(false); } }; getRate(); }, []);
    useEffect(() => { const fetchList = async () => { setIsCoinListLoading(true); setCoinListError(null); try { setFullCoinList(await fetchTop500Coins()); } catch (err) { setCoinListError("Gagal ambil daftar koin."); } finally { setIsCoinListLoading(false); } }; fetchList(); }, []);
    useEffect(() => { fetchTrendingData(); }, [fetchTrendingData]);

    // Firebase Messages Listener Effect
     useEffect(() => {
         if (!database || !currentRoom?.id) {
             if (currentRoom?.id) setFirebaseMessages(prev => ({ ...prev, [currentRoom.id]: [] }));
             return () => {};
         }
         const messagesRef = ref(database, `messages/${currentRoom.id}`);
         const listener = onValue(messagesRef, (snapshot) => {
             const data = snapshot.val();
             const messagesArray: ForumMessageItem[] = [];
             if (data) {
                 Object.keys(data).forEach(key => {
                     const msgData = data[key];
                     if (msgData && typeof msgData === 'object' && msgData.timestamp && typeof msgData.timestamp === 'number') {
                         let type: 'news' | 'user' | 'system' | undefined = msgData.type;
                         if (!type) { // Infer type if missing
                             if ('published_on' in msgData && 'source' in msgData) type = 'news';
                             else if (msgData.sender === 'system') type = 'system';
                             else if ('sender' in msgData) type = 'user';
                         }
                         if (type === 'news' || type === 'user' || type === 'system') {
                             const reactions = typeof msgData.reactions === 'object' && msgData.reactions !== null ? msgData.reactions : {};
                             // Pastikan 'uid' ada jika tipenya 'user', bisa null/undefined untuk tipe lain
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
                      if (!timeA && !timeB) return 0;
                      if (!timeA) return 1;
                      if (!timeB) return -1;
                      return timeA - timeB;
                  })
             }));
         }, (error) => {
             console.error(`Firebase listener error room ${currentRoom?.id}:`, error);
             if (currentRoom?.id) setFirebaseMessages(prev => ({ ...prev, [currentRoom.id]: [] }));
         });
         return () => { if (database) { off(messagesRef, 'value', listener); } };
     }, [currentRoom, currentUser, database]); // Rerun when dependencies change

     // News Fetch Effect (disederhanakan, logika sama)
     useEffect(() => {
       if (!database) { console.warn("DB null - news fetch skipped"); return; }
       const currentDb = database;
       const NEWS_ROOM_ID = 'berita-kripto';
       const NEWS_FETCH_INTERVAL = 20 * 60 * 1000; // 20 menit
       const LAST_FETCH_KEY = 'lastNewsFetchTimestamp';

       let isMounted = true; // Flag untuk mencegah update state setelah unmount

       const fetchAndProcessNews = async () => {
           const currentTime = Date.now();
           const lastFetch = parseInt(localStorage.getItem(LAST_FETCH_KEY) || '0', 10);
           // Hapus komentar baris di bawah jika ingin mengaktifkan interval lagi
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
                           const articleData: Omit<NewsArticle, 'id'> = {
                               type: 'news', title: article.title, url: article.url,
                               imageurl: article.imageurl || '', published_on: article.published_on,
                               source: article.source, body: article.body || '', reactions: {},
                           };
                           updates[newsRef.key] = articleData;
                           newArticleAdded = true;
                       }
                   }
               });

               if (newArticleAdded && isMounted) {
                   console.log(`Adding ${Object.keys(updates).length} new articles to Firebase.`);
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
               } else if (isMounted) { console.log("No new unique articles to add."); }

           } catch (err: unknown) {
               let errorMessage = 'Unknown error during news fetch/process';
               if (err instanceof Error) errorMessage = err.message;
               else if (typeof err === 'string') errorMessage = err;
               else try { errorMessage = JSON.stringify(err); } catch { /* ignore */ }
               if (isMounted) console.error("News fetch/process failed:", errorMessage);
           }
       };

       fetchAndProcessNews();
       const intervalId = setInterval(fetchAndProcessNews, NEWS_FETCH_INTERVAL);

       return () => {
           isMounted = false; // Set flag saat unmount
           clearInterval(intervalId);
       };
     }, [currentRoom, database]); // Dependencies

    // --- Auth Handlers (Tetap di dalam AppContent) ---
    // handleGoogleRegisterSuccess, handleLogin, handleProfileComplete, handleLogout

    // --- App Logic Handlers (Tetap di dalam AppContent) ---
    const handleIncrementAnalysisCount = useCallback((coinId: string) => { setAnalysisCounts(prev => { const current = prev[coinId] || baseAnalysisCount; const newCounts = { ...prev, [coinId]: current + 1 }; localStorage.setItem('analysisCounts', JSON.stringify(newCounts)); return newCounts; }); }, []);
    const handleNavigate = useCallback((page: Page) => { if (page === 'home' && activePage === 'home') { handleResetToTrending(); } else if (page === 'forum') { setActivePage('rooms'); } else { setActivePage(page); } }, [activePage, handleResetToTrending]);
    const handleSelectCoin = useCallback(async (coinId: string) => { setIsTrendingLoading(true); setTrendingError(null); setSearchedCoin(null); try { setSearchedCoin(await fetchCoinDetails(coinId)); } catch (err) { setTrendingError(err instanceof Error ? err.message : "Gagal muat detail koin."); } finally { setIsTrendingLoading(false); } }, []);
    const handleJoinRoom = useCallback((room: Room) => {
        setCurrentRoom(room);
        setJoinedRoomIds(prev => new Set(prev).add(room.id));
        setUnreadCounts(prev => ({ ...prev, [room.id]: { count: 0, lastUpdate: Date.now() } }));
        setActivePage('forum');
    }, []); // Removed message state dependency
    const handleLeaveRoom = useCallback(() => { setCurrentRoom(null); setActivePage('rooms'); }, []);
    const handleLeaveJoinedRoom = useCallback((roomId: string) => { if (DEFAULT_ROOM_IDS.includes(roomId)) return; setJoinedRoomIds(prev => { const newIds = new Set(prev); newIds.delete(roomId); return newIds; }); if (currentRoom?.id === roomId) { setCurrentRoom(null); setActivePage('rooms'); } }, [currentRoom]);
    const handleCreateRoom = useCallback((roomName: string) => { if (!currentUser?.username) { alert("Anda harus login untuk membuat room."); return; } const trimmedName = roomName.trim(); if (rooms.some(r => r.name.toLowerCase() === trimmedName.toLowerCase())) { alert('Nama room sudah ada.'); return; } const newRoom: Room = { id: trimmedName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(), name: trimmedName, userCount: 1, createdBy: currentUser.username }; setRooms(prev => [newRoom, ...prev]); handleJoinRoom(newRoom); }, [handleJoinRoom, rooms, currentUser]);
    const handleDeleteRoom = useCallback((roomId: string) => {
        if (!currentUser?.username || !database) return;
        const roomToDelete = rooms.find(r => r.id === roomId);
        if (!roomToDelete || DEFAULT_ROOM_IDS.includes(roomId)) return;
        const isAdmin = firebaseUser && root.child('admins').child(firebaseUser.uid).exists() === true; // Cek admin via UID
        const isCreator = roomToDelete.createdBy === currentUser.username;
        if (!isAdmin && !isCreator) { alert("Hanya admin atau pembuat room yang bisa menghapus."); return; }
        if (window.confirm(`Yakin ingin menghapus room "${roomToDelete.name}"? Ini akan menghapus semua pesan.`)) {
            setRooms(prev => prev.filter(r => r.id !== roomId));
            setJoinedRoomIds(prev => { const n = new Set(prev); n.delete(roomId); return n; });
            if (currentRoom?.id === roomId) { setCurrentRoom(null); setActivePage('rooms'); }
            const messagesRef = ref(database, `messages/${roomId}`);
            set(messagesRef, null).catch(error => console.error(`Failed to delete messages for room ${roomId}:`, error));
        }
    }, [currentUser, rooms, currentRoom, database, firebaseUser]); // Tambah firebaseUser dependency

    // Handle Send Message (Sudah diperbaiki dengan UID)
    const handleSendMessage = useCallback((message: Partial<ChatMessage>) => { // Terima Partial<ChatMessage>
        if (!database || !currentRoom?.id || !firebaseUser?.uid || !currentUser?.username) {
             console.error("Send message prerequisites failed", { database: !!database, currentRoom: currentRoom?.id, firebaseUser: firebaseUser?.uid, currentUser: currentUser?.username });
             alert("Gagal mengirim: Data tidak lengkap atau belum login.");
             return;
        }
        const messageToSend: Omit<ChatMessage, 'id'> = {
             type: 'user',
             uid: firebaseUser.uid,
             sender: currentUser.username,
             timestamp: Date.now(),
             reactions: {},
             ...(message.text && { text: message.text }),
             ...(message.fileURL && { fileURL: message.fileURL }),
             ...(message.fileName && { fileName: message.fileName }),
        };
        if (!messageToSend.text && !messageToSend.fileURL) { console.warn("Pesan kosong dicegah."); return; }
        const messageListRef = ref(database, `messages/${currentRoom.id}`);
        const newMessageRef = push(messageListRef);
        console.log(`Sending message to DB: messages/${currentRoom.id}/${newMessageRef.key}`, messageToSend);
        set(newMessageRef, messageToSend)
            .then(() => { console.log("Pesan berhasil dikirim."); })
            .catch((error) => {
                console.error("Firebase send message error:", error);
                let alertMessage = "Gagal mengirim pesan.";
                if (error.code === 'PERMISSION_DENIED') { alertMessage += " Akses ditolak server."; }
                else if (error.message) { alertMessage += ` (${error.message})`; }
                alert(alertMessage);
            });
    }, [currentRoom, currentUser, database, firebaseUser]);

    // Handle Reaction (Tetap sama)
    const handleReaction = useCallback((messageId: string, emoji: string) => {
        if (!database || !currentRoom?.id || !firebaseUser?.uid || !messageId) { console.warn("Cannot react: Missing required info"); return; }
        const username = currentUser?.username; // Ambil username dari currentUser aplikasi
        if (!username) { console.warn("Cannot react: Missing application username"); return; }
        const reactionUserListRef = ref(database, `messages/${currentRoom.id}/${messageId}/reactions/${emoji}`);
        get(reactionUserListRef).then((snapshot) => {
            const usersForEmoji: string[] = snapshot.val() || [];
            let updatedUsers: string[] | null = null;
            if (usersForEmoji.includes(username)) {
                updatedUsers = usersForEmoji.filter(u => u !== username);
                if (updatedUsers.length === 0) updatedUsers = null;
            } else {
                updatedUsers = [...usersForEmoji, username];
            }
            set(reactionUserListRef, updatedUsers).catch(error => console.error("Update reaction failed:", error));
        }).catch(error => console.error("Get reaction failed:", error));
    }, [currentRoom, currentUser, database, firebaseUser]); // Tambahkan firebaseUser

    // Handle Delete Message (Tetap sama)
    const handleDeleteMessage = useCallback((roomId: string, messageId: string) => {
        if (!database || !roomId || !messageId) { console.error("Cannot delete message: Missing info."); return; }
        const messageRef = ref(database, `messages/${roomId}/${messageId}`);
        set(messageRef, null).catch((error) => { console.error(`Failed to delete message ${messageId}:`, error); alert("Gagal menghapus pesan."); });
    }, [database]);

    // --- Memoized Values ---
    const totalUsers = useMemo(() => rooms.reduce((sum, room) => sum + (room.userCount || 0), 0), [rooms]);
    const heroCoin = searchedCoin || trendingCoins[0] || null;
    const otherTrendingCoins = searchedCoin ? [] : trendingCoins.slice(1);
    const hotCoin = trendingCoins.length > 1 ? { name: trendingCoins[1].name, logo: trendingCoins[1].image, price: trendingCoins[1].price, change: trendingCoins[1].change } : null;

    // --- Render Logic ---
    const renderActivePage = () => {
         switch (activePage) {
          case 'home': return <HomePage idrRate={idrRate} isRateLoading={isRateLoading} currency={currency} onIncrementAnalysisCount={handleIncrementAnalysisCount} fullCoinList={fullCoinList} isCoinListLoading={isCoinListLoading} coinListError={coinListError} heroCoin={heroCoin} otherTrendingCoins={otherTrendingCoins} isTrendingLoading={isTrendingLoading} trendingError={trendingError} onSelectCoin={handleSelectCoin} onReloadTrending={handleResetToTrending} />;
          case 'rooms': return <RoomsListPage rooms={rooms} onJoinRoom={handleJoinRoom} onCreateRoom={handleCreateRoom} totalUsers={totalUsers} hotCoin={hotCoin} userProfile={currentUser} currentRoomId={currentRoom?.id || null} joinedRoomIds={joinedRoomIds} onLeaveJoinedRoom={handleLeaveJoinedRoom} unreadCounts={unreadCounts} onDeleteRoom={handleDeleteRoom} />;
          case 'forum':
                const currentMessages = currentRoom ? (firebaseMessages[currentRoom.id] || []) : [];
                const displayMessages = (currentMessages.length === 0 && currentRoom && defaultMessages[currentRoom.id]) ? defaultMessages[currentRoom.id] : currentMessages;
                const messagesToPass = Array.isArray(displayMessages) ? displayMessages : [];
                return <ForumPage room={currentRoom} messages={messagesToPass} userProfile={currentUser} onSendMessage={handleSendMessage} onLeaveRoom={handleLeaveRoom} onReact={handleReaction} onDeleteMessage={handleDeleteMessage} />;
          case 'about': return <AboutPage />;
          default: return <HomePage idrRate={idrRate} isRateLoading={isRateLoading} currency={currency} onIncrementAnalysisCount={handleIncrementAnalysisCount} fullCoinList={fullCoinList} isCoinListLoading={isCoinListLoading} coinListError={coinListError} heroCoin={heroCoin} otherTrendingCoins={otherTrendingCoins} isTrendingLoading={isTrendingLoading} trendingError={trendingError} onSelectCoin={handleSelectCoin} onReloadTrending={handleResetToTrending} />;
        }
    };

    // --- Render Utama dengan Loading Auth ---
    if (isAuthLoading) {
        return ( <div className="min-h-screen bg-transparent text-white flex items-center justify-center"> Memverifikasi sesi... </div> );
    }

    // --- Auth Flow Rendering ---
    if (!currentUser && !pendingGoogleUser) {
        return ( <LoginPage onGoogleRegisterSuccess={handleGoogleRegisterSuccess} onLogin={handleLogin} /> );
    }
    if (pendingGoogleUser && (!currentUser || currentUser.email !== pendingGoogleUser.email)) {
       return <CreateIdPage onProfileComplete={handleProfileComplete} googleProfile={pendingGoogleUser} />;
    }
    // Handle case where Firebase user is logged in, but app user profile isn't complete (no username)
    // and we are not in the pendingGoogleUser state (e.g., manual login user needs profile)
    // Note: Current CreateIdPage requires googleProfile, adjust if needed for manual users
    if (currentUser && !currentUser.username && pendingGoogleUser) {
       return <CreateIdPage onProfileComplete={handleProfileComplete} googleProfile={pendingGoogleUser} />;
    }
     // Fallback / sanity check: If currentUser exists but somehow lacks username, force logout/login
    if (currentUser && !currentUser.username) {
        console.error("State aneh: currentUser ada tapi tanpa username.");
        handleLogout(); // Force logout to reset state
        return <LoginPage onGoogleRegisterSuccess={handleGoogleRegisterSuccess} onLogin={handleLogin} />;
    }
    // Final check: If after all checks, currentUser is still somehow invalid, go to login
    if (!currentUser) {
        console.error("Render utama dicegah: currentUser tidak valid setelah semua cek.");
        return <LoginPage onGoogleRegisterSuccess={handleGoogleRegisterSuccess} onLogin={handleLogin} />;
    }

    // --- Render Aplikasi Utama ---
     return (
         <div className="min-h-screen bg-transparent text-white font-sans flex flex-col">
             <Particles />
             <Header
                 userProfile={currentUser} // Harus sudah valid di sini
                 onLogout={handleLogout}
                 activePage={activePage}
                 onNavigate={handleNavigate}
                 currency={currency}
                 onCurrencyChange={setCurrency}
                 hotCoin={hotCoin}
                 idrRate={idrRate}
            />
             <main className="flex-grow">
                 {renderActivePage()}
             </main>
             <Footer />
             {authError && (
                <div className="fixed bottom-4 right-4 bg-red-600 text-white p-3 rounded-lg shadow-lg z-50">
                    <p>Error Auth: {authError}</p>
                    <button onClick={() => setAuthError(null)} className="ml-2 text-sm underline">Tutup</button>
                </div>
             )}
         </div>
     );
}; // Akhir dari AppContent

// Komponen App Wrapper (Tetap sama)
const App = () => {
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (!googleClientId) {
        return (
             <div style={{ color: 'white', backgroundColor: '#0A0A0A', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
                 <div style={{ border: '1px solid #FF00FF', padding: '20px', borderRadius: '8px', textAlign: 'center', maxWidth: '500px' }}>
                     <h1 style={{ color: '#FF00FF', fontSize: '24px' }}>Kesalahan Konfigurasi</h1>
                     <p style={{ marginTop: '10px', lineHeight: '1.6' }}> Variabel GOOGLE_CLIENT_ID tidak ditemukan. </p>
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