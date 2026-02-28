import axios from 'axios';
import { useEffect, useState } from 'react';
import type { LiveGame } from '@/components/welcome/types';

export default function LiveGamesList({ playerId }: { playerId: string }) {
    const [games, setGames] = useState<LiveGame[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios
            .get('/games/live')
            .then((res) => setGames(res.data as LiveGame[]))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="w-full rounded border border-white/10 bg-black/60 p-4 text-center text-xs text-white/40 backdrop-blur-sm">
                Loading live games...
            </div>
        );
    }

    if (games.length === 0) {
        return (
            <div className="w-full rounded border border-white/10 bg-black/60 p-4 text-center text-xs text-white/40 backdrop-blur-sm">
                No live games right now
            </div>
        );
    }

    return (
        <div className="w-full rounded border border-white/10 bg-black/60 p-3 backdrop-blur-sm">
            <div className="mb-2 text-xs font-semibold text-white/60">Live Games</div>
            <div className="max-h-48 space-y-2 overflow-y-auto">
                {games.map((g) => (
                    <a
                        key={g.game_id}
                        href={`/games/${g.game_id}/spectate`}
                        className="flex items-center justify-between rounded bg-white/5 px-3 py-2 text-xs text-white/80 transition hover:bg-white/10"
                    >
                        <div className="flex flex-col gap-0.5">
                            <div>
                                <span className="text-blue-400">{g.player_one_name}</span>
                                <span className="text-white/30"> vs </span>
                                <span className="text-red-400">{g.player_two_name}</span>
                            </div>
                            <div className="text-[10px] text-white/30">
                                {g.match_format !== 'classic' ? g.match_format.toUpperCase() : 'Classic'}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-white/40">
                            <span>{g.spectator_count} watching</span>
                            <span className="text-green-400/60">LIVE</span>
                        </div>
                    </a>
                ))}
            </div>
        </div>
    );
}
