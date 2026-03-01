import { useEffect, useState } from 'react';
import { useApiClient } from '@/hooks/useApiClient';

type SeasonInfo = {
    season_number: number;
    start_date: string;
    end_date: string;
    days_remaining: number;
};

type SeasonHistoryEntry = {
    id: string;
    season_number: number;
    start_date: string;
    end_date: string;
};

type LeaderboardEntry = {
    player_name: string;
    player_id: string;
    peak_elo: number;
    final_elo: number | null;
    peak_rank: string;
    games_played: number;
    games_won: number;
};

export default function SeasonPanel({ playerId }: { playerId: string }) {
    const api = useApiClient(playerId);
    const [season, setSeason] = useState<SeasonInfo | null>(null);
    const [pastSeasons, setPastSeasons] = useState<SeasonHistoryEntry[]>([]);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
    const [tab, setTab] = useState<'current' | 'history'>('current');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.fetchCurrentSeason()
            .then((res) => {
                const data = res.data as { season: SeasonInfo | null };
                setSeason(data.season);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (tab === 'history') {
            api.fetchSeasonHistory()
                .then((res) => setPastSeasons(res.data as SeasonHistoryEntry[]))
                .catch(() => {});
        }
    }, [tab]);

    function loadLeaderboard(seasonId: string) {
        setSelectedSeasonId(seasonId);
        api.fetchSeasonLeaderboard(seasonId)
            .then((res) => {
                const data = res.data as { results: LeaderboardEntry[] };
                setLeaderboard(data.results);
            })
            .catch(() => {});
    }

    if (loading) {
        return (
            <div className="w-full rounded border border-white/10 bg-black/60 p-4 text-center text-xs text-white/40 backdrop-blur-sm">
                Loading season data...
            </div>
        );
    }

    return (
        <div className="w-full rounded border border-white/10 bg-black/60 p-3 backdrop-blur-sm">
            <div className="mb-2 text-xs font-semibold text-white/60">Ranked Seasons</div>

            <div className="mb-2 flex gap-1">
                <button
                    type="button"
                    onClick={() => setTab('current')}
                    className={`rounded px-2 py-0.5 text-[10px] transition ${tab === 'current' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                >
                    Current
                </button>
                <button
                    type="button"
                    onClick={() => setTab('history')}
                    className={`rounded px-2 py-0.5 text-[10px] transition ${tab === 'history' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                >
                    Past Seasons
                </button>
            </div>

            {tab === 'current' && (
                season ? (
                    <div className="space-y-2">
                        <div className="rounded bg-white/5 p-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-white">
                                    Season {season.season_number}
                                </span>
                                <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] text-green-400">
                                    {season.days_remaining}d left
                                </span>
                            </div>
                            <div className="mt-1 text-[10px] text-white/30">
                                {season.start_date} - {season.end_date}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-[10px] text-white/30">No active season</div>
                )
            )}

            {tab === 'history' && (
                <div className="space-y-1">
                    {pastSeasons.length === 0 ? (
                        <div className="text-center text-[10px] text-white/30">No past seasons</div>
                    ) : (
                        <>
                            <div className="max-h-32 space-y-1 overflow-y-auto">
                                {pastSeasons.map((s) => (
                                    <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => loadLeaderboard(s.id)}
                                        className={`flex w-full items-center justify-between rounded px-2 py-1 text-[10px] transition ${
                                            selectedSeasonId === s.id
                                                ? 'bg-white/15 text-white'
                                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                                        }`}
                                    >
                                        <span>Season {s.season_number}</span>
                                        <span className="text-white/30">{s.end_date}</span>
                                    </button>
                                ))}
                            </div>
                            {selectedSeasonId && leaderboard.length > 0 && (
                                <div className="mt-2 max-h-40 space-y-1 overflow-y-auto border-t border-white/10 pt-2">
                                    {leaderboard.map((entry, i) => (
                                        <div
                                            key={entry.player_id}
                                            className="flex items-center justify-between rounded bg-white/5 px-2 py-1 text-[10px]"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className={`w-4 text-right ${i < 3 ? 'text-amber-400' : 'text-white/30'}`}>
                                                    {i + 1}
                                                </span>
                                                <span className="text-white/80">{entry.player_name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-white/30">{entry.peak_rank}</span>
                                                <span className="text-amber-400">{entry.peak_elo}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
