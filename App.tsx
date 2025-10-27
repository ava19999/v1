// App.tsx
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { jwtDecode } from 'jwt-decode';
import Header from './components/Header';
import Footer from './components/Footer';
import type { ForumMessageItem, Room, CoinListItem, CryptoData, ChatMessage, Page, Currency, NewsArticle, User, GoogleProfile } from './types';
import HomePage from './components/HomePage';
import ForumPage from './components/ForumPage';
import AboutPage from './components/AboutPage';
import RoomsListPage from './components/RoomsListPage';
import LoginPage from './components/LoginPage';
import CreateIdPage from './components/CreateIdPage';
import { fetchIdrRate, fetchNewsArticles, fetchTop500Coins, fetchTrendingCoins, fetchCoinDetails } from './services/mockData';
import { ADMIN_USERNAMES } from './components/UserTag';

// Firebase imports
import { database } from './services/firebaseService';
import { ref, set, push, onValue, off, update, get } from "firebase/database"; // Tambahkan 'update' dan 'get'

// Pesan default (bisa digunakan jika room baru dan belum ada data di Firebase)
const defaultMessages: { [key: string]: ForumMessageItem[] } = {
     'pengumuman-aturan': [
        { id: 'rule1', type: 'system', text: 'Selamat datang di RT Crypto! Ini adalah tempat kita untuk diskusi dan analisis.', sender: 'system', timestamp: Date.now() - 2000 },
        { id: 'rule2', type: 'system', text: 'Aturan Penting: Dilarang keras membagikan ajakan membeli (sinyal). Selalu lakukan riset sendiri (DYOR). Semua risiko ditanggung oleh masing-masing.', sender: 'system', timestamp: Date.now() - 1000 },
        { id: 'mission1', type: 'system', text: 'Misi Kita Bareng: Jujur, kita capek liat banyak temen yang boncos gara-gara info sesat atau FOMO doang. Misi kita simpel: bikin tempat di mana semua orang bisa dapet info valid dan ngeracik strategi bareng...', sender: 'system', timestamp: Date.now() }
    ],
    // 'berita-kripto': [], // Biarkan kosong, akan diisi oleh fetchNewsArticles
};

const Particles = () => (
      <div className="particles">
        <div className="particle" style={{ width: '3px', height: '3px', left: '10%', animationDelay: '-1s' }}></div>
        <div className="particle" style={{ width: '2px', height: '2px', left: '25%', animationDelay: '-5s' }}></div>
        <div className="particle" style={{ width: '4px', height: '4px', left: '50%', animationDelay: '-3s' }}></div>
        {/* ... particle lainnya ... */}
        <div className="particle" style={{ width: '3px', height: '3px', left: '90%', animationDelay: '-15s' }}></div>
      </div>
);


