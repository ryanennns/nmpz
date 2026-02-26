import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import echo from '@/echo';

type Player = { id: string; user: { name: string } };
type Round = { id: string; round_number: number; player_one_locked_in: boolean; player_two_locked_in: boolean };
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

function getCsrfToken() {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

function randomCoords() {
    return {
        lat: +(Math.random() * 180 - 90).toFixed(6),
        lng: +(Math.random() * 360 - 180).toFixed(6),
    };
}

function deriveGameState(round: Round, gameOver: boolean): GameState {
    if (gameOver) return 'game_over';
    if (round.player_one_locked_in && round.player_two_locked_in) return 'finished';
    if (round.player_one_locked_in || round.player_two_locked_in) return 'one_guessed';
    return 'waiting';
}

let eventSeq = 0;

export default function Welcome({ game, round: initial }: { game: Game; round: Round }) {
    const [round, setRound] = useState(initial);
    const [health, setHealth] = useState({ p1: game.player_one_health, p2: game.player_two_health });
    const [gameOver, setGameOver] = useState(false);
    const [events, setEvents] = useState<GameEvent[]>([]);
    const [countdown, setCountdown] = useState<number | null>(null);

    const gameState = deriveGameState(round, gameOver);

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
            setRound((prev) => ({
                ...prev,
                id: data.round_id as string,
                round_number: data.round_number as number,
                player_one_locked_in: false,
                player_two_locked_in: false,
            }));
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

    async function guess(player: Player) {
        const { lat, lng } = randomCoords();
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
                    <p className="mb-4">Round {round.round_number}</p>

                    <div className="mb-4 space-y-1 text-sm">
                        <HealthBar name={game.player_one.user.name} health={health.p1} />
                        <HealthBar name={game.player_two.user.name} health={health.p2} />
                    </div>

                    <div className="mb-4 flex gap-4">
                        <button
                            onClick={() => guess(game.player_one)}
                            disabled={round.player_one_locked_in || gameOver}
                        >
                            {game.player_one.user.name}
                            {round.player_one_locked_in ? ' ✓' : ''}
                        </button>

                        <button
                            onClick={() => guess(game.player_two)}
                            disabled={round.player_two_locked_in || gameOver}
                        >
                            {game.player_two.user.name}
                            {round.player_two_locked_in ? ' ✓' : ''}
                        </button>
                    </div>

                    <p className="opacity-60">{stateLabel[gameState]}</p>
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
            </div>
        </>
    );
}
