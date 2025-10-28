// types.ts

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
  createdBy?: string; // Add createdBy field
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
  id: string; // Firebase key atau generated unique ID
  type: 'user' | 'system'; // Add type discriminator
  uid?: string; // JADIKAN OPSIONAL: Firebase Auth User ID
  text?: string;
  sender: string; // 'system', username aplikasi
  timestamp: number;
  fileURL?: string;
  fileName?: string;
  reactions?: { [key: string]: string[] };
}

// Union type for items in the forum feed
export type ForumMessageItem = NewsArticle | ChatMessage;

// --- Type Guards ---
export const isNewsArticle = (item: ForumMessageItem | null | undefined): item is NewsArticle => {
    if (!!item && item.type === 'news' && typeof (item as NewsArticle).published_on === 'number') {
        return true;
    }
    return false;
};
export const isChatMessage = (item: ForumMessageItem | null | undefined): item is ChatMessage => {
     if (!!item && (item.type === 'user' || item.type === 'system') && typeof (item as ChatMessage).timestamp === 'number') {
        return true;
    }
    return false;
};


// --- Component Props Interfaces ---
export interface HeaderProps { userProfile: User | null; onLogout: () => void; activePage: Page; onNavigate: (page: Page) => void; currency: Currency; onCurrencyChange: (currency: Currency) => void; hotCoin: { name: string; logo: string; price: number; change: number; } | null; idrRate: number | null;}
export interface HomePageProps { idrRate: number | null; isRateLoading: boolean; currency: Currency; onIncrementAnalysisCount: (coinId: string) => void; fullCoinList: CoinListItem[]; isCoinListLoading: boolean; coinListError: string | null; heroCoin: CryptoData | null; otherTrendingCoins: CryptoData[]; isTrendingLoading: boolean; trendingError: string | null; onSelectCoin: (coinId: string) => void; onReloadTrending: () => void;}
export interface ForumPageProps {
  room: Room | null;
  messages: ForumMessageItem[];
  userProfile: User | null;
  onSendMessage: (message: Partial<ChatMessage>) => void; // Ubah tipe parameter di sini
  onLeaveRoom: () => void;
  onReact: (messageId: string, emoji: string) => void;
  onDeleteMessage: (roomId: string, messageId: string) => void;
}
// Definisikan tipe props baru jika berbeda dari BaseRoomsListPageProps
export interface ExtendedRoomsListPageProps { rooms: Room[]; onJoinRoom: (room: Room) => void; onCreateRoom: (roomName: string) => void; totalUsers: number; hotCoin: { name: string; logo: string } | null; userProfile: User | null; currentRoomId: string | null; joinedRoomIds: Set<string>; onLeaveJoinedRoom: (roomId: string) => void; unreadCounts: { [key: string]: { count: number; lastUpdate: number } }; onDeleteRoom: (roomId: string) => void;}
export interface HeroCoinProps { crypto: CryptoData; onAnalyze: (crypto: CryptoData) => void; idrRate: number | null; currency: Currency;}
export interface CryptoCardProps { crypto: CryptoData; onAnalyze: (crypto: CryptoData) => void; idrRate: number | null; currency: Currency;}
export interface AnalysisModalProps { isOpen: boolean; onClose: () => void; crypto: CryptoData; analysisResult: AnalysisResult | null; isLoading: boolean; error: string | null; exchangeTickers: ExchangeTicker[]; isTickersLoading: boolean; tickersError: string | null; idrRate: number | null; currency: Currency;}
export interface LoginPageProps { onGoogleRegisterSuccess: (credentialResponse: CredentialResponse) => void; onLogin: (usernameOrEmail: string, password: string) => Promise<string | void>;} // Hapus onRegister dan onVerify jika tidak dipakai lagi
export interface CreateIdPageProps { onProfileComplete: (username: string, password: string) => Promise<string | void>; googleProfile: GoogleProfile;}