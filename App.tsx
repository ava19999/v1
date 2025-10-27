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
import { ADMIN_USERNAMES } from './components/UserTag'; // <-- Impor admin list (Sudah benar)

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
  // ... (semua state tetap sama)
  const [activePage, setActivePage] = useState<Page>('home');
  const [currency, setCurrency] = useState<Currency>('usd');
  const [idrRate, setIdrRate] = useState<number | null>(null);
  const [isRateLoading, setIsRateLoading] = useState(true);
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
  const [messages, setMessages] = useState<{[key: string]: ForumMessageItem[]}>(() => { /* ... load messages ... */
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

  // ... (semua useEffect dan handler lain tetap sama, termasuk handleDeleteRoom)
   useEffect(() => { /* Load/Save users & currentUser */ }, [users, currentUser]);
   useEffect(() => { /* Load/Save users */ }, [users]);
   useEffect(() => { /* Load/Save currentUser */ }, [currentUser]);
   const handleGoogleRegisterSuccess = useCallback((credentialResponse: any) => { /* ... */ }, [users]);
   const handleLogin = useCallback(async (username: string, password: string): Promise<string | void> => { /* ... */ }, [users]);
   const handleProfileComplete = useCallback(async (username: string, password: string): Promise<string | void> => { /* ... */ }, [users, pendingGoogleUser]);
   const handleLogout = useCallback(() => { /* ... */ }, []);
   useEffect(() => { /* getRate */ }, []);
   useEffect(() => { /* fetchList */ }, []);
   const fetchTrendingData = useCallback(async (showSkeleton = true) => { /* ... */ }, []);
   useEffect(() => { /* fetchTrendingData */ }, [fetchTrendingData]);
   const handleSelectCoin = useCallback(async (coinId: string) => { /* ... */ }, []);
   const handleResetToTrending = useCallback(() => { /* ... */ }, [fetchTrendingData]);
   useEffect(() => { /* Load unreadCounts */ }, []);
   useEffect(() => { /* Save unreadCounts */ }, [unreadCounts]);
   useEffect(() => { /* Save messages */ }, [messages]);
   useEffect(() => { /* Reset/Load analysisCounts */ }, []);
   useEffect(() => { /* Fetch News */ }, [currentRoom]);
   useEffect(() => { /* Simulate unread counts */ }, [joinedRoomIds, currentRoom]);
   const handleIncrementAnalysisCount = useCallback((coinId: string) => { /* ... */ }, []);
   const handleNavigate = useCallback((page: Page) => { /* ... */ }, [activePage, handleResetToTrending]);
   const handleJoinRoom = useCallback((room: Room) => { /* ... */ }, [messages, currentUser]);
   const handleLeaveRoom = useCallback(() => { /* ... */ }, []);
   const handleLeaveJoinedRoom = useCallback((roomId: string) => { /* ... */ }, [currentRoom]);
   const handleSendMessage = useCallback((message: ChatMessage) => { /* ... */ }, [currentRoom]);
   const handleReaction = useCallback((messageId: string, emoji: string) => { /* ... */ }, [currentRoom, currentUser]);

   const handleCreateRoom = useCallback((roomName: string) => {
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
    if (!currentUser?.username) return;
    const roomToDelete = rooms.find(r => r.id === roomId);
    if (!roomToDelete) return;
    const isAdmin = ADMIN_USERNAMES.map(name => name.toLowerCase()).includes(currentUser.username.toLowerCase());
    const isCreator = roomToDelete.createdBy === currentUser.username;
    if (['berita-kripto', 'pengumuman-aturan'].includes(roomId)) {
        alert('Room default tidak dapat dihapus.');
        return;
    }
    if (isAdmin || isCreator) {
        if (window.confirm(`Apakah Anda yakin ingin menghapus room "${roomToDelete.name}"? Tindakan ini tidak dapat diurungkan.`)) {
            setRooms(prevRooms => prevRooms.filter(room => room.id !== roomId));
            if (currentRoom?.id === roomId) {
                setCurrentRoom(null);
                setActivePage('rooms');
            }
            setJoinedRoomIds(prevIds => {
                const newIds = new Set(prevIds);
                newIds.delete(roomId);
                return newIds;
            });
            setMessages(prevMessages => {
                const newMessages = { ...prevMessages };
                delete newMessages[roomId];
                return newMessages;
            });
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

  // Memoized values (tetap sama)
  const totalUsers = useMemo(() => rooms.reduce((sum, room) => sum + room.userCount, 0), [rooms]);
  const heroCoin = searchedCoin || (trendingCoins.length > 0 ? trendingCoins[0] : null);
  const otherTrendingCoins = searchedCoin ? [] : trendingCoins.slice(1);
  const hotCoin = trendingCoins.length > 1 ? { name: trendingCoins[1].name, logo: trendingCoins[1].image, price: trendingCoins[1].price, change: trendingCoins[1].change } : null;

  // Render Logic
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
        // Pastikan onDeleteRoom diteruskan di sini
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
                    onDeleteRoom={handleDeleteRoom} // <-- Perbaikan di sini
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
        // Halaman default juga butuh prop yang sama dengan 'home'
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

  // ... (sisa kode render App, autentikasi flow, dll)
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
        {currentUser && renderActivePage()}
      </main>
      <Footer />
    </div>
  );
};

export default App;