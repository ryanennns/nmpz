import { setOptions } from '@googlemaps/js-api-loader';
import { Head } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import EventFields from '@/components/welcome/EventFields';
import HealthBar from '@/components/welcome/HealthBar';
import Lobby from '@/components/welcome/Lobby';
import MapPicker from '@/components/welcome/MapPicker';
import ResultsMap from '@/components/welcome/ResultsMap';
import ShimmerText from '@/components/welcome/ShimmerText';
import StreetViewPanel from '@/components/welcome/StreetViewPanel';
import type {
    Game,
    GameEvent,
    GameState,
    LatLng,
    Location,
    Player,
    Round,
    RoundResult,
} from '@/components/welcome/types';
import echo from '@/echo';

const MAX_EVENTS = 5;
const MAX_MESSAGES = 6;

setOptions({
    key: import.meta.env.VITE_GOOGLE_MAPS_KEY as string,
    v: 'weekly',
});

// --- Helpers ---

function getCsrfToken() {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

function deriveGameState(
    round: Round,
    gameOver: boolean,
    roundFinished: boolean,
): GameState {
    if (gameOver) return 'game_over';
    if (
        roundFinished ||
        (round.player_one_locked_in && round.player_two_locked_in)
    )
        return 'finished';
    if (round.player_one_locked_in || round.player_two_locked_in)
        return 'one_guessed';
    return 'waiting';
}

let eventSeq = 0;

const panel = 'rounded border border-white/10 bg-black/60 p-3 backdrop-blur-sm';

function roundRemainingSeconds(startedAt: Date | null) {
    if (!startedAt || Number.isNaN(startedAt.getTime())) return null;
    const elapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000);
    return Math.max(0, 60 - elapsed);
}

// --- Page ---

