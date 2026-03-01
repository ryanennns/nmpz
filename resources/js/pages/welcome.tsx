import { setOptions } from '@googlemaps/js-api-loader';
import { Head } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import ChatSidebar from '@/components/welcome/ChatSidebar';
import { GameProvider, useGameContext } from '@/components/welcome/GameContext';
import HealthBar from '@/components/welcome/HealthBar';
import MapillaryImagePanel from '@/components/welcome/MapillaryImagePanel';
import MapPicker from '@/components/welcome/MapPicker';
import ResultsMap from '@/components/welcome/ResultsMap';
import ShimmerText from '@/components/welcome/ShimmerText';
import { StandardCompass } from '@/components/welcome/StandardCompass';

import type {
    Game,
    GameEvent,
    GameState,
    LatLng,
    Location,
    Message,
    Player,
    Round,
    RoundResult,
} from '@/components/welcome/types';
import { WinnerOverlay } from '@/components/welcome/WinnerOverlay';
import echo from '@/echo';
import { useApiClient } from '@/hooks/useApiClient';
import { cn } from '@/lib/utils';

const MAX_EVENTS = 5;
const MAX_MESSAGES = 6;
const END_MAP_HOLD_MS = 3000;
const END_FADE_MS = 500;
const END_WINNER_HOLD_MS = 2500;
const QUEUE_FADE_MS = 500;

type RoundData = {
    game_id: string;
    round_id: string;
    round_number: number;
    player_one_health: number;
    player_two_health: number;
    location_lat: number;
    location_lng: number;
    location_heading: number;
    location_image_id?: string | null;
    started_at?: string | null;
    player_one_locked_in?: boolean;
    player_two_locked_in?: boolean;
};

setOptions({
    key: import.meta.env.VITE_GOOGLE_MAPS_KEY as string,
    v: 'weekly',
});

// --- Helpers ---
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

function roundStartedAtFromData(roundData: RoundData) {
    return roundData.started_at ? new Date(roundData.started_at) : null;
}

function roundFromData(roundData: RoundData): Round {
    return {
        id: roundData.round_id,
        round_number: roundData.round_number,
        player_one_locked_in: roundData.player_one_locked_in ?? false,
        player_two_locked_in: roundData.player_two_locked_in ?? false,
    };
}

function locationFromData(roundData: RoundData): Location {
    return {
        lat: roundData.location_lat,
        lng: roundData.location_lng,
        heading: roundData.location_heading,
        image_id: roundData.location_image_id ?? null,
    };
}

// --- Page ---

function CountdownTimer({
    config,
}: {
    config: { value: number; label: string; valueClass: string };
}) {
    return (
        <div className="pointer-events-none absolute top-6 left-1/2 z-20 -translate-x-1/2 rounded bg-black/50 px-4 py-3 text-center backdrop-blur-sm">
            <div
                className={cn(
                    'font-mono text-6xl font-bold tabular-nums',
                    config.valueClass,
                )}
            >
                {config.value}
            </div>
            <div className="mt-1 font-mono text-sm text-white/40">
                {config.label}
            </div>
        </div>
    );
}

export default function Welcome({
    player,
    game,
    round_data: roundData,
}: {
    player: Player;
    game: Game;
    round_data: RoundData;
}) {
    return (
        <GameProvider game={game}>
            <WelcomePage player={player} roundData={roundData} />
        </GameProvider>
    );
}

