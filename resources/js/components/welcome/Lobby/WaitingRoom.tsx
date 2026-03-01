import { useEffect, useRef, useState } from 'react';
import ShimmerText from '@/components/welcome/ShimmerText';
import { useStatsClient } from '@/hooks/useApiClient';

export const WaitingRoom = ({
    playerName,
    onLeaveQueue,
    active,
}: {
    playerName: string | null;
    onLeaveQueue: () => any;
    active: boolean;
}) => {
    const [stats, setStats] = useState<{
        games_in_progress: number;
        rounds_played: number;
        total_players: number;
    }>({
        games_in_progress: 0,
        rounds_played: 0,
        total_players: 0,
    });
    const [statText, setStatText] = useState('');
    const [statVisible, setStatVisible] = useState(false);
    const statCycleRef = useRef(0);

    useEffect(() => {
        const messages = [
            `${stats.games_in_progress} games in progress`,
            `${stats.rounds_played} rounds played`,
            `${stats.total_players} total players`,
        ];

        let cancelled = false;
        let t1: ReturnType<typeof setTimeout>;
        let t2: ReturnType<typeof setTimeout>;

        function cycle() {
            if (cancelled) return;
            setStatText(messages[statCycleRef.current]);
            setStatVisible(true);
            t1 = setTimeout(() => {
                if (cancelled) return;
                setStatVisible(false);
                t2 = setTimeout(() => {
                    if (cancelled) return;
                    statCycleRef.current =
                        (statCycleRef.current + 1) % messages.length;
                    cycle();
                }, 500);
            }, 3000);
        }

        statCycleRef.current = statCycleRef.current % messages.length;
        cycle();

        return () => {
            cancelled = true;
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, [stats]);

    const api = useStatsClient();
    useEffect(() => {
        if (!active) {
            return;
        }

        const t = setInterval(async () => {
            const res = await api.fetchStats();
            const data = res.data as {
                games_in_progress: number;
                rounds_played: number;
                total_players: number;
                queue_count: number;
            };
            setStats(data);
        }, 5000);

        return () => clearInterval(t);
    }, [active, api]);

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
                onClick={onLeaveQueue}
                className="mt-3 rounded px-2 py-1 text-xs text-white/20 transition-all duration-500 hover:bg-white/5 hover:text-white/50"
            >
                leave queue
            </button>
        </div>
    );
};
