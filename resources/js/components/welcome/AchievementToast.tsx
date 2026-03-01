import { useEffect, useState } from 'react';

export default function AchievementToast({
    name,
    description,
    onDone,
}: {
    name: string;
    description: string;
    onDone: () => void;
}) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        requestAnimationFrame(() => setVisible(true));
        const t = setTimeout(() => {
            setVisible(false);
            setTimeout(onDone, 800);
        }, 5000);
        return () => clearTimeout(t);
    }, []);

    return (
        <div
            className={`fixed top-6 right-6 z-[100] rounded border border-amber-500/30 bg-black/90 px-4 py-3 backdrop-blur-sm transition-all duration-800 ${
                visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
            }`}
            style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
        >
            <div className="text-xs font-bold text-amber-400">Achievement Unlocked!</div>
            <div className="mt-1 text-sm text-white">{name}</div>
            <div className="text-xs text-white/50">{description}</div>
        </div>
    );
}
