import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const Sparkline = ({ data, color }) => {
    if (!data || data.length < 2) {
        return _jsx("div", { className: "h-10 w-full flex items-center justify-center text-xs text-gray-500", children: "Data tidak cukup" });
    }
    const width = 120;
    const height = 40;
    const strokeWidth = 1.5;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min === 0 ? 1 : max - min;
    const points = data
        .map((d, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((d - min) / range) * (height - strokeWidth * 2) - strokeWidth;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
        .join(' ');
    return (_jsx("div", { className: "relative w-full h-10", children: _jsx("svg", { viewBox: `0 0 ${width} ${height}`, className: "w-full h-auto overflow-visible", preserveAspectRatio: "none", children: _jsx("polyline", { fill: "none", stroke: color, strokeWidth: strokeWidth, strokeLinecap: "round", strokeLinejoin: "round", points: points }) }) }));
};
const formatUsd = (price) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 18,
    }).format(price);
};
const formatIdr = (value, rate) => {
    if (value === null || rate === null)
        return '...';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value * rate);
};
const CryptoCard = ({ crypto, onAnalyze, idrRate, currency }) => {
    const isPositive = crypto.change >= 0;
    return (_jsxs("div", { className: "group relative rounded-xl overflow-hidden bg-gray-900 border border-white/10 w-56 flex-shrink-0 flex flex-col transition-all duration-300 hover:-translate-y-1", children: [_jsx("div", { className: "absolute -inset-px rounded-xl bg-gradient-to-r from-lime via-magenta to-electric opacity-0 group-hover:opacity-100 transition-opacity duration-300", "aria-hidden": "true" }), _jsxs("div", { className: "relative bg-gray-900/95 rounded-xl p-3 flex flex-col justify-between h-full z-10", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center mb-2", children: [_jsx("img", { src: crypto.image, alt: crypto.name, className: "h-8 w-8 rounded-full mr-3", loading: "lazy", decoding: "async" }), _jsxs("div", { className: "flex-1", children: [_jsx("h3", { className: "text-md font-bold text-gray-100 truncate", children: crypto.name }), _jsx("span", { className: "text-xs text-gray-400 font-mono", children: crypto.symbol })] })] }), _jsx(Sparkline, { data: crypto.sparkline_in_7d.price, color: isPositive ? '#32CD32' : '#FF00FF' }), _jsxs("div", { className: "flex items-end justify-between mt-2", children: [_jsx("p", { className: "text-lg font-semibold text-gray-50 tracking-tight", children: currency === 'idr' && idrRate ? formatIdr(crypto.price, idrRate) : formatUsd(crypto.price) }), _jsxs("div", { className: `inline-flex items-center text-sm font-medium ${isPositive ? 'text-lime' : 'text-magenta'}`, children: [isPositive ? '▲' : '▼', " ", crypto.change.toFixed(2), "%"] })] })] }), _jsx("button", { onClick: () => onAnalyze(crypto), className: "mt-3 w-full bg-white/5 border border-white/10 hover:border-electric hover:bg-electric/20 hover:text-electric text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-electric text-sm", children: "Analisis AI" })] })] }));
};
export default CryptoCard;
//# sourceMappingURL=CryptoCard.js.map