import ShimmerText from '@/components/welcome/ShimmerText';
import type { GameStats } from '@/components/welcome/types';

export const WaitingRoom = ({
    playerName,
    stats,
    statVisible,
    statText,
    onClick,
}: {
    playerName: string | null;
    stats: GameStats | null;
    statVisible: boolean;
    statText: string;
    onClick: () => any;
}) => {
    return (
        <div className="text-center">
            <div className="mb-2 text-xs text-white/50">{playerName}</div>
            <ShimmerText>waiting for opponent</ShimmerText>
            <div className="mt-2 min-h-[1.25rem] text-xs text-white/40">
                {stats && (
                    <div
                        className={`transition-opacity duration-500 ${statVisible ? 'opacity-100' : 'opacity-0'}`}
                    >
                        {statText}
                    </div>
                )}
            </div>
            <button
                onClick={onClick}
                className="mt-3 rounded px-2 py-1 text-xs text-white/20 transition-all duration-500 hover:bg-white/5 hover:text-white/50"
            >
                leave queue
            </button>
        </div>
    );
};