const App = () => {
  const [activePage, setActivePage] = useState<Page>('home');
  const [currency, setCurrency] = useState<Currency>('usd');
  const [idrRate, setIdrRate] = useState<number | null>(null);
  const [isRateLoading, setIsRateLoading] = useState(true);

  // Authentication State
  const [users, setUsers] = useState<{ [email: string]: User }>({});
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [pendingGoogleUser, setPendingGoogleUser] = useState<GoogleProfile | null>(null);

  // Application State
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
        { id: 'umum', name: 'Kripto Naik/Turun Hari Ini', userCount: 134 + Math.floor(Math.random() * 20) , createdBy: 'Admin_RTC'},
        { id: 'meme', name: 'Meme Coin Mania', userCount: 88 + Math.floor(Math.random() * 20), createdBy: 'Admin_RTC' },
        { id: 'xrp-army', name: 'Xrp Army', userCount: 73 + Math.floor(Math.random() * 20), createdBy: 'Admin_RTC' },
        { id: 'roblox-tuker-kripto', name: 'Roblox Tuker Kripto', userCount: 42 + Math.floor(Math.random() * 20), createdBy: 'ava' },
    ]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [joinedRoomIds, setJoinedRoomIds] = useState<Set<string>>(
    () => new Set(['berita-kripto', 'pengumuman-aturan'])
  );
   const [unreadCounts, setUnreadCounts] = useState<{ [key: string]: { count: number; lastUpdate: number } }>({});
   // State untuk menyimpan pesan dari Firebase
   const [firebaseMessages, setFirebaseMessages] = useState<{ [roomId: string]: ForumMessageItem[] }>({});


  // --- Effects for Data Loading & Persistence (Auth, Settings) ---

    useEffect(() => { /* ... Load users & currentUser from localStorage ... */
        try {
            const storedUsers = localStorage.getItem('cryptoUsers');
            if (storedUsers) setUsers(JSON.parse(storedUsers));
            const storedCurrentUser = localStorage.getItem('currentUser');
            if (storedCurrentUser) setCurrentUser(JSON.parse(storedCurrentUser));
        } catch (e) { console.error("Gagal load user:", e); }
    }, []);
    useEffect(() => { /* ... Persist users to localStorage ... */
        try { localStorage.setItem('cryptoUsers', JSON.stringify(users)); }
        catch (e) { console.error("Gagal simpan users:", e); }
    }, [users]);
    useEffect(() => { /* ... Persist currentUser to localStorage ... */
        try {
            if (currentUser) localStorage.setItem('currentUser', JSON.stringify(currentUser));
            else localStorage.removeItem('currentUser');
        } catch (e) { console.error("Gagal simpan currentUser:", e); }
    }, [currentUser]);
    useEffect(() => { /* ... Load/Save unreadCounts from localStorage ... */
        const saved = localStorage.getItem('unreadCounts');
        if (saved) try { setUnreadCounts(JSON.parse(saved)); } catch (e) { console.error("Gagal load unread:", e); }
    }, []);
    useEffect(() => { /* ... Persist unreadCounts to localStorage ... */
         localStorage.setItem('unreadCounts', JSON.stringify(unreadCounts));
    }, [unreadCounts]);
    useEffect(() => { /* ... Reset/Load analysis counts daily ... */
        const lastReset = localStorage.getItem('lastAnalysisResetDate');
        const today = new Date().toISOString().split('T')[0];
        if (lastReset !== today) {
            setAnalysisCounts({});
            localStorage.setItem('analysisCounts', JSON.stringify({}));
            localStorage.setItem('lastAnalysisResetDate', today);
        } else {
            const saved = localStorage.getItem('analysisCounts');
            if (saved) try { setAnalysisCounts(JSON.parse(saved)); } catch (e) { console.error("Gagal load analysis counts:", e); setAnalysisCounts({});}
        }
    }, []);

  // --- Authentication Handlers ---
    const handleGoogleRegisterSuccess = useCallback(async (credentialResponse: any) => { /* ... logika Google login ... */
        try {
            const decoded: any = jwtDecode(credentialResponse.credential);
            const { email, name, picture } = decoded;
            const existingUser = users[email];
             if (existingUser) {
                 setCurrentUser(existingUser);
                 setPendingGoogleUser(null);
                 alert(`Selamat datang kembali, ${existingUser.username}!`);
            } else {
                 setPendingGoogleUser({ email, name, picture });
            }
        } catch (error) { console.error("Google Sign-In Error:", error); alert('Error login Google.'); }
    }, [users]);
    const handleLogin = useCallback(async (usernameOrEmail: string, password: string): Promise<string | void> => { /* ... logika login manual ... */
        let user = Object.values(users).find(u => u.username?.toLowerCase() === usernameOrEmail.toLowerCase());
        if (!user) user = users[usernameOrEmail.toLowerCase()];
        if (user && user.password === password) setCurrentUser(user);
        else return 'Username/Email atau kata sandi salah.';
    }, [users]);
    const handleProfileComplete = useCallback(async (username: string, password: string): Promise<string | void> => { /* ... logika complete profile Google ... */
        if (!pendingGoogleUser) return 'Data Google tidak ditemukan.';
        if (users[pendingGoogleUser.email]) { /* ... handle email already exists ... */
            setPendingGoogleUser(null); setCurrentUser(users[pendingGoogleUser.email]);
            alert(`Email ${pendingGoogleUser.email} sudah ada. Anda otomatis login.`); return;
        }
        const usernameExists = Object.values(users).some(u => u.username?.toLowerCase() === username.toLowerCase());
        if (usernameExists) return 'Username sudah digunakan.';
        const newUser: User = { email: pendingGoogleUser.email, username, password, googleProfilePicture: pendingGoogleUser.picture, createdAt: Date.now() };
        setUsers(prev => ({ ...prev, [newUser.email.toLowerCase()]: newUser }));
        setCurrentUser(newUser); setPendingGoogleUser(null);
    }, [users, pendingGoogleUser]);
    const handleLogout = useCallback(() => { /* ... logika logout ... */
        setCurrentUser(null); setPendingGoogleUser(null);
        localStorage.removeItem('currentUser'); setActivePage('home');
    }, []);

  // --- Fetching External Data ---
    useEffect(() => { /* ... Fetch IDR Rate ... */
        const getRate = async () => {
            try { setIsRateLoading(true); const rate = await fetchIdrRate(); setIdrRate(rate); }
            catch (error) { console.error("Gagal fetch IDR rate:", error); setIdrRate(16000); }
            finally { setIsRateLoading(false); }
        }; getRate();
    }, []);
    useEffect(() => { /* ... Fetch Top 500 Coins ... */
        const fetchList = async () => {
             setIsCoinListLoading(true); setCoinListError(null);
            try { const coins = await fetchTop500Coins(); setFullCoinList(coins); }
            catch (err) { setCoinListError("Gagal fetch daftar koin."); }
            finally { setIsCoinListLoading(false); }
        }; fetchList();
    }, []);
    const fetchTrendingData = useCallback(async (showSkeleton = true) => { /* ... Fetch Trending Coins ... */
        if (showSkeleton) { setIsTrendingLoading(true); setTrendingError(null); }
        try { const trending = await fetchTrendingCoins(); setTrendingCoins(trending); }
        catch (err: any) { const msg = err.message || "Gagal load tren."; if (showSkeleton) setTrendingError(msg); else console.error("Gagal refresh tren:", msg); }
        finally { if (showSkeleton) setIsTrendingLoading(false); }
    }, []);
     useEffect(() => { /* ... Fetch initial trending & set interval (optional) ... */
        fetchTrendingData();
        // const intervalId = setInterval(() => fetchTrendingData(false), 5 * 60 * 1000); // Refresh every 5 mins
        // return () => clearInterval(intervalId);
    }, [fetchTrendingData]);
     const handleSelectCoin = useCallback(async (coinId: string) => { /* ... Fetch Coin Details ... */
         setIsTrendingLoading(true); setTrendingError(null); setSearchedCoin(null);
         try { const coin = await fetchCoinDetails(coinId); setSearchedCoin(coin); }
         catch (err: any) { setTrendingError(err.message || "Gagal load detail koin."); }
         finally { setIsTrendingLoading(false); }
     }, []);
     const handleResetToTrending = useCallback(() => { /* ... Reset view to trending ... */
         setSearchedCoin(null); fetchTrendingData(true);
     }, [fetchTrendingData]);

    // --- Firebase Realtime Chat Logic ---

    // Mengirim pesan ke Firebase
    const handleSendMessage = useCallback((message: ChatMessage) => {
        if (!currentRoom?.id || !currentUser?.username) {
            console.error("Tidak bisa mengirim pesan: room atau user tidak valid.");
            return;
        }

        // Dapatkan referensi unik baru untuk pesan
        const messageListRef = ref(database, `messages/${currentRoom.id}`);
        const newMessageRef = push(messageListRef); // push() menghasilkan ID unik

        // Tambahkan ID yang dihasilkan Firebase ke objek pesan sebelum disimpan
        const messageWithId = { ...message, id: newMessageRef.key };

        // Simpan pesan ke Firebase
        set(newMessageRef, messageWithId)
            .then(() => {
                console.log("Pesan terkirim ke Firebase dengan ID:", newMessageRef.key);
            })
            .catch((error) => {
                console.error("Gagal mengirim pesan ke Firebase:", error);
                alert("Gagal mengirim pesan. Silakan coba lagi.");
            });
    }, [currentRoom, currentUser]);


    // Mendengarkan pesan dari Firebase
    useEffect(() => {
        if (!currentRoom?.id) {
            // Jika tidak ada room aktif, hapus listener jika ada
            // Ini penting jika ada listener aktif dari room sebelumnya
            // (Meskipun logika `off` di cleanup harusnya menangani ini)
            return;
        }

        const messagesRef = ref(database, `messages/${currentRoom.id}`);
        console.log(`Mendengarkan pesan dari: messages/${currentRoom.id}`); // Debugging

        // Hapus listener sebelumnya jika ada (untuk mencegah duplikasi saat ganti room)
        // Ini adalah fallback, cleanup function lebih utama
        off(messagesRef);

        const listener = onValue(messagesRef, (snapshot) => {
            const data = snapshot.val();
            // Firebase mengembalikan null jika path kosong, atau objek jika ada data
            const messagesArray: ForumMessageItem[] = [];
            if (data) {
                // Konversi objek pesan dari Firebase menjadi array
                Object.keys(data).forEach(key => {
                    // Pastikan ID dari Firebase (key) dimasukkan ke objek pesan
                    messagesArray.push({ ...data[key], id: key });
                });
            }

            console.log(`Data diterima untuk room ${currentRoom.id}:`, messagesArray.length, "pesan"); // Debugging

             // Gabungkan dengan pesan default HANYA jika array dari Firebase KOSONG
             let finalMessages = messagesArray;
             if (messagesArray.length === 0) {
                 if (defaultMessages[currentRoom.id]) {
                     finalMessages = [...defaultMessages[currentRoom.id]];
                     console.log(`Menggunakan default messages untuk room ${currentRoom.id}`); // Debugging
                 } else if (!['berita-kripto', 'pengumuman-aturan'].includes(currentRoom.id) && currentUser?.username) {
                     // Logika pesan selamat datang untuk room buatan user yang kosong
                     const welcomeMsg: ChatMessage = { id: `${currentRoom.id}-welcome-${Date.now()}`, type: 'system', text: `Selamat datang di room "${currentRoom.name}".`, sender: 'system', timestamp: Date.now() };
                     const adminMsg: ChatMessage = { id: `${currentRoom.id}-admin-${Date.now()}`, type: 'user', text: 'Ingat DYOR!', sender: 'Admin_RTC', timestamp: Date.now() + 1, reactions: {'👍': []} };
                     finalMessages = [welcomeMsg, adminMsg];
                     console.log(`Membuat pesan welcome/admin untuk room kosong ${currentRoom.id}`); // Debugging
                     // Opsional: Tulis pesan default ini ke Firebase agar persisten
                     // const welcomeRef = ref(database, `messages/${currentRoom.id}/${welcomeMsg.id}`);
                     // const adminRef = ref(database, `messages/${currentRoom.id}/${adminMsg.id}`);
                     // set(welcomeRef, welcomeMsg);
                     // set(adminRef, adminMsg);
                 }
             }


            setFirebaseMessages(prev => ({
                ...prev,
                [currentRoom.id]: finalMessages.sort((a, b) => (isNewsArticle(a) ? a.published_on * 1000 : a.timestamp) - (isNewsArticle(b) ? b.published_on * 1000 : b.timestamp)) // Sortir pesan
            }));

        }, (error) => {
            console.error(`Error mendengarkan Firebase untuk room ${currentRoom.id}:`, error);
        });

        // Cleanup function: Hentikan listener
        return () => {
            console.log(`Menghentikan listener untuk room ${currentRoom.id}`); // Debugging
            off(messagesRef, 'value', listener);
        };

    }, [currentRoom, currentUser]); // Re-run saat currentRoom atau currentUser berubah


    // Fetch News Articles periodically and add to Firebase if new
    useEffect(() => {
        const NEWS_ROOM_ID = 'berita-kripto';
        const NEWS_FETCH_INTERVAL = 20 * 60 * 1000; // 20 minutes
        const LAST_FETCH_KEY = 'lastNewsFetchTimestamp';

        const fetchAndProcessNews = async () => {
            const now = Date.now();
            const lastFetchTimestamp = parseInt(localStorage.getItem(LAST_FETCH_KEY) || '0', 10);

            // Batasi fetch jika belum waktunya
            // if (now - lastFetchTimestamp < NEWS_FETCH_INTERVAL) return;

            try {
                const fetchedArticles = await fetchNewsArticles();
                if (!fetchedArticles || fetchedArticles.length === 0) return;

                const newsRoomRef = ref(database, `messages/${NEWS_ROOM_ID}`);
                const snapshot = await get(newsRoomRef); // Ambil data berita yang sudah ada sekali
                const existingNewsData = snapshot.val() || {};
                const existingNewsUrls = new Set(Object.values<NewsArticle>(existingNewsData).map(news => news.url));

                let newArticleAdded = false;
                const updates: { [key: string]: NewsArticle } = {};

                fetchedArticles.forEach(article => {
                    if (!existingNewsUrls.has(article.url)) {
                        // Gunakan URL atau ID unik lain sebagai key di Firebase
                        // Kita bisa hash URL jika terlalu panjang atau mengandung karakter invalid
                        const uniqueKey = `news-${article.id || article.published_on}-${Math.random().toString(36).substring(2, 8)}`; // Buat key unik
                        updates[uniqueKey] = { ...article, id: uniqueKey, reactions: {} }; // Pastikan ID sesuai key
                        newArticleAdded = true;
                    }
                });

                if (newArticleAdded) {
                    console.log(`Menambahkan ${Object.keys(updates).length} berita baru ke Firebase.`); // Debugging
                    await update(newsRoomRef, updates); // Update Firebase dengan berita baru
                    localStorage.setItem(LAST_FETCH_KEY, now.toString());

                    // Update unread count jika user tidak sedang di room berita
                    if (currentRoom?.id !== NEWS_ROOM_ID) {
                        setUnreadCounts(prev => ({
                            ...prev,
                            [NEWS_ROOM_ID]: {
                                count: (prev[NEWS_ROOM_ID]?.count || 0) + Object.keys(updates).length, // Tambah jumlah berita baru
                                lastUpdate: now
                            }
                        }));
                    }
                } else {
                     console.log("Tidak ada berita baru untuk ditambahkan."); // Debugging
                }

            } catch (err: any) {
                 console.error("Gagal fetch/proses berita:", err.message || err);
            }
        };

        fetchAndProcessNews(); // Panggil sekali saat mount/room berubah
        const intervalId = setInterval(fetchAndProcessNews, NEWS_FETCH_INTERVAL); // Atur interval

        return () => clearInterval(intervalId); // Cleanup interval

    }, [currentRoom]); // Jalankan ulang jika currentRoom berubah (untuk logika unread count)


    // Menangani reaksi
    const handleReaction = useCallback((messageId: string, emoji: string) => {
        if (!currentRoom?.id || !currentUser?.username || !messageId) {
            console.error("Tidak bisa bereaksi: data tidak valid", { currentRoom, currentUser, messageId });
            return;
        }

        const username = currentUser.username;
        // Referensi langsung ke node 'reactions' di dalam pesan spesifik
        const reactionRef = ref(database, `messages/${currentRoom.id}/${messageId}/reactions/${emoji}`);

        get(reactionRef).then((snapshot) => {
            const usersForEmoji: string[] = snapshot.val() || [];
            let updatedUsers: string[] | null; // Gunakan null untuk menghapus node jika array kosong

            if (usersForEmoji.includes(username)) {
                // Hapus reaksi pengguna
                updatedUsers = usersForEmoji.filter(u => u !== username);
                if (updatedUsers.length === 0) {
                    updatedUsers = null; // Set ke null agar Firebase menghapus node emoji ini
                }
            } else {
                // Tambah reaksi pengguna
                updatedUsers = [...usersForEmoji, username];
            }

            // Update Firebase
            set(reactionRef, updatedUsers) // set dengan array baru atau null
                .then(() => console.log(`Reaksi ${emoji} diupdate untuk pesan ${messageId}`))
                .catch(error => console.error("Gagal update reaksi:", error));

        }).catch(error => console.error("Error mengambil data reaksi:", error));

    }, [currentRoom, currentUser]);


  // --- Event Handlers Lainnya ---
   const handleIncrementAnalysisCount = useCallback((coinId: string) => { /* ... logika increment analysis count ... */
        setAnalysisCounts(prev => {
            const current = prev[coinId] || baseAnalysisCount;
            const newCounts = { ...prev, [coinId]: current + 1 };
            localStorage.setItem('analysisCounts', JSON.stringify(newCounts)); return newCounts;
        });
    }, []);
    const handleNavigate = useCallback((page: Page) => { /* ... logika navigasi ... */
         if (page === 'home' && activePage === 'home') handleResetToTrending();
         else if (page === 'forum') setActivePage('rooms');
         else setActivePage(page);
    }, [activePage, handleResetToTrending]);
    const handleJoinRoom = useCallback((room: Room) => { /* ... logika join room ... */
        setCurrentRoom(room);
        setUnreadCounts(prev => { /* ... reset unread count ... */
            if (prev[room.id]?.count > 0) return { ...prev, [room.id]: { ...prev[room.id], count: 0 }}; return prev;
        });
        setJoinedRoomIds(prev => new Set(prev).add(room.id));
        // Pesan default/welcome akan ditangani oleh useEffect listener Firebase
        setActivePage('forum');
    }, [/* messages (dihapus), */ currentUser]); // Hapus 'messages' dari dependensi
    const handleLeaveRoom = useCallback(() => { /* ... logika leave room (kembali ke list) ... */
        setCurrentRoom(null); setActivePage('rooms');
    }, []);
    const handleLeaveJoinedRoom = useCallback((roomId: string) => { /* ... logika leave joined room (dari list) ... */
        if (['berita-kripto', 'pengumuman-aturan'].includes(roomId)) return;
        setJoinedRoomIds(prev => { const n = new Set(prev); n.delete(roomId); return n; });
        if (currentRoom?.id === roomId) { setCurrentRoom(null); setActivePage('rooms'); }
        setUnreadCounts(prev => { const n = {...prev}; delete n[roomId]; return n; });
    }, [currentRoom]);
    const handleCreateRoom = useCallback((roomName: string) => { /* ... logika create room ... */
        const trimmed = roomName.trim();
        if (rooms.some(r => r.name.toLowerCase() === trimmed.toLowerCase())) { alert('Room sudah ada.'); return; }
        if (!currentUser?.username) { alert('Harus login.'); return; }
        const newRoom: Room = { id: trimmed.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(), name: trimmed, userCount: 1, createdBy: currentUser.username };
        setRooms(prev => [newRoom, ...prev]);
        handleJoinRoom(newRoom); // Otomatis join setelah dibuat
    }, [handleJoinRoom, rooms, currentUser]);
     const handleDeleteRoom = useCallback((roomId: string) => { /* ... logika delete room (pastikan menghapus data di Firebase juga jika perlu) ... */
        // !! PENTING: Tambahkan logika untuk menghapus data pesan dari Firebase !!
        const roomToDelete = rooms.find(r => r.id === roomId);
        if (!roomToDelete || !currentUser?.username) return;
        const isAdmin = ADMIN_USERNAMES.map(n=>n.toLowerCase()).includes(currentUser.username.toLowerCase());
        const isCreator = roomToDelete.createdBy === currentUser.username;
        if (['berita-kripto', 'pengumuman-aturan'].includes(roomId)) { alert('Room default tidak dapat dihapus.'); return; }
        if (isAdmin || isCreator) {
            if (window.confirm(`Yakin hapus room "${roomToDelete.name}"?`)) {
                // Hapus dari state React
                setRooms(prev => prev.filter(r => r.id !== roomId));
                if (currentRoom?.id === roomId) { setCurrentRoom(null); setActivePage('rooms'); }
                setJoinedRoomIds(prev => { const n = new Set(prev); n.delete(roomId); return n; });
                setFirebaseMessages(prev => { const n = {...prev}; delete n[roomId]; return n; }); // Hapus dari state pesan lokal juga
                setUnreadCounts(prev => { const n = {...prev}; delete n[roomId]; return n; });

                // Hapus dari Firebase Realtime Database
                const messagesRef = ref(database, `messages/${roomId}`);
                set(messagesRef, null) // Menghapus data di path tersebut
                    .then(() => console.log(`Pesan untuk room ${roomId} dihapus dari Firebase.`))
                    .catch(error => console.error(`Gagal menghapus pesan room ${roomId} dari Firebase:`, error));
            }
        } else { alert('Tidak punya izin menghapus.'); }
    }, [currentUser, rooms, currentRoom]);


  // --- Memoized Values ---
  const totalUsers = useMemo(() => rooms.reduce((sum, room) => sum + room.userCount, 0), [rooms]);
  const heroCoin = searchedCoin || (trendingCoins.length > 0 ? trendingCoins[0] : null);
  const otherTrendingCoins = searchedCoin ? [] : trendingCoins.slice(1);
  const hotCoin = trendingCoins.length > 1 ? { name: trendingCoins[1].name, logo: trendingCoins[1].image, price: trendingCoins[1].price, change: trendingCoins[1].change } : null;

  // --- Render Logic ---
  const renderActivePage = () => {
     switch (activePage) {
      case 'home': return <HomePage {...{idrRate, isRateLoading, currency, onIncrementAnalysisCount, fullCoinList, isCoinListLoading, coinListError, heroCoin, otherTrendingCoins, isTrendingLoading, trendingError, onSelectCoin, onReloadTrending}} />;
      case 'rooms': return <RoomsListPage {...{rooms, onJoinRoom, onCreateRoom, totalUsers, hotCoin, userProfile: currentUser, currentRoomId: currentRoom?.id || null, joinedRoomIds, onLeaveJoinedRoom, unreadCounts, onDeleteRoom}} />; // Tambahkan onDeleteRoom
      case 'forum':
        // Ambil pesan dari state firebaseMessages berdasarkan currentRoom.id
        const currentMessages = currentRoom ? firebaseMessages[currentRoom.id] || [] : [];
        // Jika messages kosong DAN room adalah default, gunakan defaultMessages
        const displayMessages = (currentMessages.length === 0 && currentRoom && defaultMessages[currentRoom.id])
            ? defaultMessages[currentRoom.id]
            : currentMessages;

        return <ForumPage {...{room: currentRoom, messages: displayMessages, userProfile: currentUser, onSendMessage, onLeaveRoom, onReact}} />;
      case 'about': return <AboutPage />;
      default: return <HomePage {...{idrRate, isRateLoading, currency, onIncrementAnalysisCount, fullCoinList, isCoinListLoading, coinListError, heroCoin, otherTrendingCoins, isTrendingLoading, trendingError, onSelectCoin, onReloadTrending}} />;
    }
  };

  // --- Authentication Flow Rendering ---
  if (!currentUser && !pendingGoogleUser) return <LoginPage {...{onGoogleRegisterSuccess, onLogin}} />;
  if (pendingGoogleUser) return <CreateIdPage {...{onProfileComplete, googleProfile: pendingGoogleUser}} />;

  // --- Main App Render (Logged In) ---
   return (
    <div className="min-h-screen bg-transparent text-white font-sans flex flex-col">
      <Particles />
      <Header {...{userProfile: currentUser, onLogout, activePage, onNavigate, currency, onCurrencyChange: setCurrency, hotCoin, idrRate}} />
      <main className="flex-grow">
        {/* Pastikan currentUser ada sebelum render halaman utama */}
        {currentUser && renderActivePage()}
      </main>
      <Footer />
    </div>
  );
};

export default App;