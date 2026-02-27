import { useEffect, type MutableRefObject } from 'react';

export function useKeyBindings(
    hasLocation: boolean,
    chatOpen: boolean,
    setChatOpen: (open: boolean) => void,
    setChatText: (text: string) => void,
    guessRef: MutableRefObject<() => void>,
) {
    // Space / Enter / Escape handling
    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            const target = e.target as HTMLElement | null;
            if (
                target &&
                (target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.isContentEditable)
            ) {
                return;
            }

            if (
                hasLocation &&
                [
                    'KeyW',
                    'KeyA',
                    'KeyS',
                    'KeyD',
                    'ArrowUp',
                    'ArrowDown',
                    'ArrowLeft',
                    'ArrowRight',
                ].includes(e.code)
            ) {
                e.preventDefault();
                return;
            }

            if (e.code === 'Space' && !e.repeat) {
                e.preventDefault();
                guessRef.current();
                return;
            }

            if (e.code === 'Enter' && !e.repeat) {
                if (chatOpen) {
                    e.preventDefault();
                } else {
                    e.preventDefault();
                    setChatOpen(true);
                }
                return;
            }

            if (e.code === 'Escape' && chatOpen) {
                e.preventDefault();
                setChatOpen(false);
                setChatText('');
            }
        }
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [chatOpen, hasLocation, guessRef, setChatOpen, setChatText]);

    // Movement key blocking
    useEffect(() => {
        if (!hasLocation) return;
        const blockKeys = new Set([
            'KeyW',
            'KeyA',
            'KeyS',
            'KeyD',
            'ArrowUp',
            'ArrowDown',
            'ArrowLeft',
            'ArrowRight',
        ]);

        function onMoveKey(e: KeyboardEvent) {
            if (!blockKeys.has(e.code)) return;
            const target = e.target as HTMLElement | null;
            if (
                target &&
                (target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.isContentEditable)
            ) {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
        }

        window.addEventListener('keydown', onMoveKey, true);
        window.addEventListener('keyup', onMoveKey, true);

        return () => {
            window.removeEventListener('keydown', onMoveKey, true);
            window.removeEventListener('keyup', onMoveKey, true);
        };
    }, [hasLocation]);
}
