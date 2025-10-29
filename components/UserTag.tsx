// components/UserTag.tsx
import React from 'react';

export const ADMIN_USERNAMES = [
    'Admin_RTC',
    'ava',
];

interface UserTagProps {
    sender: string;
    userCreationDate: number | null;
}

// Fungsi untuk mendapatkan informasi tag berdasarkan user
export const getTagInfo = (sender: string, userCreationDate: number | null) => {
    let tagName = '';
    let tagColor = 'text-gray-400';

    // Prioritaskan pemeriksaan admin (case-insensitive)
    if (sender && ADMIN_USERNAMES.map((name: string) => name.toLowerCase()).includes(sender.toLowerCase())) {
        tagName = 'atmin';
        tagColor = 'text-yellow-400';
    } else if (userCreationDate) {
        // Logika tag berbasis usia akun
        const now = Date.now();
        const ageInMillis = now - userCreationDate;
        const ageInDays = ageInMillis / (1000 * 60 * 60 * 24);

        if (ageInDays < 30) {
            tagName = 'pejuang';
            tagColor = 'text-gray-400';
        } else if (ageInDays < 60) {
            tagName = 'cuaners';
            tagColor = 'text-electric';
        } else if (ageInDays < 120) {
            tagName = 'suhu';
            tagColor = 'text-magenta';
        } else {
            tagName = 'buyut';
            tagColor = 'text-lime';
        }
    } else {
        // Jika userCreationDate tidak ada, beri tag default
        tagName = 'pejuang';
        tagColor = 'text-gray-400';
    }

    return { tagName, tagColor };
};

const UserTag: React.FC<UserTagProps> = ({ sender, userCreationDate }) => {
    const { tagName, tagColor } = getTagInfo(sender, userCreationDate);

    return (
        <span className={`text-xs font-semibold ${tagColor}`}>
            #{tagName}
        </span>
    );
};

export default UserTag;