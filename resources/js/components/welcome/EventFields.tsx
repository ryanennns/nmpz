import type { GameEvent } from '@/components/welcome/types';

function short(uuid: unknown) {
    return typeof uuid === 'string' ? uuid.slice(0, 8) : '?';
}

export default function EventFields({
    name,
    data,
}: {
    name: GameEvent['name'];
    data: Record<string, unknown>;
}) {
    const row = (label: string, value: unknown) => (
        <div key={label} className="flex gap-2">
            <span className="w-24 opacity-40">{label}</span>
            <span>{String(value)}</span>
        </div>
    );

    const common = (
        <>
            {row('game', short(data.game_id))}
            {row('round', short(data.round_id))}
            {row('round #', data.round_number)}
        </>
    );

    const extra =
        name === 'PlayerGuessed' ? (
            row('player', short(data.player_id))
        ) : name === 'RoundFinished' ? (
            <>
                {row('p1 score', data.player_one_score)}
                {row('p2 score', data.player_two_score)}
            </>
        ) : name === 'RoundStarted' ? (
            <>
                {row('p1 health', data.player_one_health)}
                {row('p2 health', data.player_two_health)}
            </>
        ) : name === 'GameFinished' ? (
            <>
                {row('winner', short(data.winner_id))}
                {row('p1 health', data.player_one_health)}
                {row('p2 health', data.player_two_health)}
            </>
        ) : null;

    return (
        <div className="border-l border-white/20 pl-2">
            {common}
            {extra}
        </div>
    );
}
