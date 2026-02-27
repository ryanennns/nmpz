import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

type ChatMessage = {
    id: number;
    name: string;
    text: string;
    ts: string;
};

export default function ChatSidebar({
    messages,
    chatOpen,
    chatText,
    onChatTextChange,
    onSendMessage,
}: {
    messages: ChatMessage[];
    chatOpen: boolean;
    chatText: string;
    onChatTextChange: (value: string) => void;
    onSendMessage: () => void;
}) {
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (!chatOpen) return;
        const t = setTimeout(() => inputRef.current?.focus(), 0);
        return () => clearTimeout(t);
    }, [chatOpen]);

    return (
        <div className="pointer-events-none space-y-2">
            {messages.length > 0 && (
                <div className="rounded border border-white/10 bg-black/50 p-2 text-xs text-white/80 backdrop-blur-sm">
                    {messages.map((m) => (
                        <div key={m.id} className="mb-1 last:mb-0">
                            <span className="text-white/40">{m.ts}</span>{' '}
                            <span className="text-white/70">{m.name}:</span>{' '}
                            <span>{m.text}</span>
                        </div>
                    ))}
                </div>
            )}
            <div
                className={cn(
                    'pointer-events-auto rounded border border-white/10 bg-black/60 p-2 text-xs backdrop-blur-sm',
                    chatOpen ? '' : 'opacity-70',
                )}
            >
                {chatOpen ? (
                    <input
                        ref={inputRef}
                        value={chatText}
                        maxLength={255}
                        onChange={(e) => onChatTextChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                e.stopPropagation();
                                onSendMessage();
                            }
                        }}
                        placeholder="Type a message…"
                        className="w-full bg-transparent text-white outline-none placeholder:text-white/30"
                    />
                ) : (
                    <div className="text-white/40">Press Enter to chat</div>
                )}
            </div>
        </div>
    );
}
