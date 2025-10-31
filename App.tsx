// ava19999/v1/v1-1e0a8198e325d409dd8ea26e029e0b4dd5c5e986/App.tsx
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Session, User as SupabaseUser, RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './services/supabaseService'; // Import client Supabase baru

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
import type {
  ForumMessageItem,
  Room,
  CoinListItem,
  CryptoData,
  ChatMessage,
  Page,
  Currency,
  NewsArticle,
  User, // Tipe User lokal kita
  GoogleProfile,
  NotificationSettings,
  RoomUserCounts,
  TypingStatus,
  TypingUsersMap
} from './types';
import { isNewsArticle, isChatMessage } from './types';
import {
  fetchIdrRate,
  fetchNewsArticles,
  fetchTop500Coins,
  fetchTrendingCoins,
  fetchCoinDetails
} from './services/mockData';
import { ADMIN_USERNAMES } from './components/UserTag';

const DEFAULT_ROOM_IDS = ['berita-kripto', 'pengumuman-aturan'];
const TYPING_TIMEOUT = 5000; // 5 detik

// Sound notification
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.8; // Volume 80%
    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    console.log('Error memutar suara notifikasi:', error);
  }
};

const Particles: React.FC = () => (
  <div className="particles fixed top-0 left-0 w-full h-full -z-10 pointer-events-none">
    <div className="particle absolute bg-electric/50 rounded-full opacity-0" style={{ width: '3px', height: '3px', left: '10%', animation: 'drift 20s linear infinite', animationDelay: '-1s' }} />
    <div className="particle absolute bg-magenta/50 rounded-full opacity-0" style={{ width: '2px', height: '2px', left: '25%', animation: 'drift 25s linear infinite', animationDelay: '-5s' }} />
    <div className="particle absolute bg-lime/50 rounded-full opacity-0" style={{ width: '4px', height: '4px', left: '50%', animation: 'drift 15s linear infinite', animationDelay: '-10s' }} />
    <div className="particle absolute bg-electric/30 rounded-full opacity-0" style={{ width: '2px', height: '2px', left: '75%', animation: 'drift 18s linear infinite', animationDelay: '-7s' }} />
    <div className="particle absolute bg-lime/40 rounded-full opacity-0" style={{ width: '3px', height: '3px', left: '90%', animation: 'drift 22s linear infinite', animationDelay: '-3s' }} />
    <style>{`
      @keyframes drift {
        from { transform: translateY(-10vh) translateX(0); opacity: 0; }
        10% { opacity: 0.6; }
        50% { transform: translateY(50vh) translateX(10px); opacity: 0.3; }
        to { transform: translateY(110vh) translateX(-10px); opacity: 0; }
      }
    `}</style>
  </div>
);

