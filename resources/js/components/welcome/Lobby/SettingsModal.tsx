import { Link } from '@inertiajs/react';
import SimpleModal from '@/components/ui/simple-modal';
import { logout } from '@/routes';
import type { User } from '@/types/auth';
import type { Player } from '@/components/welcome/types';

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
    return (
        <SimpleModal open={open} onClose={onClose} width="xl">
            <div className="mb-4 text-sm text-white/80">settings</div>
            {player && (
                <div className="flex flex-col gap-3 text-xs">
                    {user ? (
                        <Link
                            href={logout()}
                            as="button"
                            className="w-full rounded bg-white/10 px-4 py-2 text-left text-white/70 transition hover:bg-white/20 hover:text-white"
                        >
                            sign out
                        </Link>
                    ) : (
                        <>
                            <p className="text-white/50">
                                warning: if you sign out without a linked email,
                                you'll lose access to this account{' '}
                                <span className="text-red-700">
                                    permanently
                                </span>
                                . sign up first if you ever want to return.
                            </p>
                            <button
                                type="button"
                                className="w-full rounded bg-white/10 px-4 py-2 text-left text-white/70 transition hover:bg-white/20 hover:text-white"
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
        </SimpleModal>
    );
}
