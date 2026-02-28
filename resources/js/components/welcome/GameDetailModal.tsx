import { useEffect, useState } from 'react';
import SimpleModal from '@/components/ui/simple-modal';
import type { GameDetail } from '@/components/welcome/types';
import { useApiClient } from '@/hooks/useApiClient';
import { formatDistance } from '@/lib/format';

export default function GameDetailModal({
    gameId,
    playerId,
    open,
    onClose,
}: {
    gameId: string | null;
    playerId: string;
    open: boolean;
    onClose: () => void;
}) {
    const api = useApiClient(playerId);
    const [detail, setDetail] = useState<GameDetail | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!gameId || !open) return;
        setLoading(true);
        void api.fetchGameDetail(gameId).then((res) => {
            setDetail(res.data as GameDetail);
            setLoading(false);
        });
    }, [gameId, open]);

    if (!open) return null;

    const isP1 = detail?.player_one.id === playerId;

    return (
        <SimpleModal open={open} onClose={onClose}>
            {loading || !detail ? (
                <div className="py-6 text-center text-xs text-white/30">Loading...</div>
            ) : (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-white">
                            {detail.player_one.name} vs {detail.player_two.name}
                        </div>
                        <div className="text-xs text-white/40">{detail.map_name}</div>
                    </div>
                    <div className="text-xs text-white/50">
                        Winner: {detail.winner_id === null ? 'Draw' : detail.winner_id === detail.player_one.id ? detail.player_one.name : detail.player_two.name}
                    </div>
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="text-white/40">
                                <th className="py-1 text-left font-normal">Rnd</th>
                                <th className="py-1 text-center font-normal">{isP1 ? 'You' : detail.player_one.name}</th>
                                <th className="py-1 text-center font-normal">{isP1 ? detail.player_two.name : 'You'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {detail.rounds.map((r) => (
                                <tr key={r.round_number} className="border-t border-white/5">
                                    <td className="py-1 text-white/50">{r.round_number}</td>
                                    <td className="py-1 text-center">
                                        <span className="text-white/80">{r.player_one_score?.toLocaleString() ?? '-'}</span>
                                        <span className="ml-1 text-white/30">
                                            {formatDistance(r.player_one_distance_km)}
                                        </span>
                                    </td>
                                    <td className="py-1 text-center">
                                        <span className="text-white/80">{r.player_two_score?.toLocaleString() ?? '-'}</span>
                                        <span className="ml-1 text-white/30">
                                            {formatDistance(r.player_two_distance_km)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </SimpleModal>
    );
}
