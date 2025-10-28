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

const UserTag: React.FC<UserTagProps> = ({ sender, userCreationDate }) => {
    let tagName = '';
    let tagColor = 'text-gray-400';

    if (sender && ADMIN_USERNAMES.map((name: string) => name.toLowerCase()).includes(sender.toLowerCase())) {
        tagName = 'atmin';
        tagColor = 'text-yellow-400';
    } else if (userCreationDate) {
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
        return null;
    }

    return (
        <span className={`text-xs font-semibold ${tagColor}`}>
            #{tagName}
        </span>
    );
};

export default UserTag;