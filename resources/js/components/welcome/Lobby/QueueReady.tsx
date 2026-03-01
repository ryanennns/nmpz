import { Link } from '@inertiajs/react';
import { useState } from 'react';
import { logout } from '@/routes';
import { PlayerStats } from './PlayerStats';

export const QueueReady = ({
    playerName,
    playerId,
    onJoinQueue,
    onEditName,
    isAuthenticated,
    onSignUp,
    onSignOut,
}: {
    playerName: string;
    playerId?: string;
    onJoinQueue: () => void;
    onEditName: (name: string) => void;
    isAuthenticated: boolean;
    onSignUp: () => void;
    onSignOut: () => void;
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [draftName, setDraftName] = useState(playerName);

    const saveName = () => {
        const nextName = draftName.trim().slice(0, 32);

        if (!nextName) {
            return;
        }

        setIsEditing(false);

        if (nextName !== playerName) {
            onEditName(nextName);
        }
    };
    return (
        <div className="w-72">
            <div className="mb-2 flex min-h-9 items-center justify-between gap-2 text-center text-sm text-white">
                {isEditing ? (
                    <>
                        <label className="flex flex-1 items-center gap-2">
                            <span className="text-white/30">&gt;</span>
                            <input
                                type="text"
                                value={draftName}
                                onChange={(event) =>
                                    setDraftName(event.target.value)
                                }
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        event.preventDefault();
                                        saveName();
                                    }

                                    if (event.key === 'Escape') {
                                        setDraftName(playerName);
                                        setIsEditing(false);
                                    }
                                }}
                                maxLength={32}
                                autoFocus
                                className="w-full border-b border-white/30 bg-transparent px-0 py-0.5 text-sm text-white outline-none"
                            />
                        </label>
                        <button
                            type="button"
                            onClick={saveName}
                            className="rounded bg-white/10 px-2 py-0.5 pt-1.5 text-[10px] text-white/70 hover:bg-white/20"
                        >
                            Save
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            type="button"
                            onClick={() => {
                                setDraftName(playerName);
                                setIsEditing(true);
                            }}
                            className="flex items-center gap-1 text-left"
                        >
                            <span className="text-white/30">&gt;</span>
                            <span className="underline">
                                {playerName?.slice(0, 32)}
                            </span>
                        </button>
                    </>
                )}
            </div>
            <button
                onClick={onJoinQueue}
                className="w-full rounded bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20"
            >
                Join queue
            </button>
            {isAuthenticated && playerId && (
                <div className="mt-3">
                    <PlayerStats playerId={playerId} />
                </div>
            )}
            <div className="flex shrink items-center justify-between rounded py-1 text-xs text-zinc-600">
                {!isAuthenticated && (
                    <>
                        <div></div>
                        <button
                            type="button"
                            onClick={onSignUp}
                            className="shrink rounded px-2 py-1 text-xs transition-all hover:bg-zinc-900 hover:text-zinc-300"
                        >
                            create account
                        </button>
                    </>
                )}
                {isAuthenticated && (
                    <>
                        <div></div>
                        <Link
                            href={logout()}
                            as="button"
                            onClick={onSignOut}
                            className="shrink rounded px-2 py-1 text-xs transition-all hover:bg-zinc-900 hover:text-zinc-300"
                        >
                            sign out
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
};
