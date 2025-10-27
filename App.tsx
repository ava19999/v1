// ava19999/v1/v1-aacbe1d2a7de47d44bb6e7f00166828f3e9eaa42/App.tsx
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { GoogleOAuthProvider, CredentialResponse } from '@react-oauth/google'; // Removed unused GoogleLogin
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
// Removed unused FirebaseApp import
// import { FirebaseApp } from 'firebase/app';

// Define DEFAULT_ROOM_IDS constant
const DEFAULT_ROOM_IDS = ['berita-kripto', 'pengumuman-aturan'];


// Default messages structure
const defaultMessages: { [key: string]: ForumMessageItem[] } = {
    'pengumuman-aturan': [
        { id: 'rule1', type: 'system', text: 'Selamat datang di RT Crypto! Diskusi & analisis.', sender: 'system', timestamp: Date.now() - 2000 }, // Adjusted timestamp slightly
        { id: 'rule2', type: 'system', text: 'Aturan: Dilarang share sinyal. DYOR. Risiko ditanggung sendiri.', sender: 'system', timestamp: Date.now() - 1000 },
        { id: 'mission1', type: 'system', text: 'Misi: Jadi trader cerdas bareng, bukan ikut-ikutan. Ayo menang bareng!', sender: 'system', timestamp: Date.now() }
    ],
    // Add other default messages if necessary
};


