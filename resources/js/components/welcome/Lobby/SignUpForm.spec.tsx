import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SignUpForm from './SignUpForm';

describe('SignUpForm', () => {
    afterEach(() => cleanup());

    const makeApi = (overrides: Record<string, unknown> = {}) => ({
        createPlayer: vi.fn(),
        updatePlayer: vi.fn(),
        joinQueue: vi.fn(),
        leaveQueue: vi.fn(),
        getPlayer: vi.fn(),
        signIn: vi.fn(),
        getAuthPlayer: vi.fn(),
        claimPlayer: vi.fn(),
        ...overrides,
    });

    it('renders email, password, confirmation fields and create account button', () => {
        render(
            <SignUpForm
                playerId="player-1"
                api={makeApi()}
                onSuccess={vi.fn()}
                onBack={vi.fn()}
            />,
        );

        expect(screen.getByPlaceholderText('email')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('password')).toBeInTheDocument();
        expect(
            screen.getByPlaceholderText('confirm password'),
        ).toBeInTheDocument();
        expect(screen.getByText('create account')).toBeInTheDocument();
        expect(screen.getByText('back')).toBeInTheDocument();
    });

    it('calls onSuccess when claim returns 201', async () => {
        const onSuccess = vi.fn();
        const api = makeApi({
            claimPlayer: vi.fn().mockResolvedValue({ status: 201 }),
        });

        render(
            <SignUpForm
                playerId="player-1"
                api={api}
                onSuccess={onSuccess}
                onBack={vi.fn()}
            />,
        );

        const user = userEvent.setup();
        await user.type(
            screen.getByPlaceholderText('email'),
            'new@example.com',
        );
        await user.type(screen.getByPlaceholderText('password'), 'password123');
        await user.type(
            screen.getByPlaceholderText('confirm password'),
            'password123',
        );
        await user.click(screen.getByText('create account'));

        await waitFor(() => {
            expect(onSuccess).toHaveBeenCalledTimes(1);
        });
        expect(api.claimPlayer).toHaveBeenCalledWith(
            'player-1',
            'new@example.com',
            'password123',
            'password123',
        );
    });

    it('shows field errors on 422', async () => {
        const api = makeApi({
            claimPlayer: vi.fn().mockRejectedValue({
                response: {
                    status: 422,
                    data: {
                        errors: {
                            email: ['The email has already been taken.'],
                        },
                    },
                },
            }),
        });

        render(
            <SignUpForm
                playerId="player-1"
                api={api}
                onSuccess={vi.fn()}
                onBack={vi.fn()}
            />,
        );

        const user = userEvent.setup();
        await user.click(screen.getByText('create account'));

        expect(
            await screen.findByText('The email has already been taken.'),
        ).toBeInTheDocument();
    });

    it('calls onBack when back button is clicked', async () => {
        const onBack = vi.fn();

        render(
            <SignUpForm
                playerId="player-1"
                api={makeApi()}
                onSuccess={vi.fn()}
                onBack={onBack}
            />,
        );

        const user = userEvent.setup();
        await user.click(screen.getByText('back'));

        expect(onBack).toHaveBeenCalledTimes(1);
    });
});
