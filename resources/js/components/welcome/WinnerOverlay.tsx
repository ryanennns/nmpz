import type { EloDeltaMap } from '@/components/welcome/types';

export const WinnerOverlay = ({
    visible,
    winnerId,
    winnerName,
    id,
    eloDelta,
}: {
    visible: boolean;
    winnerId: string | null;
    winnerName: string | null;
    id: string;
    eloDelta: EloDeltaMap;
}) => {
    const myEloDelta = eloDelta[id];
    const hasEloDelta = Number.isFinite(myEloDelta);
    const formatEloDelta = (value: number) =>
        `${value >= 0 ? '+' : ''}${Math.round(value)}`;
    const eloDeltaClass =
        typeof myEloDelta === 'number'
            ? myEloDelta >= 0
                ? 'text-p1'
                : 'text-red-400'
            : 'text-white/80';

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
                <div
                    className={`mt-5 font-mono text-3xl font-bold ${eloDeltaClass}`}
                >
                    {formatEloDelta(myEloDelta)} elo
                </div>
            )}
        </div>
    );
};
