import React, { useState, useCallback, useRef, lazy, Suspense, useEffect } from 'react';
import { fetchCryptoAnalysis } from '../services/geminiService';
import CryptoCard from './CryptoCard';
import type { HomePageProps, MarketDominance, CryptoData, AnalysisResult, ExchangeTicker, CoinListItem } from '../types';
import HeroCoin from './HeroCoin';
import DominanceTicker from './DominanceTicker';
import {
  fetchMarketDominance,
  fetchExchangeTickers,
} from '../services/mockData';

// Lazy load komponen modal
const AnalysisModal = lazy(() => import('./AnalysisModal'));

const SkeletonHero = () => (
    <div className="bg-gray-900 border border-white/10 rounded-xl p-6 w-full relative overflow-hidden">
        <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
                <div className="flex items-center mb-4">
                    <div className="h-12 w-12 bg-gray-700 rounded-full mr-4"></div>
                    <div className="flex-1 space-y-2">
                        <div className="h-6 w-3/4 bg-gray-700 rounded"></div>
                        <div className="h-4 w-1/4 bg-gray-700 rounded"></div>
                    </div>
                </div>
                <div className="h-10 w-1/2 bg-gray-700 rounded my-2"></div>
                <div className="h-20 w-full bg-gray-700 rounded mt-4"></div>
            </div>
            <div className="w-full md:w-1/3 space-y-4">
                <div className="h-8 w-full bg-gray-700 rounded"></div>
                <div className="h-8 w-full bg-gray-700 rounded"></div>
                <div className="h-12 w-full bg-gray-700 rounded mt-4"></div>
            </div>
        </div>
        <div className="absolute top-0 left-0 w-full h-full skeleton-shimmer"></div>
    </div>
);

const SkeletonCard = () => (
  <div className="bg-gray-900 border border-white/10 rounded-xl p-4 h-full w-56 flex-shrink-0 relative overflow-hidden">
    <div className="flex items-center mb-4">
      <div className="h-8 w-8 bg-gray-700 rounded-full mr-3"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/4 bg-gray-700 rounded"></div>
        <div className="h-3 w-1/4 bg-gray-700 rounded"></div>
      </div>
    </div>
    <div className="h-10 w-full bg-gray-700 rounded my-2"></div>
    <div className="h-6 w-1/2 bg-gray-700 rounded mt-2"></div>
    <div className="absolute top-0 left-0 w-full h-full skeleton-shimmer"></div>
  </div>
);

