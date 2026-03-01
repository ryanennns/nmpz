import { useEffect, useRef, useState } from 'react';
import type { SoundName } from '@/hooks/useSoundEffects';

export function useDamageEffect(
    myHealth: number,
    hasGame: boolean,
    playSound?: (name: SoundName) => void,
) {
    const [myDamageKey, setMyDamageKey] = useState(0);
    const prevMyHealthRef = useRef<number | null>(null);
    const gameContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!hasGame) {
            prevMyHealthRef.current = null;
            return;
        }
        if (
            prevMyHealthRef.current !== null &&
            myHealth < prevMyHealthRef.current
        ) {
            setMyDamageKey((k) => k + 1);
            playSound?.('damage-taken');
        }
        prevMyHealthRef.current = myHealth;
    }, [myHealth, hasGame]);

    return { myDamageKey, gameContainerRef };
}
