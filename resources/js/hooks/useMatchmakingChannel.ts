import { useEffect, useRef } from 'react';
import type { Game } from '@/components/welcome/types';
import echo from '@/echo';
import type { SoundName } from '@/hooks/useSoundEffects';

const QUEUE_FADE_MS = 500;

export function useMatchmakingChannel(
    gameId: string | null,
    playerId: string,
    setGame: (game: Game) => void,
    setHealth: (health: { p1: number; p2: number }) => void,
    setPageVisible: (visible: boolean) => void,
    clearEndSequenceTimers: () => void,
    setBlackoutVisible: (visible: boolean) => void,
    setWinnerOverlayVisible: (visible: boolean) => void,
    playSound?: (name: SoundName) => void,
) {
    const queueFadeTimerRef = useRef<number | null>(null);

    function clearQueueFadeTimer() {
        if (queueFadeTimerRef.current !== null) {
            window.clearTimeout(queueFadeTimerRef.current);
            queueFadeTimerRef.current = null;
        }
    }

    useEffect(() => {
        if (gameId) return;

        const channel = echo.channel(`player.${playerId}`);

        channel.listen('.GameReady', (data: { game: Game }) => {
            playSound?.('match-found');
            clearEndSequenceTimers();
            clearQueueFadeTimer();
            setBlackoutVisible(false);
            setWinnerOverlayVisible(false);
            setPageVisible(true);
            const applyGame = () => {
                setGame(data.game);
                setHealth({
                    p1: data.game.player_one_health,
                    p2: data.game.player_two_health,
                });
            };
            setPageVisible(false);
            queueFadeTimerRef.current = window.setTimeout(() => {
                applyGame();
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => setPageVisible(true));
                });
            }, QUEUE_FADE_MS);
        });

        return () => {
            clearQueueFadeTimer();
            echo.leaveChannel(`player.${playerId}`);
        };
    }, [gameId, playerId]);
}
