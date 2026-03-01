import { useEffect, useState } from 'react';
import { useUnauthedApiClient } from '@/hooks/useApiClient';

type RecentMatch = {
    game_id: string;
    opponent_name: string;
    result: 'win' | 'loss' | 'draw';
    played_at: string;
};

type Stats = {
    wins: number;
    losses: number;
    draws: number;
    elo: number;
    recent_matches: RecentMatch[];
};

const resultLabel: Record<RecentMatch['result'], string> = {
    win: 'W',
    loss: 'L',
    draw: 'D',
};

const resultColor: Record<RecentMatch['result'], string> = {
    win: 'text-green-400',
    loss: 'text-red-400',
    draw: 'text-yellow-400',
};

export function PlayerStats({ playerId }: { playerId: string }) {
    const api = useUnauthedApiClient();
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        api.getPlayerStats(playerId)
            .then((res) => {
                if (!cancelled) {
                    setStats(res.data as Stats);
                }
            })
            .catch(() => {
                // silently fail - stats are non-critical
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [playerId]);

    if (loading) {
        return (
            <div className="w-full text-center text-xs text-white/30">
                loading stats...
            </div>
        );
    }

    if (!stats) {
        return null;
    }

    const hasMatches = stats.recent_matches.length > 0;

    return (
        <div className="w-full space-y-2">
            <div className="flex items-center justify-between text-xs text-white/50">
                <div className="flex gap-3">
                    <span>
                        <span className="text-green-400">{stats.wins}W</span>
                        {' / '}
                        <span className="text-red-400">{stats.losses}L</span>
                        {stats.draws > 0 && (
                            <>
                                {' / '}
                                <span className="text-yellow-400">
                                    {stats.draws}D
                                </span>
                            </>
                        )}
                    </span>
                </div>
                <span className="text-white/30">elo {stats.elo}</span>
            </div>

            {hasMatches && (
                <div className="space-y-0.5">
                    <div className="text-[10px] text-white/20">
                        recent matches
                    </div>
                    {stats.recent_matches.map((match) => (
                        <div
                            key={match.game_id}
                            className="flex items-center justify-between text-xs text-white/40"
                        >
                            <div className="flex items-center gap-2">
                                <span
                                    className={`font-bold ${resultColor[match.result]}`}
                                >
                                    {resultLabel[match.result]}
                                </span>
                                <span>vs {match.opponent_name}</span>
                            </div>
                            <span className="text-[10px] text-white/20">
                                {formatRelativeTime(match.played_at)}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function formatRelativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}
