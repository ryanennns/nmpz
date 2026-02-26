import { useEffect, useRef, useState } from 'react';

export default function NamePrompt({
    onSubmit,
}: {
    onSubmit: (name: string) => void;
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
        <div>
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
                placeholder="Your name"
                className="w-full rounded border border-white/10 bg-black/40 px-2 py-1 text-white outline-none placeholder:text-white/30"
            />
            <button
                onClick={submit}
                className="mt-2 w-full rounded bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20"
            >
                Join queue
            </button>
        </div>
    );
}
