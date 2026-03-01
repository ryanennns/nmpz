import { useState } from 'react';

const REACTIONS: { key: string; emoji: string; label: string }[] = [
    { key: 'surprised', emoji: '😲', label: 'Surprised' },
    { key: 'confident', emoji: '😎', label: 'Confident' },
    { key: 'thinking', emoji: '🤔', label: 'Thinking' },
    { key: 'gg', emoji: '🤝', label: 'GG' },
    { key: 'nice', emoji: '👏', label: 'Nice' },
    { key: 'oof', emoji: '😬', label: 'Oof' },
];

type ReactionBarProps = {
    onReact: (reaction: string) => void;
    disabled?: boolean;
};

export default function ReactionBar({ onReact, disabled }: ReactionBarProps) {
    const [cooldown, setCooldown] = useState(false);
    const [lastSent, setLastSent] = useState<string | null>(null);

    function handleClick(reaction: string) {
        if (disabled || cooldown) return;
        onReact(reaction);
        setLastSent(reaction);
        setCooldown(true);
        setTimeout(() => {
            setCooldown(false);
            setLastSent(null);
        }, 2000);
    }

    return (
        <div className="flex gap-0.5">
            {REACTIONS.map((r) => (
                <button
                    key={r.key}
                    type="button"
                    onClick={() => handleClick(r.key)}
                    disabled={disabled || cooldown}
                    title={r.label}
                    className={`rounded-lg px-1.5 py-1 text-2xl transition-all duration-150 ${
                        lastSent === r.key
                            ? 'scale-125 bg-white/20'
                            : 'hover:scale-110 hover:bg-white/10'
                    } disabled:opacity-30 disabled:hover:scale-100`}
                >
                    {r.emoji}
                </button>
            ))}
        </div>
    );
}
