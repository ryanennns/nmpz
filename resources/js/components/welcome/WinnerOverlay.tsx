import type { EloDeltaMap } from '@/components/welcome/types';

export const WinnerOverlay = ({
    visible,
    winnerId,
    winnerName,
    id,
    opponentId,
    opponentName,
    eloDelta,
}: {
    visible: boolean;
    winnerId: string | null;
    winnerName: string | null;
    id: string;
    opponentId: string | null;
    opponentName: string | null;
    eloDelta: EloDeltaMap;
}) => {
    const myEloDelta = eloDelta[id];
    const opponentEloDelta = opponentId ? eloDelta[opponentId] : undefined;
    const hasEloDelta =
        Number.isFinite(myEloDelta) || Number.isFinite(opponentEloDelta);
    const formatEloDelta = (value: number) =>
        `${value >= 0 ? '+' : ''}${Math.round(value)}`;

    return (
        <div
            className={`pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}
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
            {hasEloDelta && (
                <div className="mt-5 space-y-1 font-mono text-sm text-white/70">
                    {Number.isFinite(myEloDelta) && (
                        <div>you: elo {formatEloDelta(myEloDelta)}</div>
                    )}
                    {Number.isFinite(opponentEloDelta) && opponentName && (
                        <div>
                            {opponentName}: elo{' '}
                            {formatEloDelta(opponentEloDelta || 0)}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
