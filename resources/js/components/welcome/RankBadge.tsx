import type { Rank } from '@/components/welcome/types';

const rankColors: Record<Rank, string> = {
    Bronze: 'text-amber-700',
    Silver: 'text-gray-400',
    Gold: 'text-yellow-400',
    Platinum: 'text-cyan-300',
    Diamond: 'text-blue-300',
    Master: 'text-purple-400',
};

const rankBgColors: Record<Rank, string> = {
    Bronze: 'bg-amber-700/20 border-amber-700/30',
    Silver: 'bg-gray-400/20 border-gray-400/30',
    Gold: 'bg-yellow-400/20 border-yellow-400/30',
    Platinum: 'bg-cyan-300/20 border-cyan-300/30',
    Diamond: 'bg-blue-300/20 border-blue-300/30',
    Master: 'bg-purple-400/20 border-purple-400/30',
};

export function rankColor(rank: Rank): string {
    return rankColors[rank];
}

export default function RankBadge({
    rank,
    elo,
    size = 'sm',
}: {
    rank: Rank;
    elo?: number;
    size?: 'xs' | 'sm';
}) {
    const textSize = size === 'xs' ? 'text-[9px]' : 'text-[10px]';
    const px = size === 'xs' ? 'px-1' : 'px-1.5';
    const py = size === 'xs' ? 'py-0' : 'py-0.5';

    return (
        <span
            className={`inline-flex items-center gap-1 rounded border font-mono ${textSize} ${px} ${py} ${rankBgColors[rank]} ${rankColors[rank]}`}
        >
            <span className="font-semibold">{rank}</span>
            {elo !== undefined && (
                <span className="opacity-60">{elo}</span>
            )}
        </span>
    );
}
