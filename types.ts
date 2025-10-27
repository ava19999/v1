// types.ts
export type Page = 'home' | 'rooms' | 'forum' | 'about';
export type Currency = 'usd' | 'idr';

// --- New Authentication Types ---
export interface GoogleProfile {
  email: string;
  name: string;
  picture: string;
}

export interface User {
  email: string; // From Google, used as a unique identifier
  username: string; // Set during profile completion
  password?: string; // Set during profile completion
  googleProfilePicture?: string; // From Google
  createdAt: number; // Timestamp of profile completion
}


export interface CryptoData {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change: number;
  image: string;
  sparkline_in_7d: {
    price: number[];
  };
  high_24h: number;
  low_24h: number;
  market_cap: number;
}

export interface AnalysisResult {
  position: 'Long' | 'Short';
  entryPrice: string;
  stopLoss: string;
  takeProfit: string;
  confidence: string;
  reasoning: string;
}

export interface ExchangeTicker {
  name: string;
  logo: string;
  price: number;
  tradeUrl: string;
}

export interface CoinListItem {
  id: string;
  symbol: string;
  name: string;
  image: string; // Dikembalikan untuk pengalaman pencarian yang lebih baik
}

export interface NewsArticle {
  id: string; // Gunakan URL sebagai ID unik
  title: string;
  url: string;
  imageurl: string;
  published_on: number; // Unix timestamp
  source: string;
  body: string;
  reactions?: { [key: string]: string[] }; // e.g., { '🚀': ['Trader_1234', 'Trader_5678'] }
}


export interface MarketDominance {
  btc: number;
  usdt: number;
  alts: number;
}

// --- Tipe baru untuk Forum ---
export interface Room {
  id: string;
  name: string;
  userCount: number;
  createdBy?: string; // Tambahkan properti opsional untuk menyimpan pembuat room
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'system';
  text?: string;
  sender: string; // 'system', nama pengguna, atau persona AI
  timestamp: number;
  fileURL?: string; // Opsional URL untuk gambar
  fileName?: string; // Opsional nama file
  reactions?: { [key: string]: string[] }; // Reaksi emoji
  isStreaming?: boolean; // Untuk efek pengetikan AI (jika ada)
}


// Tipe gabungan untuk menangani berbagai jenis item dalam umpan forum
export type ForumMessageItem = NewsArticle | ChatMessage;


// Props Interfaces
export interface HeaderProps {
    userProfile: User | null; // Tipe userProfile diperbarui
    onLogout: () => void;
    activePage: Page;
    onNavigate: (page: Page) => void;
    currency: Currency;
    onCurrencyChange: (currency: Currency) => void;
    hotCoin: { name: string; logo: string; price: number; change: number; } | null;
    idrRate: number | null;
}

export interface HomePageProps {
  idrRate: number | null;
  isRateLoading: boolean;
  currency: Currency;
  onIncrementAnalysisCount: (coinId: string) => void;
  fullCoinList: CoinListItem[];
  isCoinListLoading: boolean;
  coinListError: string | null;
  heroCoin: CryptoData | null;
  otherTrendingCoins: CryptoData[];
  isTrendingLoading: boolean;
  trendingError: string | null;
  onSelectCoin: (coinId: string) => void;
  onReloadTrending: () => void;
}

export interface ForumPageProps {
  room: Room | null; // Room bisa null jika belum dipilih
  messages: ForumMessageItem[];
  userProfile: User | null; // Tipe userProfile diperbarui
  onSendMessage: (message: ChatMessage) => void;
  onLeaveRoom: () => void;
  onReact: (messageId: string, emoji: string) => void; // Tambahkan onReact
}

export interface RoomsListPageProps {
  rooms: Room[];
  onJoinRoom: (room: Room) => void;
  onCreateRoom: (roomName: string) => void;
  totalUsers: number;
  hotCoin: { name: string; logo: string } | null; // Sesuaikan jika perlu info lebih
  userProfile: User | null; // Tipe userProfile diperbarui
  currentRoomId: string | null; // ID room yang sedang aktif
  joinedRoomIds: Set<string>; // Set ID room yang sudah dijoin
  onLeaveJoinedRoom: (roomId: string) => void; // Handler untuk keluar dari room
  unreadCounts: { [key: string]: { count: number; lastUpdate: number } }; // Unread counts
}


export interface HeroCoinProps {
  crypto: CryptoData;
  onAnalyze: (crypto: CryptoData) => void;
  idrRate: number | null;
  currency: Currency;
}

export interface CryptoCardProps {
  crypto: CryptoData;
  onAnalyze: (crypto: CryptoData) => void;
  idrRate: number | null;
  currency: Currency;
}

export interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  crypto: CryptoData;
  analysisResult: AnalysisResult | null;
  isLoading: boolean;
  error: string | null;
  exchangeTickers: ExchangeTicker[];
  isTickersLoading: boolean;
  tickersError: string | null;
  idrRate: number | null;
  currency: Currency;
}

export interface LoginPageProps {
    onGoogleRegisterSuccess: (credentialResponse: any) => void; // Handler sukses login Google
    onLogin: (usernameOrEmail: string, password: string) => Promise<string | void>; // Handler login biasa
}

// Props untuk halaman pembuatan profil setelah login Google
export interface CreateIdPageProps {
    onProfileComplete: (username: string, password: string) => Promise<string | void>; // Handler setelah profil selesai
    googleProfile: GoogleProfile; // Data profil dari Google
}