import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const TickerItemSkeleton = () => (_jsxs("div", { className: "flex-1 bg-gray-800/50 p-3 rounded-lg animate-pulse", children: [_jsx("div", { className: "h-4 w-2/3 bg-gray-700 rounded mb-2 mx-auto" }), _jsx("div", { className: "h-6 w-1/3 bg-gray-700 rounded mx-auto" })] }));
const TickerItem = ({ label, value, colorClass }) => {
    return (_jsxs("div", { className: "flex-1 text-center px-3 py-1.5", children: [_jsx("p", { className: "text-xs text-gray-400 font-medium", children: label }), _jsx("div", { className: `text-lg font-bold ${colorClass}`, children: _jsxs("span", { children: [value.toFixed(2), "%"] }) })] }));
};
const DominanceTicker = ({ initialData, isLoading }) => {
    if (isLoading) {
        return (_jsxs("div", { className: "flex items-center gap-4 bg-gray-900/50 border border-white/10 rounded-xl p-1 mb-6", children: [_jsx(TickerItemSkeleton, {}), _jsx(TickerItemSkeleton, {}), _jsx(TickerItemSkeleton, {})] }));
    }
    if (!initialData)
        return null;
    return (_jsx("div", { className: "bg-gray-900/50 border border-white/10 rounded-xl p-1 mb-6 animate-fade-in", children: _jsxs("div", { className: "flex items-center justify-around divide-x divide-white/10", children: [_jsx(TickerItem, { label: "Dominansi BTC", value: initialData.btc, colorClass: "text-electric" }), _jsx(TickerItem, { label: "Dominansi USDT", value: initialData.usdt, colorClass: "text-lime" }), _jsx(TickerItem, { label: "Dominansi ALT", value: initialData.alts, colorClass: "text-magenta" })] }) }));
};
export default DominanceTicker;
//# sourceMappingURL=DominanceTicker.js.map