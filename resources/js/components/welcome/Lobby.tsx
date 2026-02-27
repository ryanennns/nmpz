import axios from 'axios';
import { MessageCircleQuestion } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import SimpleModal from '@/components/ui/simple-modal';
import NamePrompt from '@/components/welcome/NamePrompt';
import type { Player } from '@/components/welcome/types';
import { WaitingRoom } from '@/components/welcome/WaitingRoom';
import { useApiClient } from '@/hooks/useApiClient';

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
    const [helpOpen, setHelpOpen] = useState(false);
    const [joinError, setJoinError] = useState<string | null>(null);
    const api = useApiClient(player.id);

    useEffect(() => {
        function onBeforeUnload() {
            void api.leaveQueue();
        }
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [api]);

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
            const res = await api.fetchStats();
            const data = res.data as {
                games_in_progress: number;
                rounds_played: number;
                total_players: number;
                queue_count: number;
            };
            setStats(data);
            setQueueCount(data.queue_count);
        }, 5000);
        return () => clearInterval(t);
    }, [queued, api]);

    async function fadeTransition(fn: () => void) {
        setPanelVisible(false);
        await new Promise<void>((r) => setTimeout(r, 300));
        fn();
        setPanelVisible(true);
    }

    async function leaveQueue() {
        void api.leaveQueue();
        await fadeTransition(() => setQueued(false));
    }

    async function joinQueue(name?: string) {
        try {
            const res = await api.joinQueue(name);
            const payload = res.data as { queue_count?: number };
            if (typeof payload.queue_count === 'number') {
                setQueueCount(payload.queue_count);
            }
            await fadeTransition(() => {
                if (name) onNameChange(name);
                setQueued(true);
                setJoinError(null);
            });
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const message =
                    (error.response?.data as { error?: string })?.error ??
                    'Unable to join queue.';
                setJoinError(message);
                return;
            }
            setJoinError('Unable to join queue.');
        }
    }

    return (
        <>
            <div className="relative flex h-screen items-center justify-center bg-neutral-900 font-mono text-sm text-neutral-400">
                <div
                    className={`transition-opacity duration-300 ${panelVisible ? 'opacity-100' : 'opacity-0'}`}
                >
                    {queued ? (
                        <WaitingRoom
                            playerName={playerName}
                            stats={stats}
                            statVisible={statVisible}
                            statText={statText}
                            onClick={() => void leaveQueue()}
                        />
                    ) : (
                        <div className="flex w-full max-w-sm flex-col items-center gap-4">
                            <div className="relative text-center font-mono text-5xl text-white">
                                <span className="font-semibold">nmpz</span>
                                <span className="text-white/50">.dev</span>
                                <button
                                    type="button"
                                    onClick={() => setHelpOpen(true)}
                                    className="absolute -top-2 -right-6 flex h-6 w-6 items-center justify-center rounded-full text-xs text-white/70 transition hover:text-white"
                                    aria-label="Open help"
                                >
                                    <MessageCircleQuestion />
                                </button>
                            </div>
                            <div className="w-full rounded border border-white/10 bg-black/60 p-4 text-xs text-white/80 backdrop-blur-sm">
                                {playerName ? (
                                    <>
                                        <div className="mb-2 text-center text-sm text-white">
                                            {playerName}
                                        </div>
                                        <button
                                            onClick={() => void joinQueue()}
                                            className="w-full rounded bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20"
                                        >
                                            Join queue
                                        </button>
                                        {joinError ? (
                                            <div className="mt-2 text-xs text-red-300">
                                                {joinError}
                                            </div>
                                        ) : null}
                                    </>
                                ) : (
                                    <>
                                        <div className="mb-2 text-sm text-white">
                                            Enter your name
                                        </div>
                                        <NamePrompt
                                            onSubmit={(name) =>
                                                void joinQueue(name)
                                            }
                                        />
                                        {joinError ? (
                                            <div className="mt-2 text-xs text-red-300">
                                                {joinError}
                                            </div>
                                        ) : null}
                                    </>
                                )}
                                <div className="mt-2 text-xs text-white/40">
                                    {queueCount} player
                                    {queueCount === 1 ? '' : 's'} queued
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <SimpleModal open={helpOpen} onClose={() => setHelpOpen(false)}>
                <div className="mb-2 text-2xl text-white/50">
                    what is <span className="text-white/80">nmpz</span>
                    <span className="text-white/40">.dev</span>?
                </div>
                <p className="mb-2 leading-relaxed">
                    nmpz.dev is my quick and dirty attempt creating the
                    GeoGuessr competitive experience in a simple, KISS-adherent
                    format that is free and usable for anyone to enjoy.
                </p>
                <p className="leading-relaxed">
                    please understand that this app is <b>not secure</b>, not
                    feature complete, and <b>likely very buggy</b>. while i have
                    done my best to architecturally guide it, the overwhelming
                    majority of the code has been written by various a.i. agents
                    that, while capable, i certainly wouldn't trust with my
                    life.
                </p>
                <p className="mt-4 font-bold">- ryan :)</p>
            </SimpleModal>
        </>
    );
}
