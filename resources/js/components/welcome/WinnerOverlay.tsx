export const WinnerOverlay = ({
    visible,
    winnerId,
    winnerName,
    id,
}: {
    visible: boolean;
    winnerId: string | null;
    winnerName: string | null;
    id: string;
}) => {
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
        </div>
    );
};
