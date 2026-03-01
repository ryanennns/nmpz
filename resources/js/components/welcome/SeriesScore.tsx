export default function SeriesScore({
    p1Wins,
    p2Wins,
    winsNeeded,
    p1Color = 'text-blue-400',
    p2Color = 'text-red-400',
}: {
    p1Wins: number;
    p2Wins: number;
    winsNeeded: number;
    p1Color?: string;
    p2Color?: string;
}) {
    return (
        <div className="flex items-center gap-3 font-mono">
            <div className="flex gap-1">
                {Array.from({ length: winsNeeded }, (_, i) => (
                    <div
                        key={`p1-${i}`}
                        className={`h-2.5 w-2.5 rounded-full ${i < p1Wins ? 'bg-blue-400' : 'bg-white/10'}`}
                    />
                ))}
            </div>
            <div className="flex items-baseline gap-2 text-lg font-bold">
                <span className={p1Color}>{p1Wins}</span>
                <span className="text-white/20">-</span>
                <span className={p2Color}>{p2Wins}</span>
            </div>
            <div className="flex gap-1">
                {Array.from({ length: winsNeeded }, (_, i) => (
                    <div
                        key={`p2-${i}`}
                        className={`h-2.5 w-2.5 rounded-full ${i < p2Wins ? 'bg-red-400' : 'bg-white/10'}`}
                    />
                ))}
            </div>
        </div>
    );
}
