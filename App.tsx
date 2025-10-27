// ava19999/v1/v1-1340aa22ce1177029d39fe3f8689ee2fb3a9c123/App.tsx
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { GoogleOAuthProvider, GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import Header from './components/Header';
import Footer from './components/Footer';
import type { ForumMessageItem, Room, CoinListItem, CryptoData, ChatMessage, Page, Currency, NewsArticle, User, GoogleProfile } from './types';
import { isNewsArticle, isChatMessage } from './types';
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
import { FirebaseApp } from 'firebase/app';

const defaultMessages: { [key: string]: ForumMessageItem[] } = { /* ... */ };
const Particles = () => ( <div className="particles"> {/* ... */} </div> );


const AppContent = () => {
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
  const [rooms, setRooms] = useState<Room[]>([ /* ... */ ]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [joinedRoomIds, setJoinedRoomIds] = useState<Set<string>>( () => new Set(['berita-kripto', 'pengumuman-aturan']) );
  const [unreadCounts, setUnreadCounts] = useState<{ [key: string]: { count: number; lastUpdate: number } }>({});
  const [firebaseMessages, setFirebaseMessages] = useState<{ [roomId: string]: ForumMessageItem[] }>({});

  // --- Handlers Defined Early ---
  const fetchTrendingData = useCallback(async (showSkeleton = true) => { /* ... */ }, []);
  const handleResetToTrending = useCallback(() => { /* ... */ }, [fetchTrendingData]);

  // --- Effects ---
    useEffect(() => { /* Load users & currentUser */ }, []);
    useEffect(() => { /* Persist users */ }, [users]);
    useEffect(() => { /* Persist currentUser */ }, [currentUser]);
    useEffect(() => { /* Load/Save unreadCounts */ }, []);
    useEffect(() => { /* Persist unreadCounts */ }, [unreadCounts]);
    useEffect(() => { /* Reset/Load analysis counts daily */ }, []);
    useEffect(() => { /* Fetch IDR Rate */ }, []);
    useEffect(() => { /* Fetch Top 500 Coins */ }, []);
    useEffect(() => { /* Fetch initial trending */ fetchTrendingData(); }, [fetchTrendingData]);

  // --- Auth Handlers ---
    const handleGoogleRegisterSuccess = useCallback(async (credentialResponse: CredentialResponse) => { /* ... */ }, [users]);
    const handleLogin = useCallback(async (usernameOrEmail: string, password: string): Promise<string | void> => { /* ... */ }, [users]);
    const handleProfileComplete = useCallback(async (username: string, password: string): Promise<string | void> => { /* ... */ }, [users, pendingGoogleUser]);
    const handleLogout = useCallback(() => { /* ... */ }, []);

  // --- App Logic Handlers ---
   const handleIncrementAnalysisCount = useCallback((coinId: string) => { /* ... */ }, []);
   const handleNavigate = useCallback((page: Page) => { /* ... */ }, [activePage, handleResetToTrending]);
   const handleSelectCoin = useCallback(async (coinId: string) => { /* ... */ }, []);
   const handleJoinRoom = useCallback((room: Room) => { /* ... */ }, []);
   const handleLeaveRoom = useCallback(() => { /* ... */ }, []);
   const handleLeaveJoinedRoom = useCallback((roomId: string) => { /* ... */ }, [currentRoom]);
   const handleCreateRoom = useCallback((roomName: string) => { /* ... */ }, [handleJoinRoom, rooms, currentUser]);
   const handleDeleteRoom = useCallback((roomId: string) => { /* ... (termasuk hapus dari Firebase) ... */ if (!database) { console.error("DB null - deleteRoom"); return; } const currentDb = database; /* ... rest ... */ const messagesRef = ref(currentDb, `messages/${roomId}`); set(messagesRef, null).catch(console.error); }, [currentUser, rooms, currentRoom]);


    // --- Firebase Chat Logic ---

    // Mengirim pesan (TIDAK DIUBAH)
    const handleSendMessage = useCallback((message: ChatMessage) => {
        console.log("[App.tsx] handleSendMessage called with message:", JSON.stringify(message));
        if (!database) { console.error("[App.tsx] Database not initialized!"); return; }
        if (!currentRoom?.id) { console.error("[App.tsx] currentRoom.id is missing!"); return; }
        if (!currentUser?.username) { console.error("[App.tsx] currentUser.username is missing!"); return; }
        console.log(`[App.tsx] Sending to room: ${currentRoom.id} by user: ${currentUser.username}`);
        const messageListRef = ref(database, `messages/${currentRoom.id}`);
        const newMessageRef = push(messageListRef);
        const messageToSend: ChatMessage = {
             id: newMessageRef.key ?? `local-${Date.now()}`,
             type: 'user',
             sender: message.sender,
             timestamp: message.timestamp,
             reactions: message.reactions || {},
             ...(message.text && { text: message.text }),
             ...(message.fileURL && { fileURL: message.fileURL, fileName: message.fileName }),
        };
        console.log("[App.tsx] Final message object to send:", JSON.stringify(messageToSend));
        set(newMessageRef, messageToSend)
            .then(() => { console.log("[App.tsx] Message sent successfully! ID:", newMessageRef.key); })
            .catch((error) => { console.error("[App.tsx] Firebase send message failed:", error); alert("Gagal kirim pesan."); });
    }, [currentRoom, currentUser]);

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
         if (!database) { console.warn("DB null - news fetch"); return; }
         const currentDb = database;
         const NEWS_ROOM_ID = 'berita-kripto';
         const NEWS_FETCH_INTERVAL = 20 * 60 * 1000;
         const LAST_FETCH_KEY = 'lastNewsFetchTimestamp';

         const fetchAndProcessNews = async () => {
             // PERBAIKAN: Gunakan Date.now() bukan 'now'
             const currentTime = Date.now();
             const lastFetch = parseInt(localStorage.getItem(LAST_FETCH_KEY) || '0', 10);
             /* if (currentTime - lastFetch < NEWS_FETCH_INTERVAL) return; */
             try {
                 const fetchedArticles = await fetchNewsArticles();
                 if (!fetchedArticles?.length) return;
                 if (!currentDb) return;
                 const newsRoomRef = ref(currentDb, `messages/${NEWS_ROOM_ID}`);
                 const snapshot = await get(newsRoomRef);
                 const existingNewsData = snapshot.val() || {};
                 const existingNewsUrls = new Set(Object.values<any>(existingNewsData).map(news => news.url));
                 let newArticleAdded = false;
                 const updates: { [key: string]: NewsArticle } = {};
                 fetchedArticles.forEach(article => {
                     if (!existingNewsUrls.has(article.url)) {
                         const newsRef = push(newsRoomRef);
                         if(newsRef.key) {
                             updates[newsRef.key] = { ...article, type: 'news', id: newsRef.key, reactions: {} };
                             newArticleAdded = true;
                         }
                     }
                 });
                 if (newArticleAdded) {
                     console.log(`Adding ${Object.keys(updates).length} news.`);
                     await update(newsRoomRef, updates);
                     // PERBAIKAN: Gunakan currentTime bukan 'now'
                     localStorage.setItem(LAST_FETCH_KEY, currentTime.toString());
                     if (currentRoom?.id !== NEWS_ROOM_ID) {
                         // PERBAIKAN: Gunakan currentTime bukan 'now'
                         setUnreadCounts(prev => ({ ...prev, [NEWS_ROOM_ID]: { count: (prev[NEWS_ROOM_ID]?.count || 0) + Object.keys(updates).length, lastUpdate: currentTime } }));
                     }
                 } else {
                     console.log("No new news.");
                 }
             } catch (err: any) {
                 console.error("News fetch/process failed:", err.message);
             }
         };

         fetchAndProcessNews();
         const intervalId = setInterval(fetchAndProcessNews, NEWS_FETCH_INTERVAL);
         return () => clearInterval(intervalId);
    }, [currentRoom]); // Dependensi tetap

    // Menangani reaksi
    const handleReaction = useCallback((messageId: string, emoji: string) => {
        if (!database) { console.error("DB null - reaction"); return; } if (!currentRoom?.id || !currentUser?.username || !messageId) return;
        const username = currentUser.username; const reactionUserListRef = ref(database, `messages/${currentRoom.id}/${messageId}/reactions/${emoji}`);
        get(reactionUserListRef).then((snapshot) => { const usersForEmoji: string[] = snapshot.val() || []; let updatedUsers: string[] | null = null; if (usersForEmoji.includes(username)) { updatedUsers = usersForEmoji.filter(u => u !== username); if (updatedUsers.length === 0) updatedUsers = null; } else { updatedUsers = [...usersForEmoji, username]; } set(reactionUserListRef, updatedUsers).catch(error => console.error("Update reaction failed:", error)); }).catch(error => console.error("Get reaction failed:", error));
    }, [currentRoom, currentUser]);

    // Handler untuk menghapus pesan
    const handleDeleteMessage = useCallback((roomId: string, messageId: string) => {
        if (!database) { console.error("[App.tsx] Database not initialized for deleteMessage"); return; }
        if (!roomId || !messageId) { console.error("[App.tsx] Missing roomId or messageId for deleteMessage"); return; }
        console.log(`[App.tsx] Attempting to delete message ${messageId} from room ${roomId}`);
        const messageRef = ref(database, `messages/${roomId}/${messageId}`);
        set(messageRef, null)
            .then(() => { console.log(`[App.tsx] Message ${messageId} deleted successfully.`); })
            .catch((error) => { console.error(`[App.tsx] Failed to delete message ${messageId}:`, error); alert("Gagal menghapus pesan."); });
    }, []); // Dependensi kosong


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
      case 'forum': const currentMessages = currentRoom ? firebaseMessages[currentRoom.id] || [] : []; const displayMessages = (currentMessages.length === 0 && currentRoom && defaultMessages[currentRoom.id]) ? defaultMessages[currentRoom.id] : currentMessages; const messagesToPass = Array.isArray(displayMessages) ? displayMessages : [];
        return <ForumPage room={currentRoom} messages={messagesToPass} userProfile={currentUser} onSendMessage={handleSendMessage} onLeaveRoom={handleLeaveRoom} onReact={handleReaction} onDeleteMessage={handleDeleteMessage} />; // Teruskan onDeleteMessage
      case 'about': return <AboutPage />;
      default: return <HomePage idrRate={idrRate} isRateLoading={isRateLoading} currency={currency} onIncrementAnalysisCount={handleIncrementAnalysisCount} fullCoinList={fullCoinList} isCoinListLoading={isCoinListLoading} coinListError={coinListError} heroCoin={heroCoin} otherTrendingCoins={otherTrendingCoins} isTrendingLoading={isTrendingLoading} trendingError={trendingError} onSelectCoin={handleSelectCoin} onReloadTrending={handleResetToTrending} />;
    }
  };

  // --- Auth Flow Rendering ---
  if (!currentUser && !pendingGoogleUser) return <LoginPage onGoogleRegisterSuccess={handleGoogleRegisterSuccess} onLogin={handleLogin} />;
  if (pendingGoogleUser) return <CreateIdPage onProfileComplete={handleProfileComplete} googleProfile={pendingGoogleUser} />;

  // --- Main App Render ---
   return ( <div className="min-h-screen bg-transparent text-white font-sans flex flex-col"> <Particles /> <Header userProfile={currentUser} onLogout={handleLogout} activePage={activePage} onNavigate={handleNavigate} currency={currency} onCurrencyChange={setCurrency} hotCoin={hotCoin} idrRate={idrRate} /> <main className="flex-grow"> {currentUser && renderActivePage()} </main> <Footer /> </div> );
};

// Wrap AppContent with GoogleOAuthProvider
const App = () => {
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (!googleClientId) { return ( /* ... Error message ... */ ); }
    return ( <GoogleOAuthProvider clientId={googleClientId}> <AppContent /> </GoogleOAuthProvider> );
};

export default App;