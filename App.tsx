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

const defaultMessages: { [key: string]: ForumMessageItem[] } = {
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

  // --- New Authentication State ---
  const [users, setUsers] = useState<{ [username: string]: User }>({});
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
      { id: 'umum', name: 'Kripto Naik/Turun Hari Ini', userCount: 134 + Math.floor(Math.random() * 20) },
      { id: 'meme', name: 'Meme Coin Mania', userCount: 88 + Math.floor(Math.random() * 20) },
      { id: 'xrp-army', name: 'Xrp Army', userCount: 73 + Math.floor(Math.random() * 20) },
      { id: 'roblox-tuker-kripto', name: 'Roblox Tuker Kripto', userCount: 42 + Math.floor(Math.random() * 20) },
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

  const handleGoogleRegisterSuccess = useCallback((credentialResponse: any) => {
    const profile: GoogleProfile = jwtDecode(credentialResponse.credential);
    
    // Check if a user with this Google email already exists
    const existingUser = Object.values(users).find(u => u.email === profile.email);

    if (existingUser) {
        // Automatically log in the existing user
        setCurrentUser(existingUser);
    } else {
        // It's a new user, so proceed to profile completion step
        setPendingGoogleUser(profile);
    }
  }, [users]);

  const handleLogin = useCallback(async (username: string, password: string): Promise<string | void> => {
    const user = users[username.toLowerCase()];
    if (user && user.password === password) {
      setCurrentUser(user);
    } else {
      return 'Username atau kata sandi salah.';
    }
  }, [users]);

  const handleProfileComplete = useCallback(async (username: string, password: string): Promise<string | void> => {
    if (!pendingGoogleUser) {
        return 'Sesi pendaftaran tidak valid. Silakan coba lagi.';
    }
    
    const lowercasedUsername = username.toLowerCase();
    
    if (users[lowercasedUsername]) {
        return 'Username ini sudah digunakan. Silakan pilih yang lain.';
    }

    const newUser: User = {
        email: pendingGoogleUser.email,
        username: username, // Keep original casing for display
        password: password,
        googleProfilePicture: pendingGoogleUser.picture,
        createdAt: Date.now()
    };

    const newUsers = { ...users, [lowercasedUsername]: newUser };
    setUsers(newUsers);
    setCurrentUser(newUser);
    setPendingGoogleUser(null); // Clear pending state
  }, [users, pendingGoogleUser]);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
  }, []);

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
  }, [fetchTrendingData]);
  

  const handleSelectCoin = useCallback(async (coinId: string) => {
      setIsTrendingLoading(true);
      setTrendingError(null);
      setSearchedCoin(null);
      try {
          const coin = await fetchCoinDetails(coinId);
          setSearchedCoin(coin);
      } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Gagal memuat detail koin.";
          setTrendingError(errorMessage);
      } finally {
          setIsTrendingLoading(false);
      }
  }, []);

  const handleResetToTrending = useCallback(() => {
      setSearchedCoin(null);
      fetchTrendingData(true);
  }, [fetchTrendingData]);

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

    useEffect(() => {
        try {
            localStorage.setItem('forumMessages', JSON.stringify(messages));
        } catch (e) {
            console.error("Gagal menyimpan pesan ke localStorage", e);
        }
    }, [messages]);

  useEffect(() => {
    const lastResetDate = localStorage.getItem('lastAnalysisResetDate');
    const today = new Date().toISOString().split('T')[0];

    if (lastResetDate !== today) {
      const initialCounts = {};
      setAnalysisCounts(initialCounts);
      localStorage.setItem('analysisCounts', JSON.stringify(initialCounts));
      localStorage.setItem('lastAnalysisResetDate', today);
    } else {
      const savedCounts = localStorage.getItem('analysisCounts');
      if (savedCounts) {
        try {
            setAnalysisCounts(JSON.parse(savedCounts));
        } catch(e) {
            console.error("Failed to parse analysis counts from localStorage", e);
            setAnalysisCounts({});
        }
      }
    }
  }, []);

  useEffect(() => {
      const NEWS_ROOM_ID = 'berita-kripto';
      const NEWS_FETCH_INTERVAL = 20 * 60 * 1000;
      const LAST_FETCH_KEY = 'lastNewsFetchTimestamp';
      
      const fetchAndProcessNews = async () => {
          const now = Date.now();
          const lastFetchTimestamp = parseInt(localStorage.getItem(LAST_FETCH_KEY) || '0', 10);

          if (now - lastFetchTimestamp < NEWS_FETCH_INTERVAL) {
              return;
          }

          try {
              const fetchedArticles = await fetchNewsArticles();
              if (!fetchedArticles || fetchedArticles.length === 0) return;
              
              let newArticleAdded = false;

              setMessages(prevMessages => {
                  const allMessagesInRoom = prevMessages[NEWS_ROOM_ID] || [];
                  const existingNewsUrls = new Set(
                    allMessagesInRoom
                      .filter((msg): msg is NewsArticle => 'url' in msg)
                      .map(news => news.url)
                  );
                  
                  const latestArticle = fetchedArticles.find(article => !existingNewsUrls.has(article.url));
                  
                  if (latestArticle) {
                      newArticleAdded = true;
                      const newItemToAdd: NewsArticle = {
                          ...latestArticle,
                          id: latestArticle.url,
                          reactions: {},
                      };
                      
                      return {
                          ...prevMessages,
                          [NEWS_ROOM_ID]: [...allMessagesInRoom, newItemToAdd],
                      };
                  }
                  
                  return prevMessages;
              });

              if (newArticleAdded) {
                  localStorage.setItem(LAST_FETCH_KEY, now.toString()); 
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
      
      fetchAndProcessNews();

      const intervalId = setInterval(fetchAndProcessNews, 60 * 1000); 
      
      return () => {
          clearInterval(intervalId);
      };
  }, [currentRoom]); 

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
        }, 20000);

        return () => clearInterval(simulationInterval);
    }, [joinedRoomIds, currentRoom]);

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
      handleResetToTrending();
    } else if (page === 'forum') {
      setActivePage('rooms');
    }
    else {
      setActivePage(page);
    }
  }, [activePage, handleResetToTrending]);

  const handleJoinRoom = useCallback((room: Room) => {
      setCurrentRoom(room);

      setUnreadCounts(prev => {
          const roomId = room.id;
          if (prev[roomId] && prev[roomId].count > 0) {
              return {
                  ...prev,
                  [roomId]: {
                      ...prev[roomId],
                      count: 0,
                  },
              };
          }
          return prev;
      });
      
      setJoinedRoomIds(prevIds => {
          const newIds = new Set(prevIds);
          newIds.add(room.id);
          return newIds;
      });

      if (!messages[room.id] && currentUser?.username) {
          const welcomeMessage: ChatMessage = {
              id: new Date().toISOString(),
              type: 'system',
              text: `Selamat datang di room "${room.name}". Anda bergabung sebagai ${currentUser.username}.`,
              sender: 'system',
              timestamp: Date.now(),
          };

          const roomMessages: ForumMessageItem[] = [welcomeMessage];

          if (!['berita-kripto', 'pengumuman-aturan'].includes(room.id)) {
              const adminMessage: ChatMessage = {
                  id: `admin-msg-${room.id}`,
                  type: 'user',
                  text: 'Halo para trader! Ingat, riset sendiri itu kunci. Jangan gampang percaya "sinyal" dari orang lain ya. Cuan bareng!',
                  sender: 'Admin_RTC',
                  timestamp: Date.now() + 1,
                  reactions: { '👍': [] }
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
      setCurrentRoom(null);
      setActivePage('rooms');
  }, []);

  const handleLeaveJoinedRoom = useCallback((roomId: string) => {
      if (['berita-kripto', 'pengumuman-aturan'].includes(roomId)) {
          return;
      }
      setJoinedRoomIds(prevIds => {
          const newIds = new Set(prevIds);
          newIds.delete(roomId);
          return newIds;
      });
      if (currentRoom?.id === roomId) {
          setCurrentRoom(null);
          setActivePage('rooms');
      }
  }, [currentRoom]);
  
  const handleCreateRoom = useCallback((roomName: string) => {
      const trimmedRoomName = roomName.trim();
      const roomExists = rooms.some(room => room.name.toLowerCase() === trimmedRoomName.toLowerCase());
      
      if(roomExists) {
          alert('Room dengan nama tersebut sudah ada. Silakan pilih nama lain.');
          return;
      }

      const newRoom: Room = {
          id: trimmedRoomName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
          name: trimmedRoomName,
          userCount: 1,
      };
      setRooms(prev => [newRoom, ...prev]);
      handleJoinRoom(newRoom);
  }, [handleJoinRoom, rooms]);

  const handleSendMessage = useCallback((message: ChatMessage) => {
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
    if (!currentRoom || !currentUser?.username) return;
    const username = currentUser.username;

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

  const totalUsers = useMemo(() => rooms.reduce((sum, room) => sum + room.userCount, 0), [rooms]);
  const heroCoin = searchedCoin || (trendingCoins.length > 0 ? trendingCoins[0] : null);
  const otherTrendingCoins = searchedCoin ? [] : trendingCoins.slice(1);
  const hotCoin = trendingCoins.length > 1 ? { name: trendingCoins[1].name, logo: trendingCoins[1].image, price: trendingCoins[1].price, change: trendingCoins[1].change } : null;

  const renderActivePage = () => {
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
  
  if (!currentUser && !pendingGoogleUser) {
    return <LoginPage onGoogleRegisterSuccess={handleGoogleRegisterSuccess} onLogin={handleLogin} />;
  }

  if (pendingGoogleUser) {
      return <CreateIdPage onProfileComplete={handleProfileComplete} googleProfile={pendingGoogleUser} />;
  }


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
        {renderActivePage()}
      </main>
      <Footer />
    </div>
  );
};

export default App;