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
    RematchAcceptedData,
    RematchDeclinedData,
    RematchRequestedData,
    OpponentGuessUpdateData,
    RematchState,
    Round,
    RoundData,
    RoundFinishedData,
    RoundResult,
} from '@/components/welcome/types';
import echo from '@/echo';
import type { SoundName } from '@/hooks/useSoundEffects';

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
    setGame: (game: Game) => void;
    setRound: Dispatch<SetStateAction<Round | null>>;
    setRoundFinished: Dispatch<SetStateAction<boolean>>;
    setCountdown: Dispatch<SetStateAction<number | null>>;
    setUrgentCountdown: Dispatch<SetStateAction<number | null>>;
    setRoundScores: Dispatch<
        SetStateAction<{ p1: number | null; p2: number | null }>
    >;
    setRoundDistances: Dispatch<
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
    setRematchState: Dispatch<SetStateAction<RematchState>>;
    scheduleEndSequence: (resetGame: () => void) => void;
    dismissEndSequence: (resetGame: () => void) => void;
    clearEndSequenceTimers: () => void;
    resetGameState: () => void;
    setOpponentLiveGuess: Dispatch<SetStateAction<{ lat: number; lng: number } | null>>;
    playerId: string;
    playSound: (name: SoundName) => void;
};

export function useGameChannel(deps: GameChannelDeps) {
    const {
        game,
        setGame,
        setRound,
        setRoundFinished,
        setCountdown,
        setUrgentCountdown,
        setRoundScores,
        setRoundDistances,
        setHealth,
        setRoundResult,
        setPendingRoundData,
        setEvents,
        setMessages,
        setGameOver,
        setWinnerId,
        setWinnerName,
        setRematchState,
        scheduleEndSequence,
        dismissEndSequence,
        clearEndSequenceTimers,
        setOpponentLiveGuess,
        resetGameState,
        playerId,
        playSound,
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
                if (data.player_id !== playerId) {
                    playSound('opponent-locked');
                }
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
                playSound('round-end');
                setRoundFinished(true);
                setOpponentLiveGuess(null);
                setUrgentCountdown(null);
                setCountdown(6);
                const p1Score = data.player_one_score ?? 0;
                const p2Score = data.player_two_score ?? 0;
                setRoundScores({ p1: p1Score, p2: p2Score });
                setRoundDistances({
                    p1: data.player_one_distance_km ?? null,
                    p2: data.player_two_distance_km ?? null,
                });
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
                playSound(wId === playerId ? 'win-jingle' : 'lose-sound');

                scheduleEndSequence(resetGameState);
            },
        );

        channel.listen(
            '.OpponentGuessUpdate',
            (data: OpponentGuessUpdateData) => {
                if (data.player_id !== playerId) {
                    setOpponentLiveGuess({ lat: data.lat, lng: data.lng });
                }
            },
        );

        channel.listen(
            '.RematchRequested',
            (data: RematchRequestedData) => {
                if (data.player_id !== playerId) {
                    setRematchState('received');
                }
            },
        );

        channel.listen(
            '.RematchAccepted',
            (data: RematchAcceptedData) => {
                clearEndSequenceTimers();
                setRematchState('none');
                dismissEndSequence(() => {
                    resetGameState();
                    setGame(data.new_game);
                    setHealth({
                        p1: data.new_game.player_one_health,
                        p2: data.new_game.player_two_health,
                    });
                });
            },
        );

        channel.listen(
            '.RematchDeclined',
            (data: RematchDeclinedData) => {
                if (data.player_id !== playerId) {
                    setRematchState('declined');
                }
            },
        );

        return () => {
            clearEndSequenceTimers();
            echo.leaveChannel(`game.${game.id}`);
        };
    }, [game?.id]);

    return { roundStartedAtRef };
}
