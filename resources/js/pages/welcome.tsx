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

function HealthBar({ name, health }: { name: string; health: number }) {
    const filled = Math.round(Math.max(0, Math.min(5000, health)) / 250);
    const empty = 20 - filled;
    return (
        <div className="flex gap-3">
            <span className="w-28 truncate">{name}</span>
            <span>{'█'.repeat(filled)}{'░'.repeat(empty)}</span>
            <span className="w-12 text-right">{health}hp</span>
        </div>
    );
}

function EventFields({ name, data }: { name: GameEvent['name']; data: Record<string, unknown> }) {
    const row = (label: string, value: unknown) => (
        <div key={label} className="flex">
            <span className="w-32 opacity-50">{label}</span>
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

    return <div className="border-l-2 border-neutral-500 pl-3">{common}{extra}</div>;
}

type LatLng = { lat: number; lng: number };

setOptions({
    key: import.meta.env.VITE_GOOGLE_MAPS_KEY as string,
    v: 'weekly',
});

function MapPicker({ onPin }: { onPin: (coords: LatLng) => void }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const markerRef = useRef<google.maps.Marker | null>(null);

    useEffect(() => {
        let map: google.maps.Map;
        let cancelled = false;

        async function init() {
            await importLibrary('maps');
            await importLibrary('marker');
            if (cancelled || !containerRef.current) return;
            map = new google.maps.Map(containerRef.current, {
                center: { lat: 20, lng: 0 },
                zoom: 1,
                disableDefaultUI: true,
                clickableIcons: false,
            });
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
        }

        init().catch((err) => {
            console.error('Failed to load Google Maps', err);
        });

        return () => {
            cancelled = true;
        };
    }, []);

    return <div ref={containerRef} className="h-40 w-64 rounded border border-neutral-600" />;
}

function StreetViewPanel({ location }: { location: Location }) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let cancelled = false;

        async function init() {
            await importLibrary('maps');
            if (cancelled || !containerRef.current) return;
            new google.maps.StreetViewPanorama(containerRef.current, {
                position: { lat: location.lat, lng: location.lng },
                pov: { heading: location.heading, pitch: 0 },
                disableDefaultUI: true,
                clickToGo: false,
                disableDoubleClickZoom: true,
                scrollwheel: false,
                showRoadLabels: false,
                motionTracking: false,
                motionTrackingControl: false,
            });
        }

        init().catch(console.error);

        return () => { cancelled = true; };
    }, []);

    return <div ref={containerRef} className="h-96 grow rounded" />;
}

