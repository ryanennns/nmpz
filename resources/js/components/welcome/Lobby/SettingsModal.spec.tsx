import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps, ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SettingsModal from './SettingsModal';

vi.mock('@inertiajs/react', () => ({
    Link: ({
        children,
        onClick,
        ...props
    }: ComponentProps<'button'> & { children: ReactNode }) => (
        <button type="button" onClick={onClick} {...props}>
            {children}
        </button>
    ),
}));

vi.mock('@/routes', () => ({
    logout: () => ({ url: '/logout', method: 'post' }),
}));

const player = { id: 'player-1', name: 'ryan' };
const user = {
    id: 1,
    name: 'ryan',
    email: 'ryan@example.com',
    email_verified_at: null,
    created_at: '',
    updated_at: '',
};

describe('SettingsModal', () => {
    afterEach(() => cleanup());

    it('does not render when closed', () => {
        render(
            <SettingsModal
                open={false}
                onClose={vi.fn()}
                player={player}
                user={null}
                onSignOut={vi.fn()}
            />,
        );
        expect(screen.queryByText('settings')).not.toBeInTheDocument();
    });

    it('renders the heading when open', () => {
        render(
            <SettingsModal
                open
                onClose={vi.fn()}
                player={undefined}
                user={null}
                onSignOut={vi.fn()}
            />,
        );
        expect(screen.getByText('settings')).toBeInTheDocument();
    });

    it('shows no sign-out button without a player', () => {
        render(
            <SettingsModal
                open
                onClose={vi.fn()}
                player={undefined}
                user={null}
                onSignOut={vi.fn()}
            />,
        );
        expect(screen.queryByText('sign out')).not.toBeInTheDocument();
    });

    it('shows warning and sign-out for guest player', () => {
        render(
            <SettingsModal
                open
                onClose={vi.fn()}
                player={player}
                user={null}
                onSignOut={vi.fn()}
            />,
        );
        expect(screen.getByText(/warning/)).toBeInTheDocument();
        expect(screen.getByText('sign out')).toBeInTheDocument();
    });

    it('calls onClose and onSignOut when guest clicks sign out', async () => {
        const onClose = vi.fn();
        const onSignOut = vi.fn();
        render(
            <SettingsModal
                open
                onClose={onClose}
                player={player}
                user={null}
                onSignOut={onSignOut}
            />,
        );

        await userEvent.setup().click(screen.getByText('sign out'));

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onSignOut).toHaveBeenCalledTimes(1);
    });

    it('shows sign-out without warning for authenticated user', () => {
        render(
            <SettingsModal
                open
                onClose={vi.fn()}
                player={player}
                user={user}
                onSignOut={vi.fn()}
            />,
        );
        expect(screen.queryByText(/warning/)).not.toBeInTheDocument();
        expect(screen.getByText('sign out')).toBeInTheDocument();
    });
});
