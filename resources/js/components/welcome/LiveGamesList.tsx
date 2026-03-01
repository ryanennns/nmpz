import axios from 'axios';
import { useEffect, useState } from 'react';
import type { LiveGame } from '@/components/welcome/types';

type FeaturedMatch = {
    game_id: string;
    player_one_name: string;
    player_two_name: string;
    player_one_elo: number;
    player_two_elo: number;
    spectator_count: number;
    match_format: string;
    combined_elo: number;
};

export default function LiveGamesList({ playerId }: { playerId: string }) {
    const [games, setGames] = useState<LiveGame[]>([]);
    const [featured, setFeatured] = useState<FeaturedMatch | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            axios.get('/games/live'),
            axios.get('/games/featured'),
        ])
            .then(([gamesRes, featuredRes]) => {
                setGames(gamesRes.data as LiveGame[]);
                const data = (featuredRes.data as { featured: FeaturedMatch | null });
                setFeatured(data.featured);
            })
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

    return (
        <div className="w-full rounded border border-white/10 bg-black/60 p-3 backdrop-blur-sm">
            {/* Featured Match */}
            {featured && (
                <a
                    href={`/games/${featured.game_id}/spectate`}
                    className="mb-3 block rounded border border-amber-500/20 bg-amber-500/5 p-3 transition hover:bg-amber-500/10"
                >
                    <div className="mb-1 flex items-center gap-2">
                        <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">
                            FEATURED
                        </span>
                        <span className="text-[10px] text-white/30">
                            {featured.spectator_count} watching
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <div>
                            <span className="text-blue-400">{featured.player_one_name}</span>
                            <span className="text-white/20"> ({featured.player_one_elo})</span>
                        </div>
                        <span className="text-white/20">vs</span>
                        <div>
                            <span className="text-red-400">{featured.player_two_name}</span>
                            <span className="text-white/20"> ({featured.player_two_elo})</span>
                        </div>
                    </div>
                    <div className="mt-1 text-center text-[10px] text-white/20">
                        {featured.match_format !== 'classic' ? featured.match_format.toUpperCase() : 'Classic'}
                    </div>
                </a>
            )}

            <div className="mb-2 text-xs font-semibold text-white/60">Live Games</div>
            {games.length === 0 ? (
                <div className="text-center text-xs text-white/30">No live games right now</div>
            ) : (
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
            )}
        </div>
    );
}
