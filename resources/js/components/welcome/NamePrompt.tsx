import { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';

export default function NamePrompt({
    onSubmit,
    error = false,
}: {
    onSubmit: (name: string) => void;
    error?: boolean;
}) {
    const [name, setName] = useState('');
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    function submit() {
        const trimmed = name.trim();
        if (!trimmed) return;
        onSubmit(trimmed.slice(0, 50));
    }

    return (
        <div className="flex w-72 flex-col gap-3">
            <input
                ref={inputRef}
                value={name}
                maxLength={50}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        submit();
                    }
                }}
                placeholder="your name"
                className={clsx(
                    'w-full rounded border bg-black/40 px-2 py-1 text-xs text-white outline-none placeholder:text-white/30',
                    error ? 'border-solid border-red-500' : 'border-white/10',
                )}
            />
            <button
                onClick={submit}
                className="w-full rounded bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20"
            >
                continue
            </button>
            <div className="flex shrink items-center justify-between rounded px-2 py-1 text-xs text-zinc-600">
                have an account?
                <button className="shrink rounded px-2 py-1 text-xs transition-all hover:bg-zinc-900 hover:text-zinc-300">
                    {' '}
                    sign in
                </button>
            </div>
        </div>
    );
}
