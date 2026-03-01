import { cn } from '@/lib/utils';

type CountdownConfig = {
    value: number;
    label: string;
    valueClass: string;
};

export function CountdownTimer({ config }: { config: CountdownConfig }) {
    return (
        <div className="pointer-events-none absolute top-16 left-1/2 z-20 -translate-x-1/2 rounded bg-black/50 px-4 py-3 text-center backdrop-blur-sm">
            <div
                key={config.value}
                className={cn(
                    'countdown-tick font-mono text-6xl font-bold tabular-nums',
                    config.valueClass,
                )}
            >
                {config.value}
            </div>
            <div className="mt-1 font-mono text-sm text-white/40">
                {config.label}
            </div>
        </div>
    );
}
