import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import echo from '@/echo';

type Player = { id: string; user: { name: string } };
type Round = { id: string; round_number: number; player_one_locked_in: boolean; player_two_locked_in: boolean };
type Game = { id: string; player_one: Player; player_two: Player };

type GameState = 'waiting' | 'one_guessed' | 'finished';

type GameEvent = {
    id: number;
    name: 'PlayerGuessed' | 'RoundFinished' | 'RoundStarted';
    ts: string;
    data: Record<string, unknown>;
};

const MAX_EVENTS = 5;

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

function deriveGameState(round: Round): GameState {
    if (round.player_one_locked_in && round.player_two_locked_in) return 'finished';
    if (round.player_one_locked_in || round.player_two_locked_in) return 'one_guessed';
    return 'waiting';
}

let eventSeq = 0;

export default function Welcome({ game, round: initial }: { game: Game; round: Round }) {
    const [round, setRound] = useState(initial);
    const [events, setEvents] = useState<GameEvent[]>([]);
    const [countdown, setCountdown] = useState<number | null>(null);

    const gameState = deriveGameState(round);

    function pushEvent(name: GameEvent['name'], data: Record<string, unknown>) {
        setEvents((prev) => [
            { id: eventSeq++, name, ts: new Date().toISOString().substring(11, 23), data },
            ...prev.slice(0, MAX_EVENTS - 1),
        ]);
    }

    // Tick the countdown down every second.
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
            setRound((prev) => ({
                ...prev,
                id: data.round_id as string,
                round_number: data.round_number as number,
                player_one_locked_in: false,
                player_two_locked_in: false,
            }));
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
        finished: `Round finished — next round in ${countdown ?? 3}s`,
    };

    return (
        <>
            <Head title="Test UI" />
            <div style={{ padding: '2rem', fontFamily: 'monospace', display: 'flex', gap: '3rem' }}>
                <div>
                    <p>Round {round.round_number}</p>

                    <div style={{ display: 'flex', gap: '1rem', margin: '1rem 0' }}>
                        <button
                            onClick={() => guess(game.player_one)}
                            disabled={round.player_one_locked_in}
                        >
                            {game.player_one.user.name}
                            {round.player_one_locked_in ? ' ✓' : ''}
                        </button>

                        <button
                            onClick={() => guess(game.player_two)}
                            disabled={round.player_two_locked_in}
                        >
                            {game.player_two.user.name}
                            {round.player_two_locked_in ? ' ✓' : ''}
                        </button>
                    </div>

                    <p style={{ opacity: 0.6 }}>{stateLabel[gameState]}</p>
                </div>

                <div style={{ flex: 1 }}>
                    <p style={{ marginBottom: '0.5rem' }}>Events</p>
                    {events.length === 0 && (
                        <p style={{ opacity: 0.4, fontSize: '0.85rem' }}>none yet</p>
                    )}
                    {events.map((e) => (
                        <div key={e.id} style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                            <span style={{ opacity: 0.5 }}>{e.ts}</span>{' '}
                            <strong>{e.name}</strong>{' '}
                            <span style={{ opacity: 0.7 }}>{JSON.stringify(e.data)}</span>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
