import type { ComponentProps, ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueueReady } from './QueueReady';

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

describe('QueueReady', () => {
    afterEach(() => {
        cleanup();
    });

    it('calls onJoinQueue when clicking join', async () => {
        const onJoinQueue = vi.fn();
        const onEditName = vi.fn();

        render(
            <QueueReady
                playerName="ryan"
                onJoinQueue={onJoinQueue}
                onEditName={onEditName}
                isAuthenticated={false}
                onSignUp={vi.fn()}
                onSignOut={vi.fn()}
            />,
        );

        const user = userEvent.setup();
        await user.click(screen.getByText('Join queue'));

        expect(onJoinQueue).toHaveBeenCalledTimes(1);
    });

    it('edits the player name and trims input', async () => {
        const onJoinQueue = vi.fn();
        const onEditName = vi.fn();

        render(
            <QueueReady
                playerName="ryan"
                onJoinQueue={onJoinQueue}
                onEditName={onEditName}
                isAuthenticated={false}
                onSignUp={vi.fn()}
                onSignOut={vi.fn()}
            />,
        );

        const user = userEvent.setup();
        await user.click(screen.getByText('ryan'));

        const input = screen.getByRole('textbox');
        await user.clear(input);
        await user.type(input, '  neo  ');
        await user.keyboard('{Enter}');

        expect(onEditName).toHaveBeenCalledWith('neo');
    });

    it('shows "create account" when not authenticated', () => {
        render(
            <QueueReady
                playerName="ryan"
                onJoinQueue={vi.fn()}
                onEditName={vi.fn()}
                isAuthenticated={false}
                onSignUp={vi.fn()}
                onSignOut={vi.fn()}
            />,
        );

        expect(screen.getByText('create account')).toBeInTheDocument();
    });

    it('hides "create account" when authenticated', () => {
        render(
            <QueueReady
                playerName="ryan"
                onJoinQueue={vi.fn()}
                onEditName={vi.fn()}
                isAuthenticated={true}
                onSignUp={vi.fn()}
                onSignOut={vi.fn()}
            />,
        );

        expect(screen.queryByText('create account')).not.toBeInTheDocument();
        expect(screen.getByText('sign out')).toBeInTheDocument();
    });

    it('calls onSignUp when "create account" is clicked', async () => {
        const onSignUp = vi.fn();

        render(
            <QueueReady
                playerName="ryan"
                onJoinQueue={vi.fn()}
                onEditName={vi.fn()}
                isAuthenticated={false}
                onSignUp={onSignUp}
                onSignOut={vi.fn()}
            />,
        );

        const user = userEvent.setup();
        await user.click(screen.getByText('create account'));

        expect(onSignUp).toHaveBeenCalledTimes(1);
    });

    it('calls onSignOut when "sign out" is clicked', async () => {
        const onSignOut = vi.fn();

        render(
            <QueueReady
                playerName="ryan"
                onJoinQueue={vi.fn()}
                onEditName={vi.fn()}
                isAuthenticated={true}
                onSignUp={vi.fn()}
                onSignOut={onSignOut}
            />,
        );

        const user = userEvent.setup();
        await user.click(screen.getByText('sign out'));

        expect(onSignOut).toHaveBeenCalledTimes(1);
    });
});
