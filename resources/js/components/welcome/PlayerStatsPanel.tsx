import { useEffect, useState } from 'react';
import type { PlayerStatsData } from '@/components/welcome/types';
import { useApiClient } from '@/hooks/useApiClient';

function formatDistance(km: number | null): string {
    if (km === null) return '-';
    if (km < 1) return `${Math.round(km * 1000)} m`;
    if (km < 100) return `${km.toFixed(1)} km`;
    return `${Math.round(km).toLocaleString()} km`;
}

export default function PlayerStatsPanel({ playerId }: { playerId: string }) {
    const api = useApiClient(playerId);
    const [stats, setStats] = useState<PlayerStatsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        void api.fetchPlayerStats().then((res) => {
            setStats(res.data as PlayerStatsData);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return <div className="text-xs text-white/30">Loading stats...</div>;
    }

    if (!stats || stats.games_played === 0) {
        return <div className="text-xs text-white/30">No stats yet. Play a game!</div>;
    }

    const rows: { label: string; value: string }[] = [
        { label: 'Games', value: `${stats.games_won}W / ${stats.games_lost}L (${stats.games_played} total)` },
        { label: 'Win rate', value: `${stats.win_rate}%` },
        { label: 'Win streak', value: `${stats.current_win_streak} (best: ${stats.best_win_streak})` },
        { label: 'Avg score', value: stats.average_score.toLocaleString() },
        { label: 'Best round', value: stats.best_round_score.toLocaleString() },
        { label: 'Perfect rounds', value: stats.perfect_rounds.toString() },
        { label: 'Avg distance', value: formatDistance(stats.average_distance_km) },
        { label: 'Closest guess', value: formatDistance(stats.closest_guess_km) },
        { label: 'Damage dealt', value: stats.total_damage_dealt.toLocaleString() },
        { label: 'Damage taken', value: stats.total_damage_taken.toLocaleString() },
    ];

    return (
        <div className="w-full rounded border border-white/10 bg-black/60 p-3 backdrop-blur-sm">
            <div className="mb-2 text-xs text-white/40">Your Stats</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {rows.map((row) => (
                    <div key={row.label} className="contents">
                        <span className="text-white/40">{row.label}</span>
                        <span className="text-right text-white/80">{row.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
