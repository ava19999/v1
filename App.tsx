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
  // ... (sebagian besar state tetap sama) ...
  const [activePage, setActivePage] = useState<Page>('home');
  const [currency, setCurrency] = useState<Currency>('usd');
  const [idrRate, setIdrRate] = useState<number | null>(null);
  const [isRateLoading, setIsRateLoading] = useState(true);
  const [users, setUsers] = useState<{ [email: string]: User }>({}); // Gunakan email sebagai key
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
   const [messages, setMessages] = useState<{[key: string]: ForumMessageItem[]}>(() => {
     const savedMessages = localStorage.getItem('forumMessages');
    if (savedMessages) {
        try {
            return JSON.parse(savedMessages);
        } catch (e) {
            console.error("Gagal mem-parsing pesan dari localStorage", e);
            return defaultMessages;
        }
    }
    return defaultMessages;
   });

  // --- Effects ---
   useEffect(() => { /* Load/Save users & currentUser */ }, [users, currentUser]);
   useEffect(() => { /* Load/Save users */ }, [users]);
   useEffect(() => { /* Load/Save currentUser */ }, [currentUser]);
   useEffect(() => { /* getRate */ }, []);
   useEffect(() => { /* fetchList */ }, []);
   useEffect(() => { /* fetchTrendingData */ }, [fetchTrendingData]); // fetchTrendingData didefinisikan di bawah
   useEffect(() => { /* Load unreadCounts */ }, []);
   useEffect(() => { /* Save unreadCounts */ }, [unreadCounts]);
   useEffect(() => { /* Save messages */ }, [messages]);
   useEffect(() => { /* Reset/Load analysisCounts */ }, []);
   useEffect(() => { /* Fetch News */ }, [currentRoom]);
   useEffect(() => { /* Simulate unread counts */ }, [joinedRoomIds, currentRoom]);


  // --- Authentication Handlers ---
  const handleGoogleRegisterSuccess = useCallback((credentialResponse: any) => {
        try {
            const decoded: any = jwtDecode(credentialResponse.credential);
            const { email, name, picture } = decoded;

            // **Pengecekan Email Sudah Terdaftar**
            const existingUser = users[email];
            if (existingUser) {
                 // Jika user dengan email ini sudah ada (baik dari Google atau manual)
                 // Langsung login
                 setCurrentUser(existingUser);
                 setPendingGoogleUser(null);
                 alert(`Selamat datang kembali, ${existingUser.username}! Anda login dengan akun yang terhubung ke ${email}.`);
            } else {
                // Jika user baru, simpan data Google dan arahkan ke pembuatan profil
                 setPendingGoogleUser({ email, name, picture });
            }
        } catch (error) {
            console.error("Google Sign-In Error:", error);
            alert('Terjadi kesalahan saat login dengan Google.');
        }
    }, [users]); // Depend on users state

    const handleLogin = useCallback(async (usernameOrEmail: string, password: string): Promise<string | void> => {
        // ... (logika login tetap sama) ...
         // Coba cari berdasarkan username dulu
        let user = Object.values(users).find(u => u.username?.toLowerCase() === usernameOrEmail.toLowerCase());

        // Jika tidak ketemu username, coba cari berdasarkan email
        if (!user) {
            user = users[usernameOrEmail.toLowerCase()]; // Asumsi email disimpan lowercase sebagai key
        }

        if (user && user.password === password) {
             setCurrentUser(user);
             setPendingGoogleUser(null);
        } else {
            return 'Username/Email atau kata sandi salah.';
        }
    }, [users]);

    const handleProfileComplete = useCallback(async (username: string, password: string): Promise<string | void> => {
        if (!pendingGoogleUser) return 'Data pengguna Google tidak ditemukan.';

        // **Pengecekan Email Sudah Ada (Double Check)**
        // Seharusnya sudah dicek di handleGoogleRegisterSuccess, tapi baik untuk double check
        if (users[pendingGoogleUser.email]) {
            setPendingGoogleUser(null); // Hapus pending user
            // Secara otomatis login dengan akun yang ada
            setCurrentUser(users[pendingGoogleUser.email]);
            alert(`Email ${pendingGoogleUser.email} sudah terdaftar dengan username ${users[pendingGoogleUser.email].username}. Anda otomatis login.`);
            return; // Hentikan proses pembuatan akun baru
        }


        // Cek apakah username sudah ada (case-insensitive)
        const usernameExists = Object.values(users).some(u => u.username?.toLowerCase() === username.toLowerCase());
        if (usernameExists) {
            return 'Username sudah digunakan. Silakan pilih nama lain.';
        }

        const newUser: User = {
            email: pendingGoogleUser.email, // Gunakan email Google sebagai identifier unik
            username: username,
            password: password,
            googleProfilePicture: pendingGoogleUser.picture,
            createdAt: Date.now(),
        };

        setUsers(prev => ({ ...prev, [newUser.email.toLowerCase()]: newUser })); // Gunakan email lowercase sebagai key
        setCurrentUser(newUser);
        setPendingGoogleUser(null);
    }, [users, pendingGoogleUser]);

    const handleLogout = useCallback(() => {
        setCurrentUser(null);
        setPendingGoogleUser(null);
        localStorage.removeItem('currentUser');
        setActivePage('home');
    }, []);


    // --- Other Handlers ---
     const fetchTrendingData = useCallback(async (showSkeleton = true) => {
        // ... (logika fetch trending data tetap sama) ...
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

    const handleSelectCoin = useCallback(async (coinId: string) => {
        // ... (logika select coin tetap sama) ...
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
        // ... (logika reset trending tetap sama) ...
          setSearchedCoin(null); // Clear the searched coin
         fetchTrendingData(true); // Reload trending data with skeleton
    }, [fetchTrendingData]);

    const handleIncrementAnalysisCount = useCallback((coinId: string) => {
        // ... (logika increment count tetap sama) ...
         setAnalysisCounts(prevCounts => {
            const currentCount = prevCounts[coinId] || baseAnalysisCount;
            const newCounts = { ...prevCounts, [coinId]: currentCount + 1 };
             localStorage.setItem('analysisCounts', JSON.stringify(newCounts));
            return newCounts;
        });
    }, []);

    const handleNavigate = useCallback((page: Page) => {
        // ... (logika navigasi tetap sama) ...
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
        // ... (logika join room tetap sama) ...
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
    }, [messages, currentUser]);

    const handleLeaveRoom = useCallback(() => {
        // ... (logika leave room (dari forum page) tetap sama) ...
         setCurrentRoom(null);
        setActivePage('rooms'); // Go back to room list
    }, []);

    const handleLeaveJoinedRoom = useCallback((roomId: string) => {
        // ... (logika leave joined room (dari rooms list) tetap sama) ...
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

        // Optional: Clear unread count for the left room
        setUnreadCounts(prev => {
            const newCounts = {...prev};
            delete newCounts[roomId];
            return newCounts;
        });
    }, [currentRoom]);

    const handleCreateRoom = useCallback((roomName: string) => {
        // ... (logika create room tetap sama) ...
         const trimmedRoomName = roomName.trim();
      const roomExists = rooms.some(room => room.name.toLowerCase() === trimmedRoomName.toLowerCase());
      if(roomExists) {
          alert('Room dengan nama tersebut sudah ada. Silakan pilih nama lain.');
          return;
      }
      if (!currentUser?.username) {
        alert('Anda harus login untuk membuat room.');
        return;
      }
      const newRoom: Room = {
          id: trimmedRoomName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
          name: trimmedRoomName,
          userCount: 1,
          createdBy: currentUser.username // <-- Simpan username pembuat
      };
      setRooms(prev => [newRoom, ...prev]);
      handleJoinRoom(newRoom);
    }, [handleJoinRoom, rooms, currentUser]);

     const handleDeleteRoom = useCallback((roomId: string) => {
        // ... (logika delete room tetap sama) ...
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
            }
        } else {
            alert('Anda tidak memiliki izin untuk menghapus room ini.');
        }
    }, [currentUser, rooms, currentRoom]);

    const handleSendMessage = useCallback((message: ChatMessage) => {
        // ... (logika send message tetap sama) ...
         if (!currentRoom) return;
        setMessages(prev => {
            const roomMessages = prev[currentRoom.id] || [];
            return {
                ...prev,
                [currentRoom.id]: [...roomMessages, message]
            };
        });
    }, [currentRoom]);

    const handleReaction = useCallback((messageId: string, emoji: string) => {
        // ... (logika reaction tetap sama) ...
          if (!currentRoom || !currentUser?.username) return; // Need room and user context

         const username = currentUser.username; // Get username

         setMessages(prevMessages => {
            const roomMessages = prevMessages[currentRoom.id] || [];

            const newRoomMessages = roomMessages.map(msg => {
                if (msg.id === messageId) {
                    const newReactions = { ...(msg.reactions || {}) };
                    const users = newReactions[emoji] || [];

                    if (users.includes(username)) {
                        const updatedUsers = users.filter(u => u !== username);
                         if (updatedUsers.length === 0) {
                            delete newReactions[emoji];
                         } else {
                            newReactions[emoji] = updatedUsers;
                         }
                    } else {
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
    }, [currentRoom, currentUser]);

  // --- Memoized Values ---
  // ... (memoized values tetap sama) ...
  const totalUsers = useMemo(() => rooms.reduce((sum, room) => sum + room.userCount, 0), [rooms]);
  const heroCoin = searchedCoin || (trendingCoins.length > 0 ? trendingCoins[0] : null);
  const otherTrendingCoins = searchedCoin ? [] : trendingCoins.slice(1);
  const hotCoin = trendingCoins.length > 1 ? { name: trendingCoins[1].name, logo: trendingCoins[1].image, price: trendingCoins[1].price, change: trendingCoins[1].change } : null;

  // --- Render Logic ---
  const renderActivePage = () => {
    // ... (render logic for pages, pastikan onDeleteRoom di-pass ke RoomsListPage) ...
     switch (activePage) {
      case 'home':
        return <HomePage
                  idrRate={idrRate} isRateLoading={isRateLoading} currency={currency} onIncrementAnalysisCount={handleIncrementAnalysisCount}
                  fullCoinList={fullCoinList} isCoinListLoading={isCoinListLoading} coinListError={coinListError}
                  heroCoin={heroCoin} otherTrendingCoins={otherTrendingCoins} isTrendingLoading={isTrendingLoading} trendingError={trendingError} onSelectCoin={handleSelectCoin} onReloadTrending={handleResetToTrending}
               />;
      case 'rooms':
        return <RoomsListPage
                    rooms={rooms} onJoinRoom={handleJoinRoom} onCreateRoom={handleCreateRoom} totalUsers={totalUsers} hotCoin={hotCoin} userProfile={currentUser}
                    currentRoomId={currentRoom?.id || null} joinedRoomIds={joinedRoomIds} onLeaveJoinedRoom={handleLeaveJoinedRoom} unreadCounts={unreadCounts}
                    onDeleteRoom={handleDeleteRoom} // Pastikan prop ini ada
                />;
      case 'forum':
         return <ForumPage
                    room={currentRoom} messages={currentRoom ? messages[currentRoom.id] || [] : []} userProfile={currentUser}
                    onSendMessage={handleSendMessage} onLeaveRoom={handleLeaveRoom} onReact={handleReaction}
                />;
      case 'about':
        return <AboutPage />;
      default:
        return <HomePage
                  idrRate={idrRate} isRateLoading={isRateLoading} currency={currency} onIncrementAnalysisCount={handleIncrementAnalysisCount}
                  fullCoinList={fullCoinList} isCoinListLoading={isCoinListLoading} coinListError={coinListError}
                  heroCoin={heroCoin} otherTrendingCoins={otherTrendingCoins} isTrendingLoading={isTrendingLoading} trendingError={trendingError} onSelectCoin={handleSelectCoin} onReloadTrending={handleResetToTrending}
                />;
    }
  };

  // --- Authentication Flow Rendering ---
  if (!currentUser && !pendingGoogleUser) {
    return <LoginPage onGoogleRegisterSuccess={handleGoogleRegisterSuccess} onLogin={handleLogin} />;
  }

  if (pendingGoogleUser) {
      return <CreateIdPage onProfileComplete={handleProfileComplete} googleProfile={pendingGoogleUser} />;
  }

  // --- Main App Render (Logged In) ---
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