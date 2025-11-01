// App.tsx
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Session, User as SupabaseUser, RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './services/supabaseService';

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
  User,
  GoogleProfile,
  NotificationSettings,
  RoomUserCounts,
  TypingStatus,
  TypingUsersMap
  // [FIX] Tipe Json dihapus dari impor './types'
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

// Impor tipe-tipe Supabase untuk Insert/Update
import type {
  ProfileUpdate,
  RoomInsert,
  MessageInsert,
  MessageUpdate
} from './supabaseTypes';

// [FIX] Impor tipe Json yang BENAR dari types_db
import type { Json } from './types_db';

// [FIX] Definisikan tipe lokal untuk hasil SELECT
interface SupabaseProfile {
  id: string;
  username: string | null;
  google_profile_picture: string | null;
  created_at: string;
}

interface SupabaseRoom {
  id: number; // Ini adalah PK (number)
  room_id: string; // Ini adalah ID publik (string)
  name: string;
  created_by: string | null;
  is_default_room: boolean;
}

interface SupabaseMessage {
  id: number;
  room_id: number; // Ini adalah FK ke rooms.id (number)
  user_id: string | null;
  sender_username: string;
  user_creation_date: string | null;
  type: 'user' | 'system';
  text: string | null;
  file_url: string | null;
  file_name: string | null;
  reactions: Json; // Tipe dari DB adalah Json
  created_at: string;
}


const DEFAULT_ROOM_IDS = ['berita-kripto', 'pengumuman-aturan'];
const TYPING_TIMEOUT = 5000;

const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.8;
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

