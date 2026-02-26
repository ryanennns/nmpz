import { useEffect, useRef, useState } from 'react';
import NamePrompt from '@/components/welcome/NamePrompt';
import ShimmerText from '@/components/welcome/ShimmerText';
import type { Player } from '@/components/welcome/types';

function getCsrfToken() {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

export default function Lobby({
    player,
    initialQueueCount,
    playerName,
    onNameChange,
}: {
    player: Player;
    initialQueueCount: number;
    playerName: string | null;
    onNameChange: (name: string) => void;
}) {
    const [queueCount, setQueueCount] = useState(initialQueueCount);
    const [queued, setQueued] = useState(false);
    const [panelVisible, setPanelVisible] = useState(true);
    const [stats, setStats] = useState<{
        games_in_progress: number;
        rounds_played: number;
        total_players: number;
    } | null>(null);
    const [statText, setStatText] = useState('');
    const [statVisible, setStatVisible] = useState(false);
    const statCycleRef = useRef(0);

    useEffect(() => {
        function onBeforeUnload() {
            fetch(`/players/${player.id}/leave-queue`, {
                method: 'POST',
                keepalive: true,
                headers: { 'X-XSRF-TOKEN': getCsrfToken() },
            });
        }
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [player.id]);

    useEffect(() => {
        if (!queued || !stats) return;
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
    }, [queued, stats]);

    useEffect(() => {
        if (!queued) return;
        const t = setInterval(async () => {
            const res = await fetch('/stats', {
                headers: { Accept: 'application/json' },
            });
            if (res.ok) {
                const data = (await res.json()) as {
                    games_in_progress: number;
                    rounds_played: number;
                    total_players: number;
                    queue_count: number;
                };
                setStats(data);
                setQueueCount(data.queue_count);
            }
        }, 5000);
        return () => clearInterval(t);
    }, [queued]);

    async function fadeTransition(fn: () => void) {
        setPanelVisible(false);
        await new Promise<void>((r) => setTimeout(r, 300));
        fn();
        setPanelVisible(true);
    }

    async function leaveQueue() {
        void fetch(`/players/${player.id}/leave-queue`, {
            method: 'POST',
            headers: { 'X-XSRF-TOKEN': getCsrfToken() },
        });
        await fadeTransition(() => setQueued(false));
    }

    async function joinQueue(name?: string) {
        const res = await fetch(`/players/${player.id}/join-queue`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-XSRF-TOKEN': getCsrfToken(),
            },
            body: JSON.stringify(name ? { name } : {}),
        });
        if (res.ok) {
            const payload = (await res.json()) as { queue_count?: number };
            if (typeof payload.queue_count === 'number') {
                setQueueCount(payload.queue_count);
            }
            await fadeTransition(() => {
                if (name) onNameChange(name);
                setQueued(true);
            });
        }
    }

    return (
        <div className="relative flex h-screen items-center justify-center bg-neutral-900 font-mono text-sm text-neutral-400">
            <div
                className={`transition-opacity duration-300 ${panelVisible ? 'opacity-100' : 'opacity-0'}`}
            >
                {queued ? (
                    <div className="text-center">
                        <div className="mb-2 text-xs text-white/50">
                            {playerName}
                        </div>
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
                            onClick={() => void leaveQueue()}
                            className="mt-3 rounded px-2 py-1 text-xs text-white/20 transition-all duration-500 hover:bg-white/5 hover:text-white/50"
                        >
                            leave queue
                        </button>
                    </div>
                ) : playerName ? (
                    <div className="flex w-full max-w-sm flex-col items-center gap-4">
                        <div className="text-center font-mono text-5xl text-white">
                            nmpz.dev
                        </div>
                        <div className="w-full rounded border border-white/10 bg-black/60 p-4 text-xs text-white/80 backdrop-blur-sm">
                            <div className="mb-2 text-center text-sm text-white">
                                {playerName}
                            </div>
                            <button
                                onClick={() => void joinQueue()}
                                className="w-full rounded bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20"
                            >
                                Join queue
                            </button>
                            <div className="mt-2 text-xs text-white/40">
                                {queueCount} player
                                {queueCount === 1 ? '' : 's'} queued
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex w-full max-w-sm flex-col items-center gap-4">
                        <div className="text-center font-mono text-5xl text-white">
                            nmpz.dev
                        </div>
                        <div className="w-full rounded border border-white/10 bg-black/60 p-4 text-xs text-white/80 backdrop-blur-sm">
                            <div className="mb-2 text-sm text-white">
                                Enter your name
                            </div>
                            <NamePrompt
                                onSubmit={(name) => void joinQueue(name)}
                            />
                            <div className="mt-2 text-xs text-white/40">
                                {queueCount} player
                                {queueCount === 1 ? '' : 's'} queued
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
