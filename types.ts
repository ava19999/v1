// Fix: Removed incorrect import of Page and Currency from App.tsx. Page is defined in this file, and Currency is defined below.
export type Page = 'home' | 'rooms' | 'forum' | 'about';
export type Currency = 'usd' | 'idr';

// --- New Authentication Types ---
export interface User {
  email: string;
  // FIX: Corrected typo from `password; string;` to `password: string;`
  password: string; // In a real app, this would be a hash
  username?: string;
  createdAt: number;
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
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'system';
  text?: string;
  sender: string; // 'system', nama pengguna, atau persona AI
  timestamp: number;
  fileURL?: string;
  fileName?: string;
  reactions?: { [key: string]: string[] };
  isStreaming?: boolean; // Untuk efek pengetikan AI
}


// Tipe gabungan untuk menangani berbagai jenis item dalam umpan forum
export type ForumMessageItem = NewsArticle | ChatMessage;


// Props Interfaces
export interface HeaderProps {
    userProfile: User | null;
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
  room: Room | null;
  messages: ForumMessageItem[];
  userProfile: User | null;
  onSendMessage: (message: ChatMessage) => void;
  onLeaveRoom: () => void;
  onReact: (messageId: string, emoji: string) => void;
}

export interface RoomsListPageProps {
  rooms: Room[];
  onJoinRoom: (room: Room) => void;
  onCreateRoom: (roomName: string) => void;
  totalUsers: number;
  hotCoin: { name: string; logo: string } | null;
  userProfile: User | null;
  currentRoomId: string | null;
  joinedRoomIds: Set<string>;
  onLeaveJoinedRoom: (roomId: string) => void;
  unreadCounts: { [key: string]: { count: number; lastUpdate: number } };
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
    onLogin: (email: string, password: string) => Promise<string | void>;
    onRegister: (email: string, password: string) => Promise<{ code: string } | string>;
    onVerify: (email: string, code: string) => Promise<string | void>;
}

export interface CreateIdPageProps {
    onIdCreated: (username: string, email: string) => void;
    email: string;
}