const App: React.FC = () => {
  // State Halaman & UI
  const [activePage, setActivePage] = useState<Page>('home');
  const [currency, setCurrency] = useState<Currency>('usd');
  const [idrRate, setIdrRate] = useState<number | null>(null);
  const [isRateLoading, setIsRateLoading] = useState(true);

  // State Auth Supabase
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
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
  const roomListenersRef = useRef<{ [roomId: string]: RealtimeChannel }>({});

  // --- EFEK AUTH SUPABASE ---
  useEffect(() => {
    setIsAuthLoading(true);
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      if (session) {
        // [FIX] Gunakan cast manual untuk SELECT
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single() as { data: SupabaseProfile | null; error: any };
          
        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching profile:', error);
        } else if (profile && !profile.username) {
          setPendingGoogleUser({
            email: session.user.email || '',
            name: session.user.user_metadata?.full_name || 'User',
            picture: session.user.user_metadata?.picture || profile.google_profile_picture || ''
          });
          setCurrentUser(null);
        } else if (profile) {
          setCurrentUser({
              email: session.user.email || '',
              username: profile.username!,
              googleProfilePicture: profile.google_profile_picture || undefined,
              createdAt: new Date(profile.created_at).getTime()
          });
          setPendingGoogleUser(null);
        }
      }
      setIsAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setSupabaseUser(session?.user ?? null);
        
        if (session) {
          // [FIX] Gunakan cast manual untuk SELECT
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single() as { data: SupabaseProfile | null; error: any };

          if (error && error.code !== 'PGRST116') { // Abaikan error "no rows"
            console.error('Error fetching profile:', error);
          } else if (profile && profile.username) {
            setCurrentUser({
                email: session.user.email || '',
                username: profile.username,
                googleProfilePicture: profile.google_profile_picture || undefined,
                createdAt: new Date(profile.created_at).getTime()
            });
            setPendingGoogleUser(null);
          } else if (session.user) {
            setPendingGoogleUser({
               email: session.user.email || '',
               name: session.user.user_metadata?.full_name || 'User',
               // [FIX] Tambahkan pengecekan null untuk profile
               picture: session.user.user_metadata?.picture || (profile ? profile.google_profile_picture : '') || ''
            });
            setCurrentUser(null);
          }
        } else {
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
    const fetchRooms = async () => {
      // [FIX] Gunakan cast manual untuk SELECT
      const { data, error } = await supabase
        .from('rooms')
        .select('*') as { data: SupabaseRoom[] | null; error: any };
        
      if (error) {
        console.error("Gagal mengambil rooms:", error);
        return;
      }
        
      if (data) {
        const mappedRooms: Room[] = data.map((r: SupabaseRoom) => ({
          id: r.room_id,
          name: r.name,
          userCount: roomUserCounts[r.room_id] || 0,
          createdBy: r.created_by || undefined,
          isDefaultRoom: r.is_default_room || false
        }));
        
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

    const channel = supabase.channel('public:rooms')
      .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'rooms'
      }, 
      (payload) => {
          console.log('Perubahan data rooms terdeteksi, mengambil ulang...', payload);
          fetchRooms();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomUserCounts]);

  // --- EFEK DATA PESAN (REALTIME) ---
  useEffect(() => {
    if (!currentRoom?.id) return;
    
    if (currentRoom.id === 'berita-kripto') {
      setChatMessages(prev => ({ ...prev, [currentRoom.id]: [] }));
      return;
    }

    let channel: RealtimeChannel | null = null;
    
    const setupMessageListener = async () => {
      // [FIX] Gunakan cast manual untuk SELECT
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('id')
        .eq('room_id', currentRoom.id)
        .single() as { data: { id: number } | null; error: any };
        
      if (roomError || !roomData) {
        console.error(`Tidak dapat menemukan PK untuk room_id: ${currentRoom.id}`, roomError);
        return;
      }
      
      const roomPk = roomData.id;

      // [FIX] Gunakan cast manual untuk SELECT
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomPk)
        .order('created_at', { ascending: true }) as { data: SupabaseMessage[] | null; error: any };

      if (error) {
        console.error(`Gagal mengambil pesan untuk room ${currentRoom.id}:`, error);
        return;
      }

      if (messagesData) {
        const mappedMessages: ChatMessage[] = messagesData.map((msg: SupabaseMessage) => ({
          id: msg.id.toString(),
          type: msg.type as 'user' | 'system',
          uid: msg.user_id || undefined,
          text: msg.text || undefined,
          sender: msg.sender_username,
          timestamp: new Date(msg.created_at).getTime(),
          fileURL: msg.file_url || undefined,
          fileName: msg.file_name || undefined,
          // [FIX] Cast 'reactions' dari Json ke tipe yang diharapkan
          reactions: (msg.reactions as { [key: string]: string[] }) || {},
          userCreationDate: msg.user_creation_date ? new Date(msg.user_creation_date).getTime() : undefined,
        }));
        setChatMessages(prev => ({ ...prev, [currentRoom.id!]: mappedMessages }));
      }
      
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
              const msg = payload.new as SupabaseMessage;
              const newMessage: ChatMessage = {
                id: msg.id.toString(),
                type: msg.type as 'user' | 'system',
                uid: msg.user_id || undefined,
                text: msg.text || undefined,
                sender: msg.sender_username,
                timestamp: new Date(msg.created_at).getTime(),
                fileURL: msg.file_url || undefined,
                fileName: msg.file_name || undefined,
                // [FIX] Cast 'reactions' dari Json ke tipe yang diharapkan
                reactions: (msg.reactions as { [key: string]: string[] }) || {},
                userCreationDate: msg.user_creation_date ? new Date(msg.user_creation_date).getTime() : undefined,
              };
              setChatMessages(prev => ({
                ...prev,
                [currentRoom.id!]: [...(prev[currentRoom.id!] || []), newMessage]
              }));
            }
            
            else if (payload.eventType === 'UPDATE') {
              const updatedMsg = payload.new as SupabaseMessage;
              setChatMessages(prev => {
                  const roomMessages = prev[currentRoom.id!] || [];
                  return {
                      ...prev,
                      [currentRoom.id!]: roomMessages.map(m => 
                          m.id === updatedMsg.id.toString() 
                          // [FIX] Cast 'reactions' dari Json ke tipe yang diharapkan
                          ? { ...m, reactions: (updatedMsg.reactions as { [key: string]: string[] }) || {}, text: updatedMsg.text || undefined }
                          : m
                      )
                  };
              });
            }
            
            else if (payload.eventType === 'DELETE') {
              const deletedMsgId = (payload.old as SupabaseMessage).id.toString();
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

    newChannel.on('broadcast', { event: 'typing' }, ({ payload }) => {
      const { username, userCreationDate, isTyping } = payload;
      if (username === currentUser.username) return;
      
      setTypingUsers(prev => {
        const roomTyping = { ...(prev[currentRoom.id] || {}) };
        if (isTyping) {
          roomTyping[username] = { username, userCreationDate, timestamp: Date.now() };
        } else {
          delete roomTyping[username];
        }
        return { ...prev, [currentRoom.id]: roomTyping };
      });
    });
    
    newChannel.on('presence', { event: 'sync' }, () => {
      try {
        const presenceState = newChannel.presenceState();
        const userCount = Object.keys(presenceState).length;
        console.log(`Presence sync room ${currentRoom.id}: ${userCount} users`, presenceState);
        setRoomUserCounts(prev => ({ ...prev, [currentRoom.id]: userCount }));
      } catch (error) {
        console.error("Error saat sync presence:", error);
      }
    });

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

  // --- EFEK UNREAD COUNT ---
  useEffect(() => {
    Object.values(roomListenersRef.current).forEach(channel => supabase.removeChannel(channel));
    roomListenersRef.current = {};

    const setupUnreadListeners = async () => {
      for (const roomId of joinedRoomIds) {
        if (roomId === currentRoom?.id || roomId === 'berita-kripto') continue;

        // [FIX] Gunakan cast manual untuk SELECT
        const { data: roomData, error } = await supabase
          .from('rooms')
          .select('id')
          .eq('room_id', roomId)
          .single() as { data: { id: number } | null; error: any };
        
        if (error || !roomData) continue;
        const roomPk = roomData.id;

        const channel = supabase.channel(`public:messages:room_id=eq.${roomPk}:unread`)
          .on('postgres_changes', {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `room_id=eq.${roomPk}`
          }, (payload) => {
            const newMessage = payload.new as SupabaseMessage;
            const lastVisit = userLastVisit[roomId] || 0;
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

  // --- EFEK DATA LAIN ---
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

  // --- EFEK LOCAL STORAGE ---
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

  // --- EFEK SUARA NOTIFIKASI ---
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

  // --- HANDLER FUNGSI ---
  const handleProfileComplete = useCallback(async (username: string): Promise<string | void> => {
    setAuthError(null);
    if (!pendingGoogleUser || !session) {
      const msg = 'Sesi tidak valid untuk melengkapi profil.';
      setAuthError(msg); return msg;
    }
    
    // [FIX] Gunakan cast manual untuk SELECT
    const { data: existingUser, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single() as { data: SupabaseProfile | null; error: any };
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking username:', checkError);
    }
    
    if (existingUser) {
      const msg = 'Username sudah digunakan. Pilih username lain.';
      setAuthError(msg); return msg;
    }

    // [FIX] Terapkan tipe ProfileUpdate
    const updateData: ProfileUpdate = {
      username: username,
      google_profile_picture: pendingGoogleUser.picture
    };

    // [FIX] Gunakan cast manual untuk SELECT
    const { data, error } = await supabase
      .from('profiles')
      .update(updateData) 
      .eq('id', session.user.id)
      .select()
      .single() as { data: SupabaseProfile | null; error: any };

    if (error) {
      setAuthError(error.message); return error.message;
    }
    if (data) {
      setCurrentUser({
        email: session.user.email || '',
        username: data.username!,
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
      setCurrentUser(null); setSession(null); setSupabaseUser(null);
      setActivePage('home');
    });
  }, [roomChannel]);

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
    
    // [FIX] Terapkan tipe RoomInsert
    const newRoomData: RoomInsert = {
      room_id: newRoomIdString,
      name: trimmedName,
      created_by: supabaseUser.id,
      is_default_room: false
    };

    // [FIX] Gunakan cast manual untuk SELECT
    const { data, error } = await supabase
      .from('rooms')
      .insert(newRoomData) 
      .select()
      .single() as { data: SupabaseRoom | null; error: any };

    if (error) {
      console.error('Gagal buat room:', error);
      alert('Gagal membuat room. Coba lagi.');
    } else if (data) {
      const newRoom: Room = {
        id: data.room_id,
        name: data.name,
        userCount: 0,
        createdBy: data.created_by || undefined,
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

    const isAdmin = ADMIN_USERNAMES.includes(currentUser.username);
    // [FIX] Cek created_by (string) dengan user.id (string)
    const isCreator = roomToDelete.createdBy === supabaseUser.id;

    if (!isAdmin && !isCreator) {
      alert('Hanya admin atau pembuat room yang bisa menghapus.'); return;
    }
    
    if (window.confirm(`Yakin ingin menghapus room "${roomToDelete.name}"? Ini akan menghapus semua pesan di dalamnya.`)) {
      // [FIX] Gunakan cast manual untuk SELECT
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('id')
        .eq('room_id', roomId)
        .single() as { data: { id: number } | null; error: any };
      
      if (roomError || !roomData) { 
        alert('Room tidak ditemukan untuk dihapus.'); 
        return; 
      }
      
      // [FIX] Hapus cast
      const { error } = await supabase.from('rooms').delete().eq('id', roomData.id); 
      
      if (error) { 
        alert(`Gagal menghapus room: ${error.message}`); 
      } else { 
        if (currentRoom?.id === roomId) handleLeaveRoom(); 
      }
    }
  }, [currentUser, supabaseUser, rooms, currentRoom, handleLeaveRoom]);

  const handleSendMessage = useCallback(async (message: Partial<ChatMessage>) => {
    if (!currentRoom || !currentUser || !session) return;
    if (!message.text?.trim() && !message.fileURL) return;

    const room = rooms.find(r => r.id === currentRoom.id);
    if (!room) return;

    // [FIX] Gunakan cast manual untuk SELECT
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('id') // Ini adalah PK (number)
      .eq('room_id', room.id) // room.id adalah room_id (string)
      .single() as { data: { id: number } | null; error: any };
    
    if (roomError || !roomData) {
      console.error('Gagal menemukan ID room (PK):', roomError);
      return;
    }

    // [FIX] Terapkan tipe MessageInsert
    const messageToSend: MessageInsert = {
      room_id: roomData.id, // roomData.id sekarang adalah number (PK)
      user_id: session.user.id,
      sender_username: currentUser.username,
      user_creation_date: new Date(currentUser.createdAt).toISOString(),
      type: 'user',
      text: message.text?.trim() || null,
      file_url: message.fileURL || null,
      file_name: message.fileName || null,
      reactions: {} // Tipe Json default
    };

    // [FIX] Hapus typo underscore
    const { error } = await supabase
      .from('messages')
      .insert(messageToSend); 

    if (error) {
      console.error("Gagal kirim pesan:", error);
      alert(`Gagal mengirim pesan: ${error.message}`);
    }
    handleStopTyping();
  }, [currentRoom, currentUser, session, rooms, handleStopTyping]);

  const handleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!currentRoom || !currentUser || !messageId || !emoji) return;

    const messagePk = parseInt(messageId, 10);
    if (isNaN(messagePk)) return;

    // [FIX] Gunakan cast manual untuk SELECT
    const { data, error } = await supabase
      .from('messages')
      .select('reactions')
      .eq('id', messagePk)
      .single() as { data: { reactions: Json } | null; error: any };
    
    if (error || !data) return;

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

    // [FIX] Terapkan tipe MessageUpdate
    const updateData: MessageUpdate = {
      reactions: currentReactions // Ini sesuai dengan tipe Json
    };

    // [FIX] Hapus typo underscore
    await supabase
      .from('messages')
      .update(updateData) 
      .eq('id', messagePk);
  }, [currentRoom, currentUser]);
  
  const handleDeleteMessage = useCallback(async (roomId: string, messageId: string) => {
    const messagePk = parseInt(messageId, 10);
    if (isNaN(messagePk)) return;

    // [FIX] Hapus typo underscore
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messagePk);
      
    if (error) {
      alert(`Gagal menghapus pesan: ${error.message}`);
    }
  }, []);

  const handleStartTyping = useCallback(() => {
    if (!roomChannel || !currentUser) return;
    const now = Date.now();
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
  
  const currentTypingUsers = useMemo(() => {
    const currentRoomId = currentRoom?.id;
    if (!currentRoomId || !typingUsers[currentRoomId]) return [];
    const now = Date.now();
    return Object.values(typingUsers[currentRoomId])
      .filter(status => status.username !== currentUser?.username && (now - status.timestamp < (TYPING_TIMEOUT + 2000)));
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
          else displayMessages = chatMessages[currentRoom.id] || [];
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

  if (isAuthLoading) {
    return <div className="min-h-screen bg-transparent text-white flex items-center justify-center">Memverifikasi sesi Anda...</div>;
  }

  let contentToRender;
  if (session && supabaseUser) {
    if (pendingGoogleUser) {
      contentToRender = <CreateIdPage onProfileComplete={handleProfileComplete} googleProfile={pendingGoogleUser} />;
    } else if (currentUser && currentUser.username) {
      contentToRender = (
        <>
          <Header userProfile={currentUser} onLogout={handleLogout} activePage={activePage} onNavigate={handleNavigate} currency={currency} onCurrencyChange={setCurrency} hotCoin={hotCoinForHeader} idrRate={idrRate} />
          <main className="flex-grow">{renderActivePage()}</main>
          <Footer />
        </>
      );
    } else {
      // [FIX] Periksa profile yang mungkin null saat membuat pendingGoogleUser
      const profilePicture = session.user.user_metadata?.picture || '';
      if (session.user.email) {
         contentToRender = <CreateIdPage onProfileComplete={handleProfileComplete} googleProfile={{
            email: session.user.email,
            name: session.user.user_metadata?.full_name || 'User',
            picture: profilePicture
         }} />;
      } else {
        contentToRender = <div className="min-h-screen bg-transparent text-white flex items-center justify-center">Sinkronisasi akun...</div>;
        if (!isAuthLoading) setTimeout(handleLogout, 2000);
      }
    }
  } else {
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