import type { ReactNode } from 'react';
import type { GameEvent, GameState } from '@/types/game';

const panel = 'rounded border border-white/10 bg-black/60 p-3 backdrop-blur-sm';

export default function EventLog({
    events,
    roundNumber,
    gameState,
    stateLabel,
}: {
    events: GameEvent[];
    roundNumber: number | null;
    gameState: GameState;
    stateLabel: Record<GameState, ReactNode>;
}) {
    return (
        <div className={`absolute bottom-4 left-4 z-10 w-80 space-y-2 text-xs ${panel}`}>
            {roundNumber !== null && (
                <>
                    <div className="flex justify-between text-xs opacity-70">
                        <span>Round {roundNumber}</span>
                        <span>{stateLabel[gameState]}</span>
                    </div>
                    {events.length > 0 && (
                        <div className="border-t border-white/10" />
                    )}
                </>
            )}
            {events.length === 0 ? (
                <p className="opacity-30">no events yet</p>
            ) : (
                events.map((e) => (
                    <div key={e.id} className="flex gap-2 opacity-40">
                        <span>{e.ts}</span>
                        <span className="truncate text-white/70">{e.name}</span>
                    </div>
                ))
            )}
        </div>
    );
}
