import { useEffect, useRef, useState } from 'react';

const END_MAP_HOLD_MS = 3000;
const END_FADE_MS = 500;

export function useEndSequence() {
    const [blackoutVisible, setBlackoutVisible] = useState(false);
    const [winnerOverlayVisible, setWinnerOverlayVisible] = useState(false);
    const [postGameButtonsVisible, setPostGameButtonsVisible] = useState(false);
    const [pageVisible, setPageVisible] = useState(true);
    const [winnerId, setWinnerId] = useState<string | null>(null);
    const [winnerName, setWinnerName] = useState<string | null>(null);
    const endTimersRef = useRef<number[]>([]);

    function clearEndSequenceTimers() {
        endTimersRef.current.forEach((id) => window.clearTimeout(id));
        endTimersRef.current = [];
    }

    function scheduleEndSequence() {
        clearEndSequenceTimers();
        setBlackoutVisible(false);
        setWinnerOverlayVisible(false);
        setPostGameButtonsVisible(false);
        setPageVisible(true);

        const t1 = window.setTimeout(() => {
            setBlackoutVisible(true);

            const t2 = window.setTimeout(() => {
                setWinnerOverlayVisible(true);

                const t3 = window.setTimeout(() => {
                    setPostGameButtonsVisible(true);
                }, 1500);

                endTimersRef.current.push(t3);
            }, END_FADE_MS);

            endTimersRef.current.push(t2);
        }, END_MAP_HOLD_MS);

        endTimersRef.current.push(t1);
    }

    function dismissEndSequence(resetGame: () => void) {
        clearEndSequenceTimers();
        setPostGameButtonsVisible(false);
        setWinnerOverlayVisible(false);

        const t1 = window.setTimeout(() => {
            setPageVisible(false);

            const t2 = window.setTimeout(() => {
                resetGame();
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => setPageVisible(true));
                });

                const t3 = window.setTimeout(() => {
                    setBlackoutVisible(false);
                }, END_FADE_MS);

                endTimersRef.current.push(t3);
            }, END_FADE_MS);

            endTimersRef.current.push(t2);
        }, END_FADE_MS);

        endTimersRef.current.push(t1);
    }

    useEffect(() => () => clearEndSequenceTimers(), []);

    return {
        blackoutVisible,
        setBlackoutVisible,
        winnerOverlayVisible,
        setWinnerOverlayVisible,
        postGameButtonsVisible,
        setPostGameButtonsVisible,
        pageVisible,
        setPageVisible,
        winnerId,
        setWinnerId,
        winnerName,
        setWinnerName,
        scheduleEndSequence,
        dismissEndSequence,
        clearEndSequenceTimers,
    };
}