// Ganti AppContent menjadi App
const App: React.FC = () => {
  // State Halaman & UI
  const [activePage, setActivePage] = useState<Page>('home');
  const [currency, setCurrency] = useState<Currency>('usd');
  const [idrRate, setIdrRate] = useState<number | null>(null);
  const [isRateLoading, setIsRateLoading] = useState(true);

  // State Auth Supabase
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null); // Tipe User lokal kita
  const [pendingGoogleUser, setPendingGoogleUser] = useState<GoogleProfile | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // State Data Koin
  const [analysisCounts, setAnalysisCounts] = useState<{ [key: string]: number }>({});
  const baseAnalysisCount = 1904;
  const [fullCoinList, setFullCoinList] = useState<CoinListItem[]>([]);
  const [isCoinListLoading, setIsCoinListLoading] = useState(true);
  const [coinListError, setCoinListError] = useState<string | null>(null);
  const [trendingCoins, setTrendingCoins] = useState<CryptoData[]>([]);
  const [isTrendingLoading, setIsTrendingLoading] = useState(true);
  const [trendingError, setTrendingError] = useState<string | null>(null);
  const [searchedCoin, setSearchedCoin] = useState<CryptoData | null>(null);
  
  // State Room & Pesan
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [roomChannel, setRoomChannel] = useState<RealtimeChannel | null>(null);
  const [joinedRoomIds, setJoinedRoomIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('joinedRoomIds');
    return saved ? new Set(JSON.parse(saved)) : new Set(DEFAULT_ROOM_IDS);
  });
  const [unreadCounts, setUnreadCounts] = useState<{ [key: string]: number }>({});
  // Ganti nama state dari firebaseMessages ke chatMessages
  const [chatMessages, setChatMessages] = useState<{ [roomId: string]: ForumMessageItem[] }>({});
  const [userLastVisit, setUserLastVisit] = useState<{ [roomId: string]: number }>({});
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({});
  const [roomUserCounts, setRoomUserCounts] = useState<RoomUserCounts>({});
  
  // State Typing
  const [typingUsers, setTypingUsers] = useState<TypingUsersMap>({});
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingCallRef = useRef<number>(0);

  // Refs
  const prevTotalUnreadRef = useRef<number>(0);
  const lastSoundPlayTimeRef = useRef<number>(0);
  const roomListenersRef = useRef<{ [roomId: string]: RealtimeChannel }>({}); // Simpan channel, bukan fungsi

  // --- EFEK AUTH SUPABASE ---
  useEffect(() => {
    setIsAuthLoading(true);
    // 1. Cek sesi awal
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      if (session) {
        // 2. Jika ada sesi, ambil profil
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (profile && !profile.username) {
          // User baru (username masih null), perlu set username
          setPendingGoogleUser({
            email: session.user.email || '',
            name: session.user.user_metadata?.full_name || 'User',
            picture: session.user.user_metadata?.picture || profile.google_profile_picture || ''
          });
          setCurrentUser(null);
        } else if (profile) {
          // User sudah ada dan punya username
          setCurrentUser({
              email: session.user.email || '',
              username: profile.username,
              googleProfilePicture: profile.google_profile_picture || undefined,
              createdAt: new Date(profile.created_at).getTime()
          });
          setPendingGoogleUser(null);
        }
      }
      setIsAuthLoading(false);
    });

    // 3. Dengarkan perubahan auth (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setSupabaseUser(session?.user ?? null);
        
        if (session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile && profile.username) {
            // User ada dan lengkap
            setCurrentUser({
                email: session.user.email || '',
                username: profile.username,
                googleProfilePicture: profile.google_profile_picture || undefined,
                createdAt: new Date(profile.created_at).getTime()
            });
            setPendingGoogleUser(null);
          } else if (session.user) {
            // User baru, perlu set username
            setPendingGoogleUser({
               email: session.user.email || '',
               name: session.user.user_metadata?.full_name || 'User',
               picture: session.user.user_metadata?.picture || profile?.google_profile_picture || ''
            });
            setCurrentUser(null);
          }
        } else {
          // Logout
          setCurrentUser(null);
          setPendingGoogleUser(null);
        }
        setIsAuthLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // --- EFEK DATA ROOMS (REALTIME) ---
  useEffect(() => {
    // 1. Ambil data awal
    const fetchRooms = async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('*');
        
      if (error) {
        console.error("Gagal mengambil rooms:", error);
        return;
      }
        
      if (data) {
        const mappedRooms: Room[] = data.map(r => ({
          id: r.room_id, // Gunakan room_id string sebagai ID di aplikasi
          name: r.name,
          userCount: roomUserCounts[r.room_id] || 0, // Diisi oleh Presence
          createdBy: r.created_by || undefined, // Ini adalah uuid
          isDefaultRoom: r.is_default_room || false
        }));
        
        // Pastikan room default ada di list
        const defaultRooms: Room[] = [];
        if (!mappedRooms.find(r => r.id === 'berita-kripto')) {
          defaultRooms.push({ id: 'berita-kripto', name: 'Berita Kripto', userCount: 0, isDefaultRoom: true });
        }
         if (!mappedRooms.find(r => r.id === 'pengumuman-aturan')) {
          defaultRooms.push({ id: 'pengumuman-aturan', name: 'Pengumuman & Aturan', userCount: 0, isDefaultRoom: true });
        }
        
        setRooms([...defaultRooms, ...mappedRooms.filter(r => !DEFAULT_ROOM_IDS.includes(r.id))]);
      }
    };
    
    fetchRooms();

    // 2. Dengarkan perubahan (INSERT, UPDATE, DELETE)
    const channel = supabase.channel('public:rooms')
      .on('postgres_changes', {
          event: '*', // Dengarkan semua event
          schema: 'public',
          table: 'rooms'
      }, 
      (payload) => {
          console.log('Perubahan data rooms terdeteksi, mengambil ulang...', payload);
          fetchRooms(); // Ambil ulang semua data
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomUserCounts]); // Ambil ulang jika user count berubah

  // --- EFEK DATA PESAN (REALTIME) ---
  useEffect(() => {
    // Berhenti jika tidak ada room
    if (!currentRoom?.id) return;
    
    // Jangan ambil pesan untuk 'berita-kripto' (ditangani oleh state News)
    if (currentRoom.id === 'berita-kripto') {
      setChatMessages(prev => ({ ...prev, [currentRoom.id!]: [] }));
      return;
    }

    let channel: RealtimeChannel | null = null;
    
    const setupMessageListener = async () => {
      // 1. Dapatkan PK (Primary Key) dari room_id string
      const { data: roomData } = await supabase
        .from('rooms')
        .select('id') // Ambil 'id' (bigint)
        .eq('room_id', currentRoom.id) // Gunakan 'room_id' (text)
        .single();
        
      if (!roomData) {
        console.error(`Tidak dapat menemukan PK untuk room_id: ${currentRoom.id}`);
        return;
      }
      
      const roomPk = roomData.id; // Ini adalah room_id (bigint) untuk foreign key

      // 2. Ambil semua pesan awal
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomPk)
        .order('created_at', { ascending: true });

      if (error) {
        console.error(`Gagal mengambil pesan untuk room ${currentRoom.id}:`, error);
        return;
      }

      if (messagesData) {
        const mappedMessages: ChatMessage[] = messagesData.map(msg => ({
          id: msg.id.toString(), // Gunakan ID pesan (PK)
          type: msg.type as 'user' | 'system',
          uid: msg.user_id || undefined,
          text: msg.text || undefined,
          sender: msg.sender_username,
          timestamp: new Date(msg.created_at).getTime(),
          fileURL: msg.file_url || undefined,
          fileName: msg.file_name || undefined,
          reactions: msg.reactions as any || {},
          userCreationDate: msg.user_creation_date ? new Date(msg.user_creation_date).getTime() : undefined,
        }));
        setChatMessages(prev => ({ ...prev, [currentRoom.id!]: mappedMessages }));
      }
      
      // 3. Dengarkan perubahan realtime
      channel = supabase.channel(`public:messages:room_id=eq.${roomPk}`)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `room_id=eq.${roomPk}`
        }, 
        (payload) => {
            console.log('Perubahan pesan terdeteksi!', payload);
            
            if (payload.eventType === 'INSERT') {
              const msg = payload.new as any;
              const newMessage: ChatMessage = {
                id: msg.id.toString(),
                type: msg.type as 'user' | 'system',
                uid: msg.user_id || undefined,
                text: msg.text || undefined,
                sender: msg.sender_username,
                timestamp: new Date(msg.created_at).getTime(),
                fileURL: msg.file_url || undefined,
                fileName: msg.file_name || undefined,
                reactions: msg.reactions as any || {},
                userCreationDate: msg.user_creation_date ? new Date(msg.user_creation_date).getTime() : undefined,
              };
              setChatMessages(prev => ({
                ...prev,
                [currentRoom.id!]: [...(prev[currentRoom.id!] || []), newMessage]
              }));
            }
            
            else if (payload.eventType === 'UPDATE') {
              const updatedMsg = payload.new as any;
              setChatMessages(prev => {
                  const roomMessages = prev[currentRoom.id!] || [];
                  return {
                      ...prev,
                      [currentRoom.id!]: roomMessages.map(m => 
                          m.id === updatedMsg.id.toString() 
                          ? { ...m, reactions: updatedMsg.reactions as any || {}, text: updatedMsg.text || undefined }
                          : m
                      )
                  };
              });
            }
            
            else if (payload.eventType === 'DELETE') {
              const deletedMsgId = (payload.old as any).id.toString();
              setChatMessages(prev => ({
                  ...prev,
                  [currentRoom.id!]: (prev[currentRoom.id!] || []).filter(m => m.id !== deletedMsgId)
              }));
            }
        })
        .subscribe();
    };

    setupMessageListener();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [currentRoom]);

  // --- EFEK UNTUK PRESENCE & TYPING ---
  useEffect(() => {
    // Keluar jika channel lama masih ada atau jika user/room tidak ada
    if (roomChannel) {
      supabase.removeChannel(roomChannel);
      setRoomChannel(null);
    }
    if (!currentRoom || !currentUser || !supabaseUser) {
      return;
    }

    const newChannel = supabase.channel(`room-${currentRoom.id}`, {
      config: {
        presence: { key: currentUser.username },
      },
    });

    // 1. Dengarkan event typing
    newChannel.on('broadcast', { event: 'typing' }, ({ payload }) => {
      const { username, userCreationDate, isTyping } = payload;
      if (username === currentUser.username) return; // Abaikan event sendiri
      
      setTypingUsers(prev => {
        const roomTyping = { ...(prev[currentRoom.id!] || {}) };
        if (isTyping) {
          roomTyping[username] = { username, userCreationDate, timestamp: Date.now() };
        } else {
          delete roomTyping[username];
        }
        return { ...prev, [currentRoom.id!]: roomTyping };
      });
    });
    
    // 2. Dengarkan perubahan presence (user join/leave)
    newChannel.on('presence', { event: 'sync' }, () => {
      try {
        const presenceState = newChannel.presenceState();
        const userCount = Object.keys(presenceState).length;
        console.log(`Presence sync room ${currentRoom.id}: ${userCount} users`, presenceState);
        setRoomUserCounts(prev => ({ ...prev, [currentRoom.id!]: userCount }));
      } catch (error) {
        console.error("Error saat sync presence:", error);
      }
    });

    // 3. Subscribe ke channel
    newChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        try {
          await newChannel.track({ 
            user: currentUser.username, 
            createdAt: currentUser.createdAt 
          });
          console.log(`Berhasil 'track' di room ${currentRoom.id}`);
        } catch (error) {
          console.error("Gagal 'track' presence:", error);
        }
      }
    });

    setRoomChannel(newChannel);

    return () => {
      if (newChannel) {
        newChannel.untrack();
        supabase.removeChannel(newChannel);
      }
    };

  }, [currentRoom, currentUser, supabaseUser]);

  // --- EFEK UNREAD COUNT (HANYA UNTUK ROOM YANG DIIKUTI TAPI TIDAK DIBUKA) ---
  useEffect(() => {
    // Hapus semua listener lama
    Object.values(roomListenersRef.current).forEach(channel => supabase.removeChannel(channel));
    roomListenersRef.current = {};

    const setupUnreadListeners = async () => {
      for (const roomId of joinedRoomIds) {
        if (roomId === currentRoom?.id || roomId === 'berita-kripto') continue;

        const { data: roomData } = await supabase.from('rooms').select('id').eq('room_id', roomId).single();
        if (!roomData) continue;
        const roomPk = roomData.id;

        const channel = supabase.channel(`public:messages:room_id=eq.${roomPk}:unread`)
          .on('postgres_changes', {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `room_id=eq.${roomPk}`
          }, (payload) => {
            const newMessage = payload.new as any;
            const lastVisit = userLastVisit[roomId] || 0;
            // Cek jika pesan baru & bukan dari user saat ini
            if (newMessage.created_at && (new Date(newMessage.created_at).getTime() > lastVisit) && newMessage.user_id !== supabaseUser?.id) {
              setUnreadCounts(prev => ({
                ...prev,
                [roomId]: (prev[roomId] || 0) + 1
              }));
            }
          })
          .subscribe();
        
        roomListenersRef.current[roomId] = channel;
      }
    };
    
    if (supabaseUser) setupUnreadListeners();

    return () => {
      Object.values(roomListenersRef.current).forEach(channel => supabase.removeChannel(channel));
      roomListenersRef.current = {};
    };
  }, [joinedRoomIds, currentRoom, supabaseUser, userLastVisit]);


  // --- EFEK DATA LAIN (TIDAK BERUBAH) ---
  useEffect(() => {
    const getRate = async () => { 
      setIsRateLoading(true);
      try { setIdrRate(await fetchIdrRate()); }
      catch (error) { console.error('Gagal ambil kurs IDR:', error); setIdrRate(16000); }
      finally { setIsRateLoading(false); }
    }; getRate();
  }, []);
  
  useEffect(() => {
    const fetchList = async () => { 
      setIsCoinListLoading(true);
      setCoinListError(null);
      try { setFullCoinList(await fetchTop500Coins()); }
      catch (err) { setCoinListError('Gagal ambil daftar koin.'); }
      finally { setIsCoinListLoading(false); }
    }; fetchList();
  }, []);
  
  const fetchTrendingData = useCallback(async (showSkeleton = true) => { 
    if (showSkeleton) { setIsTrendingLoading(true); setTrendingError(null); }
    try { setTrendingCoins(await fetchTrendingCoins()); }
    catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal memuat data tren.';
      if (showSkeleton) setTrendingError(errorMessage);
      else console.error('Gagal menyegarkan data tren:', errorMessage);
    } finally { if (showSkeleton) setIsTrendingLoading(false); }
  }, []);

  useEffect(() => { fetchTrendingData(true); }, [fetchTrendingData]);

  const fetchAndStoreNews = useCallback(async () => { 
    try {
      const fetchedArticles = await fetchNewsArticles();
      if (fetchedArticles && fetchedArticles.length > 0) {
        const articlesWithIds: NewsArticle[] = fetchedArticles.map((article, index) => ({
          ...article, id: article.url, type: 'news' as const
        }));
        setNewsArticles(articlesWithIds);
        localStorage.setItem('cryptoNews', JSON.stringify(articlesWithIds));
        localStorage.setItem('lastNewsFetch', Date.now().toString());
        if (currentRoom?.id !== 'berita-kripto') {
          setUnreadCounts(prev => ({ ...prev, 'berita-kripto': (prev['berita-kripto'] || 0) + 1 }));
        }
      }
    } catch (error) { console.error('Gagal mengambil berita kripto:', error); }
  }, [currentRoom?.id]);
  
  useEffect(() => {
    const savedNews = localStorage.getItem('cryptoNews');
    const lastFetch = localStorage.getItem('lastNewsFetch');
    const now = Date.now();
    const twentyMinutes = 20 * 60 * 1000;
    if (savedNews) try { setNewsArticles(JSON.parse(savedNews)); } catch (e) { console.error("Gagal parse berita:", e)}
    if (!lastFetch || (now - parseInt(lastFetch)) > twentyMinutes) fetchAndStoreNews();
    const newsInterval = setInterval(fetchAndStoreNews, twentyMinutes);
    return () => clearInterval(newsInterval);
  }, [fetchAndStoreNews]);

  // --- EFEK LOCAL STORAGE (SAMA) ---
  useEffect(() => { localStorage.setItem('joinedRoomIds', JSON.stringify(Array.from(joinedRoomIds))); }, [joinedRoomIds]);
  useEffect(() => { 
    const saved = localStorage.getItem('unreadCounts'); 
    if (saved) try { setUnreadCounts(JSON.parse(saved)); } catch (e) { console.error("Gagal parse unreadCounts:", e)} 
  }, []);
  useEffect(() => { localStorage.setItem('unreadCounts', JSON.stringify(unreadCounts)); }, [unreadCounts]);
  useEffect(() => { 
    const saved = localStorage.getItem('userLastVisit'); 
    if (saved) try { setUserLastVisit(JSON.parse(saved)); } catch (e) { console.error("Gagal parse userLastVisit:", e)} 
  }, []);
  useEffect(() => { localStorage.setItem('userLastVisit', JSON.stringify(userLastVisit)); }, [userLastVisit]);
  useEffect(() => {
    const lastReset = localStorage.getItem('lastAnalysisResetDate');
    const today = new Date().toISOString().split('T')[0];
    if (lastReset !== today) {
      localStorage.setItem('analysisCounts', '{}');
      localStorage.setItem('lastAnalysisResetDate', today);
      setAnalysisCounts({});
    } else {
      const saved = localStorage.getItem('analysisCounts');
      if (saved) try { setAnalysisCounts(JSON.parse(saved)); } catch (e) { console.error("Gagal parse analysis counts:", e)}
    }
  }, []);
  useEffect(() => {
    const savedSettings = localStorage.getItem('roomNotificationSettings');
    if (savedSettings) try { setNotificationSettings(JSON.parse(savedSettings)); } catch (e) { console.error("Gagal parse notif settings:", e)}
  }, []);
  useEffect(() => { localStorage.setItem('roomNotificationSettings', JSON.stringify(notificationSettings)); }, [notificationSettings]);

  // --- EFEK SUARA NOTIFIKASI (SAMA) ---
  useEffect(() => {
    const currentTotal = Object.entries(unreadCounts).reduce((total, [roomId, count]) => {
      if (notificationSettings[roomId] !== false && roomId !== currentRoom?.id) return total + count;
      return total;
    }, 0);
    const previousTotal = prevTotalUnreadRef.current;
    const now = Date.now();
    if (currentTotal > previousTotal && (now - lastSoundPlayTimeRef.current) > 1000) {
      playNotificationSound();
      lastSoundPlayTimeRef.current = now;
    }
    prevTotalUnreadRef.current = currentTotal;
  }, [unreadCounts, notificationSettings, currentRoom]);


  // --- HANDLER FUNGSI (VERSI SUPABASE) ---

  const handleProfileComplete = useCallback(async (username: string): Promise<string | void> => {
    setAuthError(null);
    if (!pendingGoogleUser || !session) {
      const msg = 'Sesi tidak valid untuk melengkapi profil.';
      setAuthError(msg); return msg;
    }
    // Cek dulu apakah username sudah ada
    const { data: existingUser } = await supabase.from('profiles').select('id').eq('username', username).single();
    if (existingUser) {
      const msg = 'Username sudah digunakan. Pilih username lain.';
      setAuthError(msg); return msg;
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        username: username,
        google_profile_picture: pendingGoogleUser.picture
      })
      .eq('id', session.user.id)
      .select()
      .single();

    if (error) {
      setAuthError(error.message); return error.message;
    }
    if (data) {
      setCurrentUser({
        email: session.user.email || '',
        username: data.username!, // Kita tahu ini tidak null karena kita baru set
        googleProfilePicture: data.google_profile_picture || undefined,
        createdAt: new Date(data.created_at).getTime()
      });
      setPendingGoogleUser(null);
      setActivePage('home');
    }
  }, [session, pendingGoogleUser]);
  
  const handleLogout = useCallback(() => {
    if (roomChannel) {
      roomChannel.untrack();
      supabase.removeChannel(roomChannel);
      setRoomChannel(null);
    }
    supabase.auth.signOut().then(() => {
      setCurrentRoom(null);
      setActivePage('home');
    }).catch((error) => {
      console.error('Gagal logout:', error);
      // Force logout di sisi client
      setCurrentUser(null); setSession(null); setSupabaseUser(null);
      setActivePage('home');
    });
  }, [roomChannel]);

  const handleResetToTrending = useCallback(() => {
    setSearchedCoin(null);
    fetchTrendingData(true);
  }, [fetchTrendingData]);
  
  const handleNavigate = useCallback((page: Page) => {
    if (currentRoom && (page !== 'forum' || activePage !== 'forum')) {
      if (roomChannel) {
        roomChannel.untrack();
        supabase.removeChannel(roomChannel);
        setRoomChannel(null);
      }
      setCurrentRoom(null);
    }
    if (page === 'home' && activePage === 'home') handleResetToTrending();
    else if (page === 'forum') setActivePage(currentRoom ? 'forum' : 'rooms');
    else setActivePage(page);
  }, [activePage, handleResetToTrending, currentRoom, roomChannel]);

  const handleJoinRoom = useCallback((room: Room) => {
    setCurrentRoom(room);
    setJoinedRoomIds(prev => new Set(prev).add(room.id));
    setActivePage('forum');
    setUnreadCounts(prev => ({ ...prev, [room.id]: 0 }));
    setUserLastVisit(prev => ({ ...prev, [room.id]: Date.now() }));
  }, []);

  const handleLeaveRoom = useCallback(() => {
    if (roomChannel) {
      roomChannel.untrack();
      supabase.removeChannel(roomChannel);
      setRoomChannel(null);
    }
    setCurrentRoom(null);
    setActivePage('rooms');
  }, [roomChannel]);
  
  const handleLeaveJoinedRoom = useCallback((roomId: string) => {
    if (DEFAULT_ROOM_IDS.includes(roomId)) return;
    setJoinedRoomIds(prev => { const n = new Set(prev); n.delete(roomId); return n; });
    setUnreadCounts(prev => { const n = { ...prev }; delete n[roomId]; return n; });
    setUserLastVisit(prev => { const n = { ...prev }; delete n[roomId]; return n; });
    setNotificationSettings(prev => { const n = { ...prev }; delete n[roomId]; return n; });
    if (currentRoom?.id === roomId) handleLeaveRoom();
  }, [currentRoom, handleLeaveRoom]);

  const handleCreateRoom = useCallback(async (roomName: string) => {
    if (!currentUser?.username || !supabaseUser) {
      alert('Anda harus login untuk membuat room.'); return;
    }
    const trimmedName = roomName.trim();
    if (trimmedName.length > 25 || trimmedName.length < 3) {
      alert('Nama room harus 3-25 karakter.'); return;
    }
    if (rooms.some(r => r.name.toLowerCase() === trimmedName.toLowerCase())) {
      alert('Nama room sudah ada.'); return;
    }

    const newRoomIdString = `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const { data, error } = await supabase
      .from('rooms')
      .insert({
        room_id: newRoomIdString,
        name: trimmedName,
        created_by: supabaseUser.id,
        is_default_room: false
      })
      .select()
      .single();

    if (error) {
      console.error('Gagal buat room:', error);
      alert('Gagal membuat room. Coba lagi.');
    } else if (data) {
      const newRoom: Room = {
        id: data.room_id,
        name: data.name,
        userCount: 0,
        createdBy: data.created_by,
        isDefaultRoom: data.is_default_room || false
      };
      handleJoinRoom(newRoom);
    }
  }, [rooms, currentUser, supabaseUser, handleJoinRoom]);
  
  const handleDeleteRoom = useCallback(async (roomId: string) => {
    if (!currentUser?.username || !supabaseUser) {
      alert('Anda harus login untuk menghapus.'); return;
    }
    const roomToDelete = rooms.find(r => r.id === roomId);
    if (!roomToDelete || roomToDelete.isDefaultRoom) return;

    // Cek admin atau kreator
    const isAdmin = ADMIN_USERNAMES.includes(currentUser.username);
    const isCreator = roomToDelete.createdBy === supabaseUser.id;

    if (!isAdmin && !isCreator) {
      alert('Hanya admin atau pembuat room yang bisa menghapus.'); return;
    }
    
    if (window.confirm(`Yakin ingin menghapus room "${roomToDelete.name}"? Ini akan menghapus semua pesan di dalamnya.`)) {
      // Dapatkan PK room dulu
      const { data: roomData } = await supabase.from('rooms').select('id').eq('room_id', roomId).single();
      if (!roomData) { alert('Room tidak ditemukan untuk dihapus.'); return; }
      
      // Hapus room. Pesan akan terhapus otomatis (ON DELETE CASCADE)
      const { error } = await supabase.from('rooms').delete().eq('id', roomData.id); 
      
      if (error) { alert(`Gagal menghapus room: ${error.message}`); }
      else { if (currentRoom?.id === roomId) handleLeaveRoom(); }
    }
  }, [currentUser, supabaseUser, rooms, currentRoom, handleLeaveRoom]);

  const handleSendMessage = useCallback(async (message: Partial<ChatMessage>) => {
    if (!currentRoom || !currentUser || !session) return;
    if (!message.text?.trim() && !message.fileURL) return;

    const room = rooms.find(r => r.id === currentRoom.id);
    if (!room) return;

    // Dapatkan PK (bigint) dari room
    const { data: roomData } = await supabase.from('rooms').select('id').eq('room_id', room.id).single();
    if (!roomData) return;

    const messageToSend = {
      room_id: roomData.id,
      user_id: session.user.id,
      sender_username: currentUser.username,
      user_creation_date: new Date(currentUser.createdAt).toISOString(),
      type: 'user' as const,
      text: message.text?.trim() || null,
      file_url: message.fileURL || null,
      file_name: message.fileName || null,
      reactions: {}
    };

    const { error } = await supabase.from('messages').insert(messageToSend);
    if (error) {
      console.error("Gagal kirim pesan:", error);
      alert(`Gagal mengirim pesan: ${error.message}`);
    }
    handleStopTyping(); // Panggil stop typing setelah mengirim
  }, [currentRoom, currentUser, session, rooms, handleStopTyping]);

  const handleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!currentRoom || !currentUser || !messageId || !emoji) return;

    const messagePk = parseInt(messageId, 10);
    if (isNaN(messagePk)) return;

    // 1. Ambil reaksi saat ini
    const { data } = await supabase
      .from('messages')
      .select('reactions')
      .eq('id', messagePk)
      .single();
    if (!data) return;

    const currentReactions = (data.reactions as { [key: string]: string[] }) || {};
    const usersForEmoji: string[] = currentReactions[emoji] || [];
    let updatedUsers: string[];

    if (usersForEmoji.includes(currentUser.username)) {
      updatedUsers = usersForEmoji.filter(u => u !== currentUser.username);
    } else {
      updatedUsers = [...usersForEmoji, currentUser.username];
    }
    
    if (updatedUsers.length === 0) {
      delete currentReactions[emoji];
    } else {
      currentReactions[emoji] = updatedUsers;
    }

    // 2. Update reaksi
    await supabase
      .from('messages')
      .update({ reactions: currentReactions })
      .eq('id', messagePk);
  }, [currentRoom, currentUser]);
  
  const handleDeleteMessage = useCallback(async (roomId: string, messageId: string) => {
    const messagePk = parseInt(messageId, 10);
    if (isNaN(messagePk)) return;

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messagePk);
      
    if (error) {
      alert(`Gagal menghapus pesan: ${error.message}`);
    }
  }, []);

  // --- HANDLER TYPING (SUPABASE) ---
  const handleStartTyping = useCallback(() => {
    if (!roomChannel || !currentUser) return;
    const now = Date.now();
    // Kirim event typing jika sudah lewat 3 detik
    if (now - lastTypingCallRef.current > 3000) { 
      roomChannel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { 
          username: currentUser.username, 
          userCreationDate: currentUser.createdAt,
          isTyping: true 
        },
      });
      lastTypingCallRef.current = now;
    }
  }, [roomChannel, currentUser]);
  
  const handleStopTyping = useCallback(() => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (!roomChannel || !currentUser) return;
    
    roomChannel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { 
        username: currentUser.username,
        isTyping: false 
      },
    });
  }, [roomChannel, currentUser]);
  
  // --- HANDLER LAIN (SAMA) ---
  const handleIncrementAnalysisCount = useCallback((coinId: string) => {
    setAnalysisCounts(prev => {
      const current = prev[coinId] || baseAnalysisCount;
      const newCounts = { ...prev, [coinId]: current + 1 };
      localStorage.setItem('analysisCounts', JSON.stringify(newCounts));
      return newCounts;
    });
  }, [baseAnalysisCount]);
  
  const handleSelectCoin = useCallback(async (coinId: string) => { 
    setIsTrendingLoading(true); setTrendingError(null); setSearchedCoin(null);
    try { setSearchedCoin(await fetchCoinDetails(coinId)); }
    catch (err) { setTrendingError(err instanceof Error ? err.message : 'Gagal muat detail koin.'); }
    finally { setIsTrendingLoading(false); }
  }, []);
  
  const handleToggleNotification = useCallback((roomId: string, enabled: boolean) => {
    setNotificationSettings(prev => ({ ...prev, [roomId]: enabled }));
  }, []);
  

  // --- DATA UNTUK RENDER ---
  const updatedRooms = useMemo(() => {
    return rooms.map(room => ({
      ...room,
      userCount: roomUserCounts[room.id] || room.userCount || 0
    }));
  }, [rooms, roomUserCounts]);

  const totalUsers = useMemo(() => updatedRooms.reduce((sum, r) => sum + (r.userCount || 0), 0), [updatedRooms]);
  const heroCoin = useMemo(() => searchedCoin || trendingCoins[0] || null, [searchedCoin, trendingCoins]);
  const otherTrendingCoins = useMemo(() => searchedCoin ? [] : trendingCoins.slice(1), [searchedCoin, trendingCoins]);
  const hotCoinForHeader = useMemo(() => trendingCoins.length > 1 ? { name: trendingCoins[1].name, logo: trendingCoins[1].image, price: trendingCoins[1].price, change: trendingCoins[1].change } : null, [trendingCoins]);
  
  // Ambil data typing untuk room saat ini
  const currentTypingUsers = useMemo(() => {
    const currentRoomId = currentRoom?.id;
    if (!currentRoomId || !typingUsers[currentRoomId]) return [];
    const now = Date.now();
    return Object.values(typingUsers[currentRoomId])
      .filter(status => status.username !== currentUser?.username && (now - status.timestamp < (TYPING_TIMEOUT + 2000))); // beri jeda
  }, [typingUsers, currentRoom, currentUser]);


  const renderActivePage = () => {
    switch (activePage) {
      case 'home':
        return <HomePage idrRate={idrRate} isRateLoading={isRateLoading} currency={currency} onIncrementAnalysisCount={handleIncrementAnalysisCount} fullCoinList={fullCoinList} isCoinListLoading={isCoinListLoading} coinListError={coinListError} heroCoin={heroCoin} otherTrendingCoins={otherTrendingCoins} isTrendingLoading={isTrendingLoading} trendingError={trendingError} onSelectCoin={handleSelectCoin} onReloadTrending={handleResetToTrending} />;
      case 'rooms':
        return <RoomsListPage 
          rooms={updatedRooms} 
          onJoinRoom={handleJoinRoom} 
          onCreateRoom={handleCreateRoom} 
          totalUsers={totalUsers} 
          hotCoin={hotCoinForHeader} 
          userProfile={currentUser} 
          currentRoomId={currentRoom?.id || null} 
          joinedRoomIds={joinedRoomIds} 
          onLeaveJoinedRoom={handleLeaveJoinedRoom} 
          unreadCounts={unreadCounts} 
          onDeleteRoom={handleDeleteRoom}
          onToggleNotification={handleToggleNotification}
          notificationSettings={notificationSettings}
        />;
      case 'forum': {
        let displayMessages: ForumMessageItem[] = [];
        if (currentRoom) {
          if (currentRoom.id === 'berita-kripto') displayMessages = newsArticles;
          else displayMessages = chatMessages[currentRoom.id] || []; // Ganti ke chatMessages
        }
        return <ForumPage 
          room={currentRoom} 
          messages={displayMessages} 
          userProfile={currentUser} 
          onSendMessage={handleSendMessage} 
          onLeaveRoom={handleLeaveRoom} 
          onReact={handleReaction} 
          onDeleteMessage={handleDeleteMessage} 
          typingUsers={currentTypingUsers} 
          onStartTyping={handleStartTyping} 
          onStopTyping={handleStopTyping} 
        />;
      }
      case 'about':
        return <AboutPage />;
      default:
        return <HomePage idrRate={idrRate} isRateLoading={isRateLoading} currency={currency} onIncrementAnalysisCount={handleIncrementAnalysisCount} fullCoinList={fullCoinList} isCoinListLoading={isCoinListLoading} coinListError={coinListError} heroCoin={heroCoin} otherTrendingCoins={otherTrendingCoins} isTrendingLoading={isTrendingLoading} trendingError={trendingError} onSelectCoin={handleSelectCoin} onReloadTrending={handleResetToTrending} />;
    }
  };

  // --- LOGIKA RENDER UTAMA ---
  if (isAuthLoading) {
    return <div className="min-h-screen bg-transparent text-white flex items-center justify-center">Memverifikasi sesi Anda...</div>;
  }

  let contentToRender;
  if (session && supabaseUser) {
    if (pendingGoogleUser) {
      // User sudah auth, tapi belum punya username
      contentToRender = <CreateIdPage onProfileComplete={handleProfileComplete} googleProfile={pendingGoogleUser} />;
    } else if (currentUser && currentUser.username) {
      // User sudah auth dan punya username
      contentToRender = (
        <>
          <Header userProfile={currentUser} onLogout={handleLogout} activePage={activePage} onNavigate={handleNavigate} currency={currency} onCurrencyChange={setCurrency} hotCoin={hotCoinForHeader} idrRate={idrRate} />
          <main className="flex-grow">{renderActivePage()}</main>
          <Footer />
        </>
      );
    } else {
      // State aneh, user auth tapi data lokal tidak sinkron.
      console.warn("State tidak sinkron: Ada sesi Supabase tapi tidak ada currentUser atau pendingGoogleUser.");
      // Tampilkan halaman CreateIdPage jika data pending bisa dibuat
      if (session.user.email) {
         contentToRender = <CreateIdPage onProfileComplete={handleProfileComplete} googleProfile={{
            email: session.user.email,
            name: session.user.user_metadata?.full_name || 'User',
            picture: session.user.user_metadata?.picture || ''
         }} />;
      } else {
        // Jika state benar-benar rusak, paksa logout
        contentToRender = <div className="min-h-screen bg-transparent text-white flex items-center justify-center">Sinkronisasi akun...</div>;
        if (!isAuthLoading) setTimeout(handleLogout, 2000);
      }
    }
  } else {
    // Tidak ada sesi, tampilkan halaman login
    contentToRender = <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-transparent text-white font-sans flex flex-col">
      <Particles />
      {contentToRender}
      {authError && (
        <div className="fixed bottom-4 right-4 bg-red-600 text-white p-3 rounded-lg shadow-lg z-50">
          Error: {authError} <button onClick={() => setAuthError(null)} className="ml-2 text-sm underline">Tutup</button>
        </div>
      )}
    </div>
  );
};

export default App;