function WelcomePage({
    player,
    roundData,
}: {
    player: Player;
    roundData: RoundData;
}) {
    const { game, setGame } = useGameContext();
    const [round, setRound] = useState<Round | null>(() =>
        roundFromData(roundData),
    );
    const [location, setLocation] = useState<Location | null>(() =>
        locationFromData(roundData),
    );
    const [heading, setHeading] = useState<number | null>(
        roundData.location_heading,
    );
    const [health, setHealth] = useState({
        p1: roundData.player_one_health,
        p2: roundData.player_two_health,
    });
    const [gameOver, setGameOver] = useState(false);
    const [events, setEvents] = useState<GameEvent[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [urgentCountdown, setUrgentCountdown] = useState<number | null>(() =>
        roundRemainingSeconds(roundStartedAtFromData(roundData)),
    );
    const [pendingRoundData, setPendingRoundData] = useState<Record<
        string,
        unknown
    > | null>(null);
    const [pin, setPin] = useState<LatLng | null>(null);
    const [roundFinished, setRoundFinished] = useState(false);
    const [mapHovered, setMapHovered] = useState(false);
    const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
    const [roundScores, setRoundScores] = useState<{
        p1: number | null;
        p2: number | null;
    }>({ p1: null, p2: null });
    const [winnerId, setWinnerId] = useState<string | null>(null);
    const [winnerName, setWinnerName] = useState<string | null>(null);
    const [winnerOverlayVisible, setWinnerOverlayVisible] = useState(false);
    const [blackoutVisible, setBlackoutVisible] = useState(false);
    const [pageVisible, setPageVisible] = useState(true);
    const guessRef = useRef<() => void>(() => {});
    const roundStartedAtRef = useRef<Date | null>(
        roundStartedAtFromData(roundData),
    );
    const endTimersRef = useRef<number[]>([]);
    const queueFadeTimerRef = useRef<number | null>(null);
    const [myDamageKey, setMyDamageKey] = useState(0);
    const prevMyHealthRef = useRef<number | null>(null);
    const gameContainerRef = useRef<HTMLDivElement>(null);
    const [chatOpen, setChatOpen] = useState(false);
    const [chatText, setChatText] = useState('');
    const api = useApiClient();
    const damageTimerRef = useRef<number | null>(null);
    const gameOverRef = useRef(gameOver);

    const isPlayerOne = game ? player.id === game.player_one.id : false;
    const myLocked = round
        ? isPlayerOne
            ? round.player_one_locked_in
            : round.player_two_locked_in
        : false;
    type PlayerColour = 'blue' | 'red';
    const playerConfig = game
        ? {
              me: {
                  color: isPlayerOne ? 'text-blue-400' : 'text-red-400',
                  colorDim: isPlayerOne
                      ? 'text-blue-400/60'
                      : 'text-red-400/60',
                  health: isPlayerOne ? health.p1 : health.p2,
                  score: isPlayerOne ? roundScores.p1 : roundScores.p2,
                  barColor: isPlayerOne ? 'blue' : ('red' as PlayerColour),
              },
              opponent: {
                  color: isPlayerOne ? 'text-red-400' : 'text-blue-400',
                  colorDim: isPlayerOne
                      ? 'text-red-400/60'
                      : 'text-blue-400/60',
                  health: isPlayerOne ? health.p2 : health.p1,
                  score: isPlayerOne ? roundScores.p2 : roundScores.p1,
                  barColor: isPlayerOne ? 'red' : ('blue' as PlayerColour),
                  name: 'oops',
              },
          }
        : null;
    const gameState = round
        ? deriveGameState(round, gameOver, roundFinished)
        : 'waiting';
    const hasRoundCountdown = roundFinished && countdown !== null;
    const hasUrgentCountdown =
        (gameState === 'one_guessed' || gameState === 'waiting') &&
        urgentCountdown !== null;
    const countdownConfig = hasRoundCountdown
        ? {
              value: countdown as number,
              label: 'next round',
              valueClass: 'text-white',
          }
        : hasUrgentCountdown
          ? {
                value: urgentCountdown as number,
                label:
                    gameState === 'waiting'
                        ? 'time to guess'
                        : myLocked
                          ? 'waiting for opponent'
                          : 'time to guess',
                valueClass: cn({
                    'text-red-400': (urgentCountdown as number) <= 15,
                    'text-amber-400': (urgentCountdown as number) > 15,
                }),
            }
          : null;

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

    function clearEndSequenceTimers() {
        endTimersRef.current.forEach((id) => window.clearTimeout(id));
        endTimersRef.current = [];
    }

    function clearQueueFadeTimer() {
        if (queueFadeTimerRef.current !== null) {
            window.clearTimeout(queueFadeTimerRef.current);
            queueFadeTimerRef.current = null;
        }
    }

    function applyRoundData(data: RoundData) {
        const startedAt = roundStartedAtFromData(data);
        roundStartedAtRef.current = startedAt;
        setUrgentCountdown(roundRemainingSeconds(startedAt));
        setRoundFinished(false);
        setRoundResult(null);
        setRoundScores({ p1: null, p2: null });
        setHealth({
            p1: data.player_one_health,
            p2: data.player_two_health,
        });
        setLocation(locationFromData(data));
        setHeading(data.location_heading);
        setRound(roundFromData(data));
        setPin(null);
        setCountdown(null);
    }

    function scheduleEndSequence(resetGame: () => void) {
        clearEndSequenceTimers();
        setBlackoutVisible(false);
        setWinnerOverlayVisible(false);
        setPageVisible(true);

        const t1 = window.setTimeout(() => {
            setBlackoutVisible(true);

            const t2 = window.setTimeout(() => {
                setWinnerOverlayVisible(true);

                const t3 = window.setTimeout(() => {
                    setWinnerOverlayVisible(false);

                    const t4 = window.setTimeout(() => {
                        setPageVisible(false);

                        const t5 = window.setTimeout(() => {
                            resetGame();
                            requestAnimationFrame(() => {
                                requestAnimationFrame(() =>
                                    setPageVisible(true),
                                );
                            });

                            const t6 = window.setTimeout(() => {
                                setBlackoutVisible(false);
                            }, END_FADE_MS);

                            endTimersRef.current.push(t6);
                        }, END_FADE_MS);

                        endTimersRef.current.push(t5);
                    }, END_FADE_MS);

                    endTimersRef.current.push(t4);
                }, END_WINNER_HOLD_MS);

                endTimersRef.current.push(t3);
            }, END_FADE_MS);

            endTimersRef.current.push(t2);
        }, END_MAP_HOLD_MS);

        endTimersRef.current.push(t1);
    }

    function triggerGameOver(
        winnerId: string | null,
        winnerName: string | null,
    ) {
        if (damageTimerRef.current !== null) {
            window.clearTimeout(damageTimerRef.current);
            damageTimerRef.current = null;
        }
        setCountdown(null);
        setUrgentCountdown(null);
        roundStartedAtRef.current = null;
        setGameOver(true);
        setWinnerId(winnerId);
        setWinnerName(winnerName);

        scheduleEndSequence(() => {
            window.location.assign('/');
        });
    }

    // Countdown tick (next round)
    useEffect(() => {
        if (countdown === null || countdown <= 0) return;
        const t = setTimeout(() => setCountdown((c) => (c ?? 1) - 1), 1000);
        return () => clearTimeout(t);
    }, [countdown]);

    // Apply buffered RoundStarted data once countdown expires
    useEffect(() => {
        if (pendingRoundData === null) return;
        if (countdown !== null && countdown > 0) return;

        const data = pendingRoundData;
        setPendingRoundData(null);
        setCountdown(null);
        applyRoundData(data as RoundData);
    }, [countdown, pendingRoundData]);

    useEffect(() => {
        applyRoundData(roundData);
    }, [roundData]);

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
            clearEndSequenceTimers();
            clearQueueFadeTimer();
            setBlackoutVisible(false);
            setWinnerOverlayVisible(false);
            setPageVisible(true);
            const applyGame = () => {
                setGame(data.game);
                setHealth({
                    p1: data.game.player_one_health,
                    p2: data.game.player_two_health,
                });
            };
            setPageVisible(false);
            queueFadeTimerRef.current = window.setTimeout(() => {
                applyGame();
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => setPageVisible(true));
                });
            }, QUEUE_FADE_MS);
        });

        return () => {
            clearQueueFadeTimer();
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
            if (damageTimerRef.current !== null) {
                window.clearTimeout(damageTimerRef.current);
            }
            damageTimerRef.current = window.setTimeout(() => {
                if (gameOverRef.current) return;
                setHealth((prev) => {
                    if (p1Score < p2Score)
                        return { p1: prev.p1 - damage, p2: prev.p2 };
                    if (p2Score < p1Score)
                        return { p1: prev.p1, p2: prev.p2 - damage };
                    return prev;
                });
            }, 1800);
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
            setPendingRoundData(data);
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
            setHealth({
                p1: data.player_one_health as number,
                p2: data.player_two_health as number,
            });
            const winnerId = data.winner_id as string | null;
            const name =
                winnerId === game.player_one.id
                    ? game.player_one.name
                    : winnerId === game.player_two.id
                      ? game.player_two.name
                      : null;
            triggerGameOver(winnerId, name);
        });

        return () => {
            clearEndSequenceTimers();
            echo.leaveChannel(`game.${game.id}`);
        };
    }, [game?.id]);

    useEffect(() => () => clearEndSequenceTimers(), []);

    useEffect(() => {
        gameOverRef.current = gameOver;
    }, [gameOver]);

    useEffect(() => {
        if (!game || gameOver) return;
        if (health.p1 >= 0 && health.p2 >= 0) return;

        const winnerId =
            health.p1 < 0 ? game.player_two.id : game.player_one.id;
        const winnerName =
            winnerId === game.player_one.id
                ? game.player_one.name
                : game.player_two.name;

        triggerGameOver(winnerId, winnerName);
    }, [game?.id, gameOver, health.p1, health.p2]);

    // Detect when my health drops → screen vignette + shake
    useEffect(() => {
        if (!game) {
            prevMyHealthRef.current = null;
            return;
        }
        const myHealth = isPlayerOne ? health.p1 : health.p2;
        if (
            prevMyHealthRef.current !== null &&
            myHealth < prevMyHealthRef.current
        ) {
            // Vignette: increment key forces the overlay div to remount, restarting animation
            setMyDamageKey((k) => k + 1);
            // Screen shake via direct DOM class manipulation
            const el = gameContainerRef.current;
            if (el) {
                el.classList.remove('screen-shake');
                void el.offsetWidth; // force reflow so animation restarts
                el.classList.add('screen-shake');
                el.addEventListener(
                    'animationend',
                    () => el.classList.remove('screen-shake'),
                    { once: true },
                );
            }
        }
        prevMyHealthRef.current = myHealth;
    }, [health, isPlayerOne, game?.id]);

    async function guess() {
        if (!pin || !round || !game || myLocked || gameOver) return;
        setMapHovered(false);
        const res = await api.guess(player.id, round.id, pin, true);
        if (res?.data) setRound(res.data as Round);
    }

    async function updateGuess(coords: LatLng) {
        if (!round || !game || myLocked || gameOver) return;
        const res = await api.guess(player.id, round.id, coords, false);
        if (res?.data) setRound(res.data as Round);
    }

    async function sendMessage() {
        if (!game || !chatText.trim()) return;
        const res = await api.sendMessage(player.id, chatText.trim());
        if (res) {
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

    return (
        <>
            <Head title="nmpz.dev" />
            <div
                className={`transition-opacity duration-500 ${pageVisible ? 'opacity-100' : 'opacity-0'}`}
            >
                <div
                    ref={gameContainerRef}
                    className="relative h-screen w-screen overflow-hidden font-mono text-white"
                >
                    {urgentCountdown !== null && urgentCountdown <= 15 && (
                        <div className="urgent-screen-halo pointer-events-none absolute inset-0 z-10" />
                    )}
                    {/* Red vignette flash when my health drops */}
                    {myDamageKey > 0 && (
                        <div
                            key={myDamageKey}
                            className="damage-vignette pointer-events-none absolute inset-0 z-30"
                        />
                    )}
                    {/* Fullscreen results during countdown */}
                    {roundFinished && roundResult ? (
                        <ResultsMap
                            key={`result-${round?.id ?? 'pending'}`}
                            result={roundResult}
                        />
                    ) : location ? (
                        <MapillaryImagePanel
                            key={`${location.image_id ?? ''}-${location.lat},${location.lng}`}
                            location={location}
                            onHeadingChange={setHeading}
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 text-sm text-neutral-500">
                            <ShimmerText>
                                Waiting for round to start
                            </ShimmerText>
                        </div>
                    )}

                    {/* Top corners: player panels (always visible) */}
                    {(() => {
                        const { me, opponent } = playerConfig ?? {};
                        return (
                            <>
                                <div className="pointer-events-none absolute top-6 left-8 z-20 flex w-72 flex-col gap-3">
                                    <div className="rounded bg-black/50 px-4 py-3 backdrop-blur-sm">
                                        {roundFinished &&
                                            me?.score !== null && (
                                                <div
                                                    className={`${me?.color} mb-3 font-mono text-6xl font-bold tabular-nums`}
                                                >
                                                    {me?.score?.toLocaleString()}
                                                </div>
                                            )}
                                        <div
                                            className={`${me?.colorDim} mb-1 font-mono text-xs`}
                                        >
                                            You
                                        </div>
                                        <HealthBar
                                            health={me?.health ?? 0}
                                            color={me?.barColor ?? 'blue'}
                                        />
                                    </div>
                                    <ChatSidebar
                                        messages={messages}
                                        chatOpen={chatOpen}
                                        chatText={chatText}
                                        onChatTextChange={setChatText}
                                        onSendMessage={() => void sendMessage()}
                                    />
                                </div>
                                {countdownConfig && (
                                    <CountdownTimer config={countdownConfig} />
                                )}
                                <div className="pointer-events-none absolute top-6 right-8 z-20 rounded bg-black/50 px-4 py-3 text-right backdrop-blur-sm">
                                    {roundFinished &&
                                        opponent?.score !== null && (
                                            <div
                                                className={`${opponent?.color} mb-3 font-mono text-6xl font-bold tabular-nums`}
                                            >
                                                {opponent?.score?.toLocaleString()}
                                            </div>
                                        )}
                                    <div
                                        className={`${opponent?.colorDim} mb-1 font-mono text-xs`}
                                    >
                                        {opponent?.name}
                                    </div>
                                    <HealthBar
                                        health={opponent?.health ?? 0}
                                        color={opponent?.barColor ?? 'red'}
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
                                <div
                                    key={e.id}
                                    className="flex gap-2 opacity-40"
                                >
                                    <span>{e.ts}</span>
                                    <span className="truncate text-white/70">
                                        {e.name}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Bottom-center: compass */}
                    {location && heading && (
                        <StandardCompass heading={heading} />
                    )}

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

                    {/* Fade to black overlay */}
                    <div
                        className={`pointer-events-none absolute inset-0 z-40 bg-black transition-opacity duration-500 ${blackoutVisible ? 'opacity-100' : 'opacity-0'}`}
                    />
                    <WinnerOverlay
                        visible={winnerOverlayVisible}
                        winnerId={winnerId}
                        id={player.id}
                        winnerName={winnerName}
                    />
                </div>
            </div>
        </>
    );
}
