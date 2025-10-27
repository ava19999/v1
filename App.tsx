// ava19999/v1/v1-c5d7d0ddb102ed890fdcf6a9b98065e6ff8b15c3/App.tsx
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { GoogleOAuthProvider, GoogleLogin, CredentialResponse } from '@react-oauth/google'; // Import GoogleOAuthProvider
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


const AppContent = () => { // Bungkus konten utama dalam komponen terpisah
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

  // --- Handlers Defined Early ---
  const fetchTrendingData = useCallback(async (showSkeleton = true) => { /* Fetch Trending Coins */
      if (showSkeleton) { setIsTrendingLoading(true); setTrendingError(null); }
      try { const trending = await fetchTrendingCoins(); setTrendingCoins(trending); }
      catch (err: any) { const msg = err.message || "Gagal load tren."; if (showSkeleton) setTrendingError(msg); else console.error("Gagal refresh tren:", msg); }
      finally { if (showSkeleton) setIsTrendingLoading(false); }
  }, []);
  const handleResetToTrending = useCallback(() => { /* Reset view to trending */
       setSearchedCoin(null); fetchTrendingData(true);
   }, [fetchTrendingData]);

  // --- Effects ---
    useEffect(() => { /* Load users & currentUser */ try { const storedUsers = localStorage.getItem('cryptoUsers'); if (storedUsers) setUsers(JSON.parse(storedUsers)); const storedCurrentUser = localStorage.getItem('currentUser'); if (storedCurrentUser) setCurrentUser(JSON.parse(storedCurrentUser)); } catch (e) { console.error("Gagal load user:", e); } }, []);
    useEffect(() => { /* Persist users */ try { localStorage.setItem('cryptoUsers', JSON.stringify(users)); } catch (e) { console.error("Gagal simpan users:", e); } }, [users]);
    useEffect(() => { /* Persist currentUser */ try { if (currentUser) localStorage.setItem('currentUser', JSON.stringify(currentUser)); else localStorage.removeItem('currentUser'); } catch (e) { console.error("Gagal simpan currentUser:", e); } }, [currentUser]);
    useEffect(() => { /* Load/Save unreadCounts */ const saved = localStorage.getItem('unreadCounts'); if (saved) try { setUnreadCounts(JSON.parse(saved)); } catch (e) { console.error("Gagal load unread:", e); } }, []);
    useEffect(() => { /* Persist unreadCounts */ localStorage.setItem('unreadCounts', JSON.stringify(unreadCounts)); }, [unreadCounts]);
    useEffect(() => { /* Reset/Load analysis counts daily */ const lastReset = localStorage.getItem('lastAnalysisResetDate'); const today = new Date().toISOString().split('T')[0]; if (lastReset !== today) { setAnalysisCounts({}); localStorage.setItem('analysisCounts', '{}'); localStorage.setItem('lastAnalysisResetDate', today); } else { const saved = localStorage.getItem('analysisCounts'); if (saved) try { setAnalysisCounts(JSON.parse(saved)); } catch (e) { console.error("Gagal load analysis counts:", e); setAnalysisCounts({}); } } }, []);
    useEffect(() => { /* Fetch IDR Rate */ const getRate = async () => { try { setIsRateLoading(true); const rate = await fetchIdrRate(); setIdrRate(rate); } catch (error) { console.error("Gagal fetch IDR rate:", error); setIdrRate(16000); } finally { setIsRateLoading(false); } }; getRate(); }, []);
    useEffect(() => { /* Fetch Top 500 Coins */ const fetchList = async () => { setIsCoinListLoading(true); setCoinListError(null); try { const coins = await fetchTop500Coins(); setFullCoinList(coins); } catch (err) { setCoinListError("Gagal fetch daftar koin."); } finally { setIsCoinListLoading(false); } }; fetchList(); }, []);
    useEffect(() => { /* Fetch initial trending */ fetchTrendingData(); }, [fetchTrendingData]);

  // --- Auth Handlers ---
    const handleGoogleRegisterSuccess = useCallback(async (credentialResponse: CredentialResponse) => { /* Logika Google login/register */
      console.log("Google Success:", credentialResponse); // Log credential response
      try {
          if (!credentialResponse.credential) {
              throw new Error("Google credential not found");
          }
          const decoded: any = jwtDecode(credentialResponse.credential);
          console.log("Decoded Google Token:", decoded); // Log decoded token
          const { email, name, picture } = decoded;

          if (!email) {
              throw new Error("Email not found in Google token");
          }

          const existingUser = users[email];
          if (existingUser) {
              console.log("Existing user found:", existingUser);
              setCurrentUser(existingUser);
              setPendingGoogleUser(null);
              alert(`Selamat datang kembali, ${existingUser.username}!`);
          } else {
              console.log("New user via Google:", { email, name, picture });
              setPendingGoogleUser({ email, name, picture });
          }
      } catch (error) {
          console.error("Google Sign-In Error:", error);
          alert('Error login Google.');
      }
    }, [users]);
    const handleLogin = useCallback(async (usernameOrEmail: string, password: string): Promise<string | void> => { /* Logika login manual */ let user = Object.values(users).find(u => u.username?.toLowerCase() === usernameOrEmail.toLowerCase()); if (!user) user = users[usernameOrEmail.toLowerCase()]; if (user && user.password === password) { console.log("Manual login success:", user); setCurrentUser(user); setPendingGoogleUser(null); } else { console.warn("Manual login failed for:", usernameOrEmail); return 'Username/Email atau kata sandi salah.'; } }, [users]);
    const handleProfileComplete = useCallback(async (username: string, password: string): Promise<string | void> => { /* Logika complete profile Google */ if (!pendingGoogleUser) return 'Data Google tidak ditemukan.'; if (users[pendingGoogleUser.email]) { setPendingGoogleUser(null); setCurrentUser(users[pendingGoogleUser.email]); alert(`Email ${pendingGoogleUser.email} sudah ada. Anda otomatis login.`); return; } const usernameExists = Object.values(users).some(u => u.username?.toLowerCase() === username.toLowerCase()); if (usernameExists) return 'Username sudah digunakan.'; const newUser: User = { email: pendingGoogleUser.email, username, password, googleProfilePicture: pendingGoogleUser.picture, createdAt: Date.now() }; console.log("Completing profile, creating new user:", newUser); setUsers(prev => ({ ...prev, [newUser.email.toLowerCase()]: newUser })); setCurrentUser(newUser); setPendingGoogleUser(null); }, [users, pendingGoogleUser]);
    const handleLogout = useCallback(() => { /* Logika logout */ console.log("Logging out"); setCurrentUser(null); setPendingGoogleUser(null); localStorage.removeItem('currentUser'); setActivePage('home'); }, []);

  // --- App Logic Handlers ---
   const handleIncrementAnalysisCount = useCallback((coinId: string) => { /* Increment analysis count */ setAnalysisCounts(prev => { const current = prev[coinId] || baseAnalysisCount; const newCounts = { ...prev, [coinId]: current + 1 }; localStorage.setItem('analysisCounts', JSON.stringify(newCounts)); return newCounts; }); }, []);
   const handleNavigate = useCallback((page: Page) => { /* Navigasi */ if (page === 'home' && activePage === 'home') handleResetToTrending(); else if (page === 'forum') setActivePage('rooms'); else setActivePage(page); }, [activePage, handleResetToTrending]);
   const handleSelectCoin = useCallback(async (coinId: string) => { /* Fetch Coin Details */ setIsTrendingLoading(true); setTrendingError(null); setSearchedCoin(null); try { const coin = await fetchCoinDetails(coinId); setSearchedCoin(coin); } catch (err: any) { setTrendingError(err.message || "Gagal load detail koin."); } finally { setIsTrendingLoading(false); } }, []);
   const handleJoinRoom = useCallback((room: Room) => { /* Join room */ setCurrentRoom(room); setUnreadCounts(prev => { if (prev[room.id]?.count > 0) return { ...prev, [room.id]: { ...prev[room.id], count: 0 }}; return prev; }); setJoinedRoomIds(prev => new Set(prev).add(room.id)); setActivePage('forum'); }, []);
   const handleLeaveRoom = useCallback(() => { /* Leave room view */ setCurrentRoom(null); setActivePage('rooms'); }, []);
   const handleLeaveJoinedRoom = useCallback((roomId: string) => { /* Leave room permanently */ if (['berita-kripto', 'pengumuman-aturan'].includes(roomId)) return; setJoinedRoomIds(prev => { const n = new Set(prev); n.delete(roomId); return n; }); if (currentRoom?.id === roomId) { setCurrentRoom(null); setActivePage('rooms'); } setUnreadCounts(prev => { const n = {...prev}; delete n[roomId]; return n; }); }, [currentRoom]);
   const handleCreateRoom = useCallback((roomName: string) => { /* Create room */ const trimmed = roomName.trim(); if (rooms.some(r => r.name.toLowerCase() === trimmed.toLowerCase())) { alert('Room sudah ada.'); return; } if (!currentUser?.username) { alert('Harus login.'); return; } const newRoom: Room = { id: trimmed.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(), name: trimmed, userCount: 1, createdBy: currentUser.username }; setRooms(prev => [newRoom, ...prev]); handleJoinRoom(newRoom); }, [handleJoinRoom, rooms, currentUser]);
   const handleDeleteRoom = useCallback((roomId: string) => { /* Delete room */ if (!database) { console.error("Database not initialized for deleteRoom"); return; } const currentDb = database; const roomToDelete = rooms.find(r => r.id === roomId); if (!roomToDelete || !currentUser?.username) return; const isAdmin = ADMIN_USERNAMES.map(n=>n.toLowerCase()).includes(currentUser.username.toLowerCase()); const isCreator = roomToDelete.createdBy === currentUser.username; if (['berita-kripto', 'pengumuman-aturan'].includes(roomId)) { alert('Room default tidak dapat dihapus.'); return; } if (isAdmin || isCreator) { if (window.confirm(`Yakin hapus room "${roomToDelete.name}"?`)) { setRooms(prev => prev.filter(r => r.id !== roomId)); if (currentRoom?.id === roomId) { setCurrentRoom(null); setActivePage('rooms'); } setJoinedRoomIds(prev => { const n = new Set(prev); n.delete(roomId); return n; }); setFirebaseMessages(prev => { const n = {...prev}; delete n[roomId]; return n; }); setUnreadCounts(prev => { const n = {...prev}; delete n[roomId]; return n; }); const messagesRef = ref(currentDb, `messages/${roomId}`); set(messagesRef, null).catch(console.error); } } else { alert('Tidak punya izin menghapus.'); } }, [currentUser, rooms, currentRoom]);


    // --- Firebase Chat Logic ---

    // Mengirim pesan
    const handleSendMessage = useCallback((message: ChatMessage) => {
        // Log saat fungsi dipanggil
        console.log("App.tsx: handleSendMessage called with message:", message); // Log 1

        if (!database) { console.error("Database not initialized for sendMessage"); return; } // Check database
        if (!currentRoom?.id) { console.error("Cannot send message: currentRoom is null or has no ID."); return; }
        if (!currentUser?.username) { console.error("Cannot send message: currentUser is null or has no username."); return; }

        console.log(`Attempting to send to room: ${currentRoom.id} by user: ${currentUser.username}`); // Log 2

        const messageListRef = ref(database, `messages/${currentRoom.id}`);
        const newMessageRef = push(messageListRef);
        const messageToSend: ChatMessage = { ...message, type: message.sender === 'system' ? 'system' : 'user', id: newMessageRef.key ?? `local-${Date.now()}-${Math.random()}`, timestamp: message.timestamp || Date.now() };

        console.log("Data to send:", messageToSend); // Log 3

        set(newMessageRef, messageToSend)
            .then(() => {
                console.log("Message successfully sent to Firebase with ID:", newMessageRef.key); // Log Sukses
            })
            .catch((error) => {
                console.error("Firebase send message failed:", error); // Log Error Firebase
                alert("Gagal kirim pesan. Periksa koneksi atau izin database.");
            });
    }, [currentRoom, currentUser]); // Dependencies tetap

    // Mendengarkan pesan
    useEffect(() => {
        if (!database) { console.warn("Database not initialized, cannot listen for messages."); return () => {}; }
        if (!currentRoom?.id) return () => {};
        const currentDb = database; const messagesRef = ref(currentDb, `messages/${currentRoom.id}`);
        console.log(`Listening to: messages/${currentRoom.id}`);
        let listener: ReturnType<typeof onValue> | null = null;
        listener = onValue(messagesRef, (snapshot) => { const data = snapshot.val(); const messagesArray: ForumMessageItem[] = []; if (data) { Object.keys(data).forEach(key => { const msgData = data[key]; if (msgData && typeof msgData === 'object') { let type: 'news' | 'user' | 'system' = msgData.type; if (!type) { if (typeof msgData.published_on === 'number' && msgData.source) type = 'news'; else if (msgData.sender === 'system') type = 'system'; else if (msgData.sender) type = 'user'; } if (type === 'news' || type === 'user' || type === 'system') { messagesArray.push({ ...msgData, id: key, type }); } else { console.warn("Pesan tanpa tipe valid:", key, msgData); } } }); } console.log(`Data received for ${currentRoom.id}:`, messagesArray.length); let finalMessages = messagesArray; if (messagesArray.length === 0) { if (defaultMessages[currentRoom.id]) { finalMessages = [...defaultMessages[currentRoom.id]]; } else if (!['berita-kripto', 'pengumuman-aturan'].includes(currentRoom.id) && currentUser?.username) { const welcomeMsg: ChatMessage = { id: `${currentRoom.id}-welcome-${Date.now()}`, type: 'system', text: `Selamat datang di room "${currentRoom.name}".`, sender: 'system', timestamp: Date.now() }; const adminMsg: ChatMessage = { id: `${currentRoom.id}-admin-${Date.now()}`, type: 'user', text: 'Ingat DYOR!', sender: 'Admin_RTC', timestamp: Date.now() + 1, reactions: {'👍': []} }; finalMessages = [welcomeMsg, adminMsg]; } } setFirebaseMessages(prev => ({ ...prev, [currentRoom.id]: finalMessages.sort((a, b) => { const timeA = isNewsArticle(a) ? a.published_on * 1000 : (isChatMessage(a) ? a.timestamp : 0); const timeB = isNewsArticle(b) ? b.published_on * 1000 : (isChatMessage(b) ? b.timestamp : 0); if (timeA === 0 && timeB !== 0) return 1; if (timeA !== 0 && timeB === 0) return -1; return timeA - timeB; }) })); }, (error) => { console.error(`Firebase listener error for ${currentRoom?.id}:`, error); });
        return () => { if (listener && database) { console.log(`Stopping listener for ${currentRoom?.id}`); off(messagesRef, 'value', listener); } };
    }, [currentRoom, currentUser]);

    // Fetch News Articles
    useEffect(() => {
         if (!database) { console.warn("Database not initialized, cannot fetch/save news."); return; }
         const currentDb = database; const NEWS_ROOM_ID = 'berita-kripto'; const NEWS_FETCH_INTERVAL = 20 * 60 * 1000; const LAST_FETCH_KEY = 'lastNewsFetchTimestamp';
         const fetchAndProcessNews = async () => { const now = Date.now(); const lastFetch = parseInt(localStorage.getItem(LAST_FETCH_KEY) || '0', 10); /* if (now - lastFetch < NEWS_FETCH_INTERVAL) return; */ try { const fetchedArticles = await fetchNewsArticles(); if (!fetchedArticles?.length) return; if (!currentDb) return; const newsRoomRef = ref(currentDb, `messages/${NEWS_ROOM_ID}`); const snapshot = await get(newsRoomRef); const existingNewsData = snapshot.val() || {}; const existingNewsUrls = new Set(Object.values<any>(existingNewsData).map(news => news.url)); let newArticleAdded = false; const updates: { [key: string]: NewsArticle } = {}; fetchedArticles.forEach(article => { if (!existingNewsUrls.has(article.url)) { const newsRef = push(newsRoomRef); if(newsRef.key) { updates[newsRef.key] = { ...article, type: 'news', id: newsRef.key, reactions: {} }; newArticleAdded = true; } } }); if (newArticleAdded) { console.log(`Adding ${Object.keys(updates).length} news.`); await update(newsRoomRef, updates); localStorage.setItem(LAST_FETCH_KEY, now.toString()); if (currentRoom?.id !== NEWS_ROOM_ID) { setUnreadCounts(prev => ({ ...prev, [NEWS_ROOM_ID]: { count: (prev[NEWS_ROOM_ID]?.count || 0) + Object.keys(updates).length, lastUpdate: now } })); } } else { console.log("No new news."); } } catch (err: any) { console.error("News fetch/process failed:", err.message); } };
         fetchAndProcessNews(); const intervalId = setInterval(fetchAndProcessNews, NEWS_FETCH_INTERVAL); return () => clearInterval(intervalId);
    }, [currentRoom]);

    // Menangani reaksi
    const handleReaction = useCallback((messageId: string, emoji: string) => {
        if (!database) { console.error("Database not initialized for reaction"); return; }
        if (!currentRoom?.id || !currentUser?.username || !messageId) return;
        const username = currentUser.username; const reactionUserListRef = ref(database, `messages/${currentRoom.id}/${messageId}/reactions/${emoji}`);
        get(reactionUserListRef).then((snapshot) => { const usersForEmoji: string[] = snapshot.val() || []; let updatedUsers: string[] | null = null; if (usersForEmoji.includes(username)) { updatedUsers = usersForEmoji.filter(u => u !== username); if (updatedUsers.length === 0) updatedUsers = null; } else { updatedUsers = [...usersForEmoji, username]; } set(reactionUserListRef, updatedUsers).catch(error => console.error("Update reaction failed:", error)); }).catch(error => console.error("Get reaction failed:", error));
    }, [currentRoom, currentUser]);


  // --- Memoized Values ---
  const totalUsers = useMemo(() => rooms.reduce((sum, room) => sum + room.userCount, 0), [rooms]);
  const heroCoin = searchedCoin || trendingCoins[0] || null;
  const otherTrendingCoins = searchedCoin ? [] : trendingCoins.slice(1);
  const hotCoin = trendingCoins.length > 1 ? { name: trendingCoins[1].name, logo: trendingCoins[1].image, price: trendingCoins[1].price, change: trendingCoins[1].change } : null;

  // --- Render Logic ---
  const renderActivePage = () => {
     switch (activePage) {
      case 'home': return <HomePage idrRate={idrRate} isRateLoading={isRateLoading} currency={currency} onIncrementAnalysisCount={handleIncrementAnalysisCount} fullCoinList={fullCoinList} isCoinListLoading={isCoinListLoading} coinListError={coinListError} heroCoin={heroCoin} otherTrendingCoins={otherTrendingCoins} isTrendingLoading={isTrendingLoading} trendingError={trendingError} onSelectCoin={handleSelectCoin} onReloadTrending={handleResetToTrending} />;
      case 'rooms': return <RoomsListPage rooms={rooms} onJoinRoom={handleJoinRoom} onCreateRoom={handleCreateRoom} totalUsers={totalUsers} hotCoin={hotCoin} userProfile={currentUser} currentRoomId={currentRoom?.id || null} joinedRoomIds={joinedRoomIds} onLeaveJoinedRoom={handleLeaveJoinedRoom} unreadCounts={unreadCounts} onDeleteRoom={handleDeleteRoom} />;
      case 'forum': const currentMessages = currentRoom ? firebaseMessages[currentRoom.id] || [] : []; const displayMessages = (currentMessages.length === 0 && currentRoom && defaultMessages[currentRoom.id]) ? defaultMessages[currentRoom.id] : currentMessages; const messagesToPass = Array.isArray(displayMessages) ? displayMessages : []; return <ForumPage room={currentRoom} messages={messagesToPass} userProfile={currentUser} onSendMessage={handleSendMessage} onLeaveRoom={handleLeaveRoom} onReact={handleReaction} />;
      case 'about': return <AboutPage />;
      default: return <HomePage idrRate={idrRate} isRateLoading={isRateLoading} currency={currency} onIncrementAnalysisCount={handleIncrementAnalysisCount} fullCoinList={fullCoinList} isCoinListLoading={isCoinListLoading} coinListError={coinListError} heroCoin={heroCoin} otherTrendingCoins={otherTrendingCoins} isTrendingLoading={isTrendingLoading} trendingError={trendingError} onSelectCoin={handleSelectCoin} onReloadTrending={handleResetToTrending} />;
    }
  };

  // --- Auth Flow Rendering ---
  if (!currentUser && !pendingGoogleUser) return <LoginPage onGoogleRegisterSuccess={handleGoogleRegisterSuccess} onLogin={handleLogin} />;
  if (pendingGoogleUser) return <CreateIdPage onProfileComplete={handleProfileComplete} googleProfile={pendingGoogleUser} />;

  // --- Main App Render ---
   return (
    <div className="min-h-screen bg-transparent text-white font-sans flex flex-col">
      <Particles />
      <Header userProfile={currentUser} onLogout={handleLogout} activePage={activePage} onNavigate={handleNavigate} currency={currency} onCurrencyChange={setCurrency} hotCoin={hotCoin} idrRate={idrRate} />
      <main className="flex-grow">
        {currentUser && renderActivePage()}
      </main>
      <Footer />
    </div>
  );
};

// Wrap AppContent with GoogleOAuthProvider
const App = () => {
    // Ambil Client ID dari environment variable
    const googleClientId = process.env.GOOGLE_CLIENT_ID;

    if (!googleClientId) {
        // Tampilkan pesan error jika Client ID tidak ada
        // (Ini mirip dengan yang ada di index.tsx Anda, mungkin bisa dipindahkan ke sini saja)
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