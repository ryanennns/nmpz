import { useState } from 'react';
import type { Player } from '@/components/welcome/types';
import type { useUnauthedApiClient } from '@/hooks/useApiClient';
import type { User } from '@/types';

export default function SignUpForm({
    playerId,
    api,
    onSuccess,
    onBack,
}: {
    playerId: string;
    api: ReturnType<typeof useUnauthedApiClient>;
    onSuccess: (player: Player, user: User) => void;
    onBack: () => void;
}) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [errors, setErrors] = useState<Record<string, string[]>>({});

    const submit = async () => {
        setErrors({});
        try {
            const data = await api.claimPlayer(
                playerId,
                email,
                password,
                passwordConfirmation,
            );
            onSuccess(data.data.player as Player, data.data.user as User);
        } catch (err: unknown) {
            const axiosErr = err as {
                response?: {
                    status: number;
                    data: { errors?: Record<string, string[]> };
                };
            };
            if (axiosErr?.response?.status === 422) {
                setErrors(axiosErr.response.data.errors ?? {});
            }
        }
    };

    return (
        <div className="flex w-72 flex-col gap-3">
            <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email"
                className="w-full rounded border border-white/10 bg-black/40 px-2 py-1 text-xs text-white outline-none placeholder:text-white/30"
            />
            {errors.email && (
                <p className="text-xs text-red-400">{errors.email[0]}</p>
            )}
            <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password"
                className="w-full rounded border border-white/10 bg-black/40 px-2 py-1 text-xs text-white outline-none placeholder:text-white/30"
            />
            {errors.password && (
                <p className="text-xs text-red-400">{errors.password[0]}</p>
            )}
            <input
                type="password"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                placeholder="confirm password"
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        void submit();
                    }
                }}
                className="w-full rounded border border-white/10 bg-black/40 px-2 py-1 text-xs text-white outline-none placeholder:text-white/30"
            />
            <button
                onClick={() => void submit()}
                className="w-full rounded bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20"
            >
                create account
            </button>
            <div className="flex shrink items-center justify-between rounded text-xs text-zinc-600">
                <button
                    onClick={onBack}
                    className="shrink rounded px-2 py-1 text-xs transition-all hover:bg-zinc-900 hover:text-zinc-300"
                >
                    back
                </button>
            </div>
        </div>
    );
}
