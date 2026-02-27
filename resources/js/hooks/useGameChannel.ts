import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useRef } from 'react';
import type {
    Game,
    GameEvent,
    GameFinishedData,
    GameMessageData,
    Location,
    Message,
    PlayerGuessedData,
    Round,
    RoundData,
    RoundFinishedData,
    RoundResult,
} from '@/components/welcome/types';
import echo from '@/echo';

const MAX_EVENTS = 5;
const MAX_MESSAGES = 6;
const HEALTH_DEDUCT_DELAY_MS = 1800;

let eventSeq = 0;

function pushEvent(
    setEvents: Dispatch<SetStateAction<GameEvent[]>>,
    name: GameEvent['name'],
    data: Record<string, unknown>,
) {
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

function roundRemainingSeconds(startedAt: Date | null) {
    if (!startedAt || Number.isNaN(startedAt.getTime())) return null;
    const elapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000);
    return Math.max(0, 60 - elapsed);
}

type GameChannelDeps = {
    game: Game | null;
    setRound: Dispatch<SetStateAction<Round | null>>;
    setRoundFinished: Dispatch<SetStateAction<boolean>>;
    setCountdown: Dispatch<SetStateAction<number | null>>;
    setUrgentCountdown: Dispatch<SetStateAction<number | null>>;
    setRoundScores: Dispatch<
        SetStateAction<{ p1: number | null; p2: number | null }>
    >;
    setHealth: Dispatch<SetStateAction<{ p1: number; p2: number }>>;
    setRoundResult: Dispatch<SetStateAction<RoundResult | null>>;
    setPendingRoundData: Dispatch<SetStateAction<RoundData | null>>;
    setEvents: Dispatch<SetStateAction<GameEvent[]>>;
    setMessages: Dispatch<SetStateAction<Message[]>>;
    setGameOver: Dispatch<SetStateAction<boolean>>;
    setWinnerId: (id: string | null) => void;
    setWinnerName: (name: string | null) => void;
    setLocation: Dispatch<SetStateAction<Location | null>>;
    setHeading: Dispatch<SetStateAction<number | null>>;
    scheduleEndSequence: (resetGame: () => void) => void;
    clearEndSequenceTimers: () => void;
    resetGameState: () => void;
};

export function useGameChannel(deps: GameChannelDeps) {
    const {
        game,
        setRound,
        setRoundFinished,
        setCountdown,
        setUrgentCountdown,
        setRoundScores,
        setHealth,
        setRoundResult,
        setPendingRoundData,
        setEvents,
        setMessages,
        setGameOver,
        setWinnerId,
        setWinnerName,
        scheduleEndSequence,
        clearEndSequenceTimers,
        resetGameState,
    } = deps;

    const roundStartedAtRef = useRef<Date | null>(null);

    useEffect(() => {
        if (!game) return;

        const channel = echo.channel(`game.${game.id}`);

        channel.listen(
            '.PlayerGuessed',
            (data: PlayerGuessedData) => {
                pushEvent(setEvents, 'PlayerGuessed', data as unknown as Record<string, unknown>);
                setRound((prev) =>
                    prev
                        ? {
                              ...prev,
                              player_one_locked_in: data.player_one_locked_in,
                              player_two_locked_in: data.player_two_locked_in,
                          }
                        : null,
                );
                if (data.player_one_locked_in !== data.player_two_locked_in) {
                    const remaining = roundRemainingSeconds(
                        roundStartedAtRef.current,
                    );
                    setUrgentCountdown(
                        remaining === null ? 15 : Math.min(remaining, 15),
                    );
                }
            },
        );

        channel.listen(
            '.RoundFinished',
            (data: RoundFinishedData) => {
                pushEvent(setEvents, 'RoundFinished', data as unknown as Record<string, unknown>);
                setRoundFinished(true);
                setUrgentCountdown(null);
                setCountdown(6);
                const p1Score = data.player_one_score ?? 0;
                const p2Score = data.player_two_score ?? 0;
                setRoundScores({ p1: p1Score, p2: p2Score });
                const damage = Math.abs(p1Score - p2Score);
                window.setTimeout(() => {
                    setHealth((prev) => {
                        if (p1Score < p2Score)
                            return { p1: prev.p1 - damage, p2: prev.p2 };
                        if (p2Score < p1Score)
                            return { p1: prev.p1, p2: prev.p2 - damage };
                        return prev;
                    });
                }, HEALTH_DEDUCT_DELAY_MS);
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
            },
        );

        channel.listen(
            '.RoundStarted',
            (data: RoundData) => {
                pushEvent(setEvents, 'RoundStarted', data as unknown as Record<string, unknown>);
                setPendingRoundData(data);
            },
        );

        channel.listen(
            '.GameMessage',
            (data: GameMessageData) => {
                pushEvent(setEvents, 'GameMessage', data as unknown as Record<string, unknown>);
                setMessages((prev) =>
                    [
                        ...prev,
                        {
                            id: eventSeq++,
                            name: data.player_name ?? 'Player',
                            text: data.message ?? '',
                            ts: new Date().toISOString().substring(11, 19),
                        },
                    ].slice(-MAX_MESSAGES),
                );
            },
        );

        channel.listen(
            '.GameFinished',
            (data: GameFinishedData) => {
                pushEvent(setEvents, 'GameFinished', data as unknown as Record<string, unknown>);
                setCountdown(null);
                setUrgentCountdown(null);
                roundStartedAtRef.current = null;
                setHealth({
                    p1: data.player_one_health,
                    p2: data.player_two_health,
                });
                setGameOver(true);

                const wId = data.winner_id;
                setWinnerId(wId);
                const name =
                    wId === game.player_one.id
                        ? game.player_one.user.name
                        : wId === game.player_two.id
                          ? game.player_two.user.name
                          : null;
                setWinnerName(name);

                scheduleEndSequence(resetGameState);
            },
        );

        return () => {
            clearEndSequenceTimers();
            echo.leaveChannel(`game.${game.id}`);
        };
    }, [game?.id]);

    return { roundStartedAtRef };
}
