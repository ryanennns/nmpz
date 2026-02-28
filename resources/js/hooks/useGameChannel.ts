import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useEffect, useRef } from 'react';
import type {
    Game,
    GameEvent,
    GameFinishedData,
    GameMessageData,
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
import { roundRemainingSeconds } from '@/hooks/useRoundState';
import type { SoundName } from '@/hooks/useSoundEffects';
import {
    HEALTH_DEDUCT_DELAY_MS,
    MAX_EVENTS,
    MAX_MESSAGES,
    NEXT_ROUND_COUNTDOWN,
    URGENT_COUNTDOWN_THRESHOLD,
} from '@/lib/game-constants';

function pushEvent(
    seqRef: MutableRefObject<number>,
    setEvents: Dispatch<SetStateAction<GameEvent[]>>,
    name: GameEvent['name'],
    data: unknown,
) {
    setEvents((prev) => [
        {
            id: seqRef.current++,
            name,
            ts: new Date().toISOString().substring(11, 23),
            data,
        },
        ...prev.slice(0, MAX_EVENTS - 1),
    ]);
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
    setRematchState: Dispatch<SetStateAction<RematchState>>;
    setOpponentLiveGuess: Dispatch<SetStateAction<{ lat: number; lng: number } | null>>;
    setRatingChange: Dispatch<SetStateAction<{ my: number | null; opponent: number | null }>>;
    setPostGameButtonsVisible: (v: boolean) => void;
    setWinnerOverlayVisible: (v: boolean) => void;
    setPageVisible: (v: boolean) => void;
    setBlackoutVisible: (v: boolean) => void;
    scheduleEndSequence: () => void;
    clearEndSequenceTimers: () => void;
    resetGameState: () => void;
    roundStartedAtRef: MutableRefObject<Date | null>;
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
        setOpponentLiveGuess,
        setRatingChange,
        setPostGameButtonsVisible,
        setWinnerOverlayVisible,
        setPageVisible,
        setBlackoutVisible,
        scheduleEndSequence,
        clearEndSequenceTimers,
        resetGameState,
        roundStartedAtRef,
        playerId,
        playSound,
    } = deps;

    const eventSeqRef = useRef(0);

    useEffect(() => {
        if (!game) return;

        const channel = echo.channel(`game.${game.id}`);

        channel.listen(
            '.PlayerGuessed',
            (data: PlayerGuessedData) => {
                pushEvent(eventSeqRef, setEvents,'PlayerGuessed', data);
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
                        remaining === null ? URGENT_COUNTDOWN_THRESHOLD : Math.min(remaining, URGENT_COUNTDOWN_THRESHOLD),
                    );
                }
            },
        );

        channel.listen(
            '.RoundFinished',
            (data: RoundFinishedData) => {
                pushEvent(eventSeqRef, setEvents,'RoundFinished', data);
                playSound('round-end');
                setRoundFinished(true);
                setOpponentLiveGuess(null);
                setUrgentCountdown(null);
                setCountdown(NEXT_ROUND_COUNTDOWN);
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
                pushEvent(eventSeqRef, setEvents,'RoundStarted', data);
                setPendingRoundData(data);
            },
        );

        channel.listen(
            '.GameMessage',
            (data: GameMessageData) => {
                pushEvent(eventSeqRef, setEvents,'GameMessage', data);
                setMessages((prev) =>
                    [
                        ...prev,
                        {
                            id: eventSeqRef.current++,
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
                pushEvent(eventSeqRef, setEvents,'GameFinished', data);
                setCountdown(null);
                setUrgentCountdown(null);
                roundStartedAtRef.current = null;
                setHealth({
                    p1: data.player_one_health,
                    p2: data.player_two_health,
                });
                setGameOver(true);

                // Capture ELO rating changes
                const isP1 = playerId === game.player_one.id;
                setRatingChange({
                    my: isP1 ? data.player_one_rating_change : data.player_two_rating_change,
                    opponent: isP1 ? data.player_two_rating_change : data.player_one_rating_change,
                });

                const wId = data.winner_id;
                const name =
                    wId === game.player_one.id
                        ? game.player_one.user.name
                        : wId === game.player_two.id
                          ? game.player_two.user.name
                          : null;
                setWinnerName(name);
                playSound(wId === playerId ? 'win-jingle' : 'lose-sound');

                scheduleEndSequence();
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
                // Skip the full dismiss animation — directly swap to new game
                // to avoid tearing down the channel and missing RoundStarted
                setPostGameButtonsVisible(false);
                setWinnerOverlayVisible(false);
                setPageVisible(false);
                window.setTimeout(() => {
                    resetGameState();
                    setGame(data.new_game);
                    setHealth({
                        p1: data.new_game.player_one_health,
                        p2: data.new_game.player_two_health,
                    });
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            setPageVisible(true);
                            setBlackoutVisible(false);
                        });
                    });
                }, 500);
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

}

