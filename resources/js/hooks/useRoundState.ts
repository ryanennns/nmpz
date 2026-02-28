import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
    GameState,
    LatLng,
    Location,
    Round,
    RoundData,
    RoundResult,
} from '@/components/welcome/types';
import { MAX_HEALTH, ROUND_TIMEOUT_SECONDS } from '@/lib/game-constants';

export function roundRemainingSeconds(startedAt: Date | null) {
    if (!startedAt || Number.isNaN(startedAt.getTime())) return null;
    const elapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000);
    return Math.max(0, ROUND_TIMEOUT_SECONDS - elapsed);
}

export function deriveGameState(
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

export function useRoundState(deps: {
    countdown: number | null;
    setCountdown: Dispatch<SetStateAction<number | null>>;
    setUrgentCountdown: Dispatch<SetStateAction<number | null>>;
    setHealth: Dispatch<SetStateAction<{ p1: number; p2: number }>>;
}) {
    const { countdown, setCountdown, setUrgentCountdown, setHealth } = deps;
    const roundStartedAtRef = useRef<Date | null>(null);

    const [round, setRound] = useState<Round | null>(null);
    const [location, setLocation] = useState<Location | null>(null);
    const [heading, setHeading] = useState<number | null>(null);
    const [pin, setPin] = useState<LatLng | null>(null);
    const [roundFinished, setRoundFinished] = useState(false);
    const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
    const [roundScores, setRoundScores] = useState<{
        p1: number | null;
        p2: number | null;
    }>({ p1: null, p2: null });
    const [roundDistances, setRoundDistances] = useState<{
        p1: number | null;
        p2: number | null;
    }>({ p1: null, p2: null });
    const [pendingRoundData, setPendingRoundData] = useState<RoundData | null>(
        null,
    );
    const [opponentLiveGuess, setOpponentLiveGuess] = useState<{ lat: number; lng: number } | null>(null);

    const applyRoundData = useCallback((data: RoundData) => {
        const startedAt = data.started_at
            ? new Date(data.started_at)
            : null;
        roundStartedAtRef.current = startedAt;
        setUrgentCountdown(roundRemainingSeconds(startedAt));
        setRoundFinished(false);
        setRoundResult(null);
        setRoundScores({ p1: null, p2: null });
        setRoundDistances({ p1: null, p2: null });
        setOpponentLiveGuess(null);
        setHealth({
            p1: data.player_one_health,
            p2: data.player_two_health,
        });
        setLocation({
            lat: data.location_lat,
            lng: data.location_lng,
            heading: data.location_heading,
        });
        setHeading(data.location_heading);
        setRound({
            id: data.round_id,
            round_number: data.round_number,
            player_one_locked_in: data.player_one_locked_in ?? false,
            player_two_locked_in: data.player_two_locked_in ?? false,
        });
        setPin(null);
    }, [roundStartedAtRef, setUrgentCountdown, setHealth]);

    // Apply buffered RoundStarted data once countdown expires
    useEffect(() => {
        if (pendingRoundData === null) return;
        if (countdown !== null && countdown > 0) return;

        const data = pendingRoundData;
        setPendingRoundData(null);
        setCountdown(null);
        applyRoundData(data);
    }, [countdown, pendingRoundData, setCountdown, applyRoundData]);

    const resetRoundState = useCallback(() => {
        setRound(null);
        setLocation(null);
        setHeading(null);
        setPin(null);
        setRoundFinished(false);
        setRoundResult(null);
        setRoundScores({ p1: null, p2: null });
        setRoundDistances({ p1: null, p2: null });
        setOpponentLiveGuess(null);
    }, []);

    return {
        round,
        setRound,
        location,
        setLocation,
        heading,
        setHeading,
        pin,
        setPin,
        roundFinished,
        setRoundFinished,
        roundResult,
        setRoundResult,
        roundScores,
        setRoundScores,
        roundDistances,
        setRoundDistances,
        pendingRoundData,
        setPendingRoundData,
        opponentLiveGuess,
        setOpponentLiveGuess,
        roundStartedAtRef,
        applyRoundData,
        resetRoundState,
    };
}
