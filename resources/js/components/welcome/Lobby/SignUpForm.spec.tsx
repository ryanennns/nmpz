import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SignUpForm from './SignUpForm';

const mocks = vi.hoisted(() => ({
    api: {
        createPlayer: vi.fn(),
        updatePlayer: vi.fn(),
        joinQueue: vi.fn(),
        leaveQueue: vi.fn(),
        getPlayer: vi.fn(),
        signIn: vi.fn(),
        getAuthPlayer: vi.fn(),
        claimPlayer: vi.fn(),
    },
}));

vi.mock('@/hooks/useApiClient', () => ({
    useUnauthedApiClient: () => mocks.api,
}));

describe('SignUpForm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => cleanup());

    it('renders email, password, confirmation fields and create account button', () => {
        render(
            <SignUpForm
                playerId="player-1"
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
        mocks.api.claimPlayer.mockResolvedValue({
            status: 201,
            data: {
                player: { id: 'player-1' },
                user: { id: 1, email: 'new@example.com' },
            },
        });

        render(
            <SignUpForm
                playerId="player-1"
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
        const button = screen.getByRole('button', { name: 'create account' });
        await user.click(button);

        await waitFor(() => {
            expect(onSuccess).toHaveBeenCalledTimes(1);
            expect(button).toHaveTextContent('✓');
        });
        expect(button).toBeDisabled();
        expect(mocks.api.claimPlayer).toHaveBeenCalledWith(
            'player-1',
            'new@example.com',
            'password123',
            'password123',
        );
    });

    it('shows field errors on 422', async () => {
        mocks.api.claimPlayer.mockRejectedValue({
            response: {
                status: 422,
                data: {
                    errors: {
                        email: ['The email has already been taken.'],
                    },
                },
            },
        });

        render(
            <SignUpForm
                playerId="player-1"
                onSuccess={vi.fn()}
                onBack={vi.fn()}
            />,
        );

        const user = userEvent.setup();
        await user.type(
            screen.getByPlaceholderText('email'),
            'taken@example.com',
        );
        await user.type(screen.getByPlaceholderText('password'), 'password123');
        await user.type(
            screen.getByPlaceholderText('confirm password'),
            'password123',
        );
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
                onSuccess={vi.fn()}
                onBack={onBack}
            />,
        );

        const user = userEvent.setup();
        await user.click(screen.getByText('back'));

        expect(onBack).toHaveBeenCalledTimes(1);
    });
});
