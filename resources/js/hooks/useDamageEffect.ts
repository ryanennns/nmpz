import { useEffect, useRef, useState } from 'react';

export function useDamageEffect(
    myHealth: number,
    hasGame: boolean,
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
            const el = gameContainerRef.current;
            if (el) {
                el.classList.remove('screen-shake');
                void el.offsetWidth;
                el.classList.add('screen-shake');
                el.addEventListener(
                    'animationend',
                    () => el.classList.remove('screen-shake'),
                    { once: true },
                );
            }
        }
        prevMyHealthRef.current = myHealth;
    }, [myHealth, hasGame]);

    return { myDamageKey, gameContainerRef };
}
