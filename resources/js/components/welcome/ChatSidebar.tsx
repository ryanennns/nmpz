import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

type ChatMessage = {
    id: number;
    name: string;
    text: string;
    ts: string;
    clientState?: 'pending' | 'failed';
};

export default function ChatSidebar({
    messages,
    chatOpen,
    chatText,
    onChatTextChange,
    onSendMessage,
    onCloseChat,
}: {
    messages: ChatMessage[];
    chatOpen: boolean;
    chatText: string;
    onChatTextChange: (value: string) => void;
    onSendMessage: () => void;
    onCloseChat: () => void;
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
                            <span
                                className={cn(
                                    m.clientState === 'failed'
                                        ? 'text-red-300/55'
                                        : 'text-white/80',
                                )}
                            >
                                {m.text}
                            </span>
                        </div>
                    ))}
                </div>
            )}
            <div
                className={cn(
                    'pointer-events-auto rounded border bg-black/60 p-2 text-xs backdrop-blur-sm transition-colors',
                    chatOpen ? 'border-p1/30' : 'border-white/10 opacity-70',
                )}
            >
                {chatOpen ? (
                    <input
                        ref={inputRef}
                        value={chatText}
                        maxLength={255}
                        onChange={(e) => onChatTextChange(e.target.value)}
                        onBlur={onCloseChat}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                e.stopPropagation();
                                onSendMessage();
                                return;
                            }

                            if (e.key === 'Escape') {
                                e.preventDefault();
                                e.stopPropagation();
                                e.currentTarget.blur();
                                onCloseChat();
                            }
                        }}
                        placeholder="Type a message…"
                        className="w-full bg-transparent text-white outline-none placeholder:text-white/30"
                    />
                ) : (
                    <div className="text-white/40">&lt;enter&gt; to chat</div>
                )}
            </div>
        </div>
    );
}
