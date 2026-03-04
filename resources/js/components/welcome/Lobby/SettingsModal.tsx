import { Link } from '@inertiajs/react';
import SimpleModal from '@/components/ui/simple-modal';
import type { Player } from '@/components/welcome/types';
import { COLOR_THEMES, useColorTheme } from '@/hooks/use-theme';
import { logout } from '@/routes';
import type { User } from '@/types/auth';

type Props = {
    open: boolean;
    onClose: () => void;
    player: Player | undefined;
    user: User | null;
    onSignOut: () => void;
};

export default function SettingsModal({
    open,
    onClose,
    player,
    user,
    onSignOut,
}: Props) {
    const { theme, setTheme } = useColorTheme();

    return (
        <SimpleModal open={open} onClose={onClose} width="xl">
            <div className="mb-4 text-sm text-white/80">settings</div>
            <div className="flex flex-col gap-5 text-xs">
                <div>
                    <div className="flex gap-2">
                        {COLOR_THEMES.map((t) => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setTheme(t.id)}
                                title={t.label}
                                className="flex flex-col items-center gap-1 rounded p-1.5 transition hover:bg-white/5"
                                aria-pressed={theme === t.id}
                            >
                                <span
                                    className="block h-5 w-5 rounded-full transition"
                                    style={{
                                        backgroundColor: t.hex,
                                        outline:
                                            theme === t.id
                                                ? '2px solid rgba(255,255,255,0.8)'
                                                : '2px solid transparent',
                                        outlineOffset: '2px',
                                    }}
                                />
                            </button>
                        ))}
                    </div>
                </div>

                {player && (
                    <div className="flex flex-col gap-3">
                        {user ? (
                            <Link
                                href={logout()}
                                as="button"
                                className="w-full rounded bg-p1/10 px-4 py-2 text-left text-p1/70 transition hover:bg-p1/20 hover:text-p1"
                            >
                                sign out
                            </Link>
                        ) : (
                            <>
                                <p className="text-white/50">
                                    warning: if you sign out without a linked
                                    email, you'll lose access to this account{' '}
                                    <span className="text-red-700">
                                        permanently
                                    </span>
                                    . sign up first if you ever want to return.
                                </p>
                                <button
                                    type="button"
                                    className="w-full rounded bg-p1/10 px-4 py-2 text-left text-p1/70 transition hover:bg-p1/20 hover:text-p1"
                                    onClick={() => {
                                        onClose();
                                        onSignOut();
                                    }}
                                >
                                    sign out
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </SimpleModal>
    );
}
