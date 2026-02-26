import { useEffect, useRef, useState } from 'react';

export default function HealthBar({
    health,
    color,
}: {
    health: number;
    color: 'blue' | 'red';
}) {
    const pct = Math.max(0, Math.min(100, (health / 5000) * 100));
    const colorClass = color === 'blue' ? 'text-blue-400' : 'text-red-400';
    const [flashing, setFlashing] = useState(false);
    const [flashKey, setFlashKey] = useState(0);
    const prevHealthRef = useRef<number | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (prevHealthRef.current !== null && health < prevHealthRef.current) {
            if (timerRef.current) clearTimeout(timerRef.current);
            setFlashKey((k) => k + 1);
            setFlashing(true);
            timerRef.current = setTimeout(() => setFlashing(false), 900);
        }
        prevHealthRef.current = health;
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [health]);

    return (
        <div className="flex items-center gap-3 font-mono">
            <div className="relative leading-none">
                <span className="text-sm text-white opacity-20 select-none">
                    {'█'.repeat(24)}
                </span>
                <span
                    className={`absolute inset-0 overflow-hidden text-sm whitespace-nowrap select-none ${colorClass}`}
                    style={{
                        width: `${pct}%`,
                        transition:
                            'width 800ms cubic-bezier(0.19, 1, 0.22, 1)',
                    }}
                >
                    {'█'.repeat(24)}
                </span>
                {flashing && (
                    <span
                        key={flashKey}
                        className="health-flash pointer-events-none absolute inset-0 overflow-hidden text-sm whitespace-nowrap text-red-400 select-none"
                        style={{ width: `${pct}%` }}
                    >
                        {'█'.repeat(24)}
                    </span>
                )}
            </div>
            <span className={`text-xs tabular-nums opacity-60 ${colorClass}`}>
                {health}hp
            </span>
        </div>
    );
}
