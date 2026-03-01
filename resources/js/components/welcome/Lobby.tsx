import axios from 'axios';
import { Eye, MessageCircleQuestion, Pencil, User, Users } from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import SimpleModal from '@/components/ui/simple-modal';
import AchievementsPanel from '@/components/welcome/AchievementsPanel';
import FriendsPanel from '@/components/welcome/FriendsPanel';
import GameDetailModal from '@/components/welcome/GameDetailModal';
import GameHistoryPanel from '@/components/welcome/GameHistoryPanel';
import Leaderboard from '@/components/welcome/Leaderboard';
import LiveGamesList from '@/components/welcome/LiveGamesList';
import MapSelector from '@/components/welcome/MapSelector';
import NamePrompt from '@/components/welcome/NamePrompt';
import PlayerProfileModal from '@/components/welcome/PlayerProfileModal';
import PrivateLobbyPanel from '@/components/welcome/PrivateLobbyPanel';
import PlayerStatsPanel from '@/components/welcome/PlayerStatsPanel';
import RankBadge from '@/components/welcome/RankBadge';
import ReplayViewer from '@/components/welcome/ReplayViewer';
import SeasonPanel from '@/components/welcome/SeasonPanel';
import SoloLeaderboardPanel from '@/components/welcome/SoloLeaderboardPanel';
import type { Player } from '@/components/welcome/types';
import { WaitingRoom } from '@/components/welcome/WaitingRoom';
import { useApiClient } from '@/hooks/useApiClient';
import { FADE_TRANSITION_MS, STATS_POLL_MS, STAT_HIDDEN_MS, STAT_VISIBLE_MS } from '@/lib/game-constants';

const SoloPlayPanel = lazy(() => import('@/components/welcome/SoloPlayPanel'));
const DailyChallengePanel = lazy(() => import('@/components/welcome/DailyChallengePanel'));

type ActiveGroup = 'none' | 'profile' | 'community' | 'watch';
type ProfileTab = 'stats' | 'history' | 'achievements' | 'season' | 'solo';
type CommunityTab = 'leaderboard' | 'friends';

