export const CreatePlayerForm = () => {
    return (
        <div className="mb-2">
            <input
                maxLength={32}
                onChange={(e) => 0}
                placeholder="Your name"
                className="w-full rounded bg-white/10 px-2 py-1 text-xs text-white placeholder:text-white/40"
            />
            <div className="mt-2 flex gap-2">
                <button
                    onClick={() => 0}
                    className="flex-1 rounded bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20"
                >
                    Save
                </button>
                <button
                    onClick={() => {}}
                    className="flex-1 rounded bg-white/5 px-2 py-1 text-xs text-white/70 hover:bg-white/10"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};
