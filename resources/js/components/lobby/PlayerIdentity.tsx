import { Pencil } from 'lucide-react';
import { useState } from 'react';
import NamePrompt from '@/components/welcome/NamePrompt';
import RankBadge from '@/components/welcome/RankBadge';
import type { Player, Rank } from '@/types/player';

export default function PlayerIdentity({
    player,
    playerName,
    onNameChange,
    onJoinQueue,
    joinError,
    setJoinError,
}: {
    player: Player;
    playerName: string | null;
    onNameChange: (name: string) => void;
    onJoinQueue: (name?: string) => void;
    joinError: string | null;
    setJoinError: (e: string | null) => void;
}) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(playerName ?? '');

    if (!playerName) {
        return (
            <div className="px-4 py-3">
                <div className="mb-2 text-center text-xs text-white/60">enter your name</div>
                <NamePrompt onSubmit={(name) => onJoinQueue(name)} />
            </div>
        );
    }

    if (editing) {
        return (
            <div className="px-4 py-3">
                <input
                    value={draft}
                    maxLength={32}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Your name"
                    className="w-full bg-white/5 px-2 py-1.5 text-center text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
                />
                <div className="mt-2 flex justify-center gap-2">
                    <button
                        onClick={() => onNameChange(draft)}
                        className="flex-1 border border-white/15 px-2 py-1 text-xs text-white hover:bg-white/5"
                    >
                        [ save ]
                    </button>
                    <button
                        onClick={() => {
                            setEditing(false);
                            setDraft(playerName);
                            setJoinError(null);
                        }}
                        className="flex-1 border border-white/10 px-2 py-1 text-xs text-white/50 hover:bg-white/5"
                    >
                        [ cancel ]
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="px-4 py-3">
            <div className="flex flex-col items-center gap-1">
                <span className="relative inline-block text-sm text-white">
                    {playerName.slice(0, 32)}
                    <button
                        type="button"
                        onClick={() => {
                            setEditing(true);
                            setDraft(playerName);
                            setJoinError(null);
                        }}
                        className="absolute -top-1.5 -right-3.5 text-white/20 transition hover:text-white/50"
                        aria-label="Edit name"
                    >
                        <Pencil size={9} />
                    </button>
                </span>
                {player.elo_rating !== undefined && player.rank && (
                    <RankBadge rank={player.rank} elo={player.elo_rating} />
                )}
            </div>
        </div>
    );
}
