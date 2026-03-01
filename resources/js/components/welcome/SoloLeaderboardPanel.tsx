import { useEffect, useState } from 'react';
import { useApiClient } from '@/hooks/useApiClient';

type SoloMode = 'explorer' | 'streak' | 'time_attack' | 'perfect_score';

type LeaderboardEntry = {
    rank: number;
    player_name: string;
    player_id: string;
    total_score: number;
    rounds_completed: number;
    elapsed_seconds: number;
    tier: string | null;
    difficulty: string | null;
    completed_at: string;
};

type PersonalBest = {
    map_name: string;
    best_score: number;
    best_rounds: number;
    best_time_seconds: number | null;
};

type SoloStats = {
    solo_games_played: number;
    solo_rounds_played: number;
    solo_total_score: number;
    solo_best_round_score: number;
    solo_perfect_rounds: number;
    solo_best_streak: number;
};

const MODE_TABS: { key: SoloMode; label: string; color: string }[] = [
    { key: 'streak', label: 'Streak', color: 'text-red-400' },
    { key: 'time_attack', label: 'Time Attack', color: 'text-blue-400' },
    { key: 'perfect_score', label: 'Perfect', color: 'text-yellow-400' },
    { key: 'explorer', label: 'Explorer', color: 'text-green-400' },
];

function tierBg(tier: string | null): string {
    if (tier === 'gold') return 'bg-yellow-400/20 text-yellow-400';
    if (tier === 'silver') return 'bg-gray-300/20 text-gray-300';
    if (tier === 'bronze') return 'bg-amber-700/20 text-amber-700';
    return '';
}

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function SoloLeaderboardPanel({ playerId }: { playerId: string }) {
    const api = useApiClient(playerId);
    const [activeTab, setActiveTab] = useState<'leaderboard' | 'personal' | 'stats'>('leaderboard');
    const [mode, setMode] = useState<SoloMode>('streak');
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [personalBests, setPersonalBests] = useState<Record<string, PersonalBest[]>>({});
    const [soloStats, setSoloStats] = useState<SoloStats | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (activeTab === 'leaderboard') {
            setLoading(true);
            api.fetchSoloLeaderboard(mode)
                .then((res) => setEntries((res.data as { entries: LeaderboardEntry[] }).entries))
                .catch(() => {})
                .finally(() => setLoading(false));
        }
    }, [mode, activeTab]);

    useEffect(() => {
        if (activeTab === 'personal') {
            setLoading(true);
            api.fetchSoloPersonalBests()
                .then((res) => setPersonalBests(res.data as Record<string, PersonalBest[]>))
                .catch(() => {})
                .finally(() => setLoading(false));
        }
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'stats') {
            setLoading(true);
            api.fetchSoloStats()
                .then((res) => setSoloStats(res.data as SoloStats))
                .catch(() => {})
                .finally(() => setLoading(false));
        }
    }, [activeTab]);

    return (
        <div className="space-y-2">
            {/* Sub-tabs */}
            <div className="flex gap-1">
                {(['leaderboard', 'personal', 'stats'] as const).map((tab) => (
                    <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`rounded px-2 py-0.5 text-[10px] transition ${
                            activeTab === tab
                                ? 'bg-white/20 text-white'
                                : 'bg-white/5 text-white/40 hover:bg-white/10'
                        }`}
                    >
                        {tab === 'personal' ? 'PBs' : tab}
                    </button>
                ))}
            </div>

            {/* Leaderboard view */}
            {activeTab === 'leaderboard' && (
                <>
                    <div className="flex gap-1">
                        {MODE_TABS.map(({ key, label, color }) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setMode(key)}
                                className={`flex-1 rounded px-1 py-0.5 text-[10px] transition ${
                                    mode === key
                                        ? `bg-white/10 ${color}`
                                        : 'bg-white/5 text-white/30 hover:bg-white/10'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    <div className="max-h-48 space-y-0.5 overflow-y-auto">
                        {loading ? (
                            <div className="text-center text-[10px] text-white/30">Loading...</div>
                        ) : entries.length === 0 ? (
                            <div className="text-center text-[10px] text-white/30">No entries yet</div>
                        ) : (
                            entries.map((entry) => (
                                <div
                                    key={`${entry.player_id}-${entry.completed_at}`}
                                    className={`flex items-center justify-between rounded bg-white/5 px-2 py-1 text-[10px] ${
                                        entry.player_id === playerId ? 'ring-1 ring-green-500/30' : ''
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className={`w-4 text-right ${entry.rank <= 3 ? 'text-amber-400' : 'text-white/30'}`}>
                                            {entry.rank}
                                        </span>
                                        {entry.tier && (
                                            <span className={`rounded px-1 text-[8px] font-bold uppercase ${tierBg(entry.tier)}`}>
                                                {entry.tier[0]}
                                            </span>
                                        )}
                                        <span className="text-white/80">{entry.player_name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {mode === 'streak' && (
                                            <span className="text-white/30">{entry.rounds_completed}r</span>
                                        )}
                                        {mode === 'time_attack' && entry.elapsed_seconds > 0 && (
                                            <span className="text-white/30">{formatTime(entry.elapsed_seconds)}</span>
                                        )}
                                        <span className="text-green-400">{entry.total_score.toLocaleString()}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}

            {/* Personal Bests view */}
            {activeTab === 'personal' && (
                <div className="space-y-2">
                    {loading ? (
                        <div className="text-center text-[10px] text-white/30">Loading...</div>
                    ) : Object.keys(personalBests).length === 0 ? (
                        <div className="text-center text-[10px] text-white/30">No personal bests yet</div>
                    ) : (
                        MODE_TABS.map(({ key, label, color }) => {
                            const bests = personalBests[key];
                            if (!bests || bests.length === 0) return null;
                            return (
                                <div key={key}>
                                    <div className={`mb-1 text-[10px] font-semibold ${color}`}>{label}</div>
                                    {bests.map((pb, i) => (
                                        <div key={i} className="flex items-center justify-between rounded bg-white/5 px-2 py-1 text-[10px]">
                                            <span className="text-white/50">{pb.map_name}</span>
                                            <div className="flex items-center gap-2">
                                                {key === 'streak' && (
                                                    <span className="text-white/30">{pb.best_rounds}r</span>
                                                )}
                                                {key === 'time_attack' && pb.best_time_seconds !== null && (
                                                    <span className="text-white/30">{formatTime(pb.best_time_seconds)}</span>
                                                )}
                                                <span className="text-green-400">{pb.best_score.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Stats view */}
            {activeTab === 'stats' && (
                <div className="space-y-1">
                    {loading || !soloStats ? (
                        <div className="text-center text-[10px] text-white/30">Loading...</div>
                    ) : (
                        <>
                            {[
                                { label: 'Games Played', value: soloStats.solo_games_played },
                                { label: 'Rounds Played', value: soloStats.solo_rounds_played },
                                { label: 'Total Score', value: soloStats.solo_total_score.toLocaleString() },
                                { label: 'Best Round Score', value: soloStats.solo_best_round_score.toLocaleString() },
                                { label: 'Perfect Rounds', value: soloStats.solo_perfect_rounds },
                                { label: 'Best Streak', value: soloStats.solo_best_streak },
                            ].map(({ label, value }) => (
                                <div key={label} className="flex items-center justify-between rounded bg-white/5 px-2 py-1 text-[10px]">
                                    <span className="text-white/50">{label}</span>
                                    <span className="text-green-400">{value}</span>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
