import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { Head } from '@inertiajs/react';
import React, { useEffect, useRef, useState } from 'react';
import echo from '@/echo';

type Player = { id: string; user: { name: string } };
type Round = {
    id: string;
    round_number: number;
    player_one_locked_in: boolean;
    player_two_locked_in: boolean;
};
type Location = { lat: number; lng: number; heading: number };
type Game = {
    id: string;
    player_one: Player;
    player_two: Player;
    player_one_health: number;
    player_two_health: number;
};
type RoundResult = {
    location: { lat: number; lng: number };
    p1Guess: { lat: number; lng: number } | null;
    p2Guess: { lat: number; lng: number } | null;
};

type GameState = 'waiting' | 'one_guessed' | 'finished' | 'game_over';

type GameEvent = {
    id: number;
    name:
        | 'PlayerGuessed'
        | 'RoundFinished'
        | 'RoundStarted'
        | 'GameFinished'
        | 'GameMessage';
    ts: string;
    data: Record<string, unknown>;
};

const MAX_EVENTS = 5;
const MAX_MESSAGES = 6;

function short(uuid: unknown) {
    return typeof uuid === 'string' ? uuid.slice(0, 8) : '?';
}

setOptions({
    key: import.meta.env.VITE_GOOGLE_MAPS_KEY as string,
    v: 'weekly',
});

// --- Results map ---

function svgDot(color: string) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><circle cx="8" cy="8" r="7" fill="${color}" stroke="white" stroke-width="2"/></svg>`;
    return {
        url: 'data:image/svg+xml,' + encodeURIComponent(svg),
        scaledSize: new google.maps.Size(16, 16),
        anchor: new google.maps.Point(8, 8),
    };
}

function svgFlagDot(circleColor: string) {
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
  <circle cx="18" cy="18" r="16" fill="${circleColor}" stroke="white" stroke-width="2.5"/>
  <path d="M16 9v18" stroke="white" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M16 9h12l-3 4 3 4H16" fill="white"/>
</svg>`;
    return {
        url: 'data:image/svg+xml,' + encodeURIComponent(svg),
        scaledSize: new google.maps.Size(36, 36),
        anchor: new google.maps.Point(18, 18),
    };
}

