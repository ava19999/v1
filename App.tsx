// App.tsx
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { jwtDecode } from 'jwt-decode'; // Tambahkan impor ini jika belum ada
import Header from './components/Header';
import Footer from './components/Footer';
import type { ForumMessageItem, Room, CoinListItem, CryptoData, ChatMessage, Page, Currency, NewsArticle, User, GoogleProfile } from './types'; // Pastikan Room diimpor
import HomePage from './components/HomePage';
import ForumPage from './components/ForumPage';
import AboutPage from './components/AboutPage';
import RoomsListPage from './components/RoomsListPage';
import LoginPage from './components/LoginPage';
import CreateIdPage from './components/CreateIdPage';
import { fetchIdrRate, fetchNewsArticles, fetchTop500Coins, fetchTrendingCoins, fetchCoinDetails } from './services/mockData';
import { ADMIN_USERNAMES } from './components/UserTag'; // <-- Impor admin list

const defaultMessages: { [key: string]: ForumMessageItem[] } = {
    // ... (pesan default tetap sama)
     'pengumuman-aturan': [
        {
            id: 'rule1',
            type: 'system',
            text: 'Selamat datang di RT Crypto! Ini adalah tempat kita untuk diskusi dan analisis.',
            sender: 'system',
            timestamp: Date.now()
        },
        {
            id: 'rule2',
            type: 'system',
            text: 'Aturan Penting: Dilarang keras membagikan ajakan membeli (sinyal). Selalu lakukan riset sendiri (DYOR). Semua risiko ditanggung oleh masing-masing.',
            sender: 'system',
            timestamp: Date.now() + 1
        },
        {
            id: 'mission1',
            type: 'system',
            text: 'Misi Kita Bareng: Jujur, kita capek liat banyak temen yang boncos gara-gara info sesat atau FOMO doang. Misi kita simpel: bikin tempat di mana semua orang bisa dapet info valid dan ngeracik strategi bareng. Ini gerakan kita buat jadi trader cerdas, bukan cuma ikut-ikutan. Ayo menang bareng di market!',
            sender: 'system',
            timestamp: Date.now() + 2
        }
    ]
};

const Particles = () => (
     // ... (kode Particles tetap sama)
      <div className="particles">
      <div className="particle" style={{ width: '3px', height: '3px', left: '10%', animationDelay: '-1s' }}></div>
      <div className="particle" style={{ width: '2px', height: '2px', left: '25%', animationDelay: '-5s' }}></div>
      <div className="particle" style={{ width: '4px', height: '4px', left: '50%', animationDelay: '-3s' }}></div>
      <div className="particle" style={{ width: '3px', height: '3px', left: '70%', animationDelay: '-8s' }}></div>
      <div className="particle" style={{ width: '2px', height: '2px', left: '85%', animationDelay: '-2s' }}></div>
      <div className="particle" style={{ width: '4px', height: '4px', left: '40%', animationDelay: '-12s' }}></div>
      <div className="particle" style={{ width: '3px', height: '3px', left: '90%', animationDelay: '-15s' }}></div>
    </div>
);


