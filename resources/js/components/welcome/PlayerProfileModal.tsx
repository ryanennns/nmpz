import { useEffect, useState } from 'react';
import RankBadge from '@/components/welcome/RankBadge';
import type { Rank } from '@/components/welcome/types';
import { useApiClient } from '@/hooks/useApiClient';

type ProfileData = {
    player_id: string;
    name: string;
    elo_rating: number;
    rank: Rank;
    stats: {
        games_played: number;
        games_won: number;
        win_rate: number;
        best_win_streak: number;
        best_round_score: number;
        average_score: number;
    };
    elo_history: { elo: number; date: string }[];
    achievements: { key: string; name: string; icon: string | null; earned_at: string }[];
    map_stats: { map_name: string; wins: number; total_games: number; win_rate: number }[];
};

type PlayerProfileModalProps = {
    targetPlayerId: string | null;
    playerId: string;
    open: boolean;
    onClose: () => void;
};

export default function PlayerProfileModal({ targetPlayerId, playerId, open, onClose }: PlayerProfileModalProps) {
    const api = useApiClient(playerId);
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open || !targetPlayerId) return;
        setLoading(true);
        setProfile(null);
        api.fetchPlayerProfile(targetPlayerId)
            .then((res) => setProfile(res.data as ProfileData))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [open, targetPlayerId]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-full max-w-md rounded border border-white/10 bg-neutral-900 p-5 font-mono text-sm text-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {loading ? (
                    <div className="py-8 text-center text-white/40">Loading profile...</div>
                ) : !profile ? (
                    <div className="py-8 text-center text-white/40">Player not found</div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-lg font-semibold">{profile.name}</span>
                                <RankBadge rank={profile.rank} elo={profile.elo_rating} />
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="text-white/30 transition hover:text-white"
                            >
                                x
                            </button>
                        </div>

                        {/* Stats Grid */}
                        <div className="mb-4 grid grid-cols-3 gap-2">
                            {[
                                { label: 'Games', value: profile.stats.games_played },
                                { label: 'Wins', value: profile.stats.games_won },
                                { label: 'Win Rate', value: `${profile.stats.win_rate}%` },
                                { label: 'Best Streak', value: profile.stats.best_win_streak },
                                { label: 'Best Round', value: profile.stats.best_round_score.toLocaleString() },
                                { label: 'Avg Score', value: Math.round(profile.stats.average_score).toLocaleString() },
                            ].map((s) => (
                                <div key={s.label} className="rounded bg-white/5 p-2 text-center">
                                    <div className="text-xs font-semibold text-white/80">{s.value}</div>
                                    <div className="text-[10px] text-white/30">{s.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* ELO History sparkline */}
                        {profile.elo_history.length > 1 && (
                            <div className="mb-4">
                                <div className="mb-1 text-[10px] font-semibold uppercase text-white/30">ELO History</div>
                                <div className="flex h-12 items-end gap-[2px]">
                                    {(() => {
                                        const values = profile.elo_history.map((e) => e.elo);
                                        const min = Math.min(...values);
                                        const max = Math.max(...values);
                                        const range = max - min || 1;
                                        return values.map((v, i) => (
                                            <div
                                                key={i}
                                                className="flex-1 rounded-t bg-blue-400/40"
                                                style={{ height: `${((v - min) / range) * 100}%`, minHeight: '2px' }}
                                                title={`${v} - ${profile.elo_history[i].date}`}
                                            />
                                        ));
                                    })()}
                                </div>
                            </div>
                        )}

                        {/* Achievements */}
                        {profile.achievements.length > 0 && (
                            <div className="mb-4">
                                <div className="mb-1 text-[10px] font-semibold uppercase text-white/30">Recent Achievements</div>
                                <div className="flex flex-wrap gap-1">
                                    {profile.achievements.map((a) => (
                                        <span
                                            key={a.key}
                                            className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-400"
                                            title={a.name}
                                        >
                                            {a.icon ?? ''} {a.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Map Stats */}
                        {profile.map_stats.length > 0 && (
                            <div>
                                <div className="mb-1 text-[10px] font-semibold uppercase text-white/30">Map Win Rates</div>
                                <div className="space-y-1">
                                    {profile.map_stats.map((m) => (
                                        <div key={m.map_name} className="flex items-center justify-between text-[10px]">
                                            <span className="text-white/60">{m.map_name}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-white/30">{m.wins}/{m.total_games}</span>
                                                <span className="text-white/80">{m.win_rate}%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
