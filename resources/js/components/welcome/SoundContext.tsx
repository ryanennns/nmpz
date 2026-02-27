import { createContext, useContext } from 'react';
import type { SoundName } from '@/hooks/useSoundEffects';

type SoundContextType = {
    play: (name: SoundName) => void;
    muted: boolean;
    setMuted: (muted: boolean) => void;
};

export const SoundContext = createContext<SoundContextType>({
    play: () => {},
    muted: false,
    setMuted: () => {},
});

export function useSoundContext() {
    return useContext(SoundContext);
}
