import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
// --- Helper Functions ---
const formatUsd = (price) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 18,
    }).format(price);
};
const formatIdr = (value) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};
const parseAndConvertPrice = (priceString, rate, displayCurrency) => {
    const cleanedString = String(priceString).replace(/[\$,]/g, '').trim();
    // Handle ranges
    if (cleanedString.includes('-')) {
        const parts = cleanedString.split('-').map(p => parseFloat(p.trim()));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            const usdRange = parts.map(formatUsd).join(' - ');
            if (rate) {
                const idrRange = parts.map(p => formatIdr(p * rate)).join(' - ');
                return displayCurrency === 'idr' ? { primary: idrRange, secondary: usdRange } : { primary: usdRange, secondary: idrRange };
            }
            return { primary: usdRange, secondary: 'Memuat kurs...' };
        }
    }
    // Handle single numbers
    const num = parseFloat(cleanedString);
    if (!isNaN(num)) {
        const usdValue = formatUsd(num);
        if (rate) {
            const idrValue = formatIdr(num * rate);
            return displayCurrency === 'idr' ? { primary: idrValue, secondary: usdValue } : { primary: usdValue, secondary: idrValue };
        }
        return { primary: usdValue, secondary: 'Memuat kurs...' };
    }
    return { primary: priceString, secondary: 'Format tidak valid' };
};
// --- Sub-components ---
const ProfitAnimation = () => (_jsxs("div", { className: "flex flex-col items-center justify-center space-y-4 py-6", children: [_jsxs("div", { className: "relative w-32 h-24 flex items-end justify-center gap-1.5 overflow-hidden", children: [_jsx("div", { className: "w-5 h-1/4 bg-lime/50 rounded-t-sm animate-grow", style: { animationDelay: '0s' } }), _jsx("div", { className: "w-5 h-1/2 bg-lime/70 rounded-t-sm animate-grow", style: { animationDelay: '0.2s' } }), _jsx("div", { className: "w-5 h-3/4 bg-lime rounded-t-sm animate-grow", style: { animationDelay: '0.4s' } }), _jsx("div", { className: "w-5 h-1/3 bg-lime/60 rounded-t-sm animate-grow", style: { animationDelay: '0.6s' } }), _jsx("div", { className: "absolute top-full left-1/4 w-2 h-2 bg-lime rounded-full opacity-0 animate-float", style: { animationDelay: '0.5s' } }), _jsx("div", { className: "absolute top-full left-1/2 w-1.5 h-1.5 bg-lime rounded-full opacity-0 animate-float", style: { animationDelay: '1s' } }), _jsx("div", { className: "absolute top-full left-3/4 w-2.5 h-2.5 bg-lime rounded-full opacity-0 animate-float", style: { animationDelay: '0.2s' } })] }), _jsx("p", { className: "text-lime text-base tracking-wider font-semibold text-center", children: "Menganalisis Potensi Keuntungan..." })] }));
const TickerLoadingSpinner = ({ text }) => (_jsxs("div", { className: "flex flex-col items-center justify-center space-y-2 py-8", children: [_jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-electric/50" }), _jsx("p", { className: "text-gray-400 text-sm", children: text })] }));
const ErrorDisplay = ({ title, message }) => (_jsxs("div", { className: "flex flex-col items-center justify-center text-center p-4 bg-magenta/10 rounded-lg", children: [_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-10 w-10 text-magenta mb-2", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" }) }), _jsx("p", { className: "text-lg font-semibold text-magenta", children: title }), _jsx("p", { className: "text-gray-400 text-sm mt-1", children: message })] }));
const AnalysisContent = ({ result, idrRate, currency }) => {
    const isLong = result.position === 'Long';
    const entry = parseAndConvertPrice(result.entryPrice, idrRate, currency);
    const stop = parseAndConvertPrice(result.stopLoss, idrRate, currency);
    const profit = parseAndConvertPrice(result.takeProfit, idrRate, currency);
    const confidenceStyles = {
        High: 'bg-lime/20 text-lime',
        Medium: 'bg-electric/20 text-electric',
        Low: 'bg-yellow-500/20 text-yellow-400',
    };
    const confidenceText = result.confidence || 'N/A';
    const styleClass = confidenceStyles[confidenceText] || 'bg-white/10 text-gray-100';
    return (_jsxs("div", { className: "space-y-3 w-full animate-fade-in-content", style: { animation: 'fade-in-content 0.5s ease-out forwards' }, children: [_jsx("div", { className: `relative p-3 rounded-xl overflow-hidden ${isLong ? 'bg-gradient-to-br from-lime/20 to-lime/5' : 'bg-gradient-to-br from-magenta/20 to-magenta/5'}`, children: _jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: `flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${isLong ? 'bg-lime/20 text-lime' : 'bg-magenta/20 text-magenta'}`, children: isLong ?
                                        _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M13 7l5 5m0 0l-5 5m5-5H6" }) }) :
                                        _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M11 17l-5-5m0 0l5-5m-5 5h12" }) }) }), _jsxs("div", { children: [_jsx("p", { className: "text-xs font-medium text-gray-400", children: "Rekomendasi Posisi" }), _jsx("p", { className: `text-xl font-black ${isLong ? 'text-lime' : 'text-magenta'}`, children: result.position })] })] }), _jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-xs font-medium text-gray-400", children: "Keyakinan" }), _jsx("span", { className: `inline-block text-xs font-semibold px-2 py-1 rounded-full ${styleClass}`, children: confidenceText })] })] }) }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-2 text-center", children: [_jsxs("div", { className: "bg-white/5 p-2 rounded-lg", children: [_jsx("p", { className: "text-xs font-medium text-gray-400", children: "Harga Masuk" }), _jsx("p", { className: "text-sm font-semibold text-electric break-words", children: entry.primary }), _jsx("p", { className: "text-xs text-gray-500", children: entry.secondary })] }), _jsxs("div", { className: "bg-white/5 p-2 rounded-lg", children: [_jsx("p", { className: "text-xs font-medium text-gray-400", children: "Stop Loss" }), _jsx("p", { className: "text-sm font-semibold text-magenta", children: stop.primary }), _jsx("p", { className: "text-xs text-gray-500", children: stop.secondary })] }), _jsxs("div", { className: "bg-white/5 p-2 rounded-lg", children: [_jsx("p", { className: "text-xs font-medium text-gray-400", children: "Ambil Untung" }), _jsx("p", { className: "text-sm font-semibold text-lime", children: profit.primary }), _jsx("p", { className: "text-xs text-gray-500", children: profit.secondary })] })] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2 mb-1.5", children: [_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5 text-electric", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" }) }), _jsx("h4", { className: "text-xs font-semibold text-gray-400 uppercase tracking-wider font-heading", children: "Kata CRYP-7:" })] }), _jsx("div", { className: "bg-black/20 border-l-4 border-electric/50 p-3 rounded-r-lg", children: _jsx("p", { className: "text-sm text-gray-300 leading-relaxed italic", children: result.reasoning }) })] })] }));
};
const ExchangeLogo = ({ logo, name }) => {
    const [imgError, setImgError] = useState(false);
    if (imgError || !logo) {
        return (_jsx("div", { className: "h-5 w-5 rounded-full bg-gray-700 flex items-center justify-center font-bold text-xs text-white flex-shrink-0", children: name.charAt(0).toUpperCase() }));
    }
    return (_jsx("img", { src: logo, alt: `${name} logo`, className: "h-5 w-5 rounded-full flex-shrink-0 bg-white/10", onError: () => setImgError(true) }));
};
const ExchangePrices = ({ tickers, idrRate, currency }) => (_jsx("div", { className: "w-full", children: tickers.length > 0 ? (_jsx("div", { className: "grid grid-cols-2 gap-2", children: tickers.map(ticker => (_jsxs("a", { href: ticker.tradeUrl, target: "_blank", rel: "noopener noreferrer", className: "flex flex-col items-center justify-center text-center bg-white/5 p-2 rounded-lg hover:bg-electric/20 transition-colors duration-200 group space-y-1", children: [_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx(ExchangeLogo, { logo: ticker.logo, name: ticker.name }), _jsx("span", { className: "font-medium text-gray-300 text-xs truncate", children: ticker.name })] }), _jsx("span", { className: "font-mono text-xs text-gray-50 font-bold", children: currency === 'idr' && idrRate ? formatIdr(ticker.price * idrRate) : formatUsd(ticker.price) })] }, ticker.name))) })) : _jsx("p", { className: "text-gray-500 text-center py-4 text-sm", children: "Tidak ada data bursa ditemukan." }) }));
const AnalysisModal = ({ isOpen, onClose, crypto, analysisResult, isLoading, error, exchangeTickers, isTickersLoading, tickersError, idrRate, currency }) => {
    if (!isOpen)
        return null;
    return (_jsxs("div", { className: "fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex justify-center items-center z-50 transition-opacity duration-300 p-2 sm:p-4", onClick: onClose, children: [_jsxs("div", { className: "bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 w-full max-w-3xl transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale max-h-[90vh] overflow-y-auto", onClick: e => e.stopPropagation(), style: { animation: 'fade-in-scale 0.3s forwards' }, children: [_jsx("div", { className: "sticky top-0 bg-gray-900/80 backdrop-blur-xl z-10 px-4 py-3 border-b border-white/10", children: _jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("h2", { className: "text-lg sm:text-xl font-bold text-gray-100 flex items-center gap-3 font-heading", children: [_jsx("img", { src: crypto.image, alt: crypto.name, className: "h-7 w-7 rounded-full" }), crypto.name, " ", _jsxs("span", { className: 'hidden sm:inline text-gray-400 font-sans', children: ["(", crypto.symbol, ")"] })] }), _jsx("button", { onClick: onClose, className: "text-gray-400 hover:text-white transition-colors rounded-full p-1 hover:bg-white/10", children: _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-6 w-6", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) }) })] }) }), _jsx("div", { className: "p-4", children: _jsxs("div", { className: "grid grid-cols-10 gap-4", children: [_jsxs("div", { className: "col-span-10 lg:col-span-6 space-y-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("h3", { className: "text-sm font-bold bg-gradient-to-r from-electric to-magenta text-transparent bg-clip-text inline-block font-heading", children: "Analisis AI" }), _jsxs("div", { className: "group relative", children: [_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-4 w-4 text-gray-400 cursor-pointer", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" }) }), _jsxs("div", { className: "absolute bottom-full mb-2 w-64 bg-gray-800 text-white text-xs rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 -translate-x-1/2 left-1/2", children: ["Analisis ini didasarkan pada metodologi multi-indikator canggih yang menggabungkan WaveTrend Oscillator, Divergensi, RSI, dan Money Flow Index (MFI) untuk mengidentifikasi potensi peluang perdagangan.", _jsx("div", { className: "absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800" })] })] })] }), _jsxs("div", { className: "flex items-center justify-center bg-black/20 rounded-lg p-3 min-h-[300px]", children: [isLoading && _jsx(ProfitAnimation, {}), error && !isLoading && _jsx(ErrorDisplay, { title: "Analisis Gagal", message: error }), analysisResult && !isLoading && _jsx(AnalysisContent, { result: analysisResult, idrRate: idrRate, currency: currency })] })] }), _jsxs("div", { className: "col-span-10 lg:col-span-4 space-y-2", children: [_jsxs("h3", { className: "text-sm font-bold text-gray-200 font-heading", children: ["Harga Langsung Bursa (", currency.toUpperCase(), ")"] }), _jsxs("div", { className: "bg-black/20 rounded-lg p-2", children: [isTickersLoading && _jsx(TickerLoadingSpinner, { text: "Memuat harga..." }), tickersError && !isTickersLoading && _jsx("div", { className: "p-2", children: _jsx(ErrorDisplay, { title: "Gagal Memuat", message: tickersError }) }), !isTickersLoading && !tickersError && _jsx(ExchangePrices, { tickers: exchangeTickers, idrRate: idrRate, currency: currency })] })] })] }) }), _jsx("div", { className: "text-center px-4 pb-3 text-xs text-gray-600", children: "Selalu lakukan riset Anda sendiri." })] }), _jsx("style", { children: `
        @keyframes fade-in-scale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes fade-in-content {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes grow {
            0% { transform: scaleY(0); transform-origin: bottom; }
            50% { transform: scaleY(1); transform-origin: bottom; }
            100% { transform: scaleY(1); transform-origin: bottom; }
        }
        @keyframes float {
            0% { transform: translateY(0) scale(0); opacity: 1; }
            100% { transform: translateY(-80px) scale(1.5); opacity: 0; }
        }
        .animate-grow { animation: grow 1.5s ease-in-out infinite; }
        .animate-float { animation: float 2s ease-out infinite; }
        
        div::-webkit-scrollbar { width: 6px; }
        div::-webkit-scrollbar-track { background: transparent; }
        div::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 3px; }
        div::-webkit-scrollbar-thumb:hover { background: rgba(0, 191, 255, 0.5); }
      ` })] }));
};
export default AnalysisModal;
//# sourceMappingURL=AnalysisModal.js.map