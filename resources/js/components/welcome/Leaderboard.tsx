import { useEffect, useState } from 'react';
import type { LeaderboardEntry } from '@/components/welcome/types';
import { useApiClient } from '@/hooks/useApiClient';

export default function Leaderboard({ playerId }: { playerId: string }) {
    const api = useApiClient(playerId);
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [sortBy, setSortBy] = useState<'games_won' | 'win_rate' | 'best_win_streak'>('games_won');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        void api.fetchLeaderboard().then((res) => {
            setEntries(res.data as LeaderboardEntry[]);
            setLoading(false);
        });
    }, []);

    const sorted = [...entries].sort((a, b) => b[sortBy] - a[sortBy]);

    const columns: { key: typeof sortBy; label: string }[] = [
        { key: 'games_won', label: 'Wins' },
        { key: 'win_rate', label: 'Win %' },
        { key: 'best_win_streak', label: 'Streak' },
    ];

    if (loading) {
        return <div className="text-xs text-white/30">Loading leaderboard...</div>;
    }

    if (entries.length === 0) {
        return <div className="text-xs text-white/30">No leaderboard data yet (min 3 games).</div>;
    }

    return (
        <div className="w-full overflow-hidden rounded border border-white/10 bg-black/60 backdrop-blur-sm">
            <table className="w-full text-xs">
                <thead>
                    <tr className="border-b border-white/10 text-white/40">
                        <th className="px-3 py-2 text-left font-normal">#</th>
                        <th className="px-3 py-2 text-left font-normal">Player</th>
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                className={`cursor-pointer px-3 py-2 text-right font-normal transition hover:text-white/70 ${sortBy === col.key ? 'text-white/70' : ''}`}
                                onClick={() => setSortBy(col.key)}
                            >
                                {col.label}{sortBy === col.key ? ' ^' : ''}
                            </th>
                        ))}
                        <th className="px-3 py-2 text-right font-normal">Played</th>
                    </tr>
                </thead>
                <tbody>
                    {sorted.map((entry, i) => (
                        <tr
                            key={entry.player_id}
                            className="border-b border-white/5 text-white/70"
                        >
                            <td className="px-3 py-1.5 text-white/30">{i + 1}</td>
                            <td className="px-3 py-1.5 text-white">{entry.player_name}</td>
                            <td className="px-3 py-1.5 text-right">{entry.games_won}</td>
                            <td className="px-3 py-1.5 text-right">{entry.win_rate}%</td>
                            <td className="px-3 py-1.5 text-right">{entry.best_win_streak}</td>
                            <td className="px-3 py-1.5 text-right text-white/40">{entry.games_played}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
