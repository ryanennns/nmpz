import { useEffect, useState } from 'react';
import type { SoundName } from '@/hooks/useSoundEffects';
import { COUNTDOWN_TICK_THRESHOLD } from '@/lib/game-constants';

export function useCountdown(playSound?: (name: SoundName) => void) {
    const [countdown, setCountdown] = useState<number | null>(null);
    const [urgentCountdown, setUrgentCountdown] = useState<number | null>(null);

    // Tick: next-round countdown
    useEffect(() => {
        if (countdown === null || countdown <= 0) return;
        const t = setTimeout(() => setCountdown((c) => (c ?? 1) - 1), 1000);
        return () => clearTimeout(t);
    }, [countdown]);

    // Tick: guess-deadline countdown
    useEffect(() => {
        if (urgentCountdown === null || urgentCountdown <= 0) return;
        if (urgentCountdown <= COUNTDOWN_TICK_THRESHOLD) {
            playSound?.('countdown-tick');
        }
        const t = setTimeout(
            () => setUrgentCountdown((c) => (c ?? 1) - 1),
            1000,
        );
        return () => clearTimeout(t);
    }, [urgentCountdown]);

    return { countdown, setCountdown, urgentCountdown, setUrgentCountdown };
}