const Particles = () => (
    <div className="particles fixed top-0 left-0 w-full h-full -z-10 pointer-events-none">
        {/* Simplified particle elements */}
        <div className="particle absolute bg-electric/50 rounded-full opacity-0 animate-[drift_20s_infinite_linear]" style={{ width: '3px', height: '3px', left: '10%', animationDelay: '-1s' }}></div>
        <div className="particle absolute bg-magenta/50 rounded-full opacity-0 animate-[drift_25s_infinite_linear_-5s]" style={{ width: '2px', height: '2px', left: '25%'}}></div>
        <div className="particle absolute bg-lime/50 rounded-full opacity-0 animate-[drift_15s_infinite_linear_-10s]" style={{ width: '4px', height: '4px', left: '50%'}}></div>
        <div className="particle absolute bg-electric/30 rounded-full opacity-0 animate-[drift_18s_infinite_linear_-7s]" style={{ width: '2px', height: '2px', left: '75%'}}></div>
        <div className="particle absolute bg-lime/40 rounded-full opacity-0 animate-[drift_22s_infinite_linear_-3s]" style={{ width: '3px', height: '3px', left: '90%'}}></div>
    </div>
);


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
  const [rooms, setRooms] = useState<Room[]>([ // Corrected initial rooms state
      { id: 'berita-kripto', name: 'Berita Kripto', userCount: 150 + Math.floor(Math.random() * 20) },
      { id: 'pengumuman-aturan', name: 'Pengumuman & Aturan', userCount: 150 + Math.floor(Math.random() * 20) },
      { id: 'umum', name: 'Kripto Naik/Turun Hari Ini', userCount: 134 + Math.floor(Math.random() * 20), createdBy: 'Admin_RTC'},
      { id: 'meme', name: 'Meme Coin Mania', userCount: 88 + Math.floor(Math.random() * 20)},
      { id: 'xrp-army', name: 'Xrp Army', userCount: 73 + Math.floor(Math.random() * 20)},
      { id: 'roblox-tuker-kripto', name: 'Roblox Tuker Kripto', userCount: 42 + Math.floor(Math.random() * 20)},
  ]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [joinedRoomIds, setJoinedRoomIds] = useState<Set<string>>( () => new Set(DEFAULT_ROOM_IDS) ); // Use constant
  const [unreadCounts, setUnreadCounts] = useState<{ [key: string]: { count: number; lastUpdate: number } }>({});
  const [firebaseMessages, setFirebaseMessages] = useState<{ [roomId: string]: ForumMessageItem[] }>({});

  // --- Handlers Defined Early ---
   const fetchTrendingData = useCallback(async (showSkeleton = true) => {
        if (showSkeleton) {
            setIsTrendingLoading(true);
            setTrendingError(null);
        }
        try {
            const trending = await fetchTrendingCoins();
            setTrendingCoins(trending);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Gagal memuat data tren.";
            if (showSkeleton) {
                setTrendingError(errorMessage);
            } else {
                console.error("Gagal menyegarkan data tren:", errorMessage);
            }
        } finally {
            if (showSkeleton) {
                setIsTrendingLoading(false);
            }
        }
    }, []);

    const handleResetToTrending = useCallback(() => {
        setSearchedCoin(null);
        setActivePage('home');
        fetchTrendingData(true);
    }, [fetchTrendingData]);


  // --- Effects ---
    // Load users & currentUser from localStorage
    useEffect(() => {
        try {
            const storedUsers = localStorage.getItem('cryptoUsers');
            if (storedUsers) setUsers(JSON.parse(storedUsers));
            const storedCurrentUser = localStorage.getItem('currentUser');
            if (storedCurrentUser) setCurrentUser(JSON.parse(storedCurrentUser));
        } catch (e) { console.error("Gagal load user localStorage", e); }
    }, []);

    // Persist users
    useEffect(() => {
        try { localStorage.setItem('cryptoUsers', JSON.stringify(users)); }
        catch (e) { console.error("Gagal simpan users localStorage", e); }
    }, [users]);

    // Persist currentUser
    useEffect(() => {
        try {
            if (currentUser) localStorage.setItem('currentUser', JSON.stringify(currentUser));
            else localStorage.removeItem('currentUser');
        } catch (e) { console.error("Gagal simpan currentUser localStorage", e); }
    }, [currentUser]);

    // Load/Save unreadCounts
    useEffect(() => {
        const saved = localStorage.getItem('unreadCounts');
        if (saved) try { setUnreadCounts(JSON.parse(saved)); } catch (e) { console.error("Gagal parse unreadCounts", e); }
    }, []);
    useEffect(() => { localStorage.setItem('unreadCounts', JSON.stringify(unreadCounts)); }, [unreadCounts]);

    // Reset/Load analysis counts daily
    useEffect(() => {
        const lastReset = localStorage.getItem('lastAnalysisResetDate');
        const today = new Date().toISOString().split('T')[0];
        if (lastReset !== today) {
            localStorage.setItem('analysisCounts', '{}');
            localStorage.setItem('lastAnalysisResetDate', today);
            setAnalysisCounts({});
        } else {
            const saved = localStorage.getItem('analysisCounts');
            if (saved) try { setAnalysisCounts(JSON.parse(saved)); } catch (e) { console.error("Gagal parse analysis counts", e); }
        }
    }, []);

    // Fetch IDR Rate
    useEffect(() => {
        const getRate = async () => {
            setIsRateLoading(true);
            try { setIdrRate(await fetchIdrRate()); }
            catch (error) { console.error("Gagal ambil kurs IDR:", error); setIdrRate(16000); } // Fallback
            finally { setIsRateLoading(false); }
        };
        getRate();
    }, []);

    // Fetch Top 500 Coins
    useEffect(() => {
        const fetchList = async () => {
            setIsCoinListLoading(true); setCoinListError(null);
            try { setFullCoinList(await fetchTop500Coins()); }
            catch (err) { setCoinListError("Gagal ambil daftar koin."); }
            finally { setIsCoinListLoading(false); }
        };
        fetchList();
    }, []);

    // Fetch initial trending
    useEffect(() => { fetchTrendingData(); }, [fetchTrendingData]);


  // --- Auth Handlers ---
    const handleGoogleRegisterSuccess = useCallback(async (credentialResponse: CredentialResponse) => {
        if (!credentialResponse.credential) return;
        try {
            const decoded: { email: string; name: string; picture: string; } = jwtDecode(credentialResponse.credential);
            const { email, name, picture } = decoded;
            const existingUser = users[email];
            if (existingUser) {
                setCurrentUser(existingUser);
            } else {
                setPendingGoogleUser({ email, name, picture });
            }
        } catch (error) { console.error("Google login decode error:", error); }
    }, [users]);

    const handleLogin = useCallback(async (usernameOrEmail: string, password: string): Promise<string | void> => {
        const user = Object.values(users).find(u => (u.username.toLowerCase() === usernameOrEmail.toLowerCase() || u.email.toLowerCase() === usernameOrEmail.toLowerCase()));
        if (user && user.password === password) { // Simple password check (NOT secure for production)
            setCurrentUser(user);
        } else {
            return 'Username/email atau kata sandi salah.';
        }
    }, [users]);

    const handleProfileComplete = useCallback(async (username: string, password: string): Promise<string | void> => {
        if (!pendingGoogleUser) return 'Data Google tidak ditemukan.';
        if (Object.values(users).some(u => u.username.toLowerCase() === username.toLowerCase())) {
            return 'Username sudah digunakan. Pilih nama lain.';
        }
        const newUser: User = {
            email: pendingGoogleUser.email,
            username: username,
            password: password,
            googleProfilePicture: pendingGoogleUser.picture,
            createdAt: Date.now()
        };
        setUsers(prev => ({ ...prev, [newUser.email]: newUser }));
        setCurrentUser(newUser);
        setPendingGoogleUser(null);
    }, [users, pendingGoogleUser]);

    const handleLogout = useCallback(() => { setCurrentUser(null); setActivePage('home'); }, []);


  // --- App Logic Handlers ---
   const handleIncrementAnalysisCount = useCallback((coinId: string) => {
        setAnalysisCounts(prev => {
            const current = prev[coinId] || baseAnalysisCount;
            const newCounts = { ...prev, [coinId]: current + 1 };
            localStorage.setItem('analysisCounts', JSON.stringify(newCounts));
            return newCounts;
        });
    }, []);

   const handleNavigate = useCallback((page: Page) => {
        if (page === 'home' && activePage === 'home') {
             handleResetToTrending();
        } else if (page === 'forum') {
            setActivePage('rooms');
        } else {
            setActivePage(page);
        }
        // Don't leave room just by navigating top level pages, only when explicitly leaving or joining another
        // setCurrentRoom(null);
    }, [activePage, handleResetToTrending]);

   const handleSelectCoin = useCallback(async (coinId: string) => {
        setIsTrendingLoading(true); setTrendingError(null); setSearchedCoin(null);
        try { setSearchedCoin(await fetchCoinDetails(coinId)); }
        catch (err) { setTrendingError(err instanceof Error ? err.message : "Gagal muat detail koin."); }
        finally { setIsTrendingLoading(false); }
    }, []);

   const handleJoinRoom = useCallback((room: Room) => {
        setCurrentRoom(room);
        setJoinedRoomIds(prev => new Set(prev).add(room.id));
        setUnreadCounts(prev => ({ ...prev, [room.id]: { count: 0, lastUpdate: Date.now() } }));
        setActivePage('forum');
    }, []); // Removed unused dependencies

    const handleLeaveRoom = useCallback(() => { setCurrentRoom(null); setActivePage('rooms'); }, []);

    const handleLeaveJoinedRoom = useCallback((roomId: string) => {
        if (DEFAULT_ROOM_IDS.includes(roomId)) return;
        setJoinedRoomIds(prev => {
            const newIds = new Set(prev);
            newIds.delete(roomId);
            return newIds;
        });
        if (currentRoom?.id === roomId) {
            setCurrentRoom(null);
            setActivePage('rooms');
        }
    }, [currentRoom]);

   const handleCreateRoom = useCallback((roomName: string) => {
        if (!currentUser?.username) { alert("Anda harus login untuk membuat room."); return; }
        const trimmedName = roomName.trim();
        if (rooms.some(r => r.name.toLowerCase() === trimmedName.toLowerCase())) {
            alert('Nama room sudah ada.'); return;
        }
        const newRoom: Room = {
            id: trimmedName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
            name: trimmedName,
            userCount: 1,
            createdBy: currentUser.username
        };
        setRooms(prev => [newRoom, ...prev]);
        // Consider saving the new room to Firebase if rooms should persist globally
        handleJoinRoom(newRoom);
    }, [handleJoinRoom, rooms, currentUser]);


   const handleDeleteRoom = useCallback((roomId: string) => {
        if (!currentUser?.username) return;
        const roomToDelete = rooms.find(r => r.id === roomId);
        if (!roomToDelete || DEFAULT_ROOM_IDS.includes(roomId)) return;

        const isAdmin = ADMIN_USERNAMES.map(n => n.toLowerCase()).includes(currentUser.username.toLowerCase());
        const isCreator = roomToDelete.createdBy === currentUser.username;

        if (!isAdmin && !isCreator) { alert("Hanya admin atau pembuat room yang bisa menghapus."); return; }

        if (window.confirm(`Yakin ingin menghapus room "${roomToDelete.name}"? Ini akan menghapus semua pesan di dalamnya.`)) {
            setRooms(prev => prev.filter(r => r.id !== roomId));
            setJoinedRoomIds(prev => { const n = new Set(prev); n.delete(roomId); return n; });
            if (currentRoom?.id === roomId) { setCurrentRoom(null); setActivePage('rooms'); }

            if (!database) { console.error("DB null - deleteRoom"); return; }
            const messagesRef = ref(database, `messages/${roomId}`);
            set(messagesRef, null).catch(error => console.error(`Failed to delete messages for room ${roomId}:`, error));
            // Optionally delete room info if stored separately in Firebase
            // const roomInfoRef = ref(database, `rooms/${roomId}`);
            // set(roomInfoRef, null).catch(error => console.error(`Failed to delete room info for ${roomId}:`, error));
        }
   }, [currentUser, rooms, currentRoom, database]);


    // --- Firebase Chat Logic ---

    // Send Message - REVISED
    const handleSendMessage = useCallback((message: ChatMessage) => {
        if (!database) {
            console.error("[App.tsx] Database not initialized!");
            alert("Gagal kirim pesan: Database tidak terhubung."); // User feedback
            return;
        }
        if (!currentRoom?.id) {
            console.error("[App.tsx] currentRoom.id is missing!");
            alert("Gagal kirim pesan: Room tidak dipilih."); // User feedback
            return;
        }
        if (!currentUser?.username) {
            console.error("[App.tsx] currentUser.username is missing!");
             alert("Gagal kirim pesan: User tidak login."); // User feedback
            return;
        }

        const messageListRef = ref(database, `messages/${currentRoom.id}`);
        const newMessageRef = push(messageListRef); // Generate unique key

        // Construct message *without* client-side ID
        const messageToSend: Omit<ChatMessage, 'id'> = {
             type: 'user',
             sender: currentUser.username, // Use confirmed logged-in username
             timestamp: Date.now(), // Use client time as fallback
             reactions: {}, // Initialize reactions
             // Conditionally add text/file info ONLY if they exist in the input 'message'
             ...(message.text && { text: message.text }),
             ...(message.fileURL && { fileURL: message.fileURL }),
             ...(message.fileName && { fileName: message.fileName }),
        };

        // Ensure we are sending something meaningful
        if (!messageToSend.text && !messageToSend.fileURL) {
            console.warn("[App.tsx] Attempted to send an empty message.");
            return; // Don't send empty messages
        }


        set(newMessageRef, messageToSend)
            .then(() => { /* Sent successfully */ })
            .catch((error) => {
                console.error("[App.tsx] Firebase send message failed:", error);
                alert("Gagal mengirim pesan ke server."); // More specific user feedback
            });

    }, [currentRoom, currentUser, database]);


    // Listen for Messages
    useEffect(() => {
        if (!database || !currentRoom?.id) {
            // Clear messages for the current room if we disconnect or leave
            if (currentRoom?.id) {
                 setFirebaseMessages(prev => ({ ...prev, [currentRoom.id]: [] }));
            }
            return () => {}; // Cleanup if db/room not available
        }

        const messagesRef = ref(database, `messages/${currentRoom.id}`);
        const listener = onValue(messagesRef, (snapshot) => {
            const data = snapshot.val();
            const messagesArray: ForumMessageItem[] = [];
            if (data) {
                Object.keys(data).forEach(key => {
                    const msgData = data[key];
                    // More robust validation
                    if (msgData && typeof msgData === 'object' && msgData.timestamp && typeof msgData.timestamp === 'number') {
                        let type: 'news' | 'user' | 'system' | undefined = msgData.type;
                        if (!type) {
                             if (msgData.published_on && msgData.source) type = 'news';
                             else if (msgData.sender === 'system') type = 'system';
                             else if (msgData.sender) type = 'user';
                        }

                        if (type === 'news' || type === 'user' || type === 'system') {
                            const reactions = typeof msgData.reactions === 'object' && msgData.reactions !== null ? msgData.reactions : {};
                            messagesArray.push({ ...msgData, id: key, type, reactions });
                        } else { console.warn("Invalid message type:", key, msgData); }
                    } else { console.warn("Invalid message structure in DB:", key, msgData); }
                });
            }

             let finalMessages = messagesArray;
             // Apply default messages logic only if Firebase returns zero valid messages
             if (messagesArray.length === 0 && currentRoom?.id) {
                  if (defaultMessages[currentRoom.id]) {
                      finalMessages = [...defaultMessages[currentRoom.id]];
                  } else if (!DEFAULT_ROOM_IDS.includes(currentRoom.id) && currentUser?.username) {
                      const welcomeMsg: ChatMessage = { id: `${currentRoom.id}-welcome-${Date.now()}`, type: 'system', text: `Selamat datang di room "${currentRoom.name}".`, sender: 'system', timestamp: Date.now() };
                      const adminMsg: ChatMessage = { id: `${currentRoom.id}-admin-${Date.now()}`, type: 'user', text: 'Ingat DYOR!', sender: 'Admin_RTC', timestamp: Date.now() + 1, reactions: {'👍': []} };
                      finalMessages = [welcomeMsg, adminMsg];
                  }
             }

            // Sort and update state
            setFirebaseMessages(prev => ({
                ...prev,
                [currentRoom!.id]: finalMessages.sort((a, b) => {
                    // Get timestamp based on type
                    const timeA = isNewsArticle(a) ? (a.published_on * 1000) : (isChatMessage(a) ? a.timestamp : 0);
                    const timeB = isNewsArticle(b) ? (b.published_on * 1000) : (isChatMessage(b) ? b.timestamp : 0);
                     // Robust sorting: Handle cases where timestamp might be missing or 0
                     if (!timeA && !timeB) return 0; // If both are missing/0, keep order
                     if (!timeA) return 1;          // Put items without time last
                     if (!timeB) return -1;          // Put items without time last
                    return timeA - timeB;         // Sort by time ascending
                })
            }));
        }, (error) => {
            console.error(`Firebase listener error for ${currentRoom?.id}:`, error);
            // Optionally clear messages or show an error state in UI
            if (currentRoom?.id) {
                 setFirebaseMessages(prev => ({ ...prev, [currentRoom.id]: [] }));
            }
        });

        // Cleanup function
        return () => {
            if (database) {
                off(messagesRef, 'value', listener);
            }
        };
    }, [currentRoom, currentUser, database]); // Rerun when room, user, or db status changes


    // Fetch News Articles and Add to Firebase
    useEffect(() => {
         if (!database) { console.warn("DB null - news fetch effect skipped"); return; }
         const currentDb = database;
         const NEWS_ROOM_ID = 'berita-kripto';
         const NEWS_FETCH_INTERVAL = 20 * 60 * 1000;
         const LAST_FETCH_KEY = 'lastNewsFetchTimestamp';

         const fetchAndProcessNews = async () => {
             const currentTime = Date.now();
             const lastFetch = parseInt(localStorage.getItem(LAST_FETCH_KEY) || '0', 10);
             // if (currentTime - lastFetch < NEWS_FETCH_INTERVAL) return; // Uncomment for production interval check

             try {
                 const fetchedArticles = await fetchNewsArticles();
                 if (!fetchedArticles || fetchedArticles.length === 0) { console.log("No news articles fetched."); return; }
                 if (!currentDb) { console.warn("Database became null during news fetch."); return; }

                 const newsRoomRef = ref(currentDb, `messages/${NEWS_ROOM_ID}`);
                 const snapshot = await get(newsRoomRef);
                 const existingNewsData = snapshot.val() || {};
                 const existingNewsValues = typeof existingNewsData === 'object' && existingNewsData !== null ? Object.values<any>(existingNewsData) : [];
                 const existingNewsUrls = new Set(existingNewsValues.map(news => news.url).filter(url => typeof url === 'string'));

                 let newArticleAdded = false;
                 const updates: { [key: string]: Omit<NewsArticle, 'id'> } = {};

                 fetchedArticles.forEach(article => {
                     // Basic validation for essential news article fields
                     if (article.url && article.title && article.published_on && article.source && !existingNewsUrls.has(article.url)) {
                         const newsRef = push(newsRoomRef);
                         if (newsRef.key) {
                              const articleData: Omit<NewsArticle, 'id'> = {
                                  type: 'news',
                                  title: article.title,
                                  url: article.url,
                                  imageurl: article.imageurl || '', // Provide default empty string for imageurl
                                  published_on: article.published_on,
                                  source: article.source,
                                  body: article.body || '', // Provide default empty string for body
                                  reactions: {},
                              };
                             updates[newsRef.key] = articleData;
                             newArticleAdded = true;
                         }
                     }
                 });

                 if (newArticleAdded) {
                     console.log(`Adding ${Object.keys(updates).length} new news articles to Firebase.`);
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
                 } else {
                     console.log("No new news articles to add.");
                 }
             } catch (err: unknown) { // Catch as unknown
                 let errorMessage = 'Unknown error during news fetch/process';
                 if (err instanceof Error) {
                     errorMessage = err.message;
                 } else if (typeof err === 'string') {
                    errorMessage = err;
                 } else {
                      try { errorMessage = JSON.stringify(err); }
                      catch { errorMessage = 'An non-error object was thrown and could not be stringified.'; }
                 }
                 console.error("News fetch/process failed:", errorMessage);
             }
         };

         fetchAndProcessNews();
         const intervalId = setInterval(fetchAndProcessNews, NEWS_FETCH_INTERVAL);
         return () => clearInterval(intervalId);

    }, [currentRoom, database]); // Correct dependencies


    // Handle Reactions
    const handleReaction = useCallback((messageId: string, emoji: string) => {
        if (!database) { console.error("DB null - reaction"); return; }
        if (!currentRoom?.id || !currentUser?.username || !messageId) {
             console.warn("Cannot react: Missing room, user, or messageId", { currentRoom, currentUser, messageId });
             return;
        }

        const username = currentUser.username;
        const reactionUserListRef = ref(database, `messages/${currentRoom.id}/${messageId}/reactions/${emoji}`);

        get(reactionUserListRef).then((snapshot) => {
            const usersForEmoji: string[] = snapshot.val() || [];
            let updatedUsers: string[] | null = null; // Use null to remove the node if empty

            if (usersForEmoji.includes(username)) {
                updatedUsers = usersForEmoji.filter(u => u !== username);
                if (updatedUsers.length === 0) {
                    updatedUsers = null; // Set to null to delete the emoji node in Firebase
                }
            } else {
                updatedUsers = [...usersForEmoji, username];
            }

            set(reactionUserListRef, updatedUsers)
                .catch(error => console.error("Update reaction failed:", error));

        }).catch(error => console.error("Get reaction failed:", error));

    }, [currentRoom, currentUser, database]);


    // Handle Delete Message
    const handleDeleteMessage = useCallback((roomId: string, messageId: string) => {
        if (!database) { console.error("[App.tsx] Database not initialized for deleteMessage"); return; }
        if (!roomId || !messageId) { console.error("[App.tsx] Missing roomId or messageId for deleteMessage"); return; }

        const messageRef = ref(database, `messages/${roomId}/${messageId}`);
        set(messageRef, null) // Setting to null deletes the data
            .then(() => { /* Deleted successfully */ })
            .catch((error) => { console.error(`[App.tsx] Failed to delete message ${messageId}:`, error); alert("Gagal menghapus pesan."); });
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
            const displayMessages = (currentMessages.length === 0 && currentRoom && defaultMessages[currentRoom.id])
                ? defaultMessages[currentRoom.id]
                : currentMessages;
            const messagesToPass = Array.isArray(displayMessages) ? displayMessages : [];
            return <ForumPage room={currentRoom} messages={messagesToPass} userProfile={currentUser} onSendMessage={handleSendMessage} onLeaveRoom={handleLeaveRoom} onReact={handleReaction} onDeleteMessage={handleDeleteMessage} />;
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
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (!googleClientId) {
         return ( // Error component
             <div style={{ color: 'white', backgroundColor: '#0A0A0A', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
                 <div style={{ border: '1px solid #FF00FF', padding: '20px', borderRadius: '8px', textAlign: 'center', maxWidth: '500px' }}>
                     <h1 style={{ color: '#FF00FF', fontSize: '24px' }}>Kesalahan Konfigurasi</h1>
                     <p style={{ marginTop: '10px', lineHeight: '1.6' }}>
                         Variabel lingkungan <strong>GOOGLE_CLIENT_ID</strong> tidak ditemukan. Harap konfigurasikan.
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