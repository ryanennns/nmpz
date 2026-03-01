import { useEffect, useState } from 'react';
import type { GameHistoryEntry } from '@/components/welcome/types';
import { useApiClient } from '@/hooks/useApiClient';

export default function GameHistoryPanel({
    playerId,
    onViewDetail,
    onViewReplay,
}: {
    playerId: string;
    onViewDetail: (gameId: string) => void;
    onViewReplay?: (gameId: string) => void;
}) {
    const api = useApiClient(playerId);
    const [entries, setEntries] = useState<GameHistoryEntry[]>([]);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        void api.fetchGameHistory(page).then((res) => {
            const data = res.data as {
                data: GameHistoryEntry[];
                current_page: number;
                last_page: number;
            };
            setEntries(data.data);
            setLastPage(data.last_page);
            setLoading(false);
        });
    }, [page]);

    const resultColor = (r: string) =>
        r === 'win' ? 'text-green-400' : r === 'loss' ? 'text-red-400' : 'text-white/40';

    return (
        <div className="w-full max-w-md rounded border border-white/10 bg-black/60 p-3 backdrop-blur-sm">
            <div className="mb-2 text-xs text-white/60">Game History</div>
            {loading ? (
                <div className="py-4 text-center text-xs text-white/30">Loading...</div>
            ) : entries.length === 0 ? (
                <div className="py-4 text-center text-xs text-white/30">No games played yet</div>
            ) : (
                <div className="max-h-64 space-y-1 overflow-y-auto">
                    {entries.map((e) => (
                        <div
                            key={e.game_id}
                            className="flex w-full items-center justify-between rounded px-2 py-1 text-xs transition hover:bg-white/5"
                        >
                            <button
                                type="button"
                                onClick={() => onViewDetail(e.game_id)}
                                className="flex flex-1 items-center gap-2 text-left"
                            >
                                <span className={`font-bold uppercase ${resultColor(e.result)}`}>
                                    {e.result === 'win' ? 'W' : e.result === 'loss' ? 'L' : 'D'}
                                </span>
                                <span className="text-white/80">vs {e.opponent_name}</span>
                            </button>
                            <div className="flex items-center gap-2">
                                <span className="text-white/50">
                                    {e.my_score.toLocaleString()} - {e.opponent_score.toLocaleString()}
                                </span>
                                {e.rating_change !== null && (
                                    <span className={e.rating_change > 0 ? 'text-green-400' : e.rating_change < 0 ? 'text-red-400' : 'text-white/40'}>
                                        {e.rating_change > 0 ? '+' : ''}{e.rating_change}
                                    </span>
                                )}
                                {onViewReplay && (
                                    <button
                                        type="button"
                                        onClick={() => onViewReplay(e.game_id)}
                                        className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/50 transition hover:bg-white/20 hover:text-white"
                                        title="View Replay"
                                    >
                                        Replay
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {lastPage > 1 && (
                <div className="mt-2 flex justify-center gap-2">
                    <button
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                        className="rounded bg-white/10 px-2 py-0.5 text-xs text-white disabled:opacity-30"
                    >
                        Prev
                    </button>
                    <span className="text-xs text-white/40">{page} / {lastPage}</span>
                    <button
                        disabled={page >= lastPage}
                        onClick={() => setPage((p) => p + 1)}
                        className="rounded bg-white/10 px-2 py-0.5 text-xs text-white disabled:opacity-30"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}
