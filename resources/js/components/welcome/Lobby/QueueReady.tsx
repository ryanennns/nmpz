import { useEffect, useState } from 'react';

export const QueueReady = ({
    playerName,
    onJoinQueue,
    onEditName,
}: {
    playerName: string;
    onJoinQueue: () => void;
    onEditName: (name: string) => void;
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [draftName, setDraftName] = useState(playerName);

    useEffect(() => {
        if (!isEditing) {
            setDraftName(playerName);
        }
    }, [isEditing, playerName]);

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
                            onClick={() => setIsEditing(true)}
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
        </div>
    );
};
