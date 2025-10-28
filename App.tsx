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
  // Hapus signInWithEmailAndPassword jika tidak digunakan lagi
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
import type { ForumMessageItem, Room, CoinListItem, CryptoData, ChatMessage, Page, Currency, NewsArticle, User, GoogleProfile, ExtendedRoomsListPageProps } from './types'; // Pastikan ExtendedRoomsListPageProps diimpor
import { isNewsArticle, isChatMessage } from './types';
import { fetchIdrRate, fetchNewsArticles, fetchTop500Coins, fetchTrendingCoins, fetchCoinDetails } from './services/mockData';
import { ADMIN_USERNAMES } from './components/UserTag'; // Pastikan ADMIN_USERNAMES diimpor jika digunakan di sini
import { database } from './services/firebaseService'; // database bisa jadi null
import { ref, set, push, onValue, off, update, get, Database, child } from "firebase/database"; // <-- Tambahkan 'child'

const DEFAULT_ROOM_IDS = ['berita-kripto', 'pengumuman-aturan'];

const defaultMessages: { [key: string]: ForumMessageItem[] } = {
    'pengumuman-aturan': [
        { id: 'rule1', type: 'system', text: 'Selamat datang di RT Crypto! Diskusi & analisis.', sender: 'system', timestamp: Date.now() - 2000 },
        { id: 'rule2', type: 'system', text: 'Aturan: Dilarang share sinyal. DYOR. Risiko ditanggung sendiri.', sender: 'system', timestamp: Date.now() - 1000 },
        { id: 'mission1', type: 'system', text: 'Misi: Jadi trader cerdas bareng, bukan ikut-ikutan. Ayo menang bareng!', sender: 'system', timestamp: Date.now() }
    ],
};

