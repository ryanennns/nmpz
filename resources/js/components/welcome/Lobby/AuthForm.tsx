import type { FormEvent, ReactNode } from 'react';

type AuthFormProps = {
    children: ReactNode;
    submitLabel: string;
    onSubmit: () => Promise<void> | void;
    onBack: () => void;
};

type AuthFieldProps = {
    type: 'email' | 'password';
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    error?: string;
};

const inputClassName =
    'w-full rounded border border-white/10 bg-black/40 px-2 py-1 text-xs text-white outline-none placeholder:text-white/30';

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
}: AuthFieldProps) {
    return (
        <>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={inputClassName}
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
        </>
    );
}

export default function AuthForm({
    children,
    submitLabel,
    onSubmit,
    onBack,
}: AuthFormProps) {
    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        void onSubmit();
    };

    return (
        <form onSubmit={handleSubmit} className="flex w-72 flex-col gap-3">
            {children}
            <button
                type="submit"
                className="w-full rounded bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20"
            >
                {submitLabel}
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
