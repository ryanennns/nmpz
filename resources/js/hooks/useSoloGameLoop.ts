import { useCallback, useEffect, useRef, useState } from 'react';
import type { LatLng } from '@/types/shared';

interface RoundStateBase {
    round_timeout?: number | null;
}

interface UseSoloGameLoopParams<TRoundState extends RoundStateBase, TGuessResult> {
    /** Called with (roundState, coords, timedOut). Should return the guess result from the API. */
    submitGuessApi: (roundState: TRoundState, coords: LatLng, timedOut: boolean) => Promise<TGuessResult>;
    /** Process the result. Return nextRound state if game continues, or isDone if game is over. */
    onGuessResult: (result: TGuessResult, roundState: TRoundState) => { nextRound: TRoundState | null; isDone: boolean };
    /** Called when the game finishes (after advanceRound on a finished game). */
    onFinished?: () => void;
}

export function useSoloGameLoop<TRoundState extends RoundStateBase, TGuessResult>({
    submitGuessApi,
    onGuessResult,
    onFinished,
}: UseSoloGameLoopParams<TRoundState, TGuessResult>) {
    const [roundState, setRoundState] = useState<TRoundState | null>(null);
    const [roundResult, setRoundResult] = useState<TGuessResult | null>(null);
    const [lastGuessCoords, setLastGuessCoords] = useState<LatLng | null>(null);
    const [pendingNextRound, setPendingNextRound] = useState<TRoundState | null>(null);
    const [pinCoords, setPinCoords] = useState<LatLng | null>(null);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [phase, setPhase] = useState<'guessing' | 'results'>('guessing');
    const [error, setError] = useState<string | null>(null);
    const [isDone, setIsDone] = useState(false);
    const submittingRef = useRef(false);
    const roundStateRef = useRef(roundState);
    const pinCoordsRef = useRef(pinCoords);
    roundStateRef.current = roundState;
    pinCoordsRef.current = pinCoords;

    // Timer countdown
    useEffect(() => {
        if (timeLeft === null || !roundState || phase !== 'guessing') return;
        if (timeLeft <= 0) {
            if (!submittingRef.current) {
                submittingRef.current = true;
                void doSubmit(true);
            }
            return;
        }
        const timer = setInterval(() => setTimeLeft((t) => (t !== null ? t - 1 : null)), 1000);
        return () => clearInterval(timer);
    }, [timeLeft, roundState, phase]);

    const doSubmit = useCallback(async (timedOut = false) => {
        const rs = roundStateRef.current;
        const pc = pinCoordsRef.current;
        if (!rs) return;
        if (!timedOut && !pc) return;
        setError(null);
        try {
            const coords = timedOut ? { lat: 0, lng: 0 } : pc!;
            setLastGuessCoords(timedOut ? null : coords);
            const result = await submitGuessApi(rs, coords, timedOut);
            setRoundResult(result);
            setTimeLeft(null);
            submittingRef.current = false;
            setPhase('results');

            const outcome = onGuessResult(result, rs);
            if (outcome.isDone) {
                setPendingNextRound(null);
                setIsDone(true);
            } else if (outcome.nextRound) {
                setPendingNextRound(outcome.nextRound);
                setIsDone(false);
            }
        } catch (e) {
            submittingRef.current = false;
            if (e && typeof e === 'object' && 'response' in e) {
                const axiosErr = e as { response?: { data?: { error?: string } } };
                setError(axiosErr.response?.data?.error ?? 'Failed to submit guess');
            }
        }
    }, [submitGuessApi, onGuessResult]);

    function advanceRound() {
        if (isDone) {
            setRoundState(null);
            setTimeLeft(null);
            setPinCoords(null);
            setPhase('guessing');
            setIsDone(false);
            onFinished?.();
        } else if (pendingNextRound) {
            setRoundState(pendingNextRound);
            setPendingNextRound(null);
            setPinCoords(null);
            setPhase('guessing');
            setTimeLeft(pendingNextRound.round_timeout ?? null);
        }
    }

    function startRound(state: TRoundState) {
        setRoundState(state);
        setRoundResult(null);
        setPinCoords(null);
        setPhase('guessing');
        setTimeLeft(state.round_timeout ?? null);
        setError(null);
        setIsDone(false);
    }

    function quit() {
        setRoundState(null);
        setTimeLeft(null);
        setPinCoords(null);
        setPhase('guessing');
        setIsDone(false);
    }

    return {
        roundState,
        roundResult,
        lastGuessCoords,
        pinCoords,
        setPinCoords,
        timeLeft,
        phase,
        error,
        setError,
        submitGuess: doSubmit,
        advanceRound,
        startRound,
        quit,
    };
}
