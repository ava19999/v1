import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useCallback, useRef, lazy, Suspense, useEffect } from 'react';
import { fetchCryptoAnalysis } from '../services/geminiService';
import CryptoCard from './CryptoCard';
import HeroCoin from './HeroCoin';
import DominanceTicker from './DominanceTicker';
import { fetchMarketDominance, fetchExchangeTickers, } from '../services/mockData';
// Lazy load komponen modal
const AnalysisModal = lazy(() => import('./AnalysisModal'));
const SkeletonHero = () => (_jsxs("div", { className: "bg-gray-900 border border-white/10 rounded-xl p-6 w-full relative overflow-hidden", children: [_jsxs("div", { className: "flex flex-col md:flex-row gap-6", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center mb-4", children: [_jsx("div", { className: "h-12 w-12 bg-gray-700 rounded-full mr-4" }), _jsxs("div", { className: "flex-1 space-y-2", children: [_jsx("div", { className: "h-6 w-3/4 bg-gray-700 rounded" }), _jsx("div", { className: "h-4 w-1/4 bg-gray-700 rounded" })] })] }), _jsx("div", { className: "h-10 w-1/2 bg-gray-700 rounded my-2" }), _jsx("div", { className: "h-20 w-full bg-gray-700 rounded mt-4" })] }), _jsxs("div", { className: "w-full md:w-1/3 space-y-4", children: [_jsx("div", { className: "h-8 w-full bg-gray-700 rounded" }), _jsx("div", { className: "h-8 w-full bg-gray-700 rounded" }), _jsx("div", { className: "h-12 w-full bg-gray-700 rounded mt-4" })] })] }), _jsx("div", { className: "absolute top-0 left-0 w-full h-full skeleton-shimmer" })] }));
const SkeletonCard = () => (_jsxs("div", { className: "bg-gray-900 border border-white/10 rounded-xl p-4 h-full w-56 flex-shrink-0 relative overflow-hidden", children: [_jsxs("div", { className: "flex items-center mb-4", children: [_jsx("div", { className: "h-8 w-8 bg-gray-700 rounded-full mr-3" }), _jsxs("div", { className: "flex-1 space-y-2", children: [_jsx("div", { className: "h-4 w-3/4 bg-gray-700 rounded" }), _jsx("div", { className: "h-3 w-1/4 bg-gray-700 rounded" })] })] }), _jsx("div", { className: "h-10 w-full bg-gray-700 rounded my-2" }), _jsx("div", { className: "h-6 w-1/2 bg-gray-700 rounded mt-2" }), _jsx("div", { className: "absolute top-0 left-0 w-full h-full skeleton-shimmer" })] }));
const HomePage = ({ idrRate, isRateLoading, currency, onIncrementAnalysisCount, fullCoinList, isCoinListLoading, coinListError, heroCoin, otherTrendingCoins, isTrendingLoading, trendingError, onSelectCoin, onReloadTrending }) => {
    const [marketDominance, setMarketDominance] = useState(null);
    const [isDominanceLoading, setIsDominanceLoading] = useState(true);
    const [selectedCrypto, setSelectedCrypto] = useState(null);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [exchangeTickers, setExchangeTickers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
    const [analysisError, setAnalysisError] = useState(null);
    const [isTickersLoading, setIsTickersLoading] = useState(false);
    const [tickersError, setTickersError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredCoinList, setFilteredCoinList] = useState([]);
    const searchContainerRef = useRef(null);
    const fetchDominanceData = useCallback(async () => {
        setIsDominanceLoading(true);
        try {
            const dominance = await fetchMarketDominance();
            setMarketDominance(dominance);
        }
        catch (err) {
            console.error("Gagal memuat data dominasi:", err);
        }
        finally {
            setIsDominanceLoading(false);
        }
    }, []);
    // Fetch dominance data
    useEffect(() => {
        fetchDominanceData();
    }, [fetchDominanceData]);
    useEffect(() => {
        if (searchQuery.length > 0) {
            const lowercasedQuery = searchQuery.toLowerCase();
            const filtered = fullCoinList
                .filter(coin => coin.name.toLowerCase().includes(lowercasedQuery) || coin.symbol.toLowerCase().includes(lowercasedQuery))
                .slice(0, 7);
            setFilteredCoinList(filtered);
        }
        else {
            setFilteredCoinList([]);
        }
    }, [searchQuery, fullCoinList]);
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
                setFilteredCoinList([]);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    const handleSearchSelect = useCallback(async (coinId) => {
        setSearchQuery('');
        setFilteredCoinList([]);
        onSelectCoin(coinId);
    }, [onSelectCoin]);
    const handleAnalyze = useCallback(async (crypto) => {
        onIncrementAnalysisCount(crypto.id); // Tambah hitungan analisis
        setSelectedCrypto(crypto);
        setIsModalOpen(true);
        setIsAnalysisLoading(true);
        setAnalysisError(null);
        setAnalysisResult(null);
        setIsTickersLoading(true);
        setTickersError(null);
        setExchangeTickers([]);
        fetchCryptoAnalysis(crypto.name, crypto.price)
            .then(setAnalysisResult)
            .catch(err => setAnalysisError(err.message))
            .finally(() => setIsAnalysisLoading(false));
        fetchExchangeTickers(crypto.id)
            .then(setExchangeTickers)
            .catch(err => setTickersError(err.message))
            .finally(() => setIsTickersLoading(false));
    }, [onIncrementAnalysisCount]);
    const closeModal = () => { setIsModalOpen(false); setSelectedCrypto(null); };
    const renderContent = () => {
        if (isTrendingLoading) {
            return (_jsxs(_Fragment, { children: [_jsx(SkeletonHero, {}), _jsx("div", { className: "flex space-x-4 overflow-x-auto pb-4 -mx-4 px-4 custom-scrollbar mt-6", children: Array.from({ length: 4 }).map((_, index) => _jsx(SkeletonCard, {}, index)) })] }));
        }
        if (trendingError) {
            return (_jsxs("div", { className: "flex flex-col items-center justify-center h-64 text-center", children: [_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-12 w-12 text-magenta mb-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" }) }), _jsx("p", { className: "text-lg font-semibold text-red-400", children: "Tidak Dapat Memuat Data" }), _jsx("p", { className: "text-gray-400 mt-2 mb-4 max-w-md", children: trendingError }), _jsx("button", { onClick: onReloadTrending, className: "bg-electric/80 hover:bg-electric text-white font-semibold py-2 px-6 rounded-lg transition-all duration-300", children: "Coba Lagi" })] }));
        }
        return (_jsxs("div", { className: "animate-fade-in-content", children: [heroCoin && _jsx(HeroCoin, { crypto: heroCoin, onAnalyze: handleAnalyze, idrRate: idrRate, currency: currency }), otherTrendingCoins.length > 0 && (_jsxs("div", { className: "mt-6", children: [_jsx("h3", { className: "text-lg font-bold text-gray-300 mb-3", children: "Peluang Pasar Lainnya" }), _jsx("div", { className: "flex space-x-4 overflow-x-auto pb-4 -mx-4 px-4 custom-scrollbar", children: otherTrendingCoins.map(crypto => _jsx(CryptoCard, { crypto: crypto, onAnalyze: handleAnalyze, idrRate: idrRate, currency: currency }, crypto.id)) })] }))] }));
    };
    return (_jsxs("div", { className: "animate-fade-in", children: [_jsxs("div", { className: "container mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-6", children: [_jsxs("div", { className: "flex flex-col md:flex-row items-center justify-between mb-5 gap-4", children: [_jsxs("div", { className: "text-center md:text-left", children: [_jsxs("h2", { className: "text-2xl font-black text-gray-100 font-heading", children: ["Cari ", _jsx("span", { className: "bg-gradient-to-r from-electric to-magenta text-transparent bg-clip-text", children: "Cuan" }), " Lo Selanjutnya"] }), _jsx("p", { className: "text-gray-400 text-sm mt-1", children: "Data paling gacor hari ini, dianalisis pake AI." })] }), _jsxs("div", { className: "relative w-full sm:max-w-xs", ref: searchContainerRef, children: [_jsx("input", { type: "text", placeholder: "Cari 500 koin teratas...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), className: "w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-electric transition-all" }), _jsx("svg", { className: "absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" }) }), (searchQuery.length > 0) && (_jsx("ul", { className: "absolute top-full mt-2 w-full bg-gray-900/80 backdrop-blur-md border border-white/10 rounded-lg shadow-lg max-h-80 overflow-y-auto z-30", children: isCoinListLoading ? (_jsx("li", { className: "px-4 py-3 text-sm text-gray-400 text-center", children: "Memuat daftar koin..." })) : coinListError ? (_jsx("li", { className: "px-4 py-3 text-sm text-red-400 text-center", children: coinListError })) : filteredCoinList.length > 0 ? (filteredCoinList.map(coin => (_jsxs("li", { onClick: () => handleSearchSelect(coin.id), className: "flex items-center gap-3 px-4 py-3 hover:bg-electric/20 cursor-pointer text-sm font-medium transition-colors", children: [_jsx("img", { src: coin.image, alt: coin.name, className: "h-6 w-6 rounded-full", loading: "lazy" }), _jsxs("span", { children: [coin.name, " ", _jsx("span", { className: "text-gray-400", children: coin.symbol.toUpperCase() })] })] }, coin.id)))) : (_jsx("li", { className: "px-4 py-3 text-sm text-gray-400 text-center", children: "Tidak ada koin ditemukan." })) }))] })] }), _jsx(DominanceTicker, { initialData: marketDominance, isLoading: isDominanceLoading }), renderContent()] }), isModalOpen && selectedCrypto && (_jsx(Suspense, { fallback: _jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 z-40" }), children: _jsx(AnalysisModal, { isOpen: isModalOpen, onClose: closeModal, crypto: selectedCrypto, analysisResult: analysisResult, isLoading: isAnalysisLoading, error: analysisError, exchangeTickers: exchangeTickers, isTickersLoading: isTickersLoading, tickersError: tickersError, idrRate: idrRate, currency: currency }) })), _jsx("style", { children: `
            @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes fade-in-content { from { opacity: 0; } to { opacity: 1; } }
            .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
            .animate-fade-in-content { animation: fade-in-content 0.6s 0.2s ease-out forwards; opacity: 0; }
            .custom-scrollbar::-webkit-scrollbar { height: 6px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 3px; }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0, 191, 255, 0.5); }
        ` })] }));
};
export default HomePage;
//# sourceMappingURL=HomePage.js.map