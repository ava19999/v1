// ava19999/v1/v1-9a4dba6fc6c91d8b6ce88474ad1ebcc8a220a34d/types.ts

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
// Fungsi untuk mengecek apakah sebuah item adalah NewsArticle
export const isNewsArticle = (item: ForumMessageItem | null | undefined): item is NewsArticle => {
    // Memeriksa apakah item ada, memiliki properti 'type' bernilai 'news',
    // dan memiliki properti 'published_on' yang merupakan angka.
    return !!item && item.type === 'news' && typeof (item as NewsArticle).published_on === 'number';
};

// Fungsi untuk mengecek apakah sebuah item adalah ChatMessage
export const isChatMessage = (item: ForumMessageItem | null | undefined): item is ChatMessage => {
     // Memeriksa apakah item ada, memiliki properti 'type' bernilai 'user' atau 'system',
     // dan memiliki properti 'timestamp' yang merupakan angka.
    return !!item && (item.type === 'user' || item.type === 'system') && typeof (item as ChatMessage).timestamp === 'number';
};


// --- Component Props Interfaces ---
// Mendefinisikan tipe data untuk props yang diterima oleh komponen Header
export interface HeaderProps {
    userProfile: User | null; // Profil pengguna saat ini atau null jika belum login
    onLogout: () => void; // Fungsi yang dipanggil saat logout
    activePage: Page; // Halaman yang sedang aktif
    onNavigate: (page: Page) => void; // Fungsi navigasi antar halaman
    currency: Currency; // Mata uang yang dipilih (USD/IDR)
    onCurrencyChange: (currency: Currency) => void; // Fungsi ganti mata uang
    hotCoin: { name: string; logo: string; price: number; change: number; } | null; // Info koin yang sedang populer
    idrRate: number | null; // Nilai tukar IDR atau null
}

// Mendefinisikan tipe data untuk props yang diterima oleh komponen HomePage
export interface HomePageProps {
  idrRate: number | null; // Nilai tukar IDR atau null
  isRateLoading: boolean; // Status loading nilai tukar
  currency: Currency; // Mata uang yang dipilih
  onIncrementAnalysisCount: (coinId: string) => void; // Fungsi increment hitungan analisis
  fullCoinList: CoinListItem[]; // Daftar lengkap koin
  isCoinListLoading: boolean; // Status loading daftar koin
  coinListError: string | null; // Pesan error jika gagal load daftar koin
  heroCoin: CryptoData | null; // Koin utama yang ditampilkan
  otherTrendingCoins: CryptoData[]; // Koin trending lainnya
  isTrendingLoading: boolean; // Status loading koin trending
  trendingError: string | null; // Pesan error jika gagal load koin trending
  onSelectCoin: (coinId: string) => void; // Fungsi saat memilih koin
  onReloadTrending: () => void; // Fungsi untuk memuat ulang data trending
}

// Mendefinisikan tipe data untuk props yang diterima oleh komponen ForumPage
export interface ForumPageProps {
  room: Room | null; // Info room saat ini atau null
  messages: ForumMessageItem[]; // Array pesan dalam room
  userProfile: User | null; // Profil pengguna saat ini
  onSendMessage: (message: ChatMessage) => void; // Fungsi kirim pesan
  onLeaveRoom: () => void; // Fungsi keluar dari room
  onReact: (messageId: string, emoji: string) => void; // Fungsi memberi reaksi
}

// Mendefinisikan tipe data untuk props yang diterima oleh komponen RoomsListPage
export interface RoomsListPageProps {
  rooms: Room[]; // Daftar semua room
  onJoinRoom: (room: Room) => void; // Fungsi masuk ke room
  onCreateRoom: (roomName: string) => void; // Fungsi membuat room baru
  totalUsers: number; // Jumlah total pengguna (estimasi)
  hotCoin: { name: string; logo: string } | null; // Info koin populer (ringkas)
  userProfile: User | null; // Profil pengguna saat ini
  currentRoomId: string | null; // ID room yang sedang dibuka (jika ada)
  joinedRoomIds: Set<string>; // Set ID room yang sudah diikuti pengguna
  onLeaveJoinedRoom: (roomId: string) => void; // Fungsi keluar dari room yang diikuti (dari list)
  unreadCounts: { [key: string]: { count: number; lastUpdate: number } }; // Jumlah pesan belum dibaca per room
  onDeleteRoom: (roomId: string) => void; // Fungsi menghapus room
}

// Mendefinisikan tipe data untuk props yang diterima oleh komponen HeroCoin
export interface HeroCoinProps {
  crypto: CryptoData; // Data koin utama
  onAnalyze: (crypto: CryptoData) => void; // Fungsi saat tombol analisis diklik
  idrRate: number | null; // Nilai tukar IDR
  currency: Currency; // Mata uang terpilih
}

// Mendefinisikan tipe data untuk props yang diterima oleh komponen CryptoCard
export interface CryptoCardProps {
  crypto: CryptoData; // Data koin
  onAnalyze: (crypto: CryptoData) => void; // Fungsi saat tombol analisis diklik
  idrRate: number | null; // Nilai tukar IDR
  currency: Currency; // Mata uang terpilih
}

// Mendefinisikan tipe data untuk props yang diterima oleh komponen AnalysisModal
export interface AnalysisModalProps {
  isOpen: boolean; // Status modal (terbuka/tertutup)
  onClose: () => void; // Fungsi menutup modal
  crypto: CryptoData; // Data koin yang dianalisis
  analysisResult: AnalysisResult | null; // Hasil analisis AI
  isLoading: boolean; // Status loading analisis AI
  error: string | null; // Pesan error analisis AI
  exchangeTickers: ExchangeTicker[]; // Data harga dari bursa
  isTickersLoading: boolean; // Status loading harga bursa
  tickersError: string | null; // Pesan error harga bursa
  idrRate: number | null; // Nilai tukar IDR
  currency: Currency; // Mata uang terpilih
}

// Mendefinisikan tipe data untuk props yang diterima oleh komponen LoginPage
export interface LoginPageProps {
    onGoogleRegisterSuccess: (credentialResponse: any) => void; // Handler sukses login/register Google
    onLogin: (usernameOrEmail: string, password: string) => Promise<string | void>; // Handler login manual
}

// Mendefinisikan tipe data untuk props yang diterima oleh komponen CreateIdPage
export interface CreateIdPageProps {
    onProfileComplete: (username: string, password: string) => Promise<string | void>; // Handler setelah profil Google dilengkapi
    googleProfile: GoogleProfile; // Data profil dari Google
}