// Komponen Partikel (Tetap sama)
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
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setFirebaseUser(user);
            if (user) {
                const appUser = Object.values(users).find(u => u.email === user.email);
                if (appUser) {
                    if (!currentUser || currentUser.email !== appUser.email) {
                        setCurrentUser(appUser);
                        setPendingGoogleUser(null);
                    }
                } else if (!pendingGoogleUser) {
                    console.warn("Auth listener: Firebase user exists but no matching app user found and not pending. Forcing app logout.");
                    setCurrentUser(null);
                }
            } else {
                 if (currentUser !== null) {
                    setCurrentUser(null);
                 }
                 setPendingGoogleUser(null);
            }
            setIsAuthLoading(false);
        });
        return () => {
             unsubscribe();
        };
    }, [users, currentUser, pendingGoogleUser]);

    // Persist users & currentUser to Local Storage
    useEffect(() => { try { localStorage.setItem('cryptoUsers', JSON.stringify(users)); } catch (e) { console.error("Gagal simpan users", e); } }, [users]);
    useEffect(() => { try { if (currentUser) localStorage.setItem('currentUser', JSON.stringify(currentUser)); else localStorage.removeItem('currentUser'); } catch (e) { console.error("Gagal simpan currentUser", e); } }, [currentUser]);

    // Other Effects (unread counts, analysis counts, IDR rate, coin list, trending data)
    useEffect(() => { const saved = localStorage.getItem('unreadCounts'); if (saved) try { setUnreadCounts(JSON.parse(saved)); } catch (e) { console.error("Gagal parse unreadCounts", e); } }, []);
    useEffect(() => { localStorage.setItem('unreadCounts', JSON.stringify(unreadCounts)); }, [unreadCounts]);
    useEffect(() => { const lastReset = localStorage.getItem('lastAnalysisResetDate'); const today = new Date().toISOString().split('T')[0]; if (lastReset !== today) { localStorage.setItem('analysisCounts', '{}'); localStorage.setItem('lastAnalysisResetDate', today); setAnalysisCounts({}); } else { const saved = localStorage.getItem('analysisCounts'); if (saved) try { setAnalysisCounts(JSON.parse(saved)); } catch (e) { console.error("Gagal parse analysis counts", e); } } }, []);
    useEffect(() => { const getRate = async () => { setIsRateLoading(true); try { setIdrRate(await fetchIdrRate()); } catch (error) { console.error("Gagal ambil kurs IDR:", error); setIdrRate(16000); } finally { setIsRateLoading(false); } }; getRate(); }, []);
    useEffect(() => { const fetchList = async () => { setIsCoinListLoading(true); setCoinListError(null); try { setFullCoinList(await fetchTop500Coins()); } catch (err) { setCoinListError("Gagal ambil daftar koin."); } finally { setIsCoinListLoading(false); } }; fetchList(); }, []);
    useEffect(() => { fetchTrendingData(); }, [fetchTrendingData]);

    // Firebase Messages Listener Effect (DIMODIFIKASI dari respons sebelumnya)
     useEffect(() => {
         if (!database) { console.warn("Messages listener skipped: DB not initialized."); if (currentRoom?.id) setFirebaseMessages(prev => ({ ...prev, [currentRoom.id]: [] })); return () => {}; }
         if (!currentRoom?.id) { return () => {}; }

         const messagesRef = ref(database, `messages/${currentRoom.id}`);
         // Listener utama untuk seluruh data pesan di room
         const listener = onValue(messagesRef, (snapshot) => {
             const data = snapshot.val();
             const messagesArray: ForumMessageItem[] = [];
             if (data) {
                 Object.keys(data).forEach(key => {
                    const msgData = data[key];
                    // Validasi struktur dasar pesan
                    if (msgData && typeof msgData === 'object' && msgData.timestamp && typeof msgData.timestamp === 'number') {
                         let type: 'news' | 'user' | 'system' | undefined = msgData.type;
                         // Coba infer type jika tidak ada
                         if (!type) {
                             if ('published_on' in msgData && 'source' in msgData) type = 'news';
                             else if (msgData.sender === 'system') type = 'system';
                             else if ('sender' in msgData) type = 'user';
                         }
                         // Proses jika tipe valid
                         if (type === 'news' || type === 'user' || type === 'system') {
                             // Pastikan reactions adalah objek atau default ke objek kosong
                             const reactions = typeof msgData.reactions === 'object' && msgData.reactions !== null ? msgData.reactions : {};
                             // Ambil uid hanya jika tipe user
                             const uid = type === 'user' ? msgData.uid : undefined;
                             messagesArray.push({ ...msgData, id: key, type, reactions, uid });
                         } else { console.warn("Invalid or missing message type:", key, msgData); }
                     } else { console.warn("Invalid message structure or timestamp:", key, msgData); }
                 });
             }
             let finalMessages = messagesArray;
             // Logika untuk pesan default jika room kosong (tetap sama)
             if (messagesArray.length === 0 && currentRoom?.id) {
                 if (defaultMessages[currentRoom.id]) {
                     finalMessages = [...defaultMessages[currentRoom.id]];
                 } else if (!DEFAULT_ROOM_IDS.includes(currentRoom.id) && currentUser?.username) {
                     const welcomeMsg: ChatMessage = { id: `${currentRoom.id}-welcome-${Date.now()}`, type: 'system', text: `Selamat datang di room "${currentRoom.name}".`, sender: 'system', timestamp: Date.now() };
                     const adminMsg: ChatMessage = { id: `${currentRoom.id}-admin-${Date.now()}`, type: 'user', uid: 'ADMIN_UID_PLACEHOLDER', text: 'Ingat DYOR!', sender: 'Admin_RTC', timestamp: Date.now() + 1, reactions: {'👍': []} };
                     finalMessages = [welcomeMsg, adminMsg];
                 }
             }

             // PERBARUI STATE DENGAN PESAN YANG SUDAH DISORTIR
             setFirebaseMessages(prev => ({
                 ...prev,
                 [currentRoom!.id]: finalMessages.sort((a, b) => {
                      const timeA = isNewsArticle(a) ? (a.published_on * 1000) : (isChatMessage(a) ? a.timestamp : 0);
                      const timeB = isNewsArticle(b) ? (b.published_on * 1000) : (isChatMessage(b) ? b.timestamp : 0);
                      // Handle potential null/undefined timestamps defensively
                      if (!timeA && !timeB) return 0;
                      if (!timeA) return 1; // Put messages without timestamp at the end
                      if (!timeB) return -1; // Put messages without timestamp at the end
                      return timeA - timeB;
                  })
             }));
         }, (error) => {
             console.error(`Firebase listener error room ${currentRoom?.id}:`, error);
             // Set ke array kosong jika ada error listener
             if (currentRoom?.id) setFirebaseMessages(prev => ({ ...prev, [currentRoom.id]: [] }));
         });

         // Cleanup listener saat komponen unmount atau currentRoom berubah
         return () => { if (database) { off(messagesRef, 'value', listener); } };
     }, [currentRoom, currentUser, database]); // <-- Dependency array penting

     // News Fetch Effect (Tetap sama)
     useEffect(() => {
       if (!database) { console.warn("News fetch skipped: DB not initialized."); return; }
       const currentDb = database;
       const NEWS_ROOM_ID = 'berita-kripto'; const NEWS_FETCH_INTERVAL = 20 * 60 * 1000; const LAST_FETCH_KEY = 'lastNewsFetchTimestamp';
       let isMounted = true;
       const fetchAndProcessNews = async () => {
           const currentTime = Date.now();
           const lastFetch = parseInt(localStorage.getItem(LAST_FETCH_KEY) || '0', 10);
           // if (currentTime - lastFetch < NEWS_FETCH_INTERVAL) return; // Uncomment to re-enable interval check

           try {
               const fetchedArticles = await fetchNewsArticles();
               if (!isMounted || !fetchedArticles || fetchedArticles.length === 0) return;
               if (!currentDb) { console.warn("DB became null during news fetch"); return; }

               const newsRoomRef = ref(currentDb, `messages/${NEWS_ROOM_ID}`);
               const snapshot = await get(newsRoomRef);
               const existingNewsData = snapshot.val() || {};
               // Pastikan existingNewsValues selalu array
               const existingNewsValues = (typeof existingNewsData === 'object' && existingNewsData !== null) ? Object.values<any>(existingNewsData) : [];
               const existingNewsUrls = new Set(existingNewsValues.map(news => news?.url).filter(url => typeof url === 'string'));

               let newArticleAdded = false;
               const updates: { [key: string]: Omit<NewsArticle, 'id'> } = {};

               fetchedArticles.forEach(article => {
                   if (article.url && article.title && article.published_on && article.source && !existingNewsUrls.has(article.url)) {
                       const newsRef = push(newsRoomRef);
                       if (newsRef.key) {
                           // Definisikan tipe data eksplisit
                           const articleData: Omit<NewsArticle, 'id'> & { type: 'news' } = { // Tambahkan type: 'news'
                               type: 'news', // Pastikan type ada
                               title: article.title,
                               url: article.url,
                               imageurl: article.imageurl || '',
                               published_on: article.published_on,
                               source: article.source,
                               body: article.body || '',
                               reactions: {}, // Selalu tambahkan objek reactions kosong
                           };
                           updates[newsRef.key] = articleData;
                           newArticleAdded = true;
                       }
                   }
               });

               if (newArticleAdded && isMounted) {
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
               } else if (isMounted) { console.log("No new unique articles found or component unmounted."); }
           } catch (err: unknown) {
               let errorMessage = 'Unknown error during news fetch';
               if (err instanceof Error) { errorMessage = err.message; }
               else if (typeof err === 'string') { errorMessage = err; }
               if (isMounted) { console.error("News fetch failed:", errorMessage); }
           }
       };
       fetchAndProcessNews(); // Fetch immediately on mount/change
       const intervalId = setInterval(fetchAndProcessNews, NEWS_FETCH_INTERVAL);
       return () => { isMounted = false; clearInterval(intervalId); };
     }, [currentRoom, database]); // Dependencies

    // --- Auth Handlers ---
    const handleGoogleRegisterSuccess = useCallback(async (credentialResponse: CredentialResponse) => {
        setAuthError(null);
        if (!credentialResponse.credential) { setAuthError("Credential Google tidak ditemukan."); return; }
        try {
            const decoded: { email: string; name: string; picture: string; } = jwtDecode(credentialResponse.credential);
            const { email, name, picture } = decoded;
            const auth = getAuth();
            const googleCredential = GoogleAuthProvider.credential(credentialResponse.credential);
            signInWithCredential(auth, googleCredential)
              .then((userCredential) => {
                 const fbUser = userCredential.user;
                 const existingAppUser = Object.values(users).find(u => u.email === email);
                 if (existingAppUser) {
                      setCurrentUser(existingAppUser);
                      setPendingGoogleUser(null);
                 } else {
                      // Simpan data Google untuk langkah berikutnya
                      setPendingGoogleUser({ email, name, picture });
                      // Hapus currentUser lokal jika ada, karena proses registrasi belum selesai
                      if (currentUser) setCurrentUser(null);
                 }
              })
              .catch((error) => {
                 console.error("Firebase signInWithCredential error:", error);
                 let errMsg = "Gagal menghubungkan login Google ke Firebase.";
                 if (error.code === 'auth/account-exists-with-different-credential') { errMsg = "Akun dengan email ini sudah ada, gunakan metode login lain."; }
                 else if (error.message) { errMsg += ` (${error.message})`; }
                 setAuthError(errMsg);
                 if (currentUser) setCurrentUser(null); // Logout jika gagal
              });
        } catch (error) {
            console.error("Google login decode/Firebase error:", error);
            setAuthError("Error memproses login Google.");
            if (currentUser) setCurrentUser(null); // Logout jika gagal
        }
    }, [users, currentUser]); // Tambahkan currentUser sebagai dependency

    // handleLogin dihapus karena tidak digunakan

    const handleProfileComplete = useCallback(async (username: string, password: string): Promise<string | void> => {
        setAuthError(null);
        if (!pendingGoogleUser) { setAuthError('Data Google tidak ditemukan untuk melengkapi profil.'); return 'Data Google tidak ditemukan.';}
        if (!firebaseUser) { setAuthError('Sesi login Firebase tidak aktif untuk melengkapi profil.'); return 'Sesi login Firebase tidak aktif.';}
        // Cek username unik (case-insensitive)
        if (Object.values(users).some(u => u.username.toLowerCase() === username.toLowerCase())) {
            const errorMsg = 'Username sudah digunakan. Pilih username lain.';
            setAuthError(errorMsg);
            return errorMsg;
        }

        // TODO: Idealnya, tautkan akun email/password di Firebase Auth di sini
        // Ini memerlukan penanganan error yang lebih kompleks jika email sudah terdaftar
        // Untuk sekarang, kita hanya simpan di state lokal

        const newUser: User = {
            email: pendingGoogleUser.email,
            username: username,
            password: password, // Simpan password (pertimbangkan keamanan jika ini aplikasi production)
            googleProfilePicture: pendingGoogleUser.picture,
            createdAt: Date.now()
        };

        // Simpan user baru ke state lokal dan localStorage
        setUsers(prev => ({ ...prev, [newUser.email]: newUser }));
        // Set user ini sebagai currentUser
        setCurrentUser(newUser);
        // Hapus pendingGoogleUser
        setPendingGoogleUser(null);
        // Navigasi ke halaman home setelah berhasil
        setActivePage('home');

    }, [users, pendingGoogleUser, firebaseUser]); // Dependencies

    const handleLogout = useCallback(() => {
        const auth = getAuth();
        signOut(auth)
          .then(() => {
            // Pengguna logout dari Firebase, state lokal akan di-handle oleh onAuthStateChanged
            setActivePage('home'); // Arahkan ke home setelah logout
            setCurrentRoom(null); // Reset current room
            setJoinedRoomIds(new Set(DEFAULT_ROOM_IDS)); // Reset joined rooms
          })
          .catch((error) => {
             console.error("Firebase signOut error:", error);
             // Tetap paksa logout lokal meskipun Firebase gagal (jarang terjadi)
             setCurrentUser(null);
             setFirebaseUser(null); // Pastikan state Firebase juga null
             setActivePage('home');
             setCurrentRoom(null);
             setJoinedRoomIds(new Set(DEFAULT_ROOM_IDS));
          });
    }, []);

    // --- App Logic Handlers ---
    const handleIncrementAnalysisCount = useCallback((coinId: string) => { setAnalysisCounts(prev => { const current = prev[coinId] || baseAnalysisCount; const newCounts = { ...prev, [coinId]: current + 1 }; localStorage.setItem('analysisCounts', JSON.stringify(newCounts)); return newCounts; }); }, []);
    const handleNavigate = useCallback((page: Page) => { if (page === 'home' && activePage === 'home') { handleResetToTrending(); } else if (page === 'forum') { setActivePage('rooms'); } else { setActivePage(page); } }, [activePage, handleResetToTrending]);
    const handleSelectCoin = useCallback(async (coinId: string) => { setIsTrendingLoading(true); setTrendingError(null); setSearchedCoin(null); try { setSearchedCoin(await fetchCoinDetails(coinId)); } catch (err) { setTrendingError(err instanceof Error ? err.message : "Gagal muat detail koin."); } finally { setIsTrendingLoading(false); } }, []);
    const handleJoinRoom = useCallback((room: Room) => { setCurrentRoom(room); setJoinedRoomIds(prev => new Set(prev).add(room.id)); setUnreadCounts(prev => ({ ...prev, [room.id]: { count: 0, lastUpdate: Date.now() } })); setActivePage('forum'); }, []);
    const handleLeaveRoom = useCallback(() => { setCurrentRoom(null); setActivePage('rooms'); }, []);
    const handleLeaveJoinedRoom = useCallback((roomId: string) => { if (DEFAULT_ROOM_IDS.includes(roomId)) return; setJoinedRoomIds(prev => { const newIds = new Set(prev); newIds.delete(roomId); return newIds; }); if (currentRoom?.id === roomId) { setCurrentRoom(null); setActivePage('rooms'); } }, [currentRoom]);
    const handleCreateRoom = useCallback((roomName: string) => { if (!currentUser?.username) { alert("Anda harus login untuk membuat room."); return; } const trimmedName = roomName.trim(); if (rooms.some(r => r.name.toLowerCase() === trimmedName.toLowerCase())) { alert('Nama room sudah ada. Silakan pilih nama lain.'); return; } const newRoom: Room = { id: trimmedName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(), name: trimmedName, userCount: 1, createdBy: currentUser.username }; setRooms(prev => [newRoom, ...prev]); handleJoinRoom(newRoom); }, [handleJoinRoom, rooms, currentUser]);

    const handleDeleteRoom = useCallback((roomId: string) => {
        if (!currentUser?.username || !firebaseUser) { console.warn("Delete room prerequisites failed (user)."); alert("Gagal menghapus: Anda belum login."); return; }
        const roomToDelete = rooms.find(r => r.id === roomId);
        if (!roomToDelete || DEFAULT_ROOM_IDS.includes(roomId)) { console.warn("Cannot delete default or non-existent room."); return; }
        if (!database) { console.error("Cannot delete room: Database not initialized."); alert("Gagal menghapus room: Koneksi database bermasalah."); return; }

        const currentDb = database; // Capture current db instance
        // Check admin status first
        const adminsRef = ref(currentDb, 'admins/' + firebaseUser.uid);
        get(adminsRef).then((snapshot) => {
            const isAdmin = snapshot.exists() && snapshot.val() === true;
            const isCreator = roomToDelete.createdBy === currentUser.username;

            if (!isAdmin && !isCreator) {
                alert("Hanya admin atau pembuat room yang dapat menghapus room ini.");
                return;
            }

            // Konfirmasi sebelum menghapus
            if (window.confirm(`Anda yakin ingin menghapus room "${roomToDelete.name}" secara permanen? Semua pesan di dalamnya akan hilang.`)) {
                // Update state lokal
                setRooms(prev => prev.filter(r => r.id !== roomId));
                setJoinedRoomIds(prev => { const n = new Set(prev); n.delete(roomId); return n; });
                if (currentRoom?.id === roomId) {
                    setCurrentRoom(null);
                    setActivePage('rooms');
                }
                // Hapus pesan dari Firebase
                const messagesRef = ref(currentDb, `messages/${roomId}`);
                set(messagesRef, null)
                    .then(() => console.log(`Messages for room ${roomId} deleted.`))
                    .catch(error => console.error(`Gagal menghapus pesan untuk room ${roomId}:`, error));
                // TODO: Hapus data room dari list rooms jika disimpan di DB
            }
        }).catch(error => {
            console.error("Gagal memeriksa status admin:", error);
            alert("Gagal memverifikasi izin penghapusan.");
        });
    }, [currentUser, rooms, currentRoom, database, firebaseUser]); // Dependencies


    const handleSendMessage = useCallback((message: Partial<ChatMessage>) => {
        // Validasi yang lebih ketat
        if (!database || !currentRoom?.id || !firebaseUser?.uid || !currentUser?.username) {
            console.error("Prasyarat kirim pesan gagal", {
                db: !!database,
                room: currentRoom?.id,
                fbUid: firebaseUser?.uid,
                appUser: currentUser?.username
            });
            alert("Gagal mengirim: Belum login, data tidak lengkap, atau masalah koneksi.");
            return;
        }

        // Pastikan ada teks atau fileURL
        if (!message.text?.trim() && !message.fileURL) {
            console.warn("Attempted to send an empty message.");
            return; // Jangan kirim pesan kosong
        }

        // Buat objek pesan yang akan dikirim
        const messageToSend: Omit<ChatMessage, 'id'> & { type: 'user' } = { // Pastikan type benar
            type: 'user',
            uid: firebaseUser.uid,
            sender: currentUser.username,
            timestamp: Date.now(),
            reactions: {}, // Selalu mulai dengan objek reactions kosong
            ...(message.text && { text: message.text.trim() }), // Trim teks
            ...(message.fileURL && { fileURL: message.fileURL }),
            ...(message.fileName && { fileName: message.fileName }),
        };

        // Referensi ke list pesan di Firebase
        const messageListRef = ref(database, `messages/${currentRoom.id}`);
        const newMessageRef = push(messageListRef); // Generate ID unik baru

        // Kirim pesan ke Firebase
        set(newMessageRef, messageToSend).catch((error) => {
            console.error("Firebase send message error:", error);
            alert(`Gagal mengirim pesan.${error.code === 'PERMISSION_DENIED' ? ' Akses ditolak. Periksa aturan database.' : ''}`);
        });
    }, [currentRoom, currentUser, database, firebaseUser]); // Dependencies


    const handleReaction = useCallback((messageId: string, emoji: string) => {
        // Validasi prasyarat
        if (!database || !currentRoom?.id || !firebaseUser?.uid || !messageId || !emoji) {
            console.warn("React prerequisites failed", { db: !!database, room: currentRoom?.id, fbUid: firebaseUser?.uid, msgId: messageId, emoji });
            return;
        }
        const username = currentUser?.username;
        if (!username) {
            console.warn("Cannot react: Missing app username");
            return;
        }

        // Referensi langsung ke ARRAY/LIST pengguna UNTUK EMOJI SPESIFIK di bawah node 'reactions'
        const reactionUserListRef = ref(database, `messages/${currentRoom.id}/${messageId}/reactions/${emoji}`);

        // Gunakan 'get' untuk membaca data saat ini sekali
        get(reactionUserListRef).then((snapshot) => {
            const usersForEmoji: string[] = snapshot.val() || []; // Default ke array kosong jika belum ada
            let updatedUsers: string[] | null;

            if (!Array.isArray(usersForEmoji)) {
                console.error("Invalid data format for reactions, expected array or null:", usersForEmoji);
                // Mungkin reset ke array kosong jika format salah? Tergantung kebutuhan.
                updatedUsers = [username]; // Coba tambahkan user
            } else if (usersForEmoji.includes(username)) {
                // User sudah ada di array -> Hapus user (toggle off)
                updatedUsers = usersForEmoji.filter(u => u !== username);
                if (updatedUsers.length === 0) {
                    updatedUsers = null; // Set ke null untuk menghapus node emoji jika array jadi kosong
                }
            } else {
                // User belum ada di array -> Tambahkan user (toggle on)
                updatedUsers = [...usersForEmoji, username];
            }

            // Tulis kembali array (atau null) ke path emoji spesifik
            set(reactionUserListRef, updatedUsers).catch(error => {
                console.error(`Failed to update reaction for emoji ${emoji}:`, error);
                // Opsional: Tampilkan pesan error ke pengguna
            });

        }).catch(error => {
            console.error(`Failed to get reaction data for emoji ${emoji}:`, error);
             // Opsional: Tampilkan pesan error ke pengguna
        });
    }, [currentRoom, currentUser, database, firebaseUser]); // Dependencies


    const handleDeleteMessage = useCallback((roomId: string, messageId: string) => {
        // Validasi input
        if (!database || !roomId || !messageId) {
            console.error("Cannot delete message: Missing database, roomId, or messageId.");
            alert("Gagal menghapus pesan: Informasi tidak lengkap.");
            return;
        }
        // Referensi ke pesan spesifik
        const messageRef = ref(database, `messages/${roomId}/${messageId}`);

        // Hapus data di path tersebut dengan set ke null
        set(messageRef, null)
            .then(() => {
                console.log(`Message ${messageId} in room ${roomId} deleted successfully.`);
                 // State akan otomatis terupdate oleh listener onValue
            })
            .catch((error) => {
                console.error(`Failed to delete message ${messageId} in room ${roomId}:`, error);
                alert("Gagal menghapus pesan. Periksa koneksi atau izin Anda.");
            });
    }, [database]); // Hanya perlu dependency database

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
                // Ambil pesan dari state firebaseMessages atau default
                const currentMessages = currentRoom ? (firebaseMessages[currentRoom.id] || []) : [];
                // Logika pesan default jika firebaseMessages kosong (setelah loading awal)
                const displayMessages = (currentMessages.length === 0 && currentRoom && defaultMessages[currentRoom.id]) ? defaultMessages[currentRoom.id] : currentMessages;
                // Pastikan yang diteruskan adalah array
                const messagesToPass = Array.isArray(displayMessages) ? displayMessages : [];
                return <ForumPage room={currentRoom} messages={messagesToPass} userProfile={currentUser} onSendMessage={handleSendMessage} onLeaveRoom={handleLeaveRoom} onReact={handleReaction} onDeleteMessage={handleDeleteMessage} />;
          case 'about': return <AboutPage />;
          default: return <HomePage idrRate={idrRate} isRateLoading={isRateLoading} currency={currency} onIncrementAnalysisCount={handleIncrementAnalysisCount} fullCoinList={fullCoinList} isCoinListLoading={isCoinListLoading} coinListError={coinListError} heroCoin={heroCoin} otherTrendingCoins={otherTrendingCoins} isTrendingLoading={isTrendingLoading} trendingError={trendingError} onSelectCoin={handleSelectCoin} onReloadTrending={handleResetToTrending} />;
        }
    };

    // --- Render Utama ---
    if (isAuthLoading) {
        return ( <div className="min-h-screen bg-transparent text-white flex items-center justify-center"> Memverifikasi sesi Anda... </div> );
    }

    // Alur Render Autentikasi yang Lebih Jelas
    let contentToRender;
    if (firebaseUser) {
        // User sudah login Firebase
        if (pendingGoogleUser) {
            // Menunggu melengkapi profil setelah login Google
            contentToRender = <CreateIdPage onProfileComplete={handleProfileComplete} googleProfile={pendingGoogleUser} />;
        } else if (currentUser && currentUser.username) {
            // User lokal ditemukan DAN sudah punya username -> Tampilkan App Utama
             contentToRender = (
                 <>
                     <Header userProfile={currentUser} onLogout={handleLogout} activePage={activePage} onNavigate={handleNavigate} currency={currency} onCurrencyChange={setCurrency} hotCoin={hotCoinForHeader} idrRate={idrRate} />
                     <main className="flex-grow">{renderActivePage()}</main>
                     <Footer />
                 </>
             );
        } else if (currentUser && !currentUser.username) {
            // User lokal ADA tapi BELUM punya username (misal dari login Google sebelumnya yg belum selesai)
            // Ini seharusnya ditangani oleh logic CreateIdPage, tapi sebagai fallback:
            console.warn("User logged in but missing username, showing CreateIdPage again.");
            // Untuk kasus ini, kita butuh data GoogleProfile lagi. Jika tidak ada (pendingGoogleUser null), logout paksa.
            if(currentUser.googleProfilePicture && currentUser.email){
                 // Coba tampilkan CreateIdPage lagi dengan data seadanya
                 contentToRender = <CreateIdPage onProfileComplete={handleProfileComplete} googleProfile={{email: currentUser.email, name: currentUser.email, picture: currentUser.googleProfilePicture}} />;
            } else {
                 console.error("Cannot show CreateIdPage: missing Google profile data. Forcing logout.");
                 handleLogout(); // Paksa logout jika state tidak konsisten
                 contentToRender = <LoginPage onGoogleRegisterSuccess={handleGoogleRegisterSuccess} />;
            }
        } else {
             // firebaseUser ada, tapi currentUser TIDAK ADA dan TIDAK ADA pendingGoogleUser
             // Ini state tidak valid, kemungkinan user dihapus manual atau error. Logout paksa.
             console.error("Invalid state: Firebase user exists but no local user or pending Google user. Forcing logout.");
             handleLogout(); // Panggil logout untuk membersihkan state Firebase
             contentToRender = <LoginPage onGoogleRegisterSuccess={handleGoogleRegisterSuccess} />;
        }
    } else {
        // Tidak ada user Firebase -> Tampilkan LoginPage
        contentToRender = <LoginPage onGoogleRegisterSuccess={handleGoogleRegisterSuccess} />;
    }


    // Render container utama
    return (
        <div className="min-h-screen bg-transparent text-white font-sans flex flex-col">
            <Particles />
            {contentToRender}
            {authError && ( <div className="fixed bottom-4 right-4 bg-red-600 text-white p-3 rounded-lg shadow-lg z-50"> Error: {authError} <button onClick={() => setAuthError(null)} className="ml-2 text-sm underline">Tutup</button> </div> )}
        </div>
    );
};

// Komponen App Wrapper (Tetap sama)
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