import { Head } from '@inertiajs/react';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { useEffect, useRef, useState } from 'react';
import echo from '@/echo';

type Player = { id: string; user: { name: string } };
type Round = { id: string; round_number: number; player_one_locked_in: boolean; player_two_locked_in: boolean };
type Location = { lat: number; lng: number; heading: number };
type Game = { id: string; player_one: Player; player_two: Player; player_one_health: number; player_two_health: number };

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

    return <div ref={containerRef} className="h-full w-full" />;
}

// --- Health bar ---

function HealthBar({ name, health }: { name: string; health: number }) {
    const filled = Math.round(Math.max(0, Math.min(5000, health)) / 250);
    const empty = 20 - filled;
    return (
        <div className="flex gap-2 text-xs">
            <span className="w-20 truncate opacity-60">{name}</span>
            <span>{'█'.repeat(filled)}{'░'.repeat(empty)}</span>
            <span className="w-12 text-right opacity-60">{health}hp</span>
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
        });

        channel.listen('.RoundFinished', (data: Record<string, unknown>) => {
            pushEvent('RoundFinished', data);
            setRoundFinished(true);
            setCountdown(3);
        });

        channel.listen('.RoundStarted', (data: Record<string, unknown>) => {
            pushEvent('RoundStarted', data);
            setCountdown(null);
            setRoundFinished(false);
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

                {/* Panorama or loading state */}
                {location
                    ? <StreetViewPanel key={`${location.lat},${location.lng}`} location={location} />
                    : <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center text-neutral-500 text-sm">
                        Waiting for round to start...
                      </div>
                }

                {/* Bottom-left: event feed */}
                <div className={`absolute bottom-4 left-4 z-10 w-80 space-y-2 text-xs ${panel}`}>
                    {round && (
                        <>
                            <div className="flex justify-between opacity-70 text-xs">
                                <span>Round {round.round_number}</span>
                                <span>{stateLabel[gameState]}</span>
                            </div>
                            <div className="space-y-1">
                                <HealthBar name={game.player_one.user.name} health={health.p1} />
                                <HealthBar name={game.player_two.user.name} health={health.p2} />
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
                {round && (
                    <div
                        className={`absolute bottom-4 right-4 z-10 overflow-hidden rounded transition-all duration-300 ${mapHovered ? 'h-[70vh] w-[55vw]' : 'h-40 w-64'}`}
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