export default function Welcome({
    player,
    game: initialGame,
    queue_count: initialQueueCount,
}: {
    player: Player;
    game: Game | null;
    queue_count: number;
}) {
    const [game, setGame] = useState<Game | null>(initialGame);
    const [round, setRound] = useState<Round | null>(null);
    const [location, setLocation] = useState<Location | null>(null);
    const [health, setHealth] = useState({
        p1: initialGame?.player_one_health ?? 5000,
        p2: initialGame?.player_two_health ?? 5000,
    });
    const [gameOver, setGameOver] = useState(false);
    const [events, setEvents] = useState<GameEvent[]>([]);
    const [messages, setMessages] = useState<
        { id: number; name: string; text: string; ts: string }[]
    >([]);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [urgentCountdown, setUrgentCountdown] = useState<number | null>(null);
    const [pin, setPin] = useState<LatLng | null>(null);
    const [roundFinished, setRoundFinished] = useState(false);
    const [mapHovered, setMapHovered] = useState(false);
    const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
    const [roundScores, setRoundScores] = useState<{
        p1: number | null;
        p2: number | null;
    }>({ p1: null, p2: null });
    const guessRef = useRef<() => void>(() => {});
    const roundStartedAtRef = useRef<Date | null>(null);
    const [chatOpen, setChatOpen] = useState(false);
    const [chatText, setChatText] = useState('');
    const chatInputRef = useRef<HTMLInputElement | null>(null);

    const isPlayerOne = game ? player.id === game.player_one.id : false;
    const myLocked = round
        ? isPlayerOne
            ? round.player_one_locked_in
            : round.player_two_locked_in
        : false;
    const gameState = round
        ? deriveGameState(round, gameOver, roundFinished)
        : 'waiting';

    function pushEvent(name: GameEvent['name'], data: Record<string, unknown>) {
        setEvents((prev) => [
            {
                id: eventSeq++,
                name,
                ts: new Date().toISOString().substring(11, 23),
                data,
            },
            ...prev.slice(0, MAX_EVENTS - 1),
        ]);
    }

    // Countdown tick (next round)
    useEffect(() => {
        if (countdown === null || countdown <= 0) return;
        const t = setTimeout(() => setCountdown((c) => (c ?? 1) - 1), 1000);
        return () => clearTimeout(t);
    }, [countdown]);

    // Countdown tick (15s guess deadline)
    useEffect(() => {
        if (urgentCountdown === null || urgentCountdown <= 0) return;
        const t = setTimeout(
            () => setUrgentCountdown((c) => (c ?? 1) - 1),
            1000,
        );
        return () => clearTimeout(t);
    }, [urgentCountdown]);

    // Matchmaking channel — only when waiting for a game
    useEffect(() => {
        if (game) return;

        const channel = echo.channel(`player.${player.id}`);

        channel.listen('.GameReady', (data: { game: Game }) => {
            setGame(data.game);
            setHealth({
                p1: data.game.player_one_health,
                p2: data.game.player_two_health,
            });
        });

        return () => {
            echo.leaveChannel(`player.${player.id}`);
        };
    }, [game?.id, player.id]);

    // Game channel — once we have a game
    useEffect(() => {
        if (!game) return;

        const channel = echo.channel(`game.${game.id}`);

        channel.listen('.PlayerGuessed', (data: Record<string, unknown>) => {
            pushEvent('PlayerGuessed', data);
            setRound((prev) =>
                prev
                    ? {
                          ...prev,
                          player_one_locked_in:
                              data.player_one_locked_in as boolean,
                          player_two_locked_in:
                              data.player_two_locked_in as boolean,
                      }
                    : null,
            );
            const p1 = data.player_one_locked_in as boolean;
            const p2 = data.player_two_locked_in as boolean;
            if (p1 !== p2) {
                const remaining = roundRemainingSeconds(
                    roundStartedAtRef.current,
                );
                setUrgentCountdown(
                    remaining === null ? 15 : Math.min(remaining, 15),
                );
            }
        });

        channel.listen('.RoundFinished', (data: Record<string, unknown>) => {
            pushEvent('RoundFinished', data);
            setRoundFinished(true);
            setUrgentCountdown(null);
            setCountdown(6);
            const p1Score = (data.player_one_score as number) ?? 0;
            const p2Score = (data.player_two_score as number) ?? 0;
            setRoundScores({ p1: p1Score, p2: p2Score });
            const damage = Math.abs(p1Score - p2Score);
            setHealth((prev) => {
                if (p1Score < p2Score)
                    return { p1: prev.p1 - damage, p2: prev.p2 };
                if (p2Score < p1Score)
                    return { p1: prev.p1, p2: prev.p2 - damage };
                return prev;
            });
            const locLat = Number(data.location_lat);
            const locLng = Number(data.location_lng);
            if (!Number.isFinite(locLat) || !Number.isFinite(locLng)) {
                setRoundResult(null);
                return;
            }
            setRoundResult({
                location: { lat: locLat, lng: locLng },
                p1Guess:
                    data.player_one_guess_lat != null &&
                    data.player_one_guess_lng != null
                        ? {
                              lat: Number(data.player_one_guess_lat),
                              lng: Number(data.player_one_guess_lng),
                          }
                        : null,
                p2Guess:
                    data.player_two_guess_lat != null &&
                    data.player_two_guess_lng != null
                        ? {
                              lat: Number(data.player_two_guess_lat),
                              lng: Number(data.player_two_guess_lng),
                          }
                        : null,
            });
        });

        channel.listen('.RoundStarted', (data: Record<string, unknown>) => {
            pushEvent('RoundStarted', data);
            setCountdown(null);
            const startedAtRaw = data.started_at as string | undefined;
            const startedAt = startedAtRaw ? new Date(startedAtRaw) : null;
            roundStartedAtRef.current = startedAt;
            setUrgentCountdown(roundRemainingSeconds(startedAt));
            setRoundFinished(false);
            setRoundResult(null);
            setRoundScores({ p1: null, p2: null });
            setHealth({
                p1: data.player_one_health as number,
                p2: data.player_two_health as number,
            });
            setLocation({
                lat: data.location_lat as number,
                lng: data.location_lng as number,
                heading: data.location_heading as number,
            });
            setRound({
                id: data.round_id as string,
                round_number: data.round_number as number,
                player_one_locked_in: false,
                player_two_locked_in: false,
            });
            setPin(null);
        });

        channel.listen('.GameMessage', (data: Record<string, unknown>) => {
            pushEvent('GameMessage', data);
            setMessages((prev) =>
                [
                    ...prev,
                    {
                        id: eventSeq++,
                        name: (data.player_name as string) ?? 'Player',
                        text: (data.message as string) ?? '',
                        ts: new Date().toISOString().substring(11, 19),
                    },
                ].slice(-MAX_MESSAGES),
            );
        });

        channel.listen('.GameFinished', (data: Record<string, unknown>) => {
            pushEvent('GameFinished', data);
            setCountdown(null);
            setUrgentCountdown(null);
            roundStartedAtRef.current = null;
            setRoundResult(null);
            setHealth({
                p1: data.player_one_health as number,
                p2: data.player_two_health as number,
            });
            setGameOver(true);
        });

        return () => {
            echo.leaveChannel(`game.${game.id}`);
        };
    }, [game?.id]);

    async function guess() {
        if (!pin || !round || !game || myLocked || gameOver) return;
        const url = `/players/${player.id}/games/${game.id}/rounds/${round.id}/guess`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-XSRF-TOKEN': getCsrfToken(),
            },
            body: JSON.stringify({ ...pin, locked_in: true }),
        });
        if (res.ok) setRound(await res.json());
    }

    async function updateGuess(coords: LatLng) {
        if (!round || !game || myLocked || gameOver) return;
        const url = `/players/${player.id}/games/${game.id}/rounds/${round.id}/guess`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-XSRF-TOKEN': getCsrfToken(),
            },
            body: JSON.stringify(coords),
        });
        if (res.ok) setRound(await res.json());
    }

    async function sendMessage() {
        if (!game || !chatText.trim()) return;
        const url = `/players/${player.id}/games/${game.id}/send-message`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-XSRF-TOKEN': getCsrfToken(),
            },
            body: JSON.stringify({ message: chatText.trim() }),
        });
        if (res.ok) {
            setChatText('');
            setChatOpen(false);
        }
    }

    guessRef.current = guess;

    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            const target = e.target as HTMLElement | null;
            if (
                target &&
                (target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.isContentEditable)
            ) {
                return;
            }

            if (
                location &&
                [
                    'KeyW',
                    'KeyA',
                    'KeyS',
                    'KeyD',
                    'ArrowUp',
                    'ArrowDown',
                    'ArrowLeft',
                    'ArrowRight',
                ].includes(e.code)
            ) {
                e.preventDefault();
                return;
            }

            if (e.code === 'Space' && !e.repeat) {
                e.preventDefault();
                guessRef.current();
                return;
            }

            if (e.code === 'Enter' && !e.repeat) {
                if (chatOpen) {
                    e.preventDefault();
                } else {
                    e.preventDefault();
                    setChatOpen(true);
                }
                return;
            }

            if (e.code === 'Escape' && chatOpen) {
                e.preventDefault();
                setChatOpen(false);
                setChatText('');
            }
        }
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [chatOpen, chatText, game?.id, location]);

    useEffect(() => {
        if (!location) return;
        const blockKeys = new Set([
            'KeyW',
            'KeyA',
            'KeyS',
            'KeyD',
            'ArrowUp',
            'ArrowDown',
            'ArrowLeft',
            'ArrowRight',
        ]);

        function onMoveKey(e: KeyboardEvent) {
            if (!blockKeys.has(e.code)) return;
            const target = e.target as HTMLElement | null;
            if (
                target &&
                (target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.isContentEditable)
            ) {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
        }

        window.addEventListener('keydown', onMoveKey, true);
        window.addEventListener('keyup', onMoveKey, true);

        return () => {
            window.removeEventListener('keydown', onMoveKey, true);
            window.removeEventListener('keyup', onMoveKey, true);
        };
    }, [location]);

    useEffect(() => {
        if (!chatOpen) return;
        const t = setTimeout(() => chatInputRef.current?.focus(), 0);
        return () => clearTimeout(t);
    }, [chatOpen]);

    const stateLabel: Record<GameState, ReactNode> = {
        waiting:
            urgentCountdown !== null ? (
                `${urgentCountdown}s to guess`
            ) : (
                <ShimmerText>Waiting for guesses</ShimmerText>
            ),
        one_guessed:
            urgentCountdown !== null ? (
                `${urgentCountdown}s to guess`
            ) : (
                <ShimmerText>waiting for opponent</ShimmerText>
            ),
        finished:
            countdown !== null
                ? `Next round in ${countdown}s`
                : 'Round finished',
        game_over: 'Game over',
    };

    if (!game) {
        return (
            <>
                <Head title="nmpz" />
                <Lobby player={player} initialQueueCount={initialQueueCount} />
            </>
        );
    }

    return (
        <>
            <Head title="nmpz" />
            <div className="relative h-screen w-screen overflow-hidden font-mono text-white">
                {urgentCountdown !== null && urgentCountdown <= 15 && (
                    <div className="urgent-screen-halo pointer-events-none absolute inset-0 z-10" />
                )}
                {/* Fullscreen results during countdown */}
                {roundFinished && roundResult ? (
                    <ResultsMap
                        key={`result-${round?.id ?? 'pending'}`}
                        result={roundResult}
                    />
                ) : location ? (
                    <StreetViewPanel
                        key={`${location.lat},${location.lng}`}
                        location={location}
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 text-sm text-neutral-500">
                        <ShimmerText>Waiting for round to start</ShimmerText>
                    </div>
                )}

                {/* Top corners: player panels (always visible) */}
                {(() => {
                    const myColor = isPlayerOne
                        ? 'text-blue-400'
                        : 'text-red-400';
                    const myColorDim = isPlayerOne
                        ? 'text-blue-400/60'
                        : 'text-red-400/60';
                    const myHealth = isPlayerOne ? health.p1 : health.p2;
                    const myScore = isPlayerOne
                        ? roundScores.p1
                        : roundScores.p2;
                    const oppColor = isPlayerOne
                        ? 'text-red-400'
                        : 'text-blue-400';
                    const oppColorDim = isPlayerOne
                        ? 'text-red-400/60'
                        : 'text-blue-400/60';
                    const oppHealth = isPlayerOne ? health.p2 : health.p1;
                    const oppScore = isPlayerOne
                        ? roundScores.p2
                        : roundScores.p1;
                    const oppName = isPlayerOne
                        ? game.player_two.user.name
                        : game.player_one.user.name;
                    return (
                        <>
                            <div className="pointer-events-none absolute top-6 left-8 z-20 flex w-72 flex-col gap-3">
                                <div className="rounded bg-black/50 px-4 py-3 backdrop-blur-sm">
                                    {roundFinished && myScore !== null && (
                                        <div
                                            className={`${myColor} mb-3 font-mono text-6xl font-bold tabular-nums`}
                                        >
                                            {myScore.toLocaleString()}
                                        </div>
                                    )}
                                    <div
                                        className={`${myColorDim} mb-1 font-mono text-xs`}
                                    >
                                        You
                                    </div>
                                    <HealthBar
                                        health={myHealth}
                                        color={isPlayerOne ? 'blue' : 'red'}
                                    />
                                </div>
                                <div className="pointer-events-none space-y-2">
                                    {messages.length > 0 && (
                                        <div className="rounded border border-white/10 bg-black/50 p-2 text-xs text-white/80 backdrop-blur-sm">
                                            {messages.map((m) => (
                                                <div
                                                    key={m.id}
                                                    className="mb-1 last:mb-0"
                                                >
                                                    <span className="text-white/40">
                                                        {m.ts}
                                                    </span>{' '}
                                                    <span className="text-white/70">
                                                        {m.name}:
                                                    </span>{' '}
                                                    <span>{m.text}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div
                                        className={`pointer-events-auto rounded border border-white/10 bg-black/60 p-2 text-xs backdrop-blur-sm ${chatOpen ? '' : 'opacity-70'}`}
                                    >
                                        {chatOpen ? (
                                            <input
                                                ref={chatInputRef}
                                                value={chatText}
                                                maxLength={255}
                                                onChange={(e) =>
                                                    setChatText(e.target.value)
                                                }
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        void sendMessage();
                                                    }
                                                }}
                                                placeholder="Type a message…"
                                                className="w-full bg-transparent text-white outline-none placeholder:text-white/30"
                                            />
                                        ) : (
                                            <div className="text-white/40">
                                                Press Enter to chat
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {roundFinished && countdown !== null && (
                                <div className="pointer-events-none absolute top-6 left-1/2 z-20 -translate-x-1/2 rounded bg-black/50 px-4 py-3 text-center backdrop-blur-sm">
                                    <div className="font-mono text-6xl font-bold text-white tabular-nums">
                                        {countdown}
                                    </div>
                                    <div className="mt-1 font-mono text-sm text-white/40">
                                        next round
                                    </div>
                                </div>
                            )}
                            {(gameState === 'one_guessed' ||
                                gameState === 'waiting') &&
                                urgentCountdown !== null && (
                                    <div className="pointer-events-none absolute top-6 left-1/2 z-20 -translate-x-1/2 rounded bg-black/50 px-4 py-3 text-center backdrop-blur-sm">
                                        <div
                                            className={`font-mono text-6xl font-bold tabular-nums ${urgentCountdown <= 15 ? 'text-red-400' : 'text-amber-400'}`}
                                        >
                                            {urgentCountdown}
                                        </div>
                                        <div className="mt-1 font-mono text-sm text-white/40">
                                            {gameState === 'waiting'
                                                ? 'time to guess'
                                                : myLocked
                                                  ? 'waiting for opponent'
                                                  : 'time to guess'}
                                        </div>
                                    </div>
                                )}
                            <div className="pointer-events-none absolute top-6 right-8 z-20 rounded bg-black/50 px-4 py-3 text-right backdrop-blur-sm">
                                {roundFinished && oppScore !== null && (
                                    <div
                                        className={`${oppColor} mb-3 font-mono text-6xl font-bold tabular-nums`}
                                    >
                                        {oppScore.toLocaleString()}
                                    </div>
                                )}
                                <div
                                    className={`${oppColorDim} mb-1 font-mono text-xs`}
                                >
                                    {oppName}
                                </div>
                                <HealthBar
                                    health={oppHealth}
                                    color={isPlayerOne ? 'red' : 'blue'}
                                />
                            </div>
                        </>
                    );
                })()}

                {/* Bottom-left: event feed */}
                <div
                    className={`absolute bottom-4 left-4 z-10 w-80 space-y-2 text-xs ${panel}`}
                >
                    {round && (
                        <>
                            <div className="flex justify-between text-xs opacity-70">
                                <span>Round {round.round_number}</span>
                                <span>{stateLabel[gameState]}</span>
                            </div>
                            {events.length > 0 && (
                                <div className="border-t border-white/10" />
                            )}
                        </>
                    )}
                    {events.length === 0 ? (
                        <p className="opacity-30">no events yet</p>
                    ) : (
                        events.map((e) => (
                            <div key={e.id}>
                                <div className="mb-0.5 flex gap-2 opacity-40">
                                    <span>{e.ts}</span>
                                    <span className="text-white/70">
                                        {e.name}
                                    </span>
                                </div>
                                <EventFields name={e.name} data={e.data} />
                            </div>
                        ))
                    )}
                </div>

                {/* Bottom-right: guess map for current player */}
                {round && !roundFinished && (
                    <div
                        className={`absolute right-4 bottom-4 z-10 overflow-hidden rounded transition-all duration-150 ${mapHovered ? 'h-[70vh] w-[55vw]' : 'h-40 w-64'}`}
                        onMouseEnter={() => setMapHovered(true)}
                        onMouseLeave={() => setMapHovered(false)}
                    >
                        <MapPicker
                            key={round.id}
                            onPin={(coords) => {
                                setPin(coords);
                                void updateGuess(coords);
                            }}
                            pinColor={isPlayerOne ? '#60a5fa' : '#f87171'}
                            disabled={myLocked || gameOver}
                        />
                        <div className="absolute right-2 bottom-2 left-2 font-mono">
                            <button
                                onClick={guess}
                                disabled={!pin || myLocked || gameOver}
                                className="w-full rounded bg-black/60 px-2 py-1 text-xs text-white backdrop-blur-sm enabled:hover:bg-black/80 disabled:opacity-30"
                            >
                                {myLocked
                                    ? 'Locked in ✓'
                                    : pin
                                      ? 'Lock in guess [space]'
                                      : 'Click map to place pin'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
