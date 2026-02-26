import { Head } from '@inertiajs/react';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { useEffect, useRef, useState } from 'react';
import echo from '@/echo';

type Player = { id: string; user: { name: string } };
type Round = { id: string; round_number: number; player_one_locked_in: boolean; player_two_locked_in: boolean };
type Location = { lat: number; lng: number; heading: number };
type Game = { id: string; player_one: Player; player_two: Player; player_one_health: number; player_two_health: number };
type RoundResult = {
    location: { lat: number; lng: number };
    p1Guess: { lat: number; lng: number } | null;
    p2Guess: { lat: number; lng: number } | null;
};

type GameState = 'waiting' | 'one_guessed' | 'finished' | 'game_over';

type GameEvent = {
    id: number;
    name: 'PlayerGuessed' | 'RoundFinished' | 'RoundStarted' | 'GameFinished';
    ts: string;
    data: Record<string, unknown>;
};

const MAX_EVENTS = 5;

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

            new google.maps.Marker({ position: result.location, map, icon: svgFlagDot('#facc15') });
            bounds.extend(result.location);

            const dashedLine = {
                strokeColor: '#000000',
                strokeOpacity: 0,
                strokeWeight: 0,
                icons: [{
                    icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.6, strokeWeight: 2, scale: 3 },
                    offset: '0',
                    repeat: '12px',
                }],
            };

            if (result.p1Guess) {
                new google.maps.Marker({ position: result.p1Guess, map, icon: svgDot('#60a5fa') });
                bounds.extend(result.p1Guess);
                new google.maps.Polyline({ path: [result.location, result.p1Guess], map, ...dashedLine });
            }

            if (result.p2Guess) {
                new google.maps.Marker({ position: result.p2Guess, map, icon: svgDot('#f87171') });
                bounds.extend(result.p2Guess);
                new google.maps.Polyline({ path: [result.location, result.p2Guess], map, ...dashedLine });
            }

            requestAnimationFrame(() => google.maps.event.trigger(map, 'resize'));
            map.fitBounds(bounds, 80);
        }

        init().catch(console.error);
        return () => { cancelled = true; };
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
        return () => { cancelled = true; };
    }, []);

    return <div ref={containerRef} className="absolute inset-0" />;
}

// --- Map picker ---

type LatLng = { lat: number; lng: number };

function MapPicker({ onPin }: { onPin: (coords: LatLng) => void }) {
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
                if (!e.latLng) return;
                const coords = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                if (markerRef.current) {
                    markerRef.current.setPosition(e.latLng);
                } else {
                    markerRef.current = new google.maps.Marker({ position: e.latLng, map });
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
        return () => { cancelled = true; };
    }, []);

    return <div ref={containerRef} className="h-full w-full cursor-crosshair" />;
}

// --- Health bar ---

function HealthBar({
    name,
    health,
    color,
    isYou,
}: {
    name: string;
    health: number;
    color: 'blue' | 'red';
    isYou?: boolean;
}) {
    const filled = Math.round(Math.max(0, Math.min(5000, health)) / 250);
    const empty = 20 - filled;
    const colorClass = color === 'blue' ? 'text-blue-400' : 'text-red-400';
    return (
        <div className="flex gap-2 text-xs">
            <span className="w-20 truncate opacity-60">{isYou ? 'You' : name}</span>
            <span className={colorClass}>{'█'.repeat(filled)}{'░'.repeat(empty)}</span>
            <span className={`w-12 text-right opacity-60 ${colorClass}`}>{health}hp</span>
        </div>
    );
}

// --- Event feed ---

function EventFields({ name, data }: { name: GameEvent['name']; data: Record<string, unknown> }) {
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
        name === 'PlayerGuessed' ? row('player', short(data.player_id))
        : name === 'RoundFinished' ? (
            <>
                {row('p1 score', data.player_one_score)}
                {row('p2 score', data.player_two_score)}
            </>
        )
        : name === 'RoundStarted' ? (
            <>
                {row('p1 health', data.player_one_health)}
                {row('p2 health', data.player_two_health)}
            </>
        )
        : name === 'GameFinished' ? (
            <>
                {row('winner', short(data.winner_id))}
                {row('p1 health', data.player_one_health)}
                {row('p2 health', data.player_two_health)}
            </>
        )
        : null;

    return <div className="border-l border-white/20 pl-2">{common}{extra}</div>;
}

// --- Helpers ---