const HomePage: React.FC<HomePageProps> = ({ 
    idrRate, isRateLoading, currency, onIncrementAnalysisCount, 
    fullCoinList, isCoinListLoading, coinListError,
    heroCoin, otherTrendingCoins, isTrendingLoading, trendingError, onSelectCoin, onReloadTrending
}) => {
  const [marketDominance, setMarketDominance] = useState<MarketDominance | null>(null);
  const [isDominanceLoading, setIsDominanceLoading] = useState(true);
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoData | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [exchangeTickers, setExchangeTickers] = useState<ExchangeTicker[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isTickersLoading, setIsTickersLoading] = useState(false);
  const [tickersError, setTickersError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCoinList, setFilteredCoinList] = useState<CoinListItem[]>([]);
  const searchContainerRef = useRef<HTMLDivElement>(null);


  const fetchDominanceData = useCallback(async () => {
    setIsDominanceLoading(true);
    try {
        const dominance = await fetchMarketDominance();
        setMarketDominance(dominance);
    } catch(err) {
        console.error("Gagal memuat data dominasi:", err);
    } finally {
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
    } else { setFilteredCoinList([]); }
  }, [searchQuery, fullCoinList]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setFilteredCoinList([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSelect = useCallback(async (coinId: string) => {
    setSearchQuery('');
    setFilteredCoinList([]);
    onSelectCoin(coinId);
  }, [onSelectCoin]);


  const handleAnalyze = useCallback(async (crypto: CryptoData) => {
    onIncrementAnalysisCount(crypto.id); // Tambah hitungan analisis
    setSelectedCrypto(crypto); setIsModalOpen(true);
    setIsAnalysisLoading(true); setAnalysisError(null); setAnalysisResult(null);
    setIsTickersLoading(true); setTickersError(null); setExchangeTickers([]);

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
      return (
        <>
          <SkeletonHero />
          <div className="flex space-x-4 overflow-x-auto pb-4 -mx-4 px-4 custom-scrollbar mt-6">
            {Array.from({ length: 4 }).map((_, index) => <SkeletonCard key={index} />)}
          </div>
        </>
      );
    }
    if (trendingError) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-magenta mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="text-lg font-semibold text-red-400">Tidak Dapat Memuat Data</p>
            <p className="text-gray-400 mt-2 mb-4 max-w-md">{trendingError}</p>
            <button onClick={onReloadTrending} className="bg-electric/80 hover:bg-electric text-white font-semibold py-2 px-6 rounded-lg transition-all duration-300">Coba Lagi</button>
        </div>
      );
    }
    return (
      <div className="animate-fade-in-content">
        {heroCoin && <HeroCoin crypto={heroCoin} onAnalyze={handleAnalyze} idrRate={idrRate} currency={currency} />}
        {otherTrendingCoins.length > 0 && (
          <div className="mt-6">
             <h3 className="text-lg font-bold text-gray-300 mb-3">Peluang Pasar Lainnya</h3>
             <div className="flex space-x-4 overflow-x-auto pb-4 -mx-4 px-4 custom-scrollbar">
                {otherTrendingCoins.map(crypto => <CryptoCard key={crypto.id} crypto={crypto} onAnalyze={handleAnalyze} idrRate={idrRate} currency={currency} />)}
             </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-6">
            <div className="flex flex-col md:flex-row items-center justify-between mb-5 gap-4">
                 <div className="text-center md:text-left">
                    <h2 className="text-2xl font-black text-gray-100 font-heading">Cari <span className="bg-gradient-to-r from-electric to-magenta text-transparent bg-clip-text">Cuan</span> Lo Selanjutnya</h2>
                    <p className="text-gray-400 text-sm mt-1">Data paling gacor hari ini, dianalisis pake AI.</p>
                </div>
                 <div className="relative w-full sm:max-w-xs" ref={searchContainerRef}>
                    <input type="text" placeholder="Cari 500 koin teratas..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-electric transition-all" />
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    {(searchQuery.length > 0) && (
                        <ul className="absolute top-full mt-2 w-full bg-gray-900/80 backdrop-blur-md border border-white/10 rounded-lg shadow-lg max-h-80 overflow-y-auto z-30">
                          {isCoinListLoading ? (
                            <li className="px-4 py-3 text-sm text-gray-400 text-center">Memuat daftar koin...</li>
                          ) : coinListError ? (
                            <li className="px-4 py-3 text-sm text-red-400 text-center">{coinListError}</li>
                          ) : filteredCoinList.length > 0 ? (
                            filteredCoinList.map(coin => (
                              <li key={coin.id} onClick={() => handleSearchSelect(coin.id)} className="flex items-center gap-3 px-4 py-3 hover:bg-electric/20 cursor-pointer text-sm font-medium transition-colors">
                                  <img src={coin.image} alt={coin.name} className="h-6 w-6 rounded-full" loading="lazy" />
                                  <span>{coin.name} <span className="text-gray-400">{coin.symbol.toUpperCase()}</span></span>
                              </li>
                            ))
                          ) : (
                             <li className="px-4 py-3 text-sm text-gray-400 text-center">Tidak ada koin ditemukan.</li>
                          )}
                        </ul>
                    )}
                </div>
            </div>
            
            <DominanceTicker initialData={marketDominance} isLoading={isDominanceLoading} />

            {renderContent()}
        </div>
        {isModalOpen && selectedCrypto && (
          <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-50 z-40" />}>
            <AnalysisModal isOpen={isModalOpen} onClose={closeModal} crypto={selectedCrypto} analysisResult={analysisResult} isLoading={isAnalysisLoading} error={analysisError} exchangeTickers={exchangeTickers} isTickersLoading={isTickersLoading} tickersError={tickersError} idrRate={idrRate} currency={currency} />
          </Suspense>
        )}
        <style>{`
            @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes fade-in-content { from { opacity: 0; } to { opacity: 1; } }
            .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
            .animate-fade-in-content { animation: fade-in-content 0.6s 0.2s ease-out forwards; opacity: 0; }
            .custom-scrollbar::-webkit-scrollbar { height: 6px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 3px; }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0, 191, 255, 0.5); }
        `}</style>
    </div>
  );
};

export default HomePage;