import { cn } from '@/lib/utils';
import type { GameSummary, SummaryRound } from './types';

type Props = {
    game: GameSummary;
    selectedRoundId: string | null;
    onSelectRound: (id: string) => void;
    onContinue: () => void;
};

export default function RoundList({
    game,
    selectedRoundId,
    onSelectRound,
    onContinue,
}: Props) {
    const winner =
        game.winner_id === game.player_one.id
            ? game.player_one.name
            : game.winner_id === game.player_two.id
              ? game.player_two.name
              : null;

    return (
        <div className="flex h-full w-72 shrink-0 flex-col overflow-hidden border-r border-white/10 bg-neutral-900">
            <div className="border-b border-white/10 p-4">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-400">
                        {game.player_one.name}
                    </span>
                    <span className="text-xs text-neutral-500">vs</span>
                    <span className="text-red-400">{game.player_two.name}</span>
                </div>
                <div className="mt-2 flex items-center justify-between font-bold tabular-nums">
                    <span className="text-blue-400">
                        {game.player_one_total_score.toLocaleString()}
                    </span>
                    <span className="text-red-400">
                        {game.player_two_total_score.toLocaleString()}
                    </span>
                </div>
                {winner && (
                    <div className="mt-2 text-center text-xs text-neutral-400">
                        Winner: {winner}
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto">
                {game.rounds.map((round) => (
                    <RoundRow
                        key={round.id}
                        round={round}
                        selected={round.id === selectedRoundId}
                        onSelect={() => onSelectRound(round.id)}
                    />
                ))}
            </div>

            <div className="border-t border-white/10 p-4">
                <button
                    onClick={onContinue}
                    className="w-full rounded bg-white/5 px-3 py-2 text-sm text-neutral-300 transition-colors hover:bg-white/10"
                >
                    continue
                </button>
            </div>
        </div>
    );
}

function RoundRow({
    round,
    selected,
    onSelect,
}: {
    round: SummaryRound;
    selected: boolean;
    onSelect: () => void;
}) {
    return (
        <button
            onClick={onSelect}
            className={cn(
                'w-full border-b border-white/5 p-3 text-left transition-colors hover:bg-white/5',
                selected && 'bg-white/10',
            )}
        >
            <div className="mb-1 text-xs text-neutral-400">
                Round {round.round_number}
            </div>
            <div className="flex justify-between text-sm tabular-nums">
                <span className="text-blue-400">
                    {round.player_one_score?.toLocaleString() ?? '—'}
                </span>
                <span className="text-red-400">
                    {round.player_two_score?.toLocaleString() ?? '—'}
                </span>
            </div>
        </button>
    );
}
