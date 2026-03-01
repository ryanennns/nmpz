import type { GameDetailRound } from '@/types/game';
import type { Message } from '@/types/shared';

export default function SpectatorSidebar({
    completedRounds,
    messages,
    spectatorMessages,
    chatText,
    setChatText,
    onSendMessage,
}: {
    completedRounds: GameDetailRound[];
    messages: Message[];
    spectatorMessages: Message[];
    chatText: string;
    setChatText: (t: string) => void;
    onSendMessage: () => void;
}) {
    return (
        <div className="flex w-72 flex-col border-l border-white/10 bg-black/40">
            <div className="flex-1 overflow-y-auto p-3">
                <div className="mb-2 text-[10px] font-semibold uppercase text-white/30">Completed Rounds</div>
                {completedRounds.length === 0 ? (
                    <div className="text-xs text-white/20">No rounds completed yet</div>
                ) : (
                    <div className="space-y-2">
                        {completedRounds.map((r) => (
                            <div key={r.round_number} className="rounded bg-white/5 px-2 py-1.5 text-[10px]">
                                <div className="mb-1 text-white/40">Round {r.round_number}</div>
                                <div className="flex justify-between">
                                    <span className="text-blue-400">{r.player_one_score}</span>
                                    <span className="text-white/20">-</span>
                                    <span className="text-red-400">{r.player_two_score}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Player chat messages */}
            <div className="border-t border-white/10 p-3">
                <div className="mb-1 text-[10px] font-semibold uppercase text-white/30">Player Chat</div>
                <div className="max-h-24 overflow-y-auto">
                    {messages.length === 0 ? (
                        <div className="text-[10px] text-white/20">No messages</div>
                    ) : (
                        messages.map((m) => (
                            <div key={m.id} className="text-[10px] text-white/60">
                                <span className="text-white/40">{m.ts}</span>{' '}
                                <span className="text-white/80">{m.name}:</span>{' '}
                                {m.text}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Spectator chat */}
            <div className="border-t border-white/10 p-3">
                <div className="mb-1 text-[10px] font-semibold uppercase text-white/30">Spectator Chat</div>
                <div className="mb-2 max-h-24 overflow-y-auto">
                    {spectatorMessages.length === 0 ? (
                        <div className="text-[10px] text-white/20">No spectator messages</div>
                    ) : (
                        spectatorMessages.map((m) => (
                            <div key={m.id} className="text-[10px] text-green-400/70">
                                <span className="text-green-400/40">{m.ts}</span>{' '}
                                <span className="text-green-400/80">{m.name}:</span>{' '}
                                {m.text}
                            </div>
                        ))
                    )}
                </div>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        onSendMessage();
                    }}
                    className="flex gap-1"
                >
                    <input
                        value={chatText}
                        onChange={(e) => setChatText(e.target.value)}
                        maxLength={200}
                        placeholder="Say something..."
                        className="flex-1 rounded bg-white/10 px-2 py-1 text-[10px] text-white placeholder:text-white/30"
                    />
                    <button
                        type="submit"
                        disabled={!chatText.trim()}
                        className="rounded bg-green-500/20 px-2 py-1 text-[10px] text-green-400 transition hover:bg-green-500/30 disabled:opacity-30"
                    >
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
}