function getCsrfToken() {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

function deriveGameState(round: Round, gameOver: boolean, roundFinished: boolean): GameState {
    if (gameOver) return 'game_over';
    if (roundFinished || (round.player_one_locked_in && round.player_two_locked_in)) return 'finished';
    if (round.player_one_locked_in || round.player_two_locked_in) return 'one_guessed';
    return 'waiting';
}

let eventSeq = 0;

const panel = 'rounded border border-white/10 bg-black/60 p-3 backdrop-blur-sm';

// --- Page ---

export default function Welcome({ player, game: initialGame }: { player: Player; game: Game | null }) {
    const [game, setGame] = useState<Game | null>(initialGame);
    const [round, setRound] = useState<Round | null>(null);
    const [location, setLocation] = useState<Location | null>(null);
    const [health, setHealth] = useState({ p1: initialGame?.player_one_health ?? 5000, p2: initialGame?.player_two_health ?? 5000 });
    const [gameOver, setGameOver] = useState(false);
    const [events, setEvents] = useState<GameEvent[]>([]);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [pin, setPin] = useState<LatLng | null>(null);
    const [roundFinished, setRoundFinished] = useState(false);
    const [mapHovered, setMapHovered] = useState(false);
    const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
    const [roundScores, setRoundScores] = useState<{ p1: number | null; p2: number | null }>({ p1: null, p2: null });
    const guessRef = useRef<() => void>(() => {});

    const isPlayerOne = game ? player.id === game.player_one.id : false;
    const myLocked = round ? (isPlayerOne ? round.player_one_locked_in : round.player_two_locked_in) : false;
    const gameState = round ? deriveGameState(round, gameOver, roundFinished) : 'waiting';

    function pushEvent(name: GameEvent['name'], data: Record<string, unknown>) {
        setEvents(prev => [
            { id: eventSeq++, name, ts: new Date().toISOString().substring(11, 23), data },
            ...prev.slice(0, MAX_EVENTS - 1),
        ]);
    }

    // Countdown tick
    useEffect(() => {
        if (countdown === null || countdown <= 0) return;
        const t = setTimeout(() => setCountdown(c => (c ?? 1) - 1), 1000);
        return () => clearTimeout(t);
    }, [countdown]);

    // Matchmaking channel — only when waiting for a game
    useEffect(() => {
        if (game) return;

        const channel = echo.channel(`player.${player.id}`);

        channel.listen('.GameReady', (data: { game: Game }) => {
            setGame(data.game);
            setHealth({ p1: data.game.player_one_health, p2: data.game.player_two_health });
        });

        return () => { echo.leaveChannel(`player.${player.id}`); };
    }, [game?.id, player.id]);

    // Game channel — once we have a game
    useEffect(() => {
        if (!game) return;

        const channel = echo.channel(`game.${game.id}`);

        channel.listen('.PlayerGuessed', (data: Record<string, unknown>) => {
            pushEvent('PlayerGuessed', data);
            setRound(prev => prev ? {
                ...prev,
                player_one_locked_in: data.player_one_locked_in as boolean,
                player_two_locked_in: data.player_two_locked_in as boolean,
            } : null);
        });

        channel.listen('.RoundFinished', (data: Record<string, unknown>) => {
            pushEvent('RoundFinished', data);
            setRoundFinished(true);
            setCountdown(6);
            setRoundScores({ p1: data.player_one_score as number ?? null, p2: data.player_two_score as number ?? null });
            const locLat = Number(data.location_lat);
            const locLng = Number(data.location_lng);
            if (!Number.isFinite(locLat) || !Number.isFinite(locLng)) {
                setRoundResult(null);
                return;
            }
            const p1Lat = Number(data.player_one_guess_lat);
            const p1Lng = Number(data.player_one_guess_lng);
            const p2Lat = Number(data.player_two_guess_lat);
            const p2Lng = Number(data.player_two_guess_lng);
            setRoundResult({
                location: { lat: locLat, lng: locLng },
                p1Guess: Number.isFinite(p1Lat) && Number.isFinite(p1Lng) ? { lat: p1Lat, lng: p1Lng } : null,
                p2Guess: Number.isFinite(p2Lat) && Number.isFinite(p2Lng) ? { lat: p2Lat, lng: p2Lng } : null,
            });
        });

        channel.listen('.RoundStarted', (data: Record<string, unknown>) => {
            pushEvent('RoundStarted', data);
            setCountdown(null);
            setRoundFinished(false);
            setRoundResult(null);
            setRoundScores({ p1: null, p2: null });
            setHealth({ p1: data.player_one_health as number, p2: data.player_two_health as number });
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

        channel.listen('.GameFinished', (data: Record<string, unknown>) => {
            pushEvent('GameFinished', data);
            setCountdown(null);
            setRoundResult(null);
            setHealth({ p1: data.player_one_health as number, p2: data.player_two_health as number });
            setGameOver(true);
        });

        return () => { echo.leaveChannel(`game.${game.id}`); };
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

    guessRef.current = guess;

    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (e.code === 'Space' && !e.repeat) {
                e.preventDefault();
                guessRef.current();
            }
        }
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    const stateLabel: Record<GameState, string> = {
        waiting: 'Waiting for guesses',
        one_guessed: 'Waiting for opponent',
        finished: countdown !== null ? `Next round in ${countdown}s` : 'Round finished',
        game_over: 'Game over',
    };

    if (!game) {
        return (
            <>
                <Head title="nmpz" />
                <div className="flex h-screen items-center justify-center bg-neutral-900 font-mono text-neutral-400 text-sm">
                    Waiting for opponent...
                </div>
            </>
        );
    }

    return (
        <>
            <Head title="nmpz" />
            <div className="relative h-screen w-screen overflow-hidden font-mono text-white">

                {/* Fullscreen results during countdown */}
                {roundFinished && roundResult ? (
                    <ResultsMap key={`result-${round?.id ?? 'pending'}`} result={roundResult} />
                ) : location ? (
                    <StreetViewPanel key={`${location.lat},${location.lng}`} location={location} />
                ) : (
                    <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center text-neutral-500 text-sm">
                        Waiting for round to start...
                    </div>
                )}

                {/* Round scores between rounds */}
                {roundFinished && (roundScores.p1 !== null || roundScores.p2 !== null) && (() => {
                    const myScore = isPlayerOne ? roundScores.p1 : roundScores.p2;
                    const myColor = isPlayerOne ? 'text-blue-400' : 'text-red-400';
                    const myColorDim = isPlayerOne ? 'text-blue-400/60' : 'text-red-400/60';
                    const oppScore = isPlayerOne ? roundScores.p2 : roundScores.p1;
                    const oppColor = isPlayerOne ? 'text-red-400' : 'text-blue-400';
                    const oppColorDim = isPlayerOne ? 'text-red-400/60' : 'text-blue-400/60';
                    const oppName = isPlayerOne ? game.player_two.user.name : game.player_one.user.name;
                    return (
                        <>
                            <div className="absolute top-6 left-8 z-20 pointer-events-none rounded px-4 py-3 bg-black/50 backdrop-blur-sm">
                                <div className={`${myColor} text-6xl font-mono font-bold tabular-nums`}>
                                    {myScore?.toLocaleString() ?? '—'}
                                </div>
                                <div className={`${myColorDim} text-sm font-mono mt-1`}>You</div>
                            </div>
                            {countdown !== null && (
                                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none rounded px-4 py-3 bg-black/50 backdrop-blur-sm text-center">
                                    <div className="text-white text-6xl font-mono font-bold tabular-nums">{countdown}</div>
                                    <div className="text-white/40 text-sm font-mono mt-1">next round</div>
                                </div>
                            )}
                            <div className="absolute top-6 right-8 z-20 pointer-events-none text-right rounded px-4 py-3 bg-black/50 backdrop-blur-sm">
                                <div className={`${oppColor} text-6xl font-mono font-bold tabular-nums`}>
                                    {oppScore?.toLocaleString() ?? '—'}
                                </div>
                                <div className={`${oppColorDim} text-sm font-mono mt-1`}>{oppName}</div>
                            </div>
                        </>
                    );
                })()}

                {/* Bottom-left: event feed */}
                <div className={`absolute bottom-4 left-4 z-10 w-80 space-y-2 text-xs ${panel}`}>
                    {round && (
                        <>
                            <div className="flex justify-between opacity-70 text-xs">
                                <span>Round {round.round_number}</span>
                                <span>{stateLabel[gameState]}</span>
                            </div>
                            <div className="space-y-1">
                                <HealthBar
                                    name={game.player_one.user.name}
                                    health={health.p1}
                                    color="blue"
                                    isYou={player.id === game.player_one.id}
                                />
                                <HealthBar
                                    name={game.player_two.user.name}
                                    health={health.p2}
                                    color="red"
                                    isYou={player.id === game.player_two.id}
                                />
                            </div>
                            {events.length > 0 && <div className="border-t border-white/10" />}
                        </>
                    )}
                    {events.length === 0
                        ? <p className="opacity-30">no events yet</p>
                        : events.map(e => (
                            <div key={e.id}>
                                <div className="mb-0.5 flex gap-2 opacity-40">
                                    <span>{e.ts}</span>
                                    <span className="text-white/70">{e.name}</span>
                                </div>
                                <EventFields name={e.name} data={e.data} />
                            </div>
                        ))
                    }
                </div>

                {/* Bottom-right: guess map for current player */}
                {round && !roundFinished && (
                    <div
                        className={`absolute bottom-4 right-4 z-10 overflow-hidden rounded transition-all duration-150 ${mapHovered ? 'h-[70vh] w-[55vw]' : 'h-40 w-64'}`}
                        onMouseEnter={() => setMapHovered(true)}
                        onMouseLeave={() => setMapHovered(false)}
                    >
                        <MapPicker key={round.id} onPin={setPin} />
                        <div className="absolute bottom-2 left-2 right-2 font-mono">
                            <button
                                onClick={guess}
                                disabled={!pin || myLocked || gameOver}
                                className="w-full rounded bg-black/60 px-2 py-1 text-xs text-white backdrop-blur-sm disabled:opacity-30 enabled:hover:bg-black/80"
                            >
                                {myLocked ? 'Locked in ✓' : pin ? 'Lock in guess [space]' : 'Click map to place pin'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
