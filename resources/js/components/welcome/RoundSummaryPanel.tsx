import type { RoundSummary } from '@/components/welcome/types';

function formatDistance(km: number | null): string {
    if (km === null) return 'No guess';
    if (km < 1) return `${Math.round(km * 1000)} m`;
    if (km < 100) return `${km.toFixed(1)} km`;
    return `${Math.round(km).toLocaleString()} km`;
}

export default function RoundSummaryPanel({
    summary,
    myColor,
    opponentColor,
    opponentName,
}: {
    summary: RoundSummary;
    myColor: string;
    opponentColor: string;
    opponentName: string;
}) {
    const rows: { label: string; me: string; opponent: string }[] = [
        {
            label: 'Distance',
            me: formatDistance(summary.myDistanceKm),
            opponent: formatDistance(summary.opponentDistanceKm),
        },
        {
            label: 'Score',
            me: summary.myScore.toLocaleString(),
            opponent: summary.opponentScore.toLocaleString(),
        },
        {
            label: 'Damage',
            me: summary.myDamage > 0 ? `+${summary.myDamage.toLocaleString()}` : '0',
            opponent: summary.opponentDamage > 0 ? `+${summary.opponentDamage.toLocaleString()}` : '0',
        },
        {
            label: 'Health',
            me: summary.myHealth.toLocaleString(),
            opponent: summary.opponentHealth.toLocaleString(),
        },
    ];

    return (
        <div className="absolute bottom-20 left-1/2 z-20 -translate-x-1/2 rounded border border-white/10 bg-black/80 px-6 py-4 font-mono text-xs backdrop-blur-sm">
            <table className="w-full">
                <thead>
                    <tr className="text-white/40">
                        <th className="pr-6 text-left font-normal"></th>
                        <th className={`w-28 text-right font-normal ${myColor}`}>You</th>
                        <th className={`w-28 text-right font-normal ${opponentColor}`}>{opponentName}</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr key={row.label} className="text-white/80">
                            <td className="pr-6 pt-1 text-white/40">{row.label}</td>
                            <td className={`pt-1 text-right ${myColor}`}>{row.me}</td>
                            <td className={`pt-1 text-right ${opponentColor}`}>{row.opponent}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