const App = () => {
  const [activePage, setActivePage] = useState<Page>('home');
  const [currency, setCurrency] = useState<Currency>('usd');
  const [idrRate, setIdrRate] = useState<number | null>(null);
  const [isRateLoading, setIsRateLoading] = useState(true);

  // Authentication State
  const [users, setUsers] = useState<{ [email: string]: User }>({}); // Gunakan email sebagai key
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [pendingGoogleUser, setPendingGoogleUser] = useState<GoogleProfile | null>(null); // Untuk menyimpan data Google sementara

  // Application State (Crypto Data, Forum, etc.)
  const [analysisCounts, setAnalysisCounts] = useState<{ [key: string]: number }>({});
  const baseAnalysisCount = 1904;
  const [fullCoinList, setFullCoinList] = useState<CoinListItem[]>([]);
  const [isCoinListLoading, setIsCoinListLoading] = useState(true);
  const [coinListError, setCoinListError] = useState<string | null>(null);
  const [trendingCoins, setTrendingCoins] = useState<CryptoData[]>([]);
  const [isTrendingLoading, setIsTrendingLoading] = useState(true);
  const [trendingError, setTrendingError] = useState<string | null>(null);
  const [searchedCoin, setSearchedCoin] = useState<CryptoData | null>(null);
  const [rooms, setRooms] = useState<Room[]>([ // Definisikan tipe state rooms
        // Tambahkan properti createdBy ke data awal jika relevan
        { id: 'berita-kripto', name: 'Berita Kripto', userCount: 150 + Math.floor(Math.random() * 20) }, // Default room, no creator needed
        { id: 'pengumuman-aturan', name: 'Pengumuman & Aturan', userCount: 150 + Math.floor(Math.random() * 20) }, // Default room
        { id: 'umum', name: 'Kripto Naik/Turun Hari Ini', userCount: 134 + Math.floor(Math.random() * 20) , createdBy: 'Admin_RTC'}, // Contoh creator
        { id: 'meme', name: 'Meme Coin Mania', userCount: 88 + Math.floor(Math.random() * 20), createdBy: 'Admin_RTC' },
        { id: 'xrp-army', name: 'Xrp Army', userCount: 73 + Math.floor(Math.random() * 20), createdBy: 'Admin_RTC' },
        { id: 'roblox-tuker-kripto', name: 'Roblox Tuker Kripto', userCount: 42 + Math.floor(Math.random() * 20), createdBy: 'ava' }, // Contoh creator lain
    ]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null); // Definisikan tipe state currentRoom
  const [joinedRoomIds, setJoinedRoomIds] = useState<Set<string>>(
    () => new Set(['berita-kripto', 'pengumuman-aturan']) // Initialize with default rooms
  );
   const [unreadCounts, setUnreadCounts] = useState<{ [key: string]: { count: number; lastUpdate: number } }>({});
   const [messages, setMessages] = useState<{[key: string]: ForumMessageItem[]}>(() => {
     const savedMessages = localStorage.getItem('forumMessages');
    if (savedMessages) {
        try {
            // TODO: Add validation logic here if needed
            return JSON.parse(savedMessages);
        } catch (e) {
            console.error("Gagal mem-parsing pesan dari localStorage", e);
            return defaultMessages;
        }
    }
    return defaultMessages;
   });

  // --- Effects for Data Loading & Persistence ---

  // Load users and currentUser from localStorage on initial render
    useEffect(() => {
        try {
            const storedUsers = localStorage.getItem('cryptoUsers');
            if (storedUsers) {
                setUsers(JSON.parse(storedUsers));
            }
            const storedCurrentUser = localStorage.getItem('currentUser');
            if (storedCurrentUser) {
                setCurrentUser(JSON.parse(storedCurrentUser));
            }
        } catch (e) {
            console.error("Gagal memuat data pengguna dari localStorage", e);
        }
    }, []);

    // Persist users to localStorage whenever it changes
    useEffect(() => {
        try {
            localStorage.setItem('cryptoUsers', JSON.stringify(users));
        } catch (e) {
            console.error("Gagal menyimpan data pengguna ke localStorage", e);
        }
    }, [users]);

    // Persist currentUser to localStorage
    useEffect(() => {
        try {
            if (currentUser) {
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
            } else {
                localStorage.removeItem('currentUser');
            }
        } catch (e) {
            console.error("Gagal menyimpan pengguna saat ini ke localStorage", e);
        }
    }, [currentUser]);

    // --- Authentication Handlers ---

    // Google Login Success Handler
    const handleGoogleRegisterSuccess = useCallback(async (credentialResponse: any) => {
        try {
            const decoded: any = jwtDecode(credentialResponse.credential);
            const { email, name, picture } = decoded;

            const existingUser = users[email];
            if (existingUser) {
                // Jika user sudah ada, langsung login
                 setCurrentUser(existingUser);
                 setPendingGoogleUser(null); // Pastikan tidak ada pending user
            } else {
                // Jika user baru, simpan data Google dan arahkan ke pembuatan profil
                 setPendingGoogleUser({ email, name, picture });
            }
        } catch (error) {
            console.error("Google Sign-In Error:", error);
            // Handle error (e.g., show message to user)
        }
    }, [users]); // Depend on users state

     // Login Biasa
    const handleLogin = useCallback(async (usernameOrEmail: string, password: string): Promise<string | void> => {
        // Coba cari berdasarkan username dulu
        let user = Object.values(users).find(u => u.username?.toLowerCase() === usernameOrEmail.toLowerCase());

        // Jika tidak ketemu username, coba cari berdasarkan email
        if (!user) {
            user = users[usernameOrEmail.toLowerCase()];
        }

        if (user && user.password === password) {
             setCurrentUser(user);
             setPendingGoogleUser(null);
        } else {
            return 'Username/Email atau kata sandi salah.';
        }
    }, [users]);

    // Handler setelah user Google baru melengkapi profil (username & password)
    const handleProfileComplete = useCallback(async (username: string, password: string): Promise<string | void> => {
        if (!pendingGoogleUser) return 'Data pengguna Google tidak ditemukan.';

        // Cek apakah username sudah ada (case-insensitive)
        const usernameExists = Object.values(users).some(u => u.username?.toLowerCase() === username.toLowerCase());
        if (usernameExists) {
            return 'Username sudah digunakan. Silakan pilih nama lain.';
        }

        const newUser: User = {
            email: pendingGoogleUser.email, // Gunakan email Google
            username: username,
            password: password, // Simpan password
            googleProfilePicture: pendingGoogleUser.picture, // Simpan gambar profil Google
            createdAt: Date.now(),
        };

        setUsers(prev => ({ ...prev, [newUser.email]: newUser })); // Simpan user baru menggunakan email sebagai key
        setCurrentUser(newUser); // Set user yang baru dibuat sebagai currentUser
        setPendingGoogleUser(null); // Hapus pending user
    }, [users, pendingGoogleUser]); // Depend on users and pendingGoogleUser


    // Logout Handler
    const handleLogout = useCallback(() => {
        setCurrentUser(null);
        setPendingGoogleUser(null); // Also clear pending user on logout
        localStorage.removeItem('currentUser'); // Clear from storage
        setActivePage('home'); // Redirect to home or login page
    }, []);


  // --- Fetching External Data (IDR Rate, Coins, Dominance, News) ---
  useEffect(() => {
        const getRate = async () => {
            try {
                setIsRateLoading(true);
                const rate = await fetchIdrRate();
                setIdrRate(rate);
            } catch (error) {
                console.error("Gagal mengambil kurs IDR:", error);
                setIdrRate(16000); // Kurs fallback
            } finally {
                setIsRateLoading(false);
            }
        };
        getRate();
    }, []);

    useEffect(() => {
        const fetchList = async () => {
             setIsCoinListLoading(true);
             setCoinListError(null);
            try {
                const coins = await fetchTop500Coins();
                setFullCoinList(coins);
            } catch (err) {
                 setCoinListError("Gagal mengambil daftar koin.");
            } finally {
                setIsCoinListLoading(false);
            }
        };
        fetchList();
    }, []);

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

     useEffect(() => {
        fetchTrendingData();
        // Set interval to refresh trending data periodically (e.g., every 5 minutes)
        // const intervalId = setInterval(() => fetchTrendingData(false), 5 * 60 * 1000);
        // return () => clearInterval(intervalId);
    }, [fetchTrendingData]);

     const handleSelectCoin = useCallback(async (coinId: string) => {
         setIsTrendingLoading(true); // Show loading skeleton while fetching details
         setTrendingError(null);
         setSearchedCoin(null); // Clear previous search result
         try {
            const coin = await fetchCoinDetails(coinId);
            setSearchedCoin(coin); // Set the fetched coin as the searchedCoin (will become hero)
         } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Gagal memuat detail koin.";
            setTrendingError(errorMessage);
         } finally {
             setIsTrendingLoading(false);
         }
     }, []);

     const handleResetToTrending = useCallback(() => {
         setSearchedCoin(null); // Clear the searched coin
         fetchTrendingData(true); // Reload trending data with skeleton
     }, [fetchTrendingData]);

    // Load/Save unreadCounts from localStorage
    useEffect(() => {
        const savedCounts = localStorage.getItem('unreadCounts');
        if (savedCounts) {
            try {
                 setUnreadCounts(JSON.parse(savedCounts));
            } catch (e) {
                console.error("Gagal mem-parsing unreadCounts dari localStorage", e);
            }
        }
    }, []);

    useEffect(() => {
         localStorage.setItem('unreadCounts', JSON.stringify(unreadCounts));
    }, [unreadCounts]);

    // Save messages to localStorage
    useEffect(() => {
        try {
            localStorage.setItem('forumMessages', JSON.stringify(messages));
        } catch (e) {
            console.error("Gagal menyimpan pesan ke localStorage", e);
        }
    }, [messages]);

    // Reset analysis counts daily
    useEffect(() => {
        const lastResetDate = localStorage.getItem('lastAnalysisResetDate');
        const today = new Date().toISOString().split('T')[0];
        if (lastResetDate !== today) {
            const initialCounts = {}; // Reset counts
            setAnalysisCounts(initialCounts);
            localStorage.setItem('analysisCounts', JSON.stringify(initialCounts));
            localStorage.setItem('lastAnalysisResetDate', today);
        } else {
            // Load counts from storage if it's the same day
            const savedCounts = localStorage.getItem('analysisCounts');
            if (savedCounts) {
                try {
                    setAnalysisCounts(JSON.parse(savedCounts));
                } catch (e) {
                    console.error("Failed to parse analysis counts from localStorage", e);
                    setAnalysisCounts({});
                }
            }
        }
    }, []);

    // Fetch News Articles periodically
    useEffect(() => {
        const NEWS_ROOM_ID = 'berita-kripto';
        const NEWS_FETCH_INTERVAL = 20 * 60 * 1000; // 20 minutes
        const LAST_FETCH_KEY = 'lastNewsFetchTimestamp';

        const fetchAndProcessNews = async () => {
            const now = Date.now();
            const lastFetchTimestamp = parseInt(localStorage.getItem(LAST_FETCH_KEY) || '0', 10);

            // Don't fetch if interval hasn't passed
            if (now - lastFetchTimestamp < NEWS_FETCH_INTERVAL) {
                // console.log("News fetch interval not yet passed.");
                return;
            }

            // console.log("Fetching news...");
            try {
                const fetchedArticles = await fetchNewsArticles();
                if (!fetchedArticles || fetchedArticles.length === 0) return;

                let newArticleAdded = false;

                setMessages(prevMessages => {
                    const allMessagesInRoom = prevMessages[NEWS_ROOM_ID] || [];
                    const existingNewsUrls = new Set(
                        allMessagesInRoom
                            .filter((msg): msg is NewsArticle => 'url' in msg) // Type guard
                            .map(news => news.url)
                    );

                    // Find the latest article not already in messages
                    const latestArticle = fetchedArticles.find(article => !existingNewsUrls.has(article.url));

                    if (latestArticle) {
                        // console.log("New news article found:", latestArticle.title);
                        newArticleAdded = true;
                        const newItemToAdd: NewsArticle = { // Explicitly type the new item
                           ...latestArticle,
                           id: latestArticle.url, // Use URL as ID
                           reactions: {}, // Initialize reactions
                        };
                        return {
                            ...prevMessages,
                            [NEWS_ROOM_ID]: [...allMessagesInRoom, newItemToAdd],
                        };
                    }
                    // console.log("No new news articles.");
                    return prevMessages; // No changes if no new article
                });

                if (newArticleAdded) {
                    localStorage.setItem(LAST_FETCH_KEY, now.toString());
                    // Increment unread count only if the user is not in the news room
                    if (currentRoom?.id !== NEWS_ROOM_ID) {
                        setUnreadCounts(prev => ({
                            ...prev,
                            [NEWS_ROOM_ID]: {
                                count: (prev[NEWS_ROOM_ID]?.count || 0) + 1,
                                lastUpdate: now
                            }
                        }));
                    }
                }

            } catch (err) {
                 const errorMessage = err instanceof Error ? err.message : 'Gagal memuat berita.';
                 console.error("Gagal mengambil berita untuk room berita:", errorMessage);
            }
        };

        fetchAndProcessNews(); // Fetch immediately on load
        const intervalId = setInterval(fetchAndProcessNews, 60 * 1000); // Check every minute

        return () => {
            clearInterval(intervalId); // Cleanup interval on component unmount
        };
    }, [currentRoom]); // Re-run effect if currentRoom changes


    // Simulate unread message counts for other joined rooms
    useEffect(() => {
        const simulationInterval = setInterval(() => {
            const joinedButNotActiveRooms = Array.from(joinedRoomIds).filter(
                id => id !== currentRoom?.id && !['berita-kripto', 'pengumuman-aturan'].includes(id)
            );

            if (joinedButNotActiveRooms.length > 0) {
                const randomRoomId = joinedButNotActiveRooms[Math.floor(Math.random() * joinedButNotActiveRooms.length)];
                setUnreadCounts(prev => ({
                    ...prev,
                    [randomRoomId]: {
                        count: (prev[randomRoomId]?.count || 0) + 1,
                        lastUpdate: Date.now()
                    }
                }));
            }
        }, 20000); // Simulate a new message every 20 seconds

        return () => clearInterval(simulationInterval);
    }, [joinedRoomIds, currentRoom]); // Depend on joined rooms and current room


  // --- Event Handlers ---

   const handleIncrementAnalysisCount = useCallback((coinId: string) => {
        setAnalysisCounts(prevCounts => {
            const currentCount = prevCounts[coinId] || baseAnalysisCount;
            const newCounts = { ...prevCounts, [coinId]: currentCount + 1 };
             localStorage.setItem('analysisCounts', JSON.stringify(newCounts));
            return newCounts;
        });
    }, []);

    const handleNavigate = useCallback((page: Page) => {
         if (page === 'home' && activePage === 'home') {
            // If already on home and click home again, reset to trending
            handleResetToTrending();
        } else if (page === 'forum') {
            // Navigate to the rooms list first if 'forum' is clicked directly
             setActivePage('rooms');
        } else {
            setActivePage(page);
        }
    }, [activePage, handleResetToTrending]);


    const handleJoinRoom = useCallback((room: Room) => {
        setCurrentRoom(room);
        // Reset unread count for the joined room
        setUnreadCounts(prev => {
            const roomId = room.id;
            // Only update if there was an unread count > 0
            if (prev[roomId] && prev[roomId].count > 0) {
                return {
                    ...prev,
                    [roomId]: {
                        ...prev[roomId], // Keep lastUpdate time
                        count: 0, // Reset count
                    },
                };
            }
            return prev; // No change needed
        });
        // Add room to joined list
        setJoinedRoomIds(prevIds => {
            const newIds = new Set(prevIds);
            newIds.add(room.id);
            return newIds;
        });
        // Add welcome/admin message if it's the first time joining
        if (!messages[room.id] && currentUser?.username) {
            const welcomeMessage: ChatMessage = {
                id: new Date().toISOString(),
                type: 'system',
                text: `Selamat datang di room "${room.name}". Anda bergabung sebagai ${currentUser.username}.`,
                sender: 'system',
                timestamp: Date.now(),
            };
            const roomMessages = [welcomeMessage];

            // Add admin message for non-default rooms
             if (!['berita-kripto', 'pengumuman-aturan'].includes(room.id)) {
                 const adminMessage: ChatMessage = {
                     id: `admin-msg-${room.id}`,
                     type: 'user',
                     text: 'Halo para trader! Ingat, riset sendiri itu kunci. Jangan gampang percaya "sinyal" dari orang lain ya. Cuan bareng!',
                     sender: 'Admin_RTC', // Or randomly select an admin
                     timestamp: Date.now() + 1, // Slightly after welcome
                     reactions: { '👍': [] } // Initialize reactions
                 };
                 roomMessages.push(adminMessage);
             }

            setMessages(prev => ({
                ...prev,
                [room.id]: roomMessages
            }));
        }
        setActivePage('forum');
    }, [messages, currentUser]); // Add currentUser as dependency

    const handleLeaveRoom = useCallback(() => {
        setCurrentRoom(null);
        setActivePage('rooms'); // Go back to room list
    }, []);

    const handleLeaveJoinedRoom = useCallback((roomId: string) => {
        // Prevent leaving default rooms
        if (['berita-kripto', 'pengumuman-aturan'].includes(roomId)) {
             // alert("Anda tidak dapat keluar dari room default."); // Optional: Beri tahu pengguna
            return;
        }

        setJoinedRoomIds(prevIds => {
            const newIds = new Set(prevIds);
            newIds.delete(roomId);
            return newIds;
        });

        // If leaving the currently active room, navigate away
        if (currentRoom?.id === roomId) {
            setCurrentRoom(null);
            setActivePage('rooms');
        }
        // Optional: Remove messages for the left room? Or keep history?
        // setMessages(prev => {
        //     const newMessages = {...prev};
        //     delete newMessages[roomId];
        //     return newMessages;
        // });
        // Optional: Clear unread count for the left room
        setUnreadCounts(prev => {
            const newCounts = {...prev};
            delete newCounts[roomId];
            return newCounts;
        });

    }, [currentRoom]); // Depend on currentRoom


    const handleCreateRoom = useCallback((roomName: string) => {
        const trimmedRoomName = roomName.trim();
        const roomExists = rooms.some(room => room.name.toLowerCase() === trimmedRoomName.toLowerCase());
        if(roomExists) {
            alert('Room dengan nama tersebut sudah ada. Silakan pilih nama lain.');
            return;
        }
         // Pastikan user sudah login sebelum membuat room
        if (!currentUser?.username) {
            alert('Anda harus login untuk membuat room.');
            return;
        }

        const newRoom: Room = {
            id: trimmedRoomName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(), // Simple unique ID
            name: trimmedRoomName,
            userCount: 1, // Creator joins immediately
            createdBy: currentUser.username // <-- Simpan username pembuat
        };
        setRooms(prev => [newRoom, ...prev]); // Add to the top of the list
        handleJoinRoom(newRoom); // Automatically join the new room
    }, [handleJoinRoom, rooms, currentUser]); // Tambahkan currentUser sebagai dependency

    const handleDeleteRoom = useCallback((roomId: string) => {
        if (!currentUser?.username) return; // Harus login

        const roomToDelete = rooms.find(r => r.id === roomId);
        if (!roomToDelete) return; // Room tidak ditemukan

        // Cek izin: Admin atau Pembuat Room
        const isAdmin = ADMIN_USERNAMES.map(name => name.toLowerCase()).includes(currentUser.username.toLowerCase());
        const isCreator = roomToDelete.createdBy === currentUser.username;

        // Cek apakah room default
        if (['berita-kripto', 'pengumuman-aturan'].includes(roomId)) {
            alert('Room default tidak dapat dihapus.');
            return;
        }

        if (isAdmin || isCreator) {
            // Konfirmasi penghapusan
            if (window.confirm(`Apakah Anda yakin ingin menghapus room "${roomToDelete.name}"? Tindakan ini tidak dapat diurungkan.`)) {
                // Hapus dari state rooms
                setRooms(prevRooms => prevRooms.filter(room => room.id !== roomId));

                // Jika room yang dihapus sedang aktif, kembali ke daftar room
                if (currentRoom?.id === roomId) {
                    setCurrentRoom(null);
                    setActivePage('rooms');
                }

                // Hapus dari daftar joined rooms (jika ada)
                setJoinedRoomIds(prevIds => {
                    const newIds = new Set(prevIds);
                    newIds.delete(roomId);
                    return newIds;
                });

                // Hapus pesan terkait room
                setMessages(prevMessages => {
                    const newMessages = { ...prevMessages };
                    delete newMessages[roomId];
                    return newMessages;
                });

                 // Hapus unread count terkait room
                setUnreadCounts(prev => {
                     const newCounts = {...prev};
                     delete newCounts[roomId];
                     return newCounts;
                 });

                 // Note: Di aplikasi nyata, Anda mungkin ingin memberi tahu pengguna lain di room tersebut
            }
        } else {
            alert('Anda tidak memiliki izin untuk menghapus room ini.');
        }
    }, [currentUser, rooms, currentRoom]); // Tambahkan dependencies


    const handleSendMessage = useCallback((message: ChatMessage) => {
        if (!currentRoom) return;
        setMessages(prev => {
            const roomMessages = prev[currentRoom.id] || [];
            return {
                ...prev,
                [currentRoom.id]: [...roomMessages, message]
            };
        });
        // Note: In a real app, send the message to the backend here
    }, [currentRoom]);


    const handleReaction = useCallback((messageId: string, emoji: string) => {
         if (!currentRoom || !currentUser?.username) return; // Need room and user context

         const username = currentUser.username; // Get username

         setMessages(prevMessages => {
            const roomMessages = prevMessages[currentRoom.id] || [];

            const newRoomMessages = roomMessages.map(msg => {
                if (msg.id === messageId) {
                     // Ensure reactions object exists
                    const newReactions = { ...(msg.reactions || {}) };
                    const users = newReactions[emoji] || [];

                    if (users.includes(username)) {
                        // User already reacted with this emoji, remove reaction
                        const updatedUsers = users.filter(u => u !== username);
                         if (updatedUsers.length === 0) {
                            delete newReactions[emoji]; // Remove emoji if no users left
                         } else {
                            newReactions[emoji] = updatedUsers;
                         }
                    } else {
                        // User hasn't reacted with this emoji, add reaction
                        newReactions[emoji] = [...users, username];
                    }
                    return { ...msg, reactions: newReactions };
                }
                return msg;
            });

            return {
                ...prevMessages,
                [currentRoom.id]: newRoomMessages
            };
        });
        // Note: In a real app, send the reaction update to the backend
    }, [currentRoom, currentUser]); // Add currentUser dependency


  // --- Memoized Values ---
  const totalUsers = useMemo(() => rooms.reduce((sum, room) => sum + room.userCount, 0), [rooms]);
  const heroCoin = searchedCoin || (trendingCoins.length > 0 ? trendingCoins[0] : null);
  const otherTrendingCoins = searchedCoin ? [] : trendingCoins.slice(1); // Don't show trending if showing search result
  const hotCoin = trendingCoins.length > 1 ? { name: trendingCoins[1].name, logo: trendingCoins[1].image, price: trendingCoins[1].price, change: trendingCoins[1].change } : null; // Example: 2nd trending as hot coin

  // --- Render Logic ---
  const renderActivePage = () => {
    // ... (render logic for pages, pastikan onDeleteRoom di-pass ke RoomsListPage)
     switch (activePage) {
      case 'home':
        return <HomePage
                  idrRate={idrRate}
                  isRateLoading={isRateLoading}
                  currency={currency}
                  onIncrementAnalysisCount={handleIncrementAnalysisCount}
                  fullCoinList={fullCoinList}
                  isCoinListLoading={isCoinListLoading}
                  coinListError={coinListError}
                  heroCoin={heroCoin}
                  otherTrendingCoins={otherTrendingCoins}
                  isTrendingLoading={isTrendingLoading}
                  trendingError={trendingError}
                  onSelectCoin={handleSelectCoin}
                  onReloadTrending={handleResetToTrending}
               />;
      case 'rooms':
        return <RoomsListPage
                    rooms={rooms}
                    onJoinRoom={handleJoinRoom}
                    onCreateRoom={handleCreateRoom}
                    totalUsers={totalUsers}
                    hotCoin={hotCoin}
                    userProfile={currentUser}
                    currentRoomId={currentRoom?.id || null}
                    joinedRoomIds={joinedRoomIds}
                    onLeaveJoinedRoom={handleLeaveJoinedRoom}
                    unreadCounts={unreadCounts}
                    onDeleteRoom={handleDeleteRoom} // <-- Pass the delete handler
                />;
      case 'forum':
         return <ForumPage
                    room={currentRoom}
                    messages={currentRoom ? messages[currentRoom.id] || [] : []}
                    userProfile={currentUser}
                    onSendMessage={handleSendMessage}
                    onLeaveRoom={handleLeaveRoom}
                    onReact={handleReaction}
                />;
      case 'about':
        return <AboutPage />;
      default:
        return <HomePage
                  idrRate={idrRate}
                  isRateLoading={isRateLoading}
                  currency={currency}
                  onIncrementAnalysisCount={handleIncrementAnalysisCount}
                  fullCoinList={fullCoinList}
                  isCoinListLoading={isCoinListLoading}
                  coinListError={coinListError}
                  heroCoin={heroCoin}
                  otherTrendingCoins={otherTrendingCoins}
                  isTrendingLoading={isTrendingLoading}
                  trendingError={trendingError}
                  onSelectCoin={handleSelectCoin}
                  onReloadTrending={handleResetToTrending}
                />;
    }
  };

  // --- Authentication Flow Rendering ---
  if (!currentUser && !pendingGoogleUser) {
    // Jika belum login DAN tidak ada user Google yang menunggu pembuatan profil
    return <LoginPage onGoogleRegisterSuccess={handleGoogleRegisterSuccess} onLogin={handleLogin} />;
  }

  if (pendingGoogleUser) {
      // Jika ada user Google yang menunggu pembuatan profil (username & password)
      return <CreateIdPage onProfileComplete={handleProfileComplete} googleProfile={pendingGoogleUser} />;
  }

  // Jika sudah login (currentUser ada)
   return (
    <div className="min-h-screen bg-transparent text-white font-sans flex flex-col">
      <Particles />
      <Header
        userProfile={currentUser} // currentUser pasti ada di sini
        onLogout={handleLogout}
        activePage={activePage}
        onNavigate={handleNavigate}
        currency={currency}
        onCurrencyChange={setCurrency}
        hotCoin={hotCoin}
        idrRate={idrRate}
      />
      <main className="flex-grow">
        {/* Render halaman hanya jika currentUser sudah pasti ada */}
        {currentUser && renderActivePage()}
      </main>
      <Footer />
    </div>
  );
};

export default App;