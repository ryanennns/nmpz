import { clsx } from 'clsx';
import { CircleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

type AuthFormProps = {
    children: ReactNode;
    submitLabel: string;
    onSubmit: () => Promise<boolean> | boolean;
    onBack: () => void;
    showSuccessState?: boolean;
    successLabel?: string;
};

type AuthFieldProps = {
    type: 'email' | 'password';
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    error?: string;
    serverError?: string;
};

const inputClassName =
    'w-full rounded border bg-black/40 px-2 py-1 text-xs text-white outline-none placeholder:text-white/30';

export function getValidationErrors(
    err: unknown,
): Record<string, string[]> | null {
    const axiosErr = err as {
        response?: {
            status: number;
            data: { errors?: Record<string, string[]> };
        };
    };

    if (axiosErr?.response?.status !== 422) {
        return null;
    }

    return axiosErr.response.data.errors ?? {};
}

export function AuthField({
    type,
    value,
    onChange,
    placeholder,
    error,
    serverError,
}: AuthFieldProps) {
    return (
        <div className="relative">
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={clsx(
                    inputClassName,
                    error || serverError ? 'border-red-500' : 'border-white/10',
                    serverError && 'pr-6',
                )}
            />
            {serverError && (
                <div className="group absolute inset-y-0 right-2 flex items-center">
                    <CircleAlert className="h-3 w-3 text-red-500" />
                    <div className="pointer-events-none absolute right-0 bottom-full mb-1 rounded bg-zinc-900 px-2 py-1 text-xs whitespace-nowrap text-red-400 opacity-0 transition-opacity group-hover:opacity-100">
                        {serverError}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AuthForm({
    children,
    submitLabel,
    onSubmit,
    onBack,
    showSuccessState = false,
    successLabel = '✓',
}: AuthFormProps) {
    const [pending, setPending] = useState(false);
    const [successful, setSuccessful] = useState(false);
    const [activeDot, setActiveDot] = useState(0);

    useEffect(() => {
        if (!pending) {
            setActiveDot(0);
            return;
        }

        const interval = window.setInterval(() => {
            setActiveDot((currentDot) => (currentDot + 1) % 3);
        }, 120);

        return () => {
            window.clearInterval(interval);
        };
    }, [pending]);

    const handleSubmit = async () => {
        if (pending || successful) {
            return;
        }

        setPending(true);
        try {
            const didSucceed = await onSubmit();
            setSuccessful(Boolean(didSucceed) && showSuccessState);
        } finally {
            setPending(false);
        }
    };

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                void handleSubmit();
            }}
            className="flex w-72 flex-col gap-3"
        >
            {children}
            <button
                type="submit"
                disabled={pending || successful}
                className="w-full rounded bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20 disabled:opacity-50"
            >
                {pending ? (
                    <span className="inline-flex items-center gap-0.5">
                        {[0, 1, 2].map((dot) => (
                            <span
                                key={dot}
                                data-dot
                                className={clsx(
                                    'inline-block transition-opacity duration-100',
                                    activeDot === dot
                                        ? 'opacity-100'
                                        : 'opacity-30',
                                )}
                            >
                                .
                            </span>
                        ))}
                    </span>
                ) : successful ? (
                    successLabel
                ) : (
                    submitLabel
                )}
            </button>
            <div className="flex shrink items-center justify-between rounded text-xs text-zinc-600">
                <button
                    type="button"
                    onClick={onBack}
                    className="shrink rounded px-2 py-1 text-xs transition-all hover:bg-zinc-900 hover:text-zinc-300"
                >
                    back
                </button>
            </div>
        </form>
    );
}