function Divider({ label }: { label?: string }) {
    if (!label) {
        return <div className="border-t border-white/10" />;
    }
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 border-t border-white/10" />
            <span className="shrink-0 text-[10px] uppercase tracking-widest text-white/25">{label}</span>
            <div className="flex-1 border-t border-white/10" />
        </div>
    );
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
    const [helpOpen, setHelpOpen] = useState(false);
    const [joinError, setJoinError] = useState<string | null>(null);
    const api = useApiClient(player.id);
    const [editingName, setEditingName] = useState(false);
    const [nameDraft, setNameDraft] = useState(playerName ?? '');
    const [activeGroup, setActiveGroup] = useState<ActiveGroup>('none');
    const [profileTab, setProfileTab] = useState<ProfileTab>('stats');
    const [communityTab, setCommunityTab] = useState<CommunityTab>('leaderboard');
    const [mountedPanels, setMountedPanels] = useState<Set<string>>(new Set());
    const [visibleKey, setVisibleKey] = useState<string | null>(null);
    const panelWrapperRef = useRef<HTMLDivElement>(null);
    const fadeRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
    const [selectedFormat, setSelectedFormat] = useState('classic');
    const [detailGameId, setDetailGameId] = useState<string | null>(null);
    const [replayGameId, setReplayGameId] = useState<string | null>(null);
    const [profilePlayerId, setProfilePlayerId] = useState<string | null>(null);
    const [privateLobbyOpen, setPrivateLobbyOpen] = useState(false);
    const [playMode, setPlayMode] = useState<'none' | 'multiplayer' | 'solo'>('none');

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

    const groupButtons: { key: ActiveGroup; label: string; icon: React.ReactNode }[] = [
        { key: 'profile', label: 'Profile', icon: <User size={14} /> },
        { key: 'community', label: 'Community', icon: <Users size={14} /> },
        { key: 'watch', label: 'Watch', icon: <Eye size={14} /> },
    ];

    const profileSubTabs: { key: ProfileTab; label: string }[] = [
        { key: 'stats', label: 'stats' },
        { key: 'history', label: 'history' },
        { key: 'achievements', label: 'achievements' },
        { key: 'season', label: 'season' },
        { key: 'solo', label: 'solo' },
    ];

    const communitySubTabs: { key: CommunityTab; label: string }[] = [
        { key: 'leaderboard', label: 'leaderboard' },
        { key: 'friends', label: 'friends' },
    ];

    function activePanelKey(): string | null {
        if (activeGroup === 'profile') return `profile-${profileTab}`;
        if (activeGroup === 'community') return `community-${communityTab}`;
        if (activeGroup === 'watch') return 'watch';
        return null;
    }

    const targetKey = activePanelKey();

    // Mount panels lazily, keep them mounted
    useEffect(() => {
        if (targetKey && !mountedPanels.has(targetKey)) {
            setMountedPanels((prev) => new Set(prev).add(targetKey));
        }
    }, [targetKey]);

    // Fade out → swap display → fade in
    useEffect(() => {
        if (targetKey === visibleKey) return;
        clearTimeout(fadeRef.current);

        const wrapper = panelWrapperRef.current;

        if (!visibleKey || !wrapper) {
            // First open — just show it
            setVisibleKey(targetKey);
            if (wrapper) {
                wrapper.style.opacity = '0';
                requestAnimationFrame(() => {
                    wrapper.style.transition = 'opacity 250ms ease';
                    wrapper.style.opacity = '1';
                });
            }
            return;
        }

        // Fade out
        wrapper.style.transition = 'opacity 200ms ease';
        wrapper.style.opacity = '0';

        fadeRef.current = setTimeout(() => {
            // Swap which panel is display:block (height changes instantly while invisible)
            setVisibleKey(targetKey);
            // Fade in after React renders the new layout
            requestAnimationFrame(() => {
                wrapper.style.opacity = '1';
            });
        }, 200);

        return () => clearTimeout(fadeRef.current);
    }, [targetKey]);

    const panelComponents: Record<string, React.ReactNode> = {
        'profile-stats': <PlayerStatsPanel playerId={player.id} />,
        'profile-history': (
            <GameHistoryPanel
                playerId={player.id}
                onViewDetail={(id) => setDetailGameId(id)}
                onViewReplay={(id) => setReplayGameId(id)}
            />
        ),
        'profile-achievements': <AchievementsPanel playerId={player.id} />,
        'profile-season': <SeasonPanel playerId={player.id} />,
        'profile-solo': <SoloLeaderboardPanel playerId={player.id} />,
        'community-leaderboard': <Leaderboard playerId={player.id} />,
        'community-friends': (
            <FriendsPanel
                playerId={player.id}
                onViewProfile={(id) => setProfilePlayerId(id)}
            />
        ),
        'watch': <LiveGamesList playerId={player.id} />,
    };

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
                            {/* ── TUI Window Frame ── */}
                            <div className="border border-white/15 bg-black/70 backdrop-blur-sm">

                                {/* ── Title Bar ── */}
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

                                {/* ── Player Identity ── */}
                                <div className="px-4 py-3">
                                    {playerName ? (
                                        editingName ? (
                                            <div>
                                                <input
                                                    value={nameDraft}
                                                    maxLength={32}
                                                    onChange={(e) => setNameDraft(e.target.value)}
                                                    placeholder="Your name"
                                                    className="w-full bg-white/5 px-2 py-1.5 text-center text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
                                                />
                                                <div className="mt-2 flex justify-center gap-2">
                                                    <button
                                                        onClick={() => void saveName(nameDraft)}
                                                        className="flex-1 border border-white/15 px-2 py-1 text-xs text-white hover:bg-white/5"
                                                    >
                                                        [ save ]
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setEditingName(false);
                                                            setNameDraft(playerName);
                                                            setJoinError(null);
                                                        }}
                                                        className="flex-1 border border-white/10 px-2 py-1 text-xs text-white/50 hover:bg-white/5"
                                                    >
                                                        [ cancel ]
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="relative inline-block text-sm text-white">
                                                    {playerName.slice(0, 32)}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEditingName(true);
                                                            setNameDraft(playerName);
                                                            setJoinError(null);
                                                        }}
                                                        className="absolute -top-1.5 -right-3.5 text-white/20 transition hover:text-white/50"
                                                        aria-label="Edit name"
                                                    >
                                                        <Pencil size={9} />
                                                    </button>
                                                </span>
                                                {player.elo_rating !== undefined && player.rank && (
                                                    <RankBadge rank={player.rank} elo={player.elo_rating} />
                                                )}
                                            </div>
                                        )
                                    ) : (
                                        <>
                                            <div className="mb-2 text-center text-xs text-white/60">enter your name</div>
                                            <NamePrompt onSubmit={(name) => void joinQueue(name)} />
                                        </>
                                    )}
                                </div>

                                {/* ── Play Mode Toggle ── */}
                                {playerName && !editingName && (
                                    <>
                                        <div className="px-4">
                                            <Divider label="play" />
                                        </div>
                                        <div className="px-4 py-3">
                                            <div className="flex justify-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setPlayMode(playMode === 'multiplayer' ? 'none' : 'multiplayer')}
                                                    className={`flex-1 border px-3 py-1.5 text-xs transition ${
                                                        playMode === 'multiplayer'
                                                            ? 'border-white/25 bg-white/10 text-white'
                                                            : 'border-white/10 text-white/35 hover:bg-white/5 hover:text-white/50'
                                                    }`}
                                                >
                                                    Multiplayer
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setPlayMode(playMode === 'solo' ? 'none' : 'solo')}
                                                    className={`flex-1 border px-3 py-1.5 text-xs transition ${
                                                        playMode === 'solo'
                                                            ? 'border-white/25 bg-white/10 text-white'
                                                            : 'border-white/10 text-white/35 hover:bg-white/5 hover:text-white/50'
                                                    }`}
                                                >
                                                    Solo
                                                </button>
                                            </div>

                                            {/* Multiplayer content */}
                                            {playMode === 'multiplayer' && (
                                                <div className="mt-3 space-y-2 text-center">
                                                    <MapSelector
                                                        playerId={player.id}
                                                        selectedMapId={selectedMapId}
                                                        onSelect={setSelectedMapId}
                                                    />
                                                    <select
                                                        value={selectedFormat}
                                                        onChange={(e) => setSelectedFormat(e.target.value)}
                                                        className="w-full bg-white/5 px-2 py-1.5 text-center text-xs text-white focus:outline-none focus:ring-1 focus:ring-white/20"
                                                    >
                                                        <option value="classic">Classic (Health)</option>
                                                        <option value="bo3">Best of 3</option>
                                                        <option value="bo5">Best of 5</option>
                                                        <option value="bo7">Best of 7</option>
                                                    </select>
                                                    <button
                                                        onClick={() => void joinQueue()}
                                                        className="w-full border border-white/20 py-2 text-sm text-white transition hover:bg-white/5"
                                                    >
                                                        [ join queue ]
                                                    </button>
                                                    <button
                                                        onClick={() => setPrivateLobbyOpen(!privateLobbyOpen)}
                                                        className="w-full border border-white/10 py-1.5 text-xs text-white/50 transition hover:bg-white/5"
                                                    >
                                                        [ private match ]
                                                    </button>
                                                    {privateLobbyOpen && (
                                                        <PrivateLobbyPanel
                                                            playerId={player.id}
                                                            onClose={() => setPrivateLobbyOpen(false)}
                                                        />
                                                    )}
                                                    <div className="text-[10px] text-white/25">
                                                        {queueCount} player{queueCount === 1 ? '' : 's'} queued
                                                    </div>
                                                </div>
                                            )}

                                            {/* Solo content */}
                                            {playMode === 'solo' && (
                                                <Suspense fallback={<div className="py-4 text-center text-xs text-white/30">Loading...</div>}>
                                                    <div className="mt-3 space-y-3">
                                                        <SoloPlayPanel playerId={player.id} />
                                                        <Divider label="daily" />
                                                        <DailyChallengePanel playerId={player.id} />
                                                    </div>
                                                </Suspense>
                                            )}
                                        </div>
                                    </>
                                )}

                                {/* ── Error ── */}
                                {joinError && (
                                    <div className="px-4 pb-2 text-xs text-red-400/80">
                                        {joinError}
                                    </div>
                                )}

                                {/* ── Browse Section ── */}
                                {playerName && !editingName && (
                                    <>
                                        <div className="px-4">
                                            <Divider label="browse" />
                                        </div>
                                        <div className="px-4 py-3">
                                            {/* Group buttons */}
                                            <div className="flex justify-center gap-1">
                                                {groupButtons.map(({ key, label, icon }) => (
                                                    <button
                                                        key={key}
                                                        type="button"
                                                        onClick={() => setActiveGroup(activeGroup === key ? 'none' : key)}
                                                        className={`flex items-center gap-1.5 border px-3 py-1.5 text-xs transition ${
                                                            activeGroup === key
                                                                ? 'border-white/25 bg-white/10 text-white'
                                                                : 'border-white/10 text-white/35 hover:bg-white/5 hover:text-white/50'
                                                        }`}
                                                    >
                                                        {icon}
                                                        {label}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Sub-tabs */}
                                            {activeGroup === 'profile' && (
                                                <div className="mt-2 flex justify-center gap-0 border-b border-white/10">
                                                    {profileSubTabs.map(({ key, label }) => (
                                                        <button
                                                            key={key}
                                                            type="button"
                                                            onClick={() => setProfileTab(key)}
                                                            className={`px-3 py-1 text-[10px] transition ${
                                                                profileTab === key
                                                                    ? 'border-b border-white/40 text-white'
                                                                    : 'text-white/30 hover:text-white/50'
                                                            }`}
                                                        >
                                                            {label}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            {activeGroup === 'community' && (
                                                <div className="mt-2 flex justify-center gap-0 border-b border-white/10">
                                                    {communitySubTabs.map(({ key, label }) => (
                                                        <button
                                                            key={key}
                                                            type="button"
                                                            onClick={() => setCommunityTab(key)}
                                                            className={`px-3 py-1 text-[10px] transition ${
                                                                communityTab === key
                                                                    ? 'border-b border-white/40 text-white'
                                                                    : 'text-white/30 hover:text-white/50'
                                                            }`}
                                                        >
                                                            {label}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Panel viewport */}
                                            {activeGroup !== 'none' && (
                                                <div ref={panelWrapperRef} className="mt-3">
                                                    {Array.from(mountedPanels).map((key) => (
                                                        <div
                                                            key={key}
                                                            style={{ display: key === visibleKey ? 'block' : 'none' }}
                                                        >
                                                            {panelComponents[key]}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}

                                {/* ── Status Bar ── */}
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
