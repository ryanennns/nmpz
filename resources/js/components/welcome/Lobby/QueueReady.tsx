export const QueueReady = ({
    playerName,
    onJoinQueue,
    onEditName,
}: {
    playerName: string;
    onJoinQueue: () => void;
    onEditName: () => void;
}) => {
    return (
        <div className="w-72">
            <div className="mb-2 flex items-center justify-between gap-2 text-center text-sm text-white">
                <span>&gt; {playerName?.slice(0, 32)}</span>
                <button
                    type="button"
                    onClick={onEditName}
                    className="rounded bg-white/10 px-2 py-0.5 pt-1.5 text-[10px] text-white/70 hover:bg-white/20"
                >
                    Edit
                </button>
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
