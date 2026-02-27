import type { RematchState } from '@/components/welcome/types';

export const WinnerOverlay = ({
    visible,
    winnerId,
    winnerName,
    id,
    postGameButtonsVisible,
    rematchState,
    ratingChange,
    onRematch,
    onRequeue,
    onExit,
    onAcceptRematch,
    onDeclineRematch,
}: {
    visible: boolean;
    winnerId: string | null;
    winnerName: string | null;
    id: string;
    postGameButtonsVisible: boolean;
    rematchState: RematchState;
    ratingChange: { my: number | null; opponent: number | null };
    onRematch: () => void;
    onRequeue: () => void;
    onExit: () => void;
    onAcceptRematch: () => void;
    onDeclineRematch: () => void;
}) => {
    return (
        <div
            className={`absolute inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-500 ${visible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
            style={{ pointerEvents: postGameButtonsVisible ? 'auto' : 'none' }}
        >
            <div className="font-mono text-6xl font-bold tracking-wide text-white">
                {winnerId === null
                    ? 'no contest'
                    : winnerId === id
                      ? 'you won'
                      : 'you lost'}
            </div>
            {winnerId !== null && winnerName && (
                <div className="mt-3 font-mono text-xs text-white/40">
                    winner: {winnerName}
                </div>
            )}
            {ratingChange.my !== null && (
                <div className={`mt-2 font-mono text-sm font-bold ${ratingChange.my > 0 ? 'text-green-400' : ratingChange.my < 0 ? 'text-red-400' : 'text-white/40'}`}>
                    {ratingChange.my > 0 ? '+' : ''}{ratingChange.my} ELO
                </div>
            )}

            {postGameButtonsVisible && (
                <div className="mt-8 flex flex-col items-center gap-3">
                    {rematchState === 'received' ? (
                        <>
                            <div className="mb-2 font-mono text-sm text-amber-400">
                                Opponent wants a rematch!
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={onAcceptRematch}
                                    className="rounded bg-green-600/80 px-6 py-2 font-mono text-sm text-white transition hover:bg-green-600"
                                >
                                    Accept
                                </button>
                                <button
                                    onClick={onDeclineRematch}
                                    className="rounded bg-red-600/80 px-6 py-2 font-mono text-sm text-white transition hover:bg-red-600"
                                >
                                    Decline
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex gap-3">
                            <button
                                onClick={onRematch}
                                disabled={rematchState === 'sent' || rematchState === 'declined'}
                                className="rounded bg-white/10 px-6 py-2 font-mono text-sm text-white transition hover:bg-white/20 disabled:opacity-40"
                            >
                                {rematchState === 'sent'
                                    ? 'Rematch sent...'
                                    : rematchState === 'declined'
                                      ? 'Declined'
                                      : 'Rematch'}
                            </button>
                            <button
                                onClick={onRequeue}
                                className="rounded bg-white/10 px-6 py-2 font-mono text-sm text-white transition hover:bg-white/20"
                            >
                                Requeue
                            </button>
                            <button
                                onClick={onExit}
                                className="rounded bg-white/10 px-6 py-2 font-mono text-sm text-white/60 transition hover:bg-white/20 hover:text-white"
                            >
                                Exit
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
