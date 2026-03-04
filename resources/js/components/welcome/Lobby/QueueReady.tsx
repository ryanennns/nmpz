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
    onReviewLocations,
    onSignOut,
}: {
    playerName: string;
    playerId?: string;
    onJoinQueue: () => void;
    onEditName: (name: string) => void;
    isAuthenticated: boolean;
    onSignUp: () => void;
    onReviewLocations: () => void;
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
    const classes = 'shrink rounded text-xs transition-all hover:text-p1';

    return (
        <div className="flex w-72 flex-col gap-3">
            <div className="flex max-h-5 items-center justify-between gap-2 text-center text-sm text-white">
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
                                className="w-full border-b border-p1/40 bg-transparent px-0 py-0.5 text-sm text-white outline-none"
                            />
                        </label>
                        <button
                            type="button"
                            onClick={saveName}
                            className="rounded bg-p1/15 px-2 py-0.5 pt-1.5 text-[10px] text-p1/80 transition hover:bg-p1/25 hover:text-p1"
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
                className="w-full rounded bg-p1/15 px-2 py-1 text-xs text-p1 transition hover:bg-p1/25"
            >
                join queue
            </button>
            {isAuthenticated && playerId && (
                <div className="mt-3">
                    <PlayerStats playerId={playerId} />
                </div>
            )}
            <div className="flex shrink items-center justify-between rounded text-xs text-white/30">
                {!isAuthenticated && (
                    <>
                        <div
                            className="cursor-default"
                            title="sign up to see elo"
                        >
                            elo: ▓▓▓▓
                        </div>
                        <button
                            type="button"
                            onClick={onSignUp}
                            className={classes}
                        >
                            create account
                        </button>
                    </>
                )}
                {isAuthenticated && (
                    <>
                        <button
                            type="button"
                            onClick={onReviewLocations}
                            className={classes}
                        >
                            review locations
                        </button>
                        <Link
                            href={logout()}
                            as="button"
                            onClick={onSignOut}
                            className={classes}
                        >
                            sign out
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
};
