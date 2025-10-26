import React from 'react';
import type { HeroCoinProps, Currency } from '../types';

const Sparkline = ({ data, color }: { data: number[], color: string }) => {
  if (!data || data.length < 2) return <div className="h-full w-full flex items-center justify-center text-sm text-gray-500">Data Grafik Tidak Tersedia</div>;

  const width = 400;
  const height = 100;
  const strokeWidth = 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min === 0 ? 1 : max - min;

  const points = data
    .map((d: number, i: number) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((d - min) / range) * (height - strokeWidth * 2) - strokeWidth;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <div className="relative w-full h-full">
       <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible" preserveAspectRatio="none">
        <defs>
            <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
        </defs>
        <polyline fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" points={points} />
        <polygon fill={`url(#gradient-${color.replace('#', '')})`} points={`0,${height} ${points} ${width},${height}`} />
      </svg>
    </div>
  );
};

// Fungsi pemformatan terpusat
const formatUsd = (price: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 18,
  }).format(price);
};

const formatIdr = (value: number, rate: number | null): string => {
    if (value === null || rate === null) return '...';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value * rate);
};

const formatMarketCap = (cap: number, rate: number | null, currency: Currency): string => {
    if (currency === 'idr') {
        if (rate === null) return '...';
        const capInIdr = cap * rate;
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(capInIdr);
    } else {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(cap);
    }
};


const DataPill = ({ label, value, className = '' }: { label: string, value: string, className?: string }) => (
    <div className={`text-center md:text-left ${className}`}>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-gray-100">{value}</p>
    </div>
);

const HeroCoin: React.FC<HeroCoinProps> = ({ crypto, onAnalyze, idrRate, currency }) => {
    const isPositive = crypto.change >= 0;

    return (
        <div className="group relative p-0.5 rounded-2xl overflow-hidden bg-gray-900 border border-white/10 w-full transition-all duration-300 hover:shadow-2xl hover:shadow-electric/20">
             <div className="absolute inset-0 bg-gradient-to-br from-electric/50 to-magenta/50 opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-3xl"></div>
             <div className="relative bg-gray-900/90 backdrop-blur-sm rounded-xl p-4 flex flex-col lg:flex-row gap-4">
                {/* Left Side: Info & Chart */}
                <div className="flex-1">
                    <div className="flex items-center mb-3">
                        <img src={crypto.image} alt={crypto.name} className="h-10 w-10 rounded-full mr-3" loading="lazy" decoding="async" />
                        <div>
                            <h3 className="text-xl font-bold text-gray-100">{crypto.name}</h3>
                            <span className="text-sm text-gray-400 font-mono">{crypto.symbol}</span>
                        </div>
                    </div>
                     <div className="flex items-end gap-3 mb-3">
                        <p className="text-3xl font-black text-gray-50 tracking-tight">{currency === 'idr' && idrRate ? formatIdr(crypto.price, idrRate) : formatUsd(crypto.price)}</p>
                        <div className={`text-lg font-bold ${isPositive ? 'text-lime' : 'text-magenta'}`}>
                            {isPositive ? '▲' : '▼'} {crypto.change.toFixed(2)}%
                        </div>
                    </div>
                    <div className="h-20 w-full">
                       <Sparkline data={crypto.sparkline_in_7d.price} color={isPositive ? '#32CD32' : '#FF00FF'} />
                    </div>
                </div>
                {/* Right Side: Stats & Action */}
                <div className="w-full lg:w-2/5 bg-black/20 p-3 rounded-lg flex flex-col justify-between">
                    <div className="grid grid-cols-2 md:grid-cols-1 gap-3">
                        <DataPill label="Tertinggi 24 Jam" value={currency === 'idr' && idrRate ? formatIdr(crypto.high_24h, idrRate) : formatUsd(crypto.high_24h)} />
                        <DataPill label="Terendah 24 Jam" value={currency === 'idr' && idrRate ? formatIdr(crypto.low_24h, idrRate) : formatUsd(crypto.low_24h)} />
                        <DataPill label="Kapitalisasi Pasar" value={formatMarketCap(crypto.market_cap, idrRate, currency)} />
                    </div>
                    <button
                        onClick={() => onAnalyze(crypto)}
                        className="mt-3 w-full bg-gradient-to-r from-electric to-magenta hover:from-electric/80 hover:to-magenta/80 text-white font-bold py-2.5 px-4 rounded-lg transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-electric/50 shadow-lg shadow-electric/20 hover:shadow-xl hover:shadow-electric/30 transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                        >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                        <span>Gaskeun Analisis</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HeroCoin;