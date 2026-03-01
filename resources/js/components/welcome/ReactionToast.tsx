import { useEffect, useState } from 'react';

const EMOJI_MAP: Record<string, string> = {
    surprised: '😲',
    confident: '😎',
    thinking: '🤔',
    gg: '🤝',
    nice: '👏',
    oof: '😬',
};

export type ReactionEvent = {
    id: number;
    playerName: string;
    reaction: string;
};

type ReactionToastProps = {
    event: ReactionEvent;
    onDone: () => void;
};

export default function ReactionToast({ event, onDone }: ReactionToastProps) {
    const [phase, setPhase] = useState<'enter' | 'visible' | 'exit'>('enter');

    useEffect(() => {
        requestAnimationFrame(() => setPhase('visible'));
        const timer = setTimeout(() => {
            setPhase('exit');
            setTimeout(onDone, 400);
        }, 2500);
        return () => clearTimeout(timer);
    }, []);

    const emoji = EMOJI_MAP[event.reaction] ?? event.reaction;

    return (
        <div
            className={`pointer-events-none flex flex-col items-center transition-all duration-400 ${
                phase === 'visible'
                    ? 'scale-100 opacity-100'
                    : phase === 'exit'
                      ? 'scale-75 opacity-0'
                      : 'scale-50 opacity-0'
            }`}
        >
            <span className="text-6xl drop-shadow-lg">{emoji}</span>
            <span className="mt-1 rounded-full bg-black/60 px-2.5 py-0.5 font-mono text-[10px] tracking-wide text-white/50 uppercase backdrop-blur-sm">
                {event.playerName}
            </span>
        </div>
    );
}
