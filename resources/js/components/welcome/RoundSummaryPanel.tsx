import { useEffect, useState } from 'react';
import type { RoundSummary } from '@/components/welcome/types';
import { formatDistance } from '@/lib/format';
import { EASE_STANDARD, ANIM_SLOW } from '@/lib/game-constants';

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
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), 600);
        return () => clearTimeout(timer);
    }, []);

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
        <div
            className="absolute bottom-20 left-1/2 z-20 rounded border border-white/10 bg-black/80 px-2 py-4 font-mono text-xs backdrop-blur-sm"
            style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(16px)',
                transition: `opacity ${ANIM_SLOW}ms ${EASE_STANDARD}, transform ${ANIM_SLOW}ms ${EASE_STANDARD}`,
            }}
        >
            <table className="w-full" style={{ borderSpacing: 0 }}>
                <thead>
                    <tr className="text-white/40">
                        <th className="w-24 text-center font-normal"></th>
                        <th className={`w-28 text-center font-normal ${myColor}`}>You</th>
                        <th className={`w-28 text-center font-normal ${opponentColor}`}>{opponentName}</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr key={row.label} className="text-white/80">
                            <td className="pt-1 text-center text-white/40">{row.label}</td>
                            <td className={`pt-1 text-center ${myColor}`}>{row.me}</td>
                            <td className={`pt-1 text-center ${opponentColor}`}>{row.opponent}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
