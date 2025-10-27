// components/UserTag.tsx
import React from 'react';

// --- ATUR ID ADMIN ANDA DI SINI ---
// Ganti 'Admin_RTC' atau tambahkan nama pengguna admin baru di sini.
// Pastikan 'export' ditambahkan di sini
export const ADMIN_USERNAMES = [
    'Admin_RTC',
    'ava',
    // 'TraderMaster', // Contoh admin lain
    // 'CryptoQueen', // Contoh admin lain
];

interface UserTagProps {
    sender: string;
    userCreationDate: number | null;
}

const UserTag: React.FC<UserTagProps> = ({ sender, userCreationDate }) => {
    let tagName = '';
    let tagColor = 'text-gray-400';

    // Prioritaskan pemeriksaan admin (case-insensitive)
    // Perbaiki map untuk menggunakan tipe string eksplisit
    if (sender && ADMIN_USERNAMES.map((name: string) => name.toLowerCase()).includes(sender.toLowerCase())) {
        tagName = 'atmin';
        tagColor = 'text-yellow-400';
    } else if (userCreationDate) {
        // Logika tag berbasis usia akun
        const now = Date.now();
        const ageInMillis = now - userCreationDate;
        const ageInDays = ageInMillis / (1000 * 60 * 60 * 24);

        if (ageInDays < 7) {
            tagName = 'pejuang';
            tagColor = 'text-gray-400';
        } else if (ageInDays < 30) {
            tagName = 'cuaners';
            tagColor = 'text-electric';
        } else if (ageInDays < 90) {
            tagName = 'suhu';
            tagColor = 'text-magenta';
        } else {
            tagName = 'buyut';
            tagColor = 'text-lime';
        }
    } else {
        return null; // Jangan render tag jika tidak ada info yang cukup
    }

    return (
        <span className={`text-xs font-semibold ${tagColor}`}>
            #{tagName}
        </span>
    );
};

export default UserTag;