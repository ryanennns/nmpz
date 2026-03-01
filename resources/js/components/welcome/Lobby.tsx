import axios from 'axios';
import { MessageCircleQuestion } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import SimpleModal from '@/components/ui/simple-modal';
import BrowsePanel from '@/components/lobby/BrowsePanel';
import PlayerIdentity from '@/components/lobby/PlayerIdentity';
import PlayModeSelector from '@/components/lobby/PlayModeSelector';
import GameDetailModal from '@/components/welcome/GameDetailModal';
import PlayerProfileModal from '@/components/welcome/PlayerProfileModal';
import ReplayViewer from '@/components/welcome/ReplayViewer';
import type { Player } from '@/types/player';
import { WaitingRoom } from '@/components/welcome/WaitingRoom';
import { useApiClient } from '@/hooks/useApiClient';
import { FADE_TRANSITION_MS, STATS_POLL_MS, STAT_HIDDEN_MS, STAT_VISIBLE_MS } from '@/lib/game-constants';

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
    const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
    const [selectedFormat, setSelectedFormat] = useState('classic');
    const [detailGameId, setDetailGameId] = useState<string | null>(null);
    const [replayGameId, setReplayGameId] = useState<string | null>(null);
    const [profilePlayerId, setProfilePlayerId] = useState<string | null>(null);
    const [privateLobbyOpen, setPrivateLobbyOpen] = useState(false);
    const [playMode, setPlayMode] = useState<'none' | 'multiplayer' | 'solo'>('none');
    const [editingName, setEditingName] = useState(false);

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
                }, STAT_HIDDEN_MS);
            }, STAT_VISIBLE_MS);
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
        }, STATS_POLL_MS);
        return () => clearInterval(t);
    }, [queued, api]);

    async function fadeTransition(fn: () => void) {
        setPanelVisible(false);
        await new Promise<void>((r) => setTimeout(r, FADE_TRANSITION_MS));
        fn();
        setPanelVisible(true);
    }

    async function leaveQueue() {
        void api.leaveQueue();
        await fadeTransition(() => setQueued(false));
    }

    function handleApiError(error: unknown, fallback: string) {
        if (axios.isAxiosError(error)) {
            setJoinError(
                (error.response?.data as { error?: string })?.error ?? fallback,
            );
            return;
        }
        setJoinError(fallback);
    }

    async function joinQueue(name?: string) {
        const trimmed = name?.trim().slice(0, 32);
        if (name && !trimmed) {
            setJoinError('Name is required.');
            return;
        }
        try {
            const res = await api.joinQueue(
                trimmed || undefined,
                selectedMapId ?? undefined,
                selectedFormat !== 'classic' ? selectedFormat : undefined,
            );
            const payload = res.data as { queue_count?: number };
            if (typeof payload.queue_count === 'number') {
                setQueueCount(payload.queue_count);
            }
            await fadeTransition(() => {
                if (trimmed) onNameChange(trimmed);
                setQueued(true);
                setJoinError(null);
                setEditingName(false);
            });
        } catch (error) {
            handleApiError(error, 'Unable to join queue.');
        }
    }

    async function saveName(name: string) {
        const trimmed = name.trim().slice(0, 32);
        if (!trimmed) {
            setJoinError('Name is required.');
            return;
        }
        try {
            const res = await api.updatePlayer(trimmed);
            const payload = res.data as { name?: string };
            const nextName = payload.name ?? trimmed;
            onNameChange(nextName);
            setEditingName(false);
            setJoinError(null);
        } catch (error) {
            handleApiError(error, 'Unable to update name.');
        }
    }

    return (
        <>
            <div className="flex min-h-screen items-center justify-center bg-neutral-900 font-mono text-sm text-neutral-400">
                <div
                    className={`w-full transition-opacity duration-300 ${panelVisible ? 'opacity-100' : 'opacity-0'}`}
                >
                    {queued ? (
                        <div className="flex min-h-screen items-center justify-center">
                            <WaitingRoom
                                playerName={playerName}
                                stats={stats}
                                statVisible={statVisible}
                                statText={statText}
                                onClick={() => void leaveQueue()}
                            />
                        </div>
                    ) : (
                        <div className="mx-auto w-full max-w-lg px-4 py-8">
                            <div className="border border-white/15 bg-black/70 backdrop-blur-sm">
                                {/* Title Bar */}
                                <div className="relative border-b border-white/10 px-4 py-2 text-center">
                                    <div className="font-mono text-lg text-white">
                                        <span className="font-semibold">nmpz</span>
                                        <span className="text-white/40">.dev</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setHelpOpen(true)}
                                        className="absolute top-1/2 right-4 -translate-y-1/2 text-white/30 transition hover:text-white/60"
                                        aria-label="Open help"
                                    >
                                        <MessageCircleQuestion size={16} />
                                    </button>
                                </div>

                                <PlayerIdentity
                                    player={player}
                                    playerName={playerName}
                                    onNameChange={(name) => void saveName(name)}
                                    onJoinQueue={(name) => void joinQueue(name)}
                                    joinError={joinError}
                                    setJoinError={setJoinError}
                                />

                                {playerName && !editingName && (
                                    <PlayModeSelector
                                        playerId={player.id}
                                        playMode={playMode}
                                        setPlayMode={setPlayMode}
                                        selectedMapId={selectedMapId}
                                        setSelectedMapId={setSelectedMapId}
                                        selectedFormat={selectedFormat}
                                        setSelectedFormat={setSelectedFormat}
                                        queueCount={queueCount}
                                        privateLobbyOpen={privateLobbyOpen}
                                        setPrivateLobbyOpen={setPrivateLobbyOpen}
                                        onJoinQueue={() => void joinQueue()}
                                    />
                                )}

                                {joinError && (
                                    <div className="px-4 pb-2 text-xs text-red-400/80">
                                        {joinError}
                                    </div>
                                )}

                                {playerName && !editingName && (
                                    <BrowsePanel
                                        playerId={player.id}
                                        onViewDetail={(id) => setDetailGameId(id)}
                                        onViewReplay={(id) => setReplayGameId(id)}
                                        onViewProfile={(id) => setProfilePlayerId(id)}
                                    />
                                )}

                                {/* Status Bar */}
                                <div className="border-t border-white/10 px-4 py-1.5 text-center text-[10px] text-white/20">
                                    nmpz v1.0 &middot; {queueCount} in queue
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <GameDetailModal
                gameId={detailGameId}
                playerId={player.id}
                open={detailGameId !== null}
                onClose={() => setDetailGameId(null)}
            />
            <ReplayViewer
                gameId={replayGameId}
                playerId={player.id}
                open={replayGameId !== null}
                onClose={() => setReplayGameId(null)}
            />
            <PlayerProfileModal
                targetPlayerId={profilePlayerId}
                playerId={player.id}
                open={profilePlayerId !== null}
                onClose={() => setProfilePlayerId(null)}
            />
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
