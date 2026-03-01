import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type {
    Game,
    GameEvent,
    GameFinishedData,
    GameMessageData,
    GameReactionData,
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
} from '@/types/game';
import type { Message } from '@/types/shared';
import { roundRemainingSeconds } from '@/hooks/useRoundState';
import type { SoundName } from '@/hooks/useSoundEffects';
import {
    HEALTH_DEDUCT_DELAY_MS,
    MAX_EVENTS,
    MAX_MESSAGES,
    NEXT_ROUND_COUNTDOWN,
    URGENT_COUNTDOWN_THRESHOLD,
} from '@/lib/game-constants';

export function pushEvent(
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

export function handlePlayerGuessed(
    data: PlayerGuessedData,
    seqRef: MutableRefObject<number>,
    setEvents: Dispatch<SetStateAction<GameEvent[]>>,
    setRound: Dispatch<SetStateAction<Round | null>>,
    setUrgentCountdown: Dispatch<SetStateAction<number | null>>,
    roundStartedAtRef: MutableRefObject<Date | null>,
    playerId: string,
    playSound: (name: SoundName) => void,
) {
    pushEvent(seqRef, setEvents, 'PlayerGuessed', data);
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
        const remaining = roundRemainingSeconds(roundStartedAtRef.current);
        setUrgentCountdown(
            remaining === null ? URGENT_COUNTDOWN_THRESHOLD : Math.min(remaining, URGENT_COUNTDOWN_THRESHOLD),
        );
    }
}

export function handleRoundFinished(
    data: RoundFinishedData,
    seqRef: MutableRefObject<number>,
    setEvents: Dispatch<SetStateAction<GameEvent[]>>,
    setRoundFinished: Dispatch<SetStateAction<boolean>>,
    setOpponentLiveGuess: Dispatch<SetStateAction<{ lat: number; lng: number } | null>>,
    setUrgentCountdown: Dispatch<SetStateAction<number | null>>,
    setCountdown: Dispatch<SetStateAction<number | null>>,
    setRoundScores: Dispatch<SetStateAction<{ p1: number | null; p2: number | null }>>,
    setRoundDistances: Dispatch<SetStateAction<{ p1: number | null; p2: number | null }>>,
    setHealth: Dispatch<SetStateAction<{ p1: number; p2: number }>>,
    setRoundResult: Dispatch<SetStateAction<RoundResult | null>>,
    playSound: (name: SoundName) => void,
) {
    pushEvent(seqRef, setEvents, 'RoundFinished', data);
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
            if (p1Score < p2Score) return { p1: prev.p1 - damage, p2: prev.p2 };
            if (p2Score < p1Score) return { p1: prev.p1, p2: prev.p2 - damage };
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
            data.player_one_guess_lat != null && data.player_one_guess_lng != null
                ? { lat: Number(data.player_one_guess_lat), lng: Number(data.player_one_guess_lng) }
                : null,
        p2Guess:
            data.player_two_guess_lat != null && data.player_two_guess_lng != null
                ? { lat: Number(data.player_two_guess_lat), lng: Number(data.player_two_guess_lng) }
                : null,
    });
}

export function handleRoundStarted(
    data: RoundData,
    seqRef: MutableRefObject<number>,
    setEvents: Dispatch<SetStateAction<GameEvent[]>>,
    setWins: Dispatch<SetStateAction<{ p1: number; p2: number }>>,
    setPendingRoundData: Dispatch<SetStateAction<RoundData | null>>,
) {
    pushEvent(seqRef, setEvents, 'RoundStarted', data);
    if (data.player_one_wins !== undefined && data.player_two_wins !== undefined) {
        setWins({ p1: data.player_one_wins, p2: data.player_two_wins });
    }
    setPendingRoundData(data);
}

export function handleGameMessage(
    data: GameMessageData,
    seqRef: MutableRefObject<number>,
    setEvents: Dispatch<SetStateAction<GameEvent[]>>,
    setMessages: Dispatch<SetStateAction<Message[]>>,
) {
    pushEvent(seqRef, setEvents, 'GameMessage', data);
    setMessages((prev) =>
        [
            ...prev,
            {
                id: seqRef.current++,
                name: data.player_name ?? 'Player',
                text: data.message ?? '',
                ts: new Date().toISOString().substring(11, 19),
            },
        ].slice(-MAX_MESSAGES),
    );
}

export function handleGameFinished(
    data: GameFinishedData,
    game: Game,
    seqRef: MutableRefObject<number>,
    setEvents: Dispatch<SetStateAction<GameEvent[]>>,
    setCountdown: Dispatch<SetStateAction<number | null>>,
    setUrgentCountdown: Dispatch<SetStateAction<number | null>>,
    roundStartedAtRef: MutableRefObject<Date | null>,
    setHealth: Dispatch<SetStateAction<{ p1: number; p2: number }>>,
    setGameOver: Dispatch<SetStateAction<boolean>>,
    setRatingChange: Dispatch<SetStateAction<{ my: number | null; opponent: number | null }>>,
    setWinnerId: (id: string | null) => void,
    setWinnerName: (name: string | null) => void,
    playerId: string,
    playSound: (name: SoundName) => void,
    scheduleEndSequence: () => void,
) {
    pushEvent(seqRef, setEvents, 'GameFinished', data);
    setCountdown(null);
    setUrgentCountdown(null);
    roundStartedAtRef.current = null;
    setHealth({ p1: data.player_one_health, p2: data.player_two_health });
    setGameOver(true);

    const isP1 = playerId === game.player_one.id;
    setRatingChange({
        my: isP1 ? data.player_one_rating_change : data.player_two_rating_change,
        opponent: isP1 ? data.player_two_rating_change : data.player_one_rating_change,
    });

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
    scheduleEndSequence();
}

export function handleOpponentGuessUpdate(
    data: OpponentGuessUpdateData,
    playerId: string,
    setOpponentLiveGuess: Dispatch<SetStateAction<{ lat: number; lng: number } | null>>,
) {
    if (data.player_id !== playerId) {
        setOpponentLiveGuess({ lat: data.lat, lng: data.lng });
    }
}

export function handleRematchRequested(
    data: RematchRequestedData,
    playerId: string,
    setRematchState: Dispatch<SetStateAction<RematchState>>,
) {
    if (data.player_id !== playerId) {
        setRematchState('received');
    }
}

export function handleRematchAccepted(
    data: RematchAcceptedData,
    clearEndSequenceTimers: () => void,
    setRematchState: Dispatch<SetStateAction<RematchState>>,
    setPostGameButtonsVisible: (v: boolean) => void,
    setWinnerOverlayVisible: (v: boolean) => void,
    setPageVisible: (v: boolean) => void,
    setBlackoutVisible: (v: boolean) => void,
    resetGameState: () => void,
    setGame: (game: Game) => void,
    setHealth: Dispatch<SetStateAction<{ p1: number; p2: number }>>,
) {
    clearEndSequenceTimers();
    setRematchState('none');
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
}

export function handleRematchDeclined(
    data: RematchDeclinedData,
    playerId: string,
    setRematchState: Dispatch<SetStateAction<RematchState>>,
) {
    if (data.player_id !== playerId) {
        setRematchState('declined');
    }
}

export function handleGameReaction(
    data: GameReactionData,
    seqRef: MutableRefObject<number>,
    setEvents: Dispatch<SetStateAction<GameEvent[]>>,
    onReaction: (data: GameReactionData) => void,
) {
    pushEvent(seqRef, setEvents, 'GameReaction', data);
    onReaction(data);
}
