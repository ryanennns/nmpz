import { useEffect, useRef, useState } from 'react';

const END_MAP_HOLD_MS = 3000;
const END_FADE_MS = 500;
const END_WINNER_HOLD_MS = 2500;

export function useEndSequence() {
    const [blackoutVisible, setBlackoutVisible] = useState(false);
    const [winnerOverlayVisible, setWinnerOverlayVisible] = useState(false);
    const [pageVisible, setPageVisible] = useState(true);
    const [winnerId, setWinnerId] = useState<string | null>(null);
    const [winnerName, setWinnerName] = useState<string | null>(null);
    const endTimersRef = useRef<number[]>([]);

    function clearEndSequenceTimers() {
        endTimersRef.current.forEach((id) => window.clearTimeout(id));
        endTimersRef.current = [];
    }

    function scheduleEndSequence(resetGame: () => void) {
        clearEndSequenceTimers();
        setBlackoutVisible(false);
        setWinnerOverlayVisible(false);
        setPageVisible(true);

        const t1 = window.setTimeout(() => {
            setBlackoutVisible(true);

            const t2 = window.setTimeout(() => {
                setWinnerOverlayVisible(true);

                const t3 = window.setTimeout(() => {
                    setWinnerOverlayVisible(false);

                    const t4 = window.setTimeout(() => {
                        setPageVisible(false);

                        const t5 = window.setTimeout(() => {
                            resetGame();
                            requestAnimationFrame(() => {
                                requestAnimationFrame(() =>
                                    setPageVisible(true),
                                );
                            });

                            const t6 = window.setTimeout(() => {
                                setBlackoutVisible(false);
                            }, END_FADE_MS);

                            endTimersRef.current.push(t6);
                        }, END_FADE_MS);

                        endTimersRef.current.push(t5);
                    }, END_FADE_MS);

                    endTimersRef.current.push(t4);
                }, END_WINNER_HOLD_MS);

                endTimersRef.current.push(t3);
            }, END_FADE_MS);

            endTimersRef.current.push(t2);
        }, END_MAP_HOLD_MS);

        endTimersRef.current.push(t1);
    }

    useEffect(() => () => clearEndSequenceTimers(), []);

    return {
        blackoutVisible,
        setBlackoutVisible,
        winnerOverlayVisible,
        setWinnerOverlayVisible,
        pageVisible,
        setPageVisible,
        winnerId,
        setWinnerId,
        winnerName,
        setWinnerName,
        scheduleEndSequence,
        clearEndSequenceTimers,
    };
}
