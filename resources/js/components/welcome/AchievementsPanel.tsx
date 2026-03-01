import { useEffect, useState } from 'react';
import type { Achievement } from '@/components/welcome/types';
import { useApiClient } from '@/hooks/useApiClient';

export default function AchievementsPanel({ playerId }: { playerId: string }) {
    const api = useApiClient(playerId);
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        void api.fetchAchievements().then((res) => {
            setAchievements(res.data as Achievement[]);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return (
            <div className="w-full max-w-md rounded border border-white/10 bg-black/60 p-3 backdrop-blur-sm">
                <div className="py-4 text-center text-xs text-white/30">Loading...</div>
            </div>
        );
    }

    const earned = achievements.filter((a) => a.earned_at !== null).length;

    return (
        <div className="w-full max-w-md rounded border border-white/10 bg-black/60 p-3 backdrop-blur-sm">
            <div className="mb-2 flex items-center justify-between text-xs text-white/60">
                <span>Achievements</span>
                <span>{earned} / {achievements.length}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
                {achievements.map((a) => (
                    <div
                        key={a.key}
                        className={`rounded border p-2 text-xs ${
                            a.earned_at
                                ? 'border-amber-500/30 bg-amber-500/10 text-white'
                                : 'border-white/5 bg-white/5 text-white/30'
                        }`}
                    >
                        <div className="font-bold">{a.name}</div>
                        <div className="mt-0.5 text-[10px] opacity-70">{a.description}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
