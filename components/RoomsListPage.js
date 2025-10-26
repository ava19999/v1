import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useMemo } from 'react';
import UserTag from './UserTag';
const DEFAULT_ROOM_IDS = ['berita-kripto', 'pengumuman-aturan'];
const ActionModal = ({ room, onJoin, onLeave, onClose, }) => {
    if (!room)
        return null;
    return (_jsx("div", { className: "fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in", style: { animationDuration: '200ms' }, onClick: onClose, children: _jsxs("div", { className: "bg-gray-900 border border-white/10 rounded-xl p-6 w-full max-w-sm text-center animate-fade-in-scale", onClick: e => e.stopPropagation(), children: [_jsx("h3", { className: "text-xl font-bold text-white mb-2", children: room.name }), _jsx("p", { className: "text-gray-400 mb-6", children: "Pilih tindakan yang ingin Anda lakukan." }), _jsxs("div", { className: "flex flex-col gap-3", children: [_jsx("button", { onClick: () => { onJoin(room); onClose(); }, className: "w-full bg-electric hover:bg-electric/80 text-white font-semibold py-2.5 px-4 rounded-lg transition-all", children: "Masuk Room" }), _jsx("button", { onClick: () => { onLeave(room.id); onClose(); }, className: "w-full bg-magenta/20 hover:bg-magenta/40 text-magenta font-semibold py-2.5 px-4 rounded-lg transition-all", children: "Keluar Room" })] }), _jsx("button", { onClick: onClose, className: "mt-6 text-sm text-gray-500 hover:text-white transition-colors", children: "Batal" })] }) }));
};
const RoomListItem = ({ room, onClick, isActive, unreadData, }) => {
    const unreadCount = unreadData?.count || 0;
    const isDefaultRoom = DEFAULT_ROOM_IDS.includes(room.id);
    return (_jsxs("div", { onClick: () => onClick(room), className: `flex items-center justify-between gap-3 p-2.5 rounded-lg cursor-pointer transition-all duration-200 group ${isActive ? 'bg-electric/20 border-electric/50' : 'bg-gray-900/70 hover:bg-gray-800/50 border-transparent'} border`, children: [_jsx("div", { className: "flex items-center gap-3 overflow-hidden", children: _jsx("div", { className: "flex-1 overflow-hidden", children: _jsx("h3", { className: "font-bold text-gray-100 truncate text-sm", children: room.name }) }) }), _jsxs("div", { className: "flex items-center gap-2 flex-shrink-0", children: [unreadCount > 0 && (_jsx("div", { className: "bg-magenta text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse-notification", children: unreadCount })), !isDefaultRoom && (_jsxs("div", { className: "text-right text-xs text-gray-400 flex items-center gap-1.5", children: [_jsxs("span", { className: "relative flex h-2 w-2", children: [_jsx("span", { className: "animate-ping absolute inline-flex h-full w-full rounded-full bg-lime opacity-75" }), _jsx("span", { className: "relative inline-flex rounded-full h-2 w-2 bg-lime" })] }), _jsx("span", { children: room.userCount.toLocaleString('id-ID') })] }))] })] }));
};
const RoomsListPage = ({ rooms, onJoinRoom, onCreateRoom, totalUsers, hotCoin, userProfile, currentRoomId, joinedRoomIds, onLeaveJoinedRoom, unreadCounts }) => {
    const [newRoomName, setNewRoomName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRoomForAction, setSelectedRoomForAction] = useState(null);
    const username = userProfile?.username || '';
    const handleCreate = (e) => {
        e.preventDefault();
        if (newRoomName.trim()) {
            onCreateRoom(newRoomName.trim());
            setNewRoomName('');
        }
    };
    const { myRooms, publicRooms } = useMemo(() => {
        const lowercasedQuery = searchQuery.toLowerCase();
        const filtered = searchQuery
            ? rooms.filter(room => room.name.toLowerCase().includes(lowercasedQuery))
            : rooms;
        const myRoomsList = filtered
            .filter(r => joinedRoomIds.has(r.id))
            .sort((a, b) => {
            const lastUpdateA = unreadCounts[a.id]?.lastUpdate || 0;
            const lastUpdateB = unreadCounts[b.id]?.lastUpdate || 0;
            if (lastUpdateB !== lastUpdateA) {
                return lastUpdateB - lastUpdateA;
            }
            const isADefault = DEFAULT_ROOM_IDS.includes(a.id);
            const isBDefault = DEFAULT_ROOM_IDS.includes(b.id);
            if (isADefault && !isBDefault)
                return -1;
            if (!isADefault && isBDefault)
                return 1;
            return a.name.localeCompare(b.name);
        });
        const publicRoomsList = filtered.filter(r => !joinedRoomIds.has(r.id));
        return { myRooms: myRoomsList, publicRooms: publicRoomsList };
    }, [rooms, searchQuery, joinedRoomIds, unreadCounts]);
    return (_jsxs("div", { className: "container mx-auto px-2 sm:px-4 py-3 animate-fade-in flex flex-col h-[calc(100vh-56px)]", children: [_jsx(ActionModal, { room: selectedRoomForAction, onJoin: onJoinRoom, onLeave: onLeaveJoinedRoom, onClose: () => setSelectedRoomForAction(null) }), _jsxs("div", { className: "flex-shrink-0 grid grid-cols-2 gap-2 mb-2", children: [_jsxs("div", { className: "bg-gray-900 border border-white/10 rounded-lg p-2 flex items-center gap-2", children: [_jsx("div", { className: "bg-electric/20 text-electric p-2 rounded-md flex-shrink-0", children: _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-4 w-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" }) }) }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-gray-400", children: "User Aktif" }), _jsx("p", { className: "text-base font-bold text-white", children: totalUsers.toLocaleString('id-ID') })] })] }), _jsx("div", { className: "bg-gray-900 border border-white/10 rounded-lg p-2 flex items-center gap-2 overflow-hidden", children: hotCoin ? (_jsxs(_Fragment, { children: [_jsx("img", { src: hotCoin.logo, alt: hotCoin.name, className: "h-7 w-7 rounded-full flex-shrink-0" }), _jsxs("div", { className: "overflow-hidden", children: [_jsx("p", { className: "text-xs text-gray-400", children: "Hot Coin" }), _jsx("p", { className: "text-base font-bold text-white truncate", title: hotCoin.name, children: hotCoin.name })] })] })) : (_jsxs("div", { className: "flex items-center gap-2 animate-pulse w-full", children: [_jsx("div", { className: "h-7 w-7 rounded-full bg-gray-700" }), _jsxs("div", { className: "flex-1 space-y-1.5", children: [_jsx("div", { className: "h-3 w-12 bg-gray-700 rounded" }), _jsx("div", { className: "h-4 w-20 bg-gray-700 rounded" })] })] })) })] }), _jsxs("div", { className: "flex-shrink-0 flex items-center gap-2 mb-2 bg-gray-900 border border-white/10 rounded-lg p-2.5", children: [_jsx("span", { className: "font-bold text-white text-sm", children: username }), _jsx(UserTag, { sender: username, userCreationDate: userProfile?.createdAt ?? null })] }), _jsxs("div", { className: "flex-shrink-0 relative mb-2 w-full", children: [_jsx("input", { type: "text", placeholder: "Cari room...", value: searchQuery, onChange: e => setSearchQuery(e.target.value), className: "w-full bg-gray-900 border border-white/10 rounded-lg py-2 pl-9 pr-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-electric transition-all" }), _jsx("svg", { className: "absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" }) })] }), _jsxs("form", { onSubmit: handleCreate, className: "flex-shrink-0 bg-gray-900/50 border border-dashed border-white/10 rounded-lg p-2 mb-3 flex items-center gap-2", children: [_jsx("input", { type: "text", value: newRoomName, onChange: (e) => setNewRoomName(e.target.value), placeholder: "Bikin tongkrongan baru...", className: "flex-1 bg-transparent py-1 px-2 text-sm text-white placeholder-gray-500 focus:outline-none" }), _jsx("button", { type: "submit", className: "bg-magenta hover:bg-magenta/80 text-white font-semibold py-1 px-4 rounded-md transition-all duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed text-sm", disabled: !newRoomName.trim(), children: "Buat" })] }), _jsxs("div", { className: "flex-grow overflow-y-auto space-y-3 pb-4 custom-scrollbar", children: [myRooms.length > 0 && (_jsxs("div", { children: [_jsx("h2", { className: "text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1", children: "Tongkrongan Saya" }), _jsx("div", { className: "space-y-1.5", children: myRooms.map(room => {
                                    const isDefaultRoom = DEFAULT_ROOM_IDS.includes(room.id);
                                    return (_jsx(RoomListItem, { room: room, onClick: isDefaultRoom ? onJoinRoom : setSelectedRoomForAction, isActive: room.id === currentRoomId, unreadData: unreadCounts[room.id] }, room.id));
                                }) })] })), publicRooms.length > 0 && (_jsxs("div", { children: [_jsx("h2", { className: "text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1", children: "Tongkrongan Publik" }), _jsx("div", { className: "space-y-1.5", children: publicRooms.map(room => (_jsx(RoomListItem, { room: room, onClick: onJoinRoom, isActive: room.id === currentRoomId, unreadData: unreadCounts[room.id] }, room.id))) })] }))] }), _jsx("style", { children: `
                @keyframes fade-in-scale {
                  from { opacity: 0; transform: scale(0.95); }
                  to { opacity: 1; transform: scale(1); }
                }
                @keyframes pulse-notification {
                  0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 0, 255, 0.7); }
                  50% { transform: scale(1.05); box-shadow: 0 0 0 5px rgba(255, 0, 255, 0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.5s ease-out forwards;
                }
                .animate-fade-in-scale {
                    animation: fade-in-scale 0.2s ease-out forwards;
                }
                .animate-pulse-notification {
                    animation: pulse-notification 1.5s infinite;
                }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 2px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0, 191, 255, 0.5); }
            ` })] }));
};
export default RoomsListPage;
//# sourceMappingURL=RoomsListPage.js.map