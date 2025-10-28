// types.ts
import type { CredentialResponse } from '@react-oauth/google';

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
  email: string;
  username: string;
  password?: string;
  googleProfilePicture?: string;
  createdAt: number;
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
  id: string;
  type: 'news';
  title: string;
  url: string;
  imageurl: string;
  published_on: number;
  source: string;
  body: string;
  reactions?: { [key: string]: string[] };
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'system';
  uid?: string;
  text?: string;
  sender: string;
  timestamp: number;
  fileURL?: string;
  fileName?: string;
  reactions?: { [key: string]: string[] };
  userCreationDate?: number;
}

export type ForumMessageItem = NewsArticle | ChatMessage;

// --- Type Guards ---
export const isNewsArticle = (item: ForumMessageItem | null | undefined): item is NewsArticle => {
    return !!item && item.type === 'news' && typeof (item as NewsArticle).published_on === 'number';
};
export const isChatMessage = (item: ForumMessageItem | null | undefined): item is ChatMessage => {
     return !!item && (item.type === 'user' || item.type === 'system') && typeof (item as ChatMessage).timestamp === 'number';
};

// --- Component Props Interfaces ---
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
  onSendMessage: (message: Partial<ChatMessage>) => void;
  onLeaveRoom: () => void;
  onReact: (messageId: string, emoji: string) => void;
  onDeleteMessage: (roomId: string, messageId: string) => void;
}

export interface RoomsListPageProps {
  rooms: Room[];
  onJoinRoom: (room: Room) => void;
  onCreateRoom: (roomName: string) => void;
  totalUsers: number;
  hotCoin: { name: string; logo: string; price: number; change: number; } | null;
  userProfile: User | null;
  currentRoomId: string | null;
  joinedRoomIds: Set<string>;
  onLeaveJoinedRoom: (roomId: string) => void;
  unreadCounts: { [key: string]: { count: number; lastUpdate: number } };
  onDeleteRoom: (roomId: string) => void;
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
  onGoogleRegisterSuccess: (credentialResponse: CredentialResponse) => void;
}

export interface CreateIdPageProps {
  onProfileComplete: (username: string, password: string) => Promise<string | void>;
  googleProfile: GoogleProfile;
}