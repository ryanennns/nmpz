import { clsx } from 'clsx';
import { useEffect, useRef, useState } from 'react';

export default function NamePrompt({
    onSubmit,
    onSignIn,
}: {
    onSubmit: (name: string) => void;
    onSignIn: () => void;
}) {
    const [error, setError] = useState<boolean>(false);
    const [name, setName] = useState('');
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    function submit() {
        const trimmed = name.trim();
        if (!trimmed) {
            setError(true);

            return;
        }

        setError(false);
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
                    error
                        ? 'border-solid border-red-500'
                        : 'border-white/10 focus:border-p1/50',
                )}
            />
            <button
                onClick={submit}
                className="w-full rounded bg-p1/15 px-2 py-1 text-xs text-p1 transition hover:bg-p1/25"
            >
                continue
            </button>
            <div className="flex shrink items-center justify-between rounded text-xs text-white/30">
                have an account?
                <button
                    onClick={onSignIn}
                    className="shrink rounded text-xs transition-all hover:text-p1"
                >
                    sign in
                </button>
            </div>
        </div>
    );
}
