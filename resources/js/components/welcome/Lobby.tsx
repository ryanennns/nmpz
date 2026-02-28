import axios from 'axios';
import { MessageCircleQuestion } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import SimpleModal from '@/components/ui/simple-modal';
import AchievementsPanel from '@/components/welcome/AchievementsPanel';
import GameDetailModal from '@/components/welcome/GameDetailModal';
import GameHistoryPanel from '@/components/welcome/GameHistoryPanel';
import Leaderboard from '@/components/welcome/Leaderboard';
import LiveGamesList from '@/components/welcome/LiveGamesList';
import MapSelector from '@/components/welcome/MapSelector';
import NamePrompt from '@/components/welcome/NamePrompt';
import PrivateLobbyPanel from '@/components/welcome/PrivateLobbyPanel';
import PlayerStatsPanel from '@/components/welcome/PlayerStatsPanel';
import RankBadge from '@/components/welcome/RankBadge';
import type { Player } from '@/components/welcome/types';
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
    const [editingName, setEditingName] = useState(false);
    const [nameDraft, setNameDraft] = useState(playerName ?? '');
    const [lobbyTab, setLobbyTab] = useState<'none' | 'stats' | 'leaderboard' | 'history' | 'achievements' | 'watch'>('none');
    const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
    const [selectedFormat, setSelectedFormat] = useState('classic');
    const [detailGameId, setDetailGameId] = useState<string | null>(null);
    const [privateLobbyOpen, setPrivateLobbyOpen] = useState(false);

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
                                        {editingName ? (
                                            <div className="mb-2">
                                                <input
                                                    value={nameDraft}
                                                    maxLength={32}
                                                    onChange={(e) =>
                                                        setNameDraft(
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="Your name"
                                                    className="w-full rounded bg-white/10 px-2 py-1 text-xs text-white placeholder:text-white/40"
                                                />
                                                <div className="mt-2 flex gap-2">
                                                    <button
                                                        onClick={() =>
                                                            void saveName(
                                                                nameDraft,
                                                            )
                                                        }
                                                        className="flex-1 rounded bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setEditingName(
                                                                false,
                                                            );
                                                            setNameDraft(
                                                                playerName,
                                                            );
                                                            setJoinError(null);
                                                        }}
                                                        className="flex-1 rounded bg-white/5 px-2 py-1 text-xs text-white/70 hover:bg-white/10"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mb-2 flex flex-col items-center gap-1">
                                                <div className="flex items-center gap-2 text-sm text-white">
                                                    <span>
                                                        {playerName.slice(0, 32)}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEditingName(true);
                                                            setNameDraft(
                                                                playerName,
                                                            );
                                                            setJoinError(null);
                                                        }}
                                                        className="rounded bg-white/10 px-2 py-0.5 text-[10px] text-white/70 hover:bg-white/20"
                                                    >
                                                        Edit
                                                    </button>
                                                </div>
                                                {player.elo_rating !== undefined && player.rank && (
                                                    <RankBadge rank={player.rank} elo={player.elo_rating} />
                                                )}
                                            </div>
                                        )}
                                        {!editingName && (
                                            <>
                                                <div className="mb-2 space-y-1">
                                                    <MapSelector
                                                        playerId={player.id}
                                                        selectedMapId={selectedMapId}
                                                        onSelect={setSelectedMapId}
                                                    />
                                                    <select
                                                        value={selectedFormat}
                                                        onChange={(e) => setSelectedFormat(e.target.value)}
                                                        className="w-full rounded bg-white/10 px-2 py-1 text-xs text-white"
                                                    >
                                                        <option value="classic">Classic (Health)</option>
                                                        <option value="bo3">Best of 3</option>
                                                        <option value="bo5">Best of 5</option>
                                                        <option value="bo7">Best of 7</option>
                                                    </select>
                                                </div>
                                                <button
                                                    onClick={() => void joinQueue()}
                                                    className="w-full rounded bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20"
                                                >
                                                    Join queue
                                                </button>
                                                <button
                                                    onClick={() => setPrivateLobbyOpen(!privateLobbyOpen)}
                                                    className="mt-1 w-full rounded bg-white/5 px-2 py-1 text-xs text-white/60 hover:bg-white/10"
                                                >
                                                    Private Match
                                                </button>
                                            </>
                                        )}
                                        {privateLobbyOpen && !editingName && (
                                            <div className="mt-2">
                                                <PrivateLobbyPanel
                                                    playerId={player.id}
                                                    onClose={() => setPrivateLobbyOpen(false)}
                                                />
                                            </div>
                                        )}
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
                {!queued && (
                    <div className="absolute bottom-8 left-1/2 flex w-full max-w-md -translate-x-1/2 flex-col items-center gap-3">
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setLobbyTab(lobbyTab === 'stats' ? 'none' : 'stats')}
                                className={`rounded px-3 py-1 text-xs transition ${lobbyTab === 'stats' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'}`}
                            >
                                My Stats
                            </button>
                            <button
                                type="button"
                                onClick={() => setLobbyTab(lobbyTab === 'leaderboard' ? 'none' : 'leaderboard')}
                                className={`rounded px-3 py-1 text-xs transition ${lobbyTab === 'leaderboard' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'}`}
                            >
                                Leaderboard
                            </button>
                            <button
                                type="button"
                                onClick={() => setLobbyTab(lobbyTab === 'history' ? 'none' : 'history')}
                                className={`rounded px-3 py-1 text-xs transition ${lobbyTab === 'history' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'}`}
                            >
                                History
                            </button>
                            <button
                                type="button"
                                onClick={() => setLobbyTab(lobbyTab === 'achievements' ? 'none' : 'achievements')}
                                className={`rounded px-3 py-1 text-xs transition ${lobbyTab === 'achievements' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'}`}
                            >
                                Achievements
                            </button>
                            <button
                                type="button"
                                onClick={() => setLobbyTab(lobbyTab === 'watch' ? 'none' : 'watch')}
                                className={`rounded px-3 py-1 text-xs transition ${lobbyTab === 'watch' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'}`}
                            >
                                Watch
                            </button>
                        </div>
                        {lobbyTab === 'stats' && <PlayerStatsPanel playerId={player.id} />}
                        {lobbyTab === 'leaderboard' && <Leaderboard playerId={player.id} />}
                        {lobbyTab === 'history' && (
                            <GameHistoryPanel
                                playerId={player.id}
                                onViewDetail={(id) => setDetailGameId(id)}
                            />
                        )}
                        {lobbyTab === 'achievements' && (
                            <AchievementsPanel playerId={player.id} />
                        )}
                        {lobbyTab === 'watch' && (
                            <LiveGamesList playerId={player.id} />
                        )}
                    </div>
                )}
            </div>
            <GameDetailModal
                gameId={detailGameId}
                playerId={player.id}
                open={detailGameId !== null}
                onClose={() => setDetailGameId(null)}
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
