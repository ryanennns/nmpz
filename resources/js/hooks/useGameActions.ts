import { useCallback, useRef } from 'react';
import type { LatLng } from '@/types/shared';
import type { Game, RematchState, Round } from '@/types/game';
import { GUESS_THROTTLE_MS } from '@/lib/game-constants';
import type { useApiClient } from '@/hooks/useApiClient';
import type { useEndSequence } from '@/hooks/useEndSequence';
import type { useSoundEffects } from '@/hooks/useSoundEffects';

interface UseGameActionsParams {
    pin: LatLng | null;
    round: Round | null;
    game: Game | null;
    myLocked: boolean;
    gameOver: boolean;
    api: ReturnType<typeof useApiClient>;
    setRound: (r: Round | null) => void;
    setMapHovered: (h: boolean) => void;
    playSound: ReturnType<typeof useSoundEffects>['play'];
    chatText: string;
    setChatText: (t: string) => void;
    setChatOpen: (o: boolean) => void;
    lastGameId: string | null;
    rematchState: RematchState;
    setRematchState: (s: RematchState) => void;
    endSequence: ReturnType<typeof useEndSequence>;
    resetGameState: () => void;
    playerName: string | null;
}

export function useGameActions({
    pin,
    round,
    game,
    myLocked,
    gameOver,
    api,
    setRound,
    setMapHovered,
    playSound,
    chatText,
    setChatText,
    setChatOpen,
    lastGameId,
    rematchState,
    setRematchState,
    endSequence,
    resetGameState,
    playerName,
}: UseGameActionsParams) {
    const updateGuessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingGuessRef = useRef<LatLng | null>(null);

    async function guess() {
        if (!pin || !round || !game || myLocked || gameOver) return;
        setMapHovered(false);
        playSound('lock-in');
        const res = await api.guess(round.id, pin, true);
        if (res?.data) setRound(res.data as Round);
    }

    function updateGuess(coords: LatLng) {
        if (!round || !game || myLocked || gameOver) return;
        pendingGuessRef.current = coords;
        if (updateGuessTimerRef.current) return;
        updateGuessTimerRef.current = setTimeout(async () => {
            updateGuessTimerRef.current = null;
            const c = pendingGuessRef.current;
            if (!c) return;
            pendingGuessRef.current = null;
            const res = await api.guess(round.id, c, false);
            if (res?.data) setRound(res.data as Round);
        }, GUESS_THROTTLE_MS);
    }

    async function sendMessage() {
        if (!game || !chatText.trim()) return;
        const res = await api.sendMessage(chatText.trim());
        if (res) {
            setChatText('');
            setChatOpen(false);
        }
    }

    const handleRematch = useCallback(() => {
        const gid = lastGameId ?? game?.id;
        if (!gid) return;
        void api.requestRematch(gid);
        setRematchState('sent');
    }, [lastGameId, game?.id, api]);

    const handleRequeue = useCallback(() => {
        endSequence.dismissEndSequence(resetGameState);
        void api.joinQueue(playerName ?? undefined);
    }, [endSequence, resetGameState, api, playerName]);

    const handleExit = useCallback(() => {
        if (rematchState === 'received') {
            const gid = lastGameId ?? game?.id;
            if (gid) void api.declineRematch(gid);
        }
        endSequence.dismissEndSequence(resetGameState);
    }, [rematchState, lastGameId, game?.id, api, endSequence, resetGameState]);

    const handleDeclineRematch = useCallback(() => {
        const gid = lastGameId ?? game?.id;
        if (!gid) return;
        void api.declineRematch(gid);
        setRematchState('declined');
    }, [lastGameId, game?.id, api]);

    return {
        guess,
        updateGuess,
        sendMessage,
        handleRematch,
        handleRequeue,
        handleExit,
        handleDeclineRematch,
    };
}