function svgGuessCircle(circleColor: string) {
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="10" fill="${circleColor}" stroke="white" stroke-width="2"/>
</svg>`;
    return {
        url: 'data:image/svg+xml,' + encodeURIComponent(svg),
        scaledSize: new google.maps.Size(24, 24),
        anchor: new google.maps.Point(12, 12),
    };
}

function ResultsMap({ result }: { result: RoundResult }) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let cancelled = false;

        async function init() {
            await importLibrary('maps');
            await importLibrary('marker');
            if (cancelled || !containerRef.current) return;

            const map = new google.maps.Map(containerRef.current, {
                center: result.location,
                zoom: 3,
                disableDefaultUI: true,
                clickableIcons: false,
            });

            const bounds = new google.maps.LatLngBounds();

            new google.maps.Marker({
                position: result.location,
                map,
                icon: svgFlagDot('#facc15'),
            });
            bounds.extend(result.location);

            const dashedLine = {
                strokeColor: '#000000',
                strokeOpacity: 0,
                strokeWeight: 0,
                icons: [
                    {
                        icon: {
                            path: 'M 0,-1 0,1',
                            strokeOpacity: 0.6,
                            strokeWeight: 2,
                            scale: 3,
                        },
                        offset: '0',
                        repeat: '12px',
                    },
                ],
            };

            if (result.p1Guess) {
                new google.maps.Marker({
                    position: result.p1Guess,
                    map,
                    icon: svgDot('#60a5fa'),
                });
                bounds.extend(result.p1Guess);
                new google.maps.Polyline({
                    path: [result.location, result.p1Guess],
                    map,
                    ...dashedLine,
                });
            }

            if (result.p2Guess) {
                new google.maps.Marker({
                    position: result.p2Guess,
                    map,
                    icon: svgDot('#f87171'),
                });
                bounds.extend(result.p2Guess);
                new google.maps.Polyline({
                    path: [result.location, result.p2Guess],
                    map,
                    ...dashedLine,
                });
            }

            requestAnimationFrame(() =>
                google.maps.event.trigger(map, 'resize'),
            );
            map.fitBounds(bounds, 80);
        }

        init().catch(console.error);
        return () => {
            cancelled = true;
        };
    }, [result]);

    return <div ref={containerRef} className="absolute inset-0" />;
}

// --- Street View ---

function StreetViewPanel({ location }: { location: Location }) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let cancelled = false;

        async function init() {
            const { StreetViewPanorama } = await importLibrary('streetView');
            if (cancelled || !containerRef.current) return;
            new StreetViewPanorama(containerRef.current, {
                position: { lat: location.lat, lng: location.lng },
                pov: { heading: location.heading, pitch: 0 },
                disableDefaultUI: true,
                clickToGo: false,
                disableDoubleClickZoom: false,
                scrollwheel: true,
                showRoadLabels: false,
                motionTracking: false,
                motionTrackingControl: false,
            });
        }

        init().catch(console.error);
        return () => {
            cancelled = true;
        };
    }, []);

    return <div ref={containerRef} className="absolute inset-0" />;
}

// --- Map picker ---

type LatLng = { lat: number; lng: number };

function MapPicker({
    onPin,
    pinColor,
    disabled,
}: {
    onPin: (coords: LatLng) => void;
    pinColor: string;
    disabled: boolean;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const markerRef = useRef<google.maps.Marker | null>(null);
    const mapRef = useRef<google.maps.Map | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function init() {
            await importLibrary('maps');
            if (cancelled || !containerRef.current) return;

            const map = new google.maps.Map(containerRef.current, {
                center: { lat: 20, lng: 0 },
                zoom: 1,
                disableDefaultUI: true,
                clickableIcons: false,
                draggableCursor: 'crosshair',
            });
            mapRef.current = map;

            map.addListener('click', (e: google.maps.MapMouseEvent) => {
                if (disabled) return;
                if (!e.latLng) return;
                const coords = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                if (markerRef.current) {
                    markerRef.current.setPosition(e.latLng);
                } else {
                    markerRef.current = new google.maps.Marker({
                        position: e.latLng,
                        map,
                        icon: svgGuessCircle(pinColor),
                        clickable: false,
                    });
                }
                onPin(coords);
            });

            const observer = new ResizeObserver(() => {
                google.maps.event.trigger(map, 'resize');
            });
            if (containerRef.current) observer.observe(containerRef.current);
            return () => observer.disconnect();
        }

        init().catch(console.error);
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className={`h-full w-full ${disabled ? 'cursor-not-allowed' : 'cursor-crosshair'}`}
        />
    );
}

// --- Health bar ---

function HealthBar({
    health,
    color,
}: {
    health: number;
    color: 'blue' | 'red';
}) {
    const pct = Math.max(0, Math.min(100, (health / 5000) * 100));
    const colorClass = color === 'blue' ? 'text-blue-400' : 'text-red-400';
    const [flashing, setFlashing] = useState(false);
    const [flashKey, setFlashKey] = useState(0);
    const prevHealthRef = useRef<number | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (prevHealthRef.current !== null && health < prevHealthRef.current) {
            if (timerRef.current) clearTimeout(timerRef.current);
            setFlashKey((k) => k + 1);
            setFlashing(true);
            timerRef.current = setTimeout(() => setFlashing(false), 900);
        }
        prevHealthRef.current = health;
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [health]);

    return (
        <div className="flex items-center gap-3 font-mono">
            <div className="relative leading-none">
                <span className="text-sm text-white opacity-20 select-none">
                    {'█'.repeat(24)}
                </span>
                <span
                    className={`absolute inset-0 overflow-hidden text-sm whitespace-nowrap select-none ${colorClass}`}
                    style={{
                        width: `${pct}%`,
                        transition:
                            'width 800ms cubic-bezier(0.19, 1, 0.22, 1)',
                    }}
                >
                    {'█'.repeat(24)}
                </span>
                {flashing && (
                    <span
                        key={flashKey}
                        className="health-flash pointer-events-none absolute inset-0 overflow-hidden text-sm whitespace-nowrap text-red-400 select-none"
                        style={{ width: `${pct}%` }}
                    >
                        {'█'.repeat(24)}
                    </span>
                )}
            </div>
            <span className={`text-xs tabular-nums opacity-60 ${colorClass}`}>
                {health}hp
            </span>
        </div>
    );
}

// --- Event feed ---

function EventFields({
    name,
    data,
}: {
    name: GameEvent['name'];
    data: Record<string, unknown>;
}) {
    const row = (label: string, value: unknown) => (
        <div key={label} className="flex gap-2">
            <span className="w-24 opacity-40">{label}</span>
            <span>{String(value)}</span>
        </div>
    );

    const common = (
        <>
            {row('game', short(data.game_id))}
            {row('round', short(data.round_id))}
            {row('round #', data.round_number)}
        </>
    );

    const extra =
        name === 'PlayerGuessed' ? (
            row('player', short(data.player_id))
        ) : name === 'RoundFinished' ? (
            <>
                {row('p1 score', data.player_one_score)}
                {row('p2 score', data.player_two_score)}
            </>
        ) : name === 'RoundStarted' ? (
            <>
                {row('p1 health', data.player_one_health)}
                {row('p2 health', data.player_two_health)}
            </>
        ) : name === 'GameFinished' ? (
            <>
                {row('winner', short(data.winner_id))}
                {row('p1 health', data.player_one_health)}
                {row('p2 health', data.player_two_health)}
            </>
        ) : null;

    return (
        <div className="border-l border-white/20 pl-2">
            {common}
            {extra}
        </div>
    );
}

// --- Animated dots ---

function Dots() {
    const [count, setCount] = useState(1);
    useEffect(() => {
        const t = setInterval(() => setCount((c) => (c % 3) + 1), 500);
        return () => clearInterval(t);
    }, []);
    return <span>{'.'.repeat(count)}</span>;
}

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
}: {
    player: Player;
    game: Game | null;
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
    const [roundStartedAt, setRoundStartedAt] = useState<Date | null>(null);
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

        function leaveQueue() {
            fetch(`/players/${player.id}/leave-queue`, {
                method: 'POST',
                keepalive: true,
                headers: { 'X-XSRF-TOKEN': getCsrfToken() },
            });
        }

        window.addEventListener('beforeunload', leaveQueue);

        return () => {
            echo.leaveChannel(`player.${player.id}`);
            window.removeEventListener('beforeunload', leaveQueue);
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
            setRoundStartedAt(null);
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
            setRoundStartedAt(startedAt);
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
            setMessages((prev) => [
                {
                    id: eventSeq++,
                    name: (data.player_name as string) ?? 'Player',
                    text: (data.message as string) ?? '',
                    ts: new Date().toISOString().substring(11, 19),
                },
                ...prev.slice(0, MAX_MESSAGES - 1),
            ]);
        });

        channel.listen('.GameFinished', (data: Record<string, unknown>) => {
            pushEvent('GameFinished', data);
            setCountdown(null);
            setUrgentCountdown(null);
            setRoundStartedAt(null);
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
            body: JSON.stringify(pin),
        });
        if (res.ok) setRound(await res.json());
    }

    async function updateGuess(coords: LatLng) {
        if (!round || !game || myLocked || gameOver) return;
        const url = `/players/${player.id}/games/${game.id}/rounds/${round.id}/guess-preview`;
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
    }, [chatOpen, chatText, game?.id]);

    useEffect(() => {
        if (!chatOpen) return;
        const t = setTimeout(() => chatInputRef.current?.focus(), 0);
        return () => clearTimeout(t);
    }, [chatOpen]);

    const stateLabel: Record<GameState, React.ReactNode> = {
        waiting:
            urgentCountdown !== null ? (
                `${urgentCountdown}s to guess`
            ) : (
                <span>
                    Waiting for guesses
                    <Dots />
                </span>
            ),
        one_guessed:
            urgentCountdown !== null ? (
                `${urgentCountdown}s to guess`
            ) : (
                <span>
                    Waiting for opponent
                    <Dots />
                </span>
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
                <div className="flex h-screen items-center justify-center bg-neutral-900 font-mono text-sm text-neutral-400">
                    Waiting for opponent
                    <Dots />
                </div>
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
                        Waiting for round to start
                        <Dots />
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
                            <div className="pointer-events-none absolute top-6 left-8 z-20 rounded bg-black/50 px-4 py-3 backdrop-blur-sm">
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

                {/* Top-left: chat */}
                {game && (
                    <div className="pointer-events-none absolute top-24 left-8 z-20 w-72 space-y-2">
                        {messages.length > 0 && (
                            <div className="rounded border border-white/10 bg-black/50 p-2 text-xs text-white/80 backdrop-blur-sm">
                                {messages.map((m) => (
                                    <div key={m.id} className="mb-1 last:mb-0">
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
                )}

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