function getCsrfToken() {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

function deriveGameState(round: Round, gameOver: boolean): GameState {
    if (gameOver) return 'game_over';
    if (round.player_one_locked_in && round.player_two_locked_in) return 'finished';
    if (round.player_one_locked_in || round.player_two_locked_in) return 'one_guessed';
    return 'waiting';
}

let eventSeq = 0;

export default function Welcome({ game }: { game: Game }) {
    const [round, setRound] = useState<Round | null>(null);
    const [location, setLocation] = useState<Location | null>(null);
    const [health, setHealth] = useState({ p1: game.player_one_health, p2: game.player_two_health });
    const [gameOver, setGameOver] = useState(false);
    const [events, setEvents] = useState<GameEvent[]>([]);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [p1Pin, setP1Pin] = useState<LatLng | null>(null);
    const [p2Pin, setP2Pin] = useState<LatLng | null>(null);

    const gameState = round ? deriveGameState(round, gameOver) : 'waiting';

    function pushEvent(name: GameEvent['name'], data: Record<string, unknown>) {
        setEvents((prev) => [
            { id: eventSeq++, name, ts: new Date().toISOString().substring(11, 23), data },
            ...prev.slice(0, MAX_EVENTS - 1),
        ]);
    }

    useEffect(() => {
        if (countdown === null || countdown <= 0) return;
        const t = setTimeout(() => setCountdown((c) => (c ?? 1) - 1), 1000);
        return () => clearTimeout(t);
    }, [countdown]);

    useEffect(() => {
        const channel = echo.channel(`game.${game.id}`);

        channel.listen('.PlayerGuessed', (data: Record<string, unknown>) => {
            pushEvent('PlayerGuessed', data);
        });

        channel.listen('.RoundFinished', (data: Record<string, unknown>) => {
            pushEvent('RoundFinished', data);
            setCountdown(3);
        });

        channel.listen('.RoundStarted', (data: Record<string, unknown>) => {
            pushEvent('RoundStarted', data);
            setCountdown(null);
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
            setP1Pin(null);
            setP2Pin(null);
        });

        channel.listen('.GameFinished', (data: Record<string, unknown>) => {
            pushEvent('GameFinished', data);
            setCountdown(null);
            setHealth({ p1: data.player_one_health as number, p2: data.player_two_health as number });
            setGameOver(true);
        });

        return () => {
            echo.leaveChannel(`game.${game.id}`);
        };
    }, [game.id]);

    async function guess(player: Player, pin: LatLng | null) {
        if (!pin || !round) return;
        const { lat, lng } = pin;
        const url = `/players/${player.id}/games/${game.id}/rounds/${round.id}/guess`;

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-XSRF-TOKEN': getCsrfToken(),
            },
            body: JSON.stringify({ lat, lng }),
        });

        if (res.ok) {
            setRound(await res.json());
        }
    }

    const stateLabel: Record<GameState, string> = {
        waiting: 'Waiting for guesses',
        one_guessed: 'Waiting for second player',
        finished: countdown !== null ? `Round finished — next round in ${countdown}s` : 'Round finished',
        game_over: 'Game over',
    };

    return (
        <>
            <Head title="Test UI" />
            <div className="flex gap-12 p-8 font-mono">
                <div className="w-64 shrink-0">
                    {!round || !location ? (
                        <p className="opacity-60">Waiting for round to start...</p>
                    ) : (
                        <>
                            <p className="mb-4">Round {round.round_number}</p>

                            <div className="mb-4 space-y-1 text-sm">
                                <HealthBar name={game.player_one.user.name} health={health.p1} />
                                <HealthBar name={game.player_two.user.name} health={health.p2} />
                            </div>

                            <div className="mb-6 space-y-4">
                                <div className="space-y-2">
                                    <MapPicker onPin={setP1Pin} />
                                    <button
                                        onClick={() => guess(game.player_one, p1Pin)}
                                        disabled={!p1Pin || round.player_one_locked_in || gameOver}
                                    >
                                        {game.player_one.user.name}
                                        {round.player_one_locked_in ? ' ✓' : ''}
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    <MapPicker onPin={setP2Pin} />
                                    <button
                                        onClick={() => guess(game.player_two, p2Pin)}
                                        disabled={!p2Pin || round.player_two_locked_in || gameOver}
                                    >
                                        {game.player_two.user.name}
                                        {round.player_two_locked_in ? ' ✓' : ''}
                                    </button>
                                </div>
                            </div>

                            <p className="opacity-60">{stateLabel[gameState]}</p>
                        </>
                    )}
                </div>

                <div className="w-112 shrink-0">
                    <p className="mb-2">Events</p>
                    {events.length === 0 && (
                        <p className="text-sm opacity-40">none yet</p>
                    )}
                    {events.map((e) => (
                        <div key={e.id} className="mb-4 text-sm">
                            <div className="mb-1">
                                <span className="inline-block w-32 opacity-50">{e.ts}</span>
                                <strong>{e.name}</strong>
                            </div>
                            <EventFields name={e.name} data={e.data} />
                        </div>
                    ))}
                </div>

                {location && (
                    <StreetViewPanel key={`${location.lat},${location.lng}`} location={location} />
                )}
            </div>
        </>
    );
}
