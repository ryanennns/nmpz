import { useEffect, useRef, useState } from 'react';

const MAX_HP = 5000;
const BLOCKS = 24;
const blockStr = '█'.repeat(BLOCKS);

export default function HealthBar({
    health,
    color,
}: {
    health: number;
    color: 'blue' | 'red';
}) {
    const pct = Math.max(0, Math.min(100, (health / MAX_HP) * 100));
    const colorClass = color === 'blue' ? 'text-blue-400' : 'text-red-400';
    const lowHp = health > 0 && health <= 1500;

    const [flashing, setFlashing] = useState(false);
    const [flashKey, setFlashKey] = useState(0);
    // Incrementing this key remounts the bar container div, restarting the shake animation
    const [shakeKey, setShakeKey] = useState(0);
    const [ghostPct, setGhostPct] = useState(pct);
    const [damageDisplay, setDamageDisplay] = useState<{
        amount: number;
        key: number;
    } | null>(null);

    const prevHealthRef = useRef<number | null>(null);
    const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const ghostTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const damageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (prevHealthRef.current !== null && health < prevHealthRef.current) {
            const damage = prevHealthRef.current - health;

            // White blast → red flicker → fade
            if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
            setFlashKey((k) => k + 1);
            setFlashing(true);
            flashTimerRef.current = setTimeout(() => setFlashing(false), 960);

            // Bar shudder (remount via key resets and replays CSS animation)
            setShakeKey((k) => k + 1);

            // Ghost drain bar: snap to old position, then slowly catch up
            const oldPct = Math.max(
                0,
                Math.min(100, (prevHealthRef.current / MAX_HP) * 100),
            );
            setGhostPct(oldPct);
            if (ghostTimerRef.current) clearTimeout(ghostTimerRef.current);
            ghostTimerRef.current = setTimeout(() => {
                setGhostPct(
                    Math.max(0, Math.min(100, (health / MAX_HP) * 100)),
                );
            }, 480);

            // Floating damage number
            if (damageTimerRef.current) clearTimeout(damageTimerRef.current);
            setDamageDisplay((prev) => ({
                amount: damage,
                key: (prev?.key ?? 0) + 1,
            }));
            damageTimerRef.current = setTimeout(
                () => setDamageDisplay(null),
                1200,
            );
        } else if (prevHealthRef.current === null) {
            setGhostPct(pct);
        }

        prevHealthRef.current = health;

        return () => {
            if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
        };
    }, [health]);

    return (
        <div className="flex items-center gap-3 font-mono">
            {/*
             * Keyed div: changing shakeKey remounts this element, which
             * forces the panel-shake CSS animation to restart from frame 0.
             */}
            <div
                key={shakeKey}
                className={`relative leading-none ${shakeKey > 0 ? 'panel-shake' : ''}`}
            >
                {/* Ghost / drain bar — sits behind active bar, slowly catches up */}
                <span
                    className="pointer-events-none absolute inset-0 overflow-hidden text-sm whitespace-nowrap text-white/20 select-none"
                    style={{
                        width: `${ghostPct}%`,
                        transition:
                            'width 1500ms cubic-bezier(0.25, 0, 0.25, 1)',
                    }}
                >
                    {blockStr}
                </span>

                {/* Track */}
                <span className="text-sm text-white/10 select-none">
                    {blockStr}
                </span>

                {/* Active health bar */}
                <span
                    className={`absolute inset-0 overflow-hidden text-sm whitespace-nowrap select-none ${colorClass} ${lowHp ? 'low-hp-pulse' : ''}`}
                    style={{
                        width: `${pct}%`,
                        transition:
                            'width 800ms cubic-bezier(0.19, 1, 0.22, 1)',
                    }}
                >
                    {blockStr}
                </span>

                {/* White blast flash overlay */}
                {flashing && (
                    <span
                        key={flashKey}
                        className="health-flash pointer-events-none absolute inset-0 overflow-hidden text-sm whitespace-nowrap select-none"
                        style={{ width: `${pct}%` }}
                    >
                        {blockStr}
                    </span>
                )}

                {/* Floating damage number */}
                {damageDisplay && (
                    <span
                        key={damageDisplay.key}
                        className="damage-float pointer-events-none absolute top-0 right-0 z-50 font-bold text-red-300"
                        style={{ fontSize: '0.72rem' }}
                    >
                        -{damageDisplay.amount.toLocaleString()}
                    </span>
                )}
            </div>

            <span className={`text-xs tabular-nums opacity-60 ${colorClass}`}>
                {health}hp
            </span>
        </div>
    );
}
