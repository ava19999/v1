// ava19999/v1/v1-a55800044f80d0f00370f9f03c7fe8adc53a2627/App.tsx
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { jwtDecode } from 'jwt-decode';
import Header from './components/Header';
import Footer from './components/Footer';
// Impor type guard dari types.ts
import type { ForumMessageItem, Room, CoinListItem, CryptoData, ChatMessage, Page, Currency, NewsArticle, User, GoogleProfile } from './types';
import { isNewsArticle, isChatMessage } from './types'; // Import type guards
import HomePage from './components/HomePage';
import ForumPage from './components/ForumPage';
import AboutPage from './components/AboutPage';
import RoomsListPage from './components/RoomsListPage';
import LoginPage from './components/LoginPage';
import CreateIdPage from './components/CreateIdPage';
import { fetchIdrRate, fetchNewsArticles, fetchTop500Coins, fetchTrendingCoins, fetchCoinDetails } from './services/mockData';
import { ADMIN_USERNAMES } from './components/UserTag';

// Firebase imports
import { database } from './services/firebaseService'; // database bisa jadi null
import { ref, set, push, onValue, off, update, get, DatabaseReference } from "firebase/database";
import { FirebaseApp } from 'firebase/app'; // Hanya jika perlu tipe FirebaseApp

// Pesan default (pastikan memiliki 'type')
const defaultMessages: { [key: string]: ForumMessageItem[] } = {
     'pengumuman-aturan': [
        { id: 'rule1', type: 'system', text: 'Selamat datang di RT Crypto! Diskusi & analisis.', sender: 'system', timestamp: Date.now() - 2000 },
        { id: 'rule2', type: 'system', text: 'Aturan: Dilarang Sinyal. DYOR. Risiko ditanggung sendiri.', sender: 'system', timestamp: Date.now() - 1000 },
        { id: 'mission1', type: 'system', text: 'Misi: Jadi trader cerdas bareng, bukan ikut-ikutan.', sender: 'system', timestamp: Date.now() }
    ],
};

const Particles = () => (
      <div className="particles">
        <div className="particle" style={{ width: '3px', height: '3px', left: '10%', animationDelay: '-1s' }}></div>
        <div className="particle" style={{ width: '2px', height: '2px', left: '25%', animationDelay: '-5s' }}></div>
        {/* ... particle lainnya ... */}
        <div className="particle" style={{ width: '3px', height: '3px', left: '90%', animationDelay: '-15s' }}></div>
      </div>
);


