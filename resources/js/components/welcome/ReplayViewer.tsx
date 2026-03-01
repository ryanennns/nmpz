import { useEffect, useState } from 'react';
import RankBadge from '@/components/welcome/RankBadge';
import type { Rank } from '@/components/welcome/types';
import { useApiClient } from '@/hooks/useApiClient';

type ReplayRound = {
    round_number: number;
    location_lat: number;
    location_lng: number;
    location_heading: number;
    player_one_guess_lat: number | null;
    player_one_guess_lng: number | null;
    player_two_guess_lat: number | null;
    player_two_guess_lng: number | null;
    player_one_score: number;
    player_two_score: number;
    player_one_distance_km: number | null;
    player_two_distance_km: number | null;
};

type ReplayData = {
    game_id: string;
    player_one: { id: string; name: string; elo_rating: number };
    player_two: { id: string; name: string; elo_rating: number };
    winner_id: string | null;
    match_format: string;
    map_name: string;
    player_one_total_score: number;
    player_two_total_score: number;
    rounds: ReplayRound[];
};

type ReplayViewerProps = {
    gameId: string | null;
    playerId: string;
    open: boolean;
    onClose: () => void;
};

export default function ReplayViewer({ gameId, playerId, open, onClose }: ReplayViewerProps) {
    const api = useApiClient(playerId);
    const [replay, setReplay] = useState<ReplayData | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeRound, setActiveRound] = useState(0);

    useEffect(() => {
        if (!open || !gameId) return;
        setLoading(true);
        setReplay(null);
        setActiveRound(0);
        api.fetchReplay(gameId)
            .then((res) => setReplay(res.data as ReplayData))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [open, gameId]);

    if (!open) return null;

    const round = replay?.rounds[activeRound];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-full max-w-lg rounded border border-white/10 bg-neutral-900 p-5 font-mono text-sm text-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {loading ? (
                    <div className="py-8 text-center text-white/40">Loading replay...</div>
                ) : !replay ? (
                    <div className="py-8 text-center text-white/40">Replay not available</div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="mb-3 flex items-center justify-between">
                            <div className="text-xs text-white/40">
                                {replay.map_name} - {replay.match_format.toUpperCase()}
                            </div>
                            <button type="button" onClick={onClose} className="text-white/30 hover:text-white">x</button>
                        </div>

                        {/* Players */}
                        <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className={`font-semibold ${replay.winner_id === replay.player_one.id ? 'text-blue-400' : 'text-blue-400/60'}`}>
                                    {replay.player_one.name}
                                </span>
                                <span className="text-xs text-white/20">{replay.player_one.elo_rating}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-lg font-bold text-blue-400">{replay.player_one_total_score.toLocaleString()}</span>
                                <span className="text-white/20">-</span>
                                <span className="text-lg font-bold text-red-400">{replay.player_two_total_score.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-white/20">{replay.player_two.elo_rating}</span>
                                <span className={`font-semibold ${replay.winner_id === replay.player_two.id ? 'text-red-400' : 'text-red-400/60'}`}>
                                    {replay.player_two.name}
                                </span>
                            </div>
                        </div>

                        {/* Round selector */}
                        <div className="mb-3 flex gap-1">
                            {replay.rounds.map((r, i) => (
                                <button
                                    key={r.round_number}
                                    type="button"
                                    onClick={() => setActiveRound(i)}
                                    className={`flex-1 rounded py-1 text-[10px] transition ${
                                        i === activeRound
                                            ? 'bg-white/20 text-white'
                                            : 'bg-white/5 text-white/40 hover:bg-white/10'
                                    }`}
                                >
                                    R{r.round_number}
                                </button>
                            ))}
                        </div>

                        {/* Round detail */}
                        {round && (
                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded bg-blue-400/10 p-3">
                                        <div className="mb-1 text-[10px] text-blue-400/60">{replay.player_one.name}</div>
                                        <div className="text-xl font-bold text-blue-400">{round.player_one_score.toLocaleString()}</div>
                                        <div className="text-[10px] text-white/30">
                                            {round.player_one_distance_km !== null
                                                ? `${round.player_one_distance_km.toFixed(1)} km`
                                                : 'No guess'}
                                        </div>
                                    </div>
                                    <div className="rounded bg-red-400/10 p-3">
                                        <div className="mb-1 text-[10px] text-red-400/60">{replay.player_two.name}</div>
                                        <div className="text-xl font-bold text-red-400">{round.player_two_score.toLocaleString()}</div>
                                        <div className="text-[10px] text-white/30">
                                            {round.player_two_distance_km !== null
                                                ? `${round.player_two_distance_km.toFixed(1)} km`
                                                : 'No guess'}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-center text-[10px] text-white/20">
                                    Location: {round.location_lat.toFixed(4)}, {round.location_lng.toFixed(4)}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
