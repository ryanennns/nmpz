import { useCallback, useEffect, useRef, useState } from 'react';

export type SoundName =
    | 'match-found'
    | 'lock-in'
    | 'opponent-locked'
    | 'round-end'
    | 'damage-taken'
    | 'countdown-tick'
    | 'win-jingle'
    | 'lose-sound';

const SOUND_FILES: Record<SoundName, string> = {
    'match-found': '/sounds/match-found.wav',
    'lock-in': '/sounds/lock-in.wav',
    'opponent-locked': '/sounds/opponent-locked.wav',
    'round-end': '/sounds/round-end.wav',
    'damage-taken': '/sounds/damage-taken.wav',
    'countdown-tick': '/sounds/countdown-tick.wav',
    'win-jingle': '/sounds/win-jingle.wav',
    'lose-sound': '/sounds/lose-sound.wav',
};

export function useSoundEffects() {
    const audioCache = useRef<Map<SoundName, HTMLAudioElement>>(new Map());
    const [muted, setMuted] = useState(() => {
        try {
            return localStorage.getItem('nmpz-muted') === 'true';
        } catch {
            return false;
        }
    });
    const initializedRef = useRef(false);

    useEffect(() => {
        try {
            localStorage.setItem('nmpz-muted', String(muted));
        } catch {}
    }, [muted]);

    const ensureLoaded = useCallback((name: SoundName): HTMLAudioElement => {
        let audio = audioCache.current.get(name);
        if (!audio) {
            audio = new Audio(SOUND_FILES[name]);
            audio.preload = 'auto';
            audioCache.current.set(name, audio);
        }
        return audio;
    }, []);

    // Lazy-init all audio elements on first user interaction
    useEffect(() => {
        if (initializedRef.current) return;
        function init() {
            initializedRef.current = true;
            for (const name of Object.keys(SOUND_FILES) as SoundName[]) {
                ensureLoaded(name);
            }
            document.removeEventListener('click', init);
            document.removeEventListener('keydown', init);
        }
        document.addEventListener('click', init, { once: true });
        document.addEventListener('keydown', init, { once: true });
        return () => {
            document.removeEventListener('click', init);
            document.removeEventListener('keydown', init);
        };
    }, [ensureLoaded]);

    const play = useCallback(
        (name: SoundName) => {
            if (muted) return;
            const audio = ensureLoaded(name);
            audio.currentTime = 0;
            audio.play().catch(() => {});
        },
        [muted, ensureLoaded],
    );

    return { play, muted, setMuted };
}
