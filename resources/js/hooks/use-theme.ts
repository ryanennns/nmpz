import { useCallback, useSyncExternalStore } from 'react';

export type ColorTheme =
    | 'default'
    | 'blue'
    | 'orange'
    | 'green'
    | 'purple'
    | 'pink';

export const COLOR_THEMES: { id: ColorTheme; label: string; hex: string }[] = [
    { id: 'default', label: 'default', hex: '#ffffff' },
    { id: 'blue', label: 'blue', hex: '#60a5fa' },
    { id: 'orange', label: 'orange', hex: '#fb923c' },
    { id: 'green', label: 'green', hex: '#4ade80' },
    { id: 'purple', label: 'purple', hex: '#c084fc' },
    { id: 'pink', label: 'pink', hex: '#f472b6' },
];

const STORAGE_KEY = 'colorTheme';
const THEME_CLASSES = COLOR_THEMES.filter((t) => t.id !== 'default').map(
    (t) => `theme-${t.id}`,
);

const listeners = new Set<() => void>();
let currentTheme: ColorTheme = 'default';

const subscribe = (cb: () => void) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
};
const notify = () => listeners.forEach((l) => l());

function applyTheme(theme: ColorTheme): void {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.remove(...THEME_CLASSES);
    if (theme !== 'default') {
        document.documentElement.classList.add(`theme-${theme}`);
    }
}

export function initializeColorTheme(): void {
    if (typeof window === 'undefined') return;
    const stored =
        (localStorage.getItem(STORAGE_KEY) as ColorTheme) || 'default';
    currentTheme = stored;
    applyTheme(stored);
}

export function getP1Color(): string {
    if (typeof document === 'undefined') return '#ffffff';
    return (
        getComputedStyle(document.documentElement)
            .getPropertyValue('--p1-color')
            .trim() || '#ffffff'
    );
}

export function useColorTheme() {
    const theme = useSyncExternalStore(
        subscribe,
        () => currentTheme,
        () => 'default' as ColorTheme,
    );

    const setTheme = useCallback((next: ColorTheme) => {
        currentTheme = next;
        localStorage.setItem(STORAGE_KEY, next);
        applyTheme(next);
        notify();
    }, []);

    return { theme, setTheme } as const;
}
