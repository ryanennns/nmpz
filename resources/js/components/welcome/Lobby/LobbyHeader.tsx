import { MessageCircleQuestion } from 'lucide-react';

export const LobbyHeader = ({ onClick }: { onClick: () => void }) => {
    return (
        <div className="relative text-center font-mono text-5xl text-white">
            <span className="font-semibold">nmpz</span>
            <span className="text-white/50">.dev</span>
            <button
                type="button"
                onClick={onClick}
                className="absolute -top-2 -right-6 flex h-6 w-6 items-center justify-center rounded-full text-xs text-white/70 transition hover:text-white"
                aria-label="Open help"
            >
                <MessageCircleQuestion />
            </button>
        </div>
    );
};