const App = () => {
  // --- States ---
  const [activePage, setActivePage] = useState<Page>('home');
  const [currency, setCurrency] = useState<Currency>('usd');
  const [idrRate, setIdrRate] = useState<number | null>(null);
  const [isRateLoading, setIsRateLoading] = useState(true);
  const [users, setUsers] = useState<{ [email: string]: User }>({});
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [pendingGoogleUser, setPendingGoogleUser] = useState<GoogleProfile | null>(null);
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
      { id: 'umum', name: 'Diskusi Umum Kripto', userCount: 134 + Math.floor(Math.random() * 20) , createdBy: 'Admin_RTC'},
      { id: 'meme', name: 'Meme Coin Mania', userCount: 88 + Math.floor(Math.random() * 20), createdBy: 'Admin_RTC' },
      { id: 'xrp-army', name: 'Xrp Army', userCount: 73 + Math.floor(Math.random() * 20), createdBy: 'Admin_RTC' },
      { id: 'roblox-tuker-kripto', name: 'Roblox Tuker Kripto', userCount: 42 + Math.floor(Math.random() * 20), createdBy: 'ava' },
  ]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [joinedRoomIds, setJoinedRoomIds] = useState<Set<string>>(
    () => new Set(['berita-kripto', 'pengumuman-aturan'])
  );
   const [unreadCounts, setUnreadCounts] = useState<{ [key: string]: { count: number; lastUpdate: number } }>({});
   const [firebaseMessages, setFirebaseMessages] = useState<{ [roomId: string]: ForumMessageItem[] }>({});

  // --- Effects ---
    useEffect(() => { /* Load users & currentUser */
        try {
            const storedUsers = localStorage.getItem('cryptoUsers'); if (storedUsers) setUsers(JSON.parse(storedUsers));
            const storedCurrentUser = localStorage.getItem('currentUser'); if (storedCurrentUser) setCurrentUser(JSON.parse(storedCurrentUser));
        } catch (e) { console.error("Gagal load user:", e); }
    }, []);
    useEffect(() => { /* Persist users */
        try { localStorage.setItem('cryptoUsers', JSON.stringify(users)); } catch (e) { console.error("Gagal simpan users:", e); }
    }, [users]);
    useEffect(() => { /* Persist currentUser */
        try { if (currentUser) localStorage.setItem('currentUser', JSON.stringify(currentUser)); else localStorage.removeItem('currentUser'); }
        catch (e) { console.error("Gagal simpan currentUser:", e); }
    }, [currentUser]);
    useEffect(() => { /* Load/Save unreadCounts */
        const saved = localStorage.getItem('unreadCounts'); if (saved) try { setUnreadCounts(JSON.parse(saved)); } catch (e) { console.error("Gagal load unread:", e); }
    }, []);
    useEffect(() => { /* Persist unreadCounts */ localStorage.setItem('unreadCounts', JSON.stringify(unreadCounts)); }, [unreadCounts]);
    useEffect(() => { /* Reset/Load analysis counts daily */
        const lastReset = localStorage.getItem('lastAnalysisResetDate'); const today = new Date().toISOString().split('T')[0];
        if (lastReset !== today) { setAnalysisCounts({}); localStorage.setItem('analysisCounts', '{}'); localStorage.setItem('lastAnalysisResetDate', today); }
        else { const saved = localStorage.getItem('analysisCounts'); if (saved) try { setAnalysisCounts(JSON.parse(saved)); } catch (e) { console.error("Gagal load analysis counts:", e); setAnalysisCounts({}); } }
    }, []);
    useEffect(() => { /* Fetch IDR Rate */
        const getRate = async () => { try { setIsRateLoading(true); const rate = await fetchIdrRate(); setIdrRate(rate); } catch (error) { console.error("Gagal fetch IDR rate:", error); setIdrRate(16000); } finally { setIsRateLoading(false); } }; getRate();
    }, []);
    useEffect(() => { /* Fetch Top 500 Coins */
        const fetchList = async () => { setIsCoinListLoading(true); setCoinListError(null); try { const coins = await fetchTop500Coins(); setFullCoinList(coins); } catch (err) { setCoinListError("Gagal fetch daftar koin."); } finally { setIsCoinListLoading(false); } }; fetchList();
    }, []);
    const fetchTrendingData = useCallback(async (showSkeleton = true) => { /* Fetch Trending Coins */
        if (showSkeleton) { setIsTrendingLoading(true); setTrendingError(null); }
        try { const trending = await fetchTrendingCoins(); setTrendingCoins(trending); }
        catch (err: any) { const msg = err.message || "Gagal load tren."; if (showSkeleton) setTrendingError(msg); else console.error("Gagal refresh tren:", msg); }
        finally { if (showSkeleton) setIsTrendingLoading(false); }
    }, []);
     useEffect(() => { /* Fetch initial trending */ fetchTrendingData(); }, [fetchTrendingData]);

  // --- Auth Handlers ---
    const handleGoogleRegisterSuccess = useCallback(async (credentialResponse: any) => { /* Logika Google login/register */
        try { const decoded: any = jwtDecode(credentialResponse.credential); const { email, name, picture } = decoded; const existingUser = users[email];
             if (existingUser) { setCurrentUser(existingUser); setPendingGoogleUser(null); alert(`Selamat datang kembali, ${existingUser.username}!`); }
             else { setPendingGoogleUser({ email, name, picture }); }
        } catch (error) { console.error("Google Sign-In Error:", error); alert('Error login Google.'); }
    }, [users]);
    const handleLogin = useCallback(async (usernameOrEmail: string, password: string): Promise<string | void> => { /* Logika login manual */
        let user = Object.values(users).find(u => u.username?.toLowerCase() === usernameOrEmail.toLowerCase()); if (!user) user = users[usernameOrEmail.toLowerCase()];
        if (user && user.password === password) { setCurrentUser(user); setPendingGoogleUser(null); } // Clear pendingGoogleUser on manual login too
        else return 'Username/Email atau kata sandi salah.';
    }, [users]);
    const handleProfileComplete = useCallback(async (username: string, password: string): Promise<string | void> => { /* Logika complete profile Google */
        if (!pendingGoogleUser) return 'Data Google tidak ditemukan.';
        if (users[pendingGoogleUser.email]) { setPendingGoogleUser(null); setCurrentUser(users[pendingGoogleUser.email]); alert(`Email ${pendingGoogleUser.email} sudah ada. Anda otomatis login.`); return; }
        const usernameExists = Object.values(users).some(u => u.username?.toLowerCase() === username.toLowerCase()); if (usernameExists) return 'Username sudah digunakan.';
        const newUser: User = { email: pendingGoogleUser.email, username, password, googleProfilePicture: pendingGoogleUser.picture, createdAt: Date.now() };
        setUsers(prev => ({ ...prev, [newUser.email.toLowerCase()]: newUser })); setCurrentUser(newUser); setPendingGoogleUser(null);
    }, [users, pendingGoogleUser]);
    const handleLogout = useCallback(() => { /* Logika logout */
        setCurrentUser(null); setPendingGoogleUser(null); localStorage.removeItem('currentUser'); setActivePage('home');
    }, []);

  // --- App Logic Handlers ---
   const handleIncrementAnalysisCount = useCallback((coinId: string) => { /* Increment analysis count */
        setAnalysisCounts(prev => { const current = prev[coinId] || baseAnalysisCount; const newCounts = { ...prev, [coinId]: current + 1 }; localStorage.setItem('analysisCounts', JSON.stringify(newCounts)); return newCounts; });
    }, []);
   const handleNavigate = useCallback((page: Page) => { /* Navigasi */
         if (page === 'home' && activePage === 'home') handleResetToTrending(); else if (page === 'forum') setActivePage('rooms'); else setActivePage(page);
    }, [activePage, handleResetToTrending]); // handleResetToTrending needs to be defined
   const handleSelectCoin = useCallback(async (coinId: string) => { /* Fetch Coin Details */
         setIsTrendingLoading(true); setTrendingError(null); setSearchedCoin(null);
         try { const coin = await fetchCoinDetails(coinId); setSearchedCoin(coin); }
         catch (err: any) { setTrendingError(err.message || "Gagal load detail koin."); }
         finally { setIsTrendingLoading(false); }
     }, []);
   const handleResetToTrending = useCallback(() => { /* Reset view to trending */
         setSearchedCoin(null); fetchTrendingData(true);
     }, [fetchTrendingData]);
   const handleJoinRoom = useCallback((room: Room) => { /* Join room */
       setCurrentRoom(room);
       setUnreadCounts(prev => { if (prev[room.id]?.count > 0) return { ...prev, [room.id]: { ...prev[room.id], count: 0 }}; return prev; });
       setJoinedRoomIds(prev => new Set(prev).add(room.id));
       setActivePage('forum');
   }, []); // Removed currentUser dependency as welcome message handled by listener
   const handleLeaveRoom = useCallback(() => { /* Leave room view */ setCurrentRoom(null); setActivePage('rooms'); }, []);
   const handleLeaveJoinedRoom = useCallback((roomId: string) => { /* Leave room permanently */
        if (['berita-kripto', 'pengumuman-aturan'].includes(roomId)) return;
        setJoinedRoomIds(prev => { const n = new Set(prev); n.delete(roomId); return n; });
        if (currentRoom?.id === roomId) { setCurrentRoom(null); setActivePage('rooms'); }
        setUnreadCounts(prev => { const n = {...prev}; delete n[roomId]; return n; });
   }, [currentRoom]);
   const handleCreateRoom = useCallback((roomName: string) => { /* Create room */
        const trimmed = roomName.trim(); if (rooms.some(r => r.name.toLowerCase() === trimmed.toLowerCase())) { alert('Room sudah ada.'); return; }
        if (!currentUser?.username) { alert('Harus login.'); return; }
        const newRoom: Room = { id: trimmed.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(), name: trimmed, userCount: 1, createdBy: currentUser.username };
        setRooms(prev => [newRoom, ...prev]); handleJoinRoom(newRoom);
   }, [handleJoinRoom, rooms, currentUser]);
   const handleDeleteRoom = useCallback((roomId: string) => { /* Delete room */
        if (!database) { console.error("Database not initialized for deleteRoom"); return; }
        const roomToDelete = rooms.find(r => r.id === roomId); if (!roomToDelete || !currentUser?.username) return;
        const isAdmin = ADMIN_USERNAMES.map(n=>n.toLowerCase()).includes(currentUser.username.toLowerCase()); const isCreator = roomToDelete.createdBy === currentUser.username;
        if (['berita-kripto', 'pengumuman-aturan'].includes(roomId)) { alert('Room default tidak dapat dihapus.'); return; }
        if (isAdmin || isCreator) { if (window.confirm(`Yakin hapus room "${roomToDelete.name}"?`)) {
                setRooms(prev => prev.filter(r => r.id !== roomId)); if (currentRoom?.id === roomId) { setCurrentRoom(null); setActivePage('rooms'); }
                setJoinedRoomIds(prev => { const n = new Set(prev); n.delete(roomId); return n; });
                setFirebaseMessages(prev => { const n = {...prev}; delete n[roomId]; return n; });
                setUnreadCounts(prev => { const n = {...prev}; delete n[roomId]; return n; });
                const messagesRef = ref(database, `messages/${roomId}`); set(messagesRef, null).catch(console.error); // Delete from Firebase
            }
        } else { alert('Tidak punya izin menghapus.'); }
   }, [currentUser, rooms, currentRoom]);


    // --- Firebase Chat Logic ---

    // Mengirim pesan
    const handleSendMessage = useCallback((message: ChatMessage) => {
        if (!database) { console.error("Database not initialized for sendMessage"); return; }
        if (!currentRoom?.id || !currentUser?.username) return;

        const messageListRef = ref(database, `messages/${currentRoom.id}`);
        const newMessageRef = push(messageListRef);
        // Pastikan pesan memiliki tipe dan ID sebelum dikirim
        const messageToSend: ChatMessage = {
            ...message,
            type: message.sender === 'system' ? 'system' : 'user', // Tentukan tipe berdasarkan sender
            id: newMessageRef.key ?? `local-${Date.now()}-${Math.random()}`, // Gunakan key Firebase atau fallback ID lokal
            timestamp: message.timestamp || Date.now() // Pastikan timestamp ada
        };

        set(newMessageRef, messageToSend).catch((error) => {
            console.error("Gagal send message:", error); alert("Gagal kirim pesan.");
        });
    }, [currentRoom, currentUser]);

    // Mendengarkan pesan
    useEffect(() => {
        if (!database) { console.warn("Database not initialized, cannot listen for messages."); return () => {}; } // Exit if no DB
        if (!currentRoom?.id) return () => {}; // Exit if no room

        const messagesRef = ref(database, `messages/${currentRoom.id}`);
        console.log(`Listening to: messages/${currentRoom.id}`);

        // Variabel untuk menyimpan fungsi listener agar bisa di-detach
        let listener: ReturnType<typeof onValue> | null = null;

        listener = onValue(messagesRef, (snapshot) => {
            const data = snapshot.val();
            const messagesArray: ForumMessageItem[] = [];
            if (data) {
                Object.keys(data).forEach(key => {
                    const msgData = data[key];
                    if (msgData && typeof msgData === 'object') {
                         // Coba tentukan tipe jika tidak ada
                         let type: 'news' | 'user' | 'system' = msgData.type;
                         if (!type) { // Fallback logic (sebaiknya tipe disimpan di DB)
                             if (typeof msgData.published_on === 'number' && msgData.source) type = 'news';
                             else if (msgData.sender === 'system') type = 'system';
                             else if (msgData.sender) type = 'user';
                             // Jika masih tidak bisa ditentukan, mungkin log error atau abaikan
                         }
                         // Hanya tambahkan jika tipe valid
                         if (type === 'news' || type === 'user' || type === 'system') {
                            messagesArray.push({ ...msgData, id: key, type });
                         } else {
                            console.warn("Pesan tanpa tipe valid ditemukan:", key, msgData);
                         }
                    }
                });
            }
            console.log(`Data received for ${currentRoom.id}:`, messagesArray.length);

            let finalMessages = messagesArray;
            // Logika pesan default (jika diperlukan)
            if (messagesArray.length === 0) {
                 if (defaultMessages[currentRoom.id]) {
                     finalMessages = [...defaultMessages[currentRoom.id]];
                 } else if (!['berita-kripto', 'pengumuman-aturan'].includes(currentRoom.id) && currentUser?.username) {
                     // Pesan welcome/admin untuk room baru yg kosong
                     const welcomeMsg: ChatMessage = { id: `${currentRoom.id}-welcome-${Date.now()}`, type: 'system', text: `Selamat datang di room "${currentRoom.name}".`, sender: 'system', timestamp: Date.now() };
                     const adminMsg: ChatMessage = { id: `${currentRoom.id}-admin-${Date.now()}`, type: 'user', text: 'Ingat DYOR!', sender: 'Admin_RTC', timestamp: Date.now() + 1, reactions: {'👍': []} };
                     finalMessages = [welcomeMsg, adminMsg];
                     // Opsional: Tulis ke Firebase
                     // if(database) { set(ref(database, `messages/${currentRoom.id}/${welcomeMsg.id}`), welcomeMsg); set(ref(database, `messages/${currentRoom.id}/${adminMsg.id}`), adminMsg); }
                 }
            }

            // Gunakan type guard saat sorting
            setFirebaseMessages(prev => ({
                ...prev,
                [currentRoom.id]: finalMessages.sort((a, b) => {
                    // Cek null/undefined sebelum akses properti
                    const timeA = isNewsArticle(a) ? a.published_on * 1000 : (isChatMessage(a) ? a.timestamp : 0);
                    const timeB = isNewsArticle(b) ? b.published_on * 1000 : (isChatMessage(b) ? b.timestamp : 0);
                    // Handle jika salah satu item tidak punya timestamp/published_on
                    if (timeA === 0 && timeB !== 0) return 1; // Taruh item tanpa waktu di akhir
                    if (timeA !== 0 && timeB === 0) return -1; // Taruh item tanpa waktu di akhir
                    return timeA - timeB;
                })
            }));

        }, (error) => {
            console.error(`Firebase listener error for ${currentRoom?.id}:`, error);
        });

        // Cleanup function: Hentikan listener
        return () => {
            if (listener && database) { // Pastikan listener dan database ada sebelum off
               console.log(`Stopping listener for ${currentRoom?.id}`);
               off(messagesRef, 'value', listener);
            }
        };

    }, [currentRoom, currentUser]); // Rerun saat room/user berubah

    // Fetch News Articles
    useEffect(() => {
         if (!database) { console.warn("Database not initialized, cannot fetch/save news."); return; }
         const NEWS_ROOM_ID = 'berita-kripto';
         const NEWS_FETCH_INTERVAL = 20 * 60 * 1000;
         const LAST_FETCH_KEY = 'lastNewsFetchTimestamp';

        const fetchAndProcessNews = async () => {
            const now = Date.now(); const lastFetch = parseInt(localStorage.getItem(LAST_FETCH_KEY) || '0', 10);
            // if (now - lastFetch < NEWS_FETCH_INTERVAL) return;

            try {
                const fetchedArticles = await fetchNewsArticles(); if (!fetchedArticles?.length) return;
                const newsRoomRef = ref(database, `messages/${NEWS_ROOM_ID}`); const snapshot = await get(newsRoomRef);
                const existingNewsData = snapshot.val() || {}; const existingNewsUrls = new Set(Object.values<any>(existingNewsData).map(news => news.url));
                let newArticleAdded = false; const updates: { [key: string]: NewsArticle } = {};

                fetchedArticles.forEach(article => {
                    if (!existingNewsUrls.has(article.url)) {
                         const newsRef = push(newsRoomRef); // Generate key first
                         if(newsRef.key) {
                             // Tambahkan 'type' dan gunakan key sebagai 'id'
                             updates[newsRef.key] = { ...article, type: 'news', id: newsRef.key, reactions: {} };
                             newArticleAdded = true;
                         }
                    }
                });

                if (newArticleAdded) {
                    console.log(`Adding ${Object.keys(updates).length} news.`); await update(newsRoomRef, updates); // Use update for multiple adds
                    localStorage.setItem(LAST_FETCH_KEY, now.toString());
                    if (currentRoom?.id !== NEWS_ROOM_ID) { /* Update unread */
                        setUnreadCounts(prev => ({ ...prev, [NEWS_ROOM_ID]: { count: (prev[NEWS_ROOM_ID]?.count || 0) + Object.keys(updates).length, lastUpdate: now } }));
                    }
                } else { console.log("No new news."); }
            } catch (err: any) { console.error("News fetch/process failed:", err.message); }
        };

        fetchAndProcessNews(); const intervalId = setInterval(fetchAndProcessNews, NEWS_FETCH_INTERVAL);
        return () => clearInterval(intervalId);
    }, [currentRoom]);

    // Menangani reaksi
    const handleReaction = useCallback((messageId: string, emoji: string) => {
        if (!database) { console.error("Database not initialized for reaction"); return; }
        if (!currentRoom?.id || !currentUser?.username || !messageId) return;

        const username = currentUser.username;
        // Ref ke list user untuk emoji spesifik
        const reactionUserListRef = ref(database, `messages/${currentRoom.id}/${messageId}/reactions/${emoji}`);

        get(reactionUserListRef).then((snapshot) => {
            const usersForEmoji: string[] = snapshot.val() || [];
            let updatedUsers: string[] | null = null;

            if (usersForEmoji.includes(username)) {
                updatedUsers = usersForEmoji.filter(u => u !== username);
                if (updatedUsers.length === 0) updatedUsers = null; // Hapus node jika kosong
            } else {
                updatedUsers = [...usersForEmoji, username];
            }
            set(reactionUserListRef, updatedUsers).catch(error => console.error("Update reaction failed:", error));
        }).catch(error => console.error("Get reaction failed:", error));

    }, [currentRoom, currentUser]);


  // --- Memoized Values ---
  const totalUsers = useMemo(() => rooms.reduce((sum, room) => sum + room.userCount, 0), [rooms]);
  const heroCoin = searchedCoin || trendingCoins[0] || null;
  const otherTrendingCoins = searchedCoin ? [] : trendingCoins.slice(1);
  const hotCoin = trendingCoins.length > 1 ? { name: trendingCoins[1].name, logo: trendingCoins[1].image, price: trendingCoins[1].price, change: trendingCoins[1].change } : null;

  // --- Render Logic ---
  const renderActivePage = () => {
     switch (activePage) {
      case 'home': return <HomePage
                idrRate={idrRate} isRateLoading={isRateLoading} currency={currency}
                onIncrementAnalysisCount={handleIncrementAnalysisCount}
                fullCoinList={fullCoinList} isCoinListLoading={isCoinListLoading} coinListError={coinListError}
                heroCoin={heroCoin} otherTrendingCoins={otherTrendingCoins} isTrendingLoading={isTrendingLoading} trendingError={trendingError}
                onSelectCoin={handleSelectCoin}
                onReloadTrending={handleResetToTrending}
               />;
      case 'rooms': return <RoomsListPage
                    rooms={rooms}
                    onJoinRoom={handleJoinRoom}
                    onCreateRoom={handleCreateRoom}
                    totalUsers={totalUsers} hotCoin={hotCoin} userProfile={currentUser}
                    currentRoomId={currentRoom?.id || null} joinedRoomIds={joinedRoomIds}
                    onLeaveJoinedRoom={handleLeaveJoinedRoom}
                    unreadCounts={unreadCounts}
                    onDeleteRoom={handleDeleteRoom}
                />;
      case 'forum':
        const currentMessages = currentRoom ? firebaseMessages[currentRoom.id] || [] : [];
        const displayMessages = (currentMessages.length === 0 && currentRoom && defaultMessages[currentRoom.id])
            ? defaultMessages[currentRoom.id]
            : currentMessages;
        // Pastikan messages adalah array sebelum di-pass
        const messagesToPass = Array.isArray(displayMessages) ? displayMessages : [];
        return <ForumPage
                    room={currentRoom} messages={messagesToPass} userProfile={currentUser}
                    onSendMessage={handleSendMessage}
                    onLeaveRoom={handleLeaveRoom}
                    onReact={handleReaction}
                />;
      case 'about': return <AboutPage />;
      default: return <HomePage
                idrRate={idrRate} isRateLoading={isRateLoading} currency={currency}
                onIncrementAnalysisCount={handleIncrementAnalysisCount}
                fullCoinList={fullCoinList} isCoinListLoading={isCoinListLoading} coinListError={coinListError}
                heroCoin={heroCoin} otherTrendingCoins={otherTrendingCoins} isTrendingLoading={isTrendingLoading} trendingError={trendingError}
                onSelectCoin={handleSelectCoin}
                onReloadTrending={handleResetToTrending}
              />;
    }
  };

  // --- Auth Flow Rendering ---
  if (!currentUser && !pendingGoogleUser) return <LoginPage
              onGoogleRegisterSuccess={handleGoogleRegisterSuccess}
              onLogin={handleLogin}
            />;
  if (pendingGoogleUser) return <CreateIdPage
              onProfileComplete={handleProfileComplete}
              googleProfile={pendingGoogleUser}
            />;

  // --- Main App Render ---
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
        hotCoin={hotCoin}
        idrRate={idrRate}
      />
      <main className="flex-grow">
        {currentUser && renderActivePage()}
      </main>
      <Footer />
    </div>
  );
};

export default App;