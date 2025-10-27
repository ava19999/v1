// ava19999/v1/v1-7f15eca86a7d76b1afc61f2fcc63d508e826b61c/types.ts

// --- Basic Types ---
export type Page = 'home' | 'rooms' | 'forum' | 'about';
export type Currency = 'usd' | 'idr';

// --- Authentication Types ---
export interface GoogleProfile {
  email: string;
  name: string;
  picture: string;
}

export interface User {
  email: string; // From Google or manual registration, unique identifier
  username: string; // Set during profile completion or manual registration
  password?: string; // Set during profile completion or manual registration
  googleProfilePicture?: string; // From Google if applicable
  createdAt: number; // Timestamp of profile completion/registration
}


// --- Crypto Data Types ---
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
  image: string;
}

export interface MarketDominance {
  btc: number;
  usdt: number;
  alts: number;
}

// --- Forum Types ---
export interface Room {
  id: string;
  name: string;
  userCount: number;
  createdBy?: string;
}

export interface NewsArticle {
  id: string; // Can be URL or generated unique ID
  type: 'news'; // Add type discriminator
  title: string;
  url: string;
  imageurl: string;
  published_on: number; // Unix timestamp
  source: string;
  body: string;
  reactions?: { [key: string]: string[] };
}


export interface ChatMessage {
  id: string; // Firebase key or generated unique ID
  type: 'user' | 'system'; // Add type discriminator
  text?: string;
  sender: string; // 'system', username
  timestamp: number;
  fileURL?: string;
  fileName?: string;
  reactions?: { [key: string]: string[] };
}

// Union type for items in the forum feed
export type ForumMessageItem = NewsArticle | ChatMessage;

// --- Type Guards ---
// PERBAIKAN: Tambahkan return false eksplisit
export const isNewsArticle = (item: ForumMessageItem | null | undefined): item is NewsArticle => {
    if (!!item && item.type === 'news' && typeof (item as NewsArticle).published_on === 'number') {
        return true;
    }
    return false; // Return false eksplisit
};
// PERBAIKAN: Tambahkan return false eksplisit
export const isChatMessage = (item: ForumMessageItem | null | undefined): item is ChatMessage => {
    if (!!item && (item.type === 'user' || item.type === 'system') && typeof (item as ChatMessage).timestamp === 'number') {
        return true;
    }
    return false; // Return false eksplisit
};


// --- Component Props Interfaces ---
export interface HeaderProps { /* ... */ }
export interface HomePageProps { /* ... */ }

export interface ForumPageProps {
  room: Room | null;
  messages: ForumMessageItem[];
  userProfile: User | null;
  onSendMessage: (message: ChatMessage) => void;
  onLeaveRoom: () => void;
  onReact: (messageId: string, emoji: string) => void;
  onDeleteMessage: (roomId: string, messageId: string) => void; // Prop untuk hapus pesan
}

export interface RoomsListPageProps { /* ... */ }
export interface HeroCoinProps { /* ... */ }
export interface CryptoCardProps { /* ... */ }
export interface AnalysisModalProps { /* ... */ }
export interface LoginPageProps { /* ... */ }
export interface CreateIdPageProps { /* ... */ }

// Pastikan definisi tipe props lengkap jika belum
export interface HeaderProps { userProfile: User | null; onLogout: () => void; activePage: Page; onNavigate: (page: Page) => void; currency: Currency; onCurrencyChange: (currency: Currency) => void; hotCoin: { name: string; logo: string; price: number; change: number; } | null; idrRate: number | null;}
export interface HomePageProps { idrRate: number | null; isRateLoading: boolean; currency: Currency; onIncrementAnalysisCount: (coinId: string) => void; fullCoinList: CoinListItem[]; isCoinListLoading: boolean; coinListError: string | null; heroCoin: CryptoData | null; otherTrendingCoins: CryptoData[]; isTrendingLoading: boolean; trendingError: string | null; onSelectCoin: (coinId: string) => void; onReloadTrending: () => void;}
export interface RoomsListPageProps { rooms: Room[]; onJoinRoom: (room: Room) => void; onCreateRoom: (roomName: string) => void; totalUsers: number; hotCoin: { name: string; logo: string } | null; userProfile: User | null; currentRoomId: string | null; joinedRoomIds: Set<string>; onLeaveJoinedRoom: (roomId: string) => void; unreadCounts: { [key: string]: { count: number; lastUpdate: number } }; onDeleteRoom: (roomId: string) => void;}
export interface HeroCoinProps { crypto: CryptoData; onAnalyze: (crypto: CryptoData) => void; idrRate: number | null; currency: Currency;}
export interface CryptoCardProps { crypto: CryptoData; onAnalyze: (crypto: CryptoData) => void; idrRate: number | null; currency: Currency;}
export interface AnalysisModalProps { isOpen: boolean; onClose: () => void; crypto: CryptoData; analysisResult: AnalysisResult | null; isLoading: boolean; error: string | null; exchangeTickers: ExchangeTicker[]; isTickersLoading: boolean; tickersError: string | null; idrRate: number | null; currency: Currency;}
export interface LoginPageProps { onGoogleRegisterSuccess: (credentialResponse: any) => void; onLogin: (usernameOrEmail: string, password: string) => Promise<string | void>;}
export interface CreateIdPageProps { onProfileComplete: (username: string, password: string) => Promise<string | void>; googleProfile: GoogleProfile;}