// types.ts
import type { CredentialResponse } from '@react-oauth/google';

// [FIX] Impor tipe Json dari types_db.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

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
  googleProfilePicture?: string;
  createdAt: number;
}

// --- Crypto Data Types (Tidak Berubah) ---
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

// --- Forum Types (Disesuaikan) ---
export interface Room {
  id: string;
  name: string;
  userCount: number;
  createdBy?: string;
  isDefaultRoom?: boolean;
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
  // [FIX] Izinkan tipe 'Json' dari database selain tipe aplikasi
  reactions?: { [key: string]: string[] } | Json;
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
  // [FIX] Izinkan tipe 'Json' dari database selain tipe aplikasi
  reactions?: { [key: string]: string[] } | Json;
  userCreationDate?: number;
}

export type ForumMessageItem = NewsArticle | ChatMessage;

// --- Typing Indicator Types ---
export interface TypingStatus {
  username: string;
  userCreationDate: number | null;
  timestamp: number;
}

export interface TypingUsersMap {
  [roomId: string]: {
    [username: string]: TypingStatus;
  };
}

// --- Notification & Count Types ---
export interface NotificationSettings {
  [roomId: string]: boolean;
}
export interface RoomUserCounts {
  [roomId: string]: number;
}

// --- Type Guards (Tidak Berubah) ---
export const isNewsArticle = (item: ForumMessageItem | null | undefined): item is NewsArticle => {
    return !!item && item.type === 'news' && typeof (item as NewsArticle).published_on === 'number';
};
export const isChatMessage = (item: ForumMessageItem | null | undefined): item is ChatMessage => {
     return !!item && (item.type === 'user' || item.type === 'system') && typeof (item as ChatMessage).timestamp === 'number';
};

// --- Component Props Interfaces (Disesuaikan) ---
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
  typingUsers: TypingStatus[];
  onStartTyping: () => void;
  onStopTyping: () => void;
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
  unreadCounts: { [key: string]: number };
  onDeleteRoom: (roomId: string) => void;
  onToggleNotification: (roomId: string, enabled: boolean) => void;
  notificationSettings: NotificationSettings;
}
export interface RoomListItemProps {
  room: Room;
  currentUser: User | null;
  onJoinRoom: (room: Room) => void;
  onLeaveRoom: (roomId: string) => void;
  onDeleteRoom: (roomId: string) => void;
  onToggleNotification: (roomId: string, enabled: boolean) => void;
  isActive: boolean;
  isJoined: boolean;
  unreadCount: number;
  notificationEnabled: boolean;
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

export interface LoginPageProps {}

export interface CreateIdPageProps {
  onProfileComplete: (username: string) => Promise<string | void>;
  googleProfile: GoogleProfile;
}

export interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}
export interface ReactionsProps {
  message: NewsArticle | ChatMessage | undefined | null;
  username: string;
  onReact: (emoji: string) => void;
}
export interface DeleteButtonProps { onClick: (e: React.MouseEvent) => void; }
export interface ReactButtonProps { onClick: (e: React.MouseEvent) => void; }
export interface NewsMessageProps {
  article: NewsArticle;
  username: string;
  onReact: (messageId: string, emoji: string) => void;
  onDeleteClick: () => void;
  canDelete: boolean;
  isActive: boolean;
  showActions: boolean;
  onMessageClick: () => void;
  onReactButtonClick: (e: React.MouseEvent) => void;
  onImageClick: (url: string) => void;
}
export interface UserMessageProps {
  message: ChatMessage;
  userProfile: User | null;
  onReact: (messageId: string, emoji: string) => void;
  onDeleteClick: () => void;
  canDelete: boolean;
  isActive: boolean;
  showActions: boolean;
  onMessageClick: () => void;
  onReactButtonClick: (e: React.MouseEvent) => void;
  onImageClick: (url: string) => void;
}
export interface SystemMessageProps { message: ChatMessage; }
export interface AnnouncementMessageProps { message: ChatMessage; }
export interface UserTagProps {
  sender: string;
  userCreationDate: number | null;
}
export interface UserTagInfo {
  tagName: string;
  tagColor: string;
  icon?: React.ReactNode;
}