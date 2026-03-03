import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SignInForm from './SignInForm';

describe('SignInForm', () => {
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

    it('renders email, password fields and sign in button', () => {
        render(
            <SignInForm api={makeApi()} onSuccess={vi.fn()} onBack={vi.fn()} />,
        );

        expect(screen.getByPlaceholderText('email')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('password')).toBeInTheDocument();
        expect(screen.getByText('sign in')).toBeInTheDocument();
        expect(screen.getByText('back')).toBeInTheDocument();
    });

    it('calls onSuccess when sign in returns 200', async () => {
        const onSuccess = vi.fn();
        let resolveSignIn: (() => void) | undefined;
        const api = makeApi({
            signIn: vi.fn().mockImplementation(
                () =>
                    new Promise<void>((resolve) => {
                        resolveSignIn = resolve;
                    }),
            ),
        });

        render(<SignInForm api={api} onSuccess={onSuccess} onBack={vi.fn()} />);

        const user = userEvent.setup();
        const button = screen.getByRole('button', { name: 'sign in' });
        await user.type(
            screen.getByPlaceholderText('email'),
            'test@example.com',
        );
        await user.type(screen.getByPlaceholderText('password'), 'secret');
        await user.click(button);

        expect(button).toHaveTextContent('...');

        resolveSignIn?.();

        await waitFor(() => {
            expect(onSuccess).toHaveBeenCalledTimes(1);
            expect(button).toHaveTextContent('✓');
        });
        expect(button).toBeDisabled();
    });

    it('blinks the loading dots in sequence while sign in is pending', async () => {
        let resolveSignIn: (() => void) | undefined;
        const api = makeApi({
            signIn: vi.fn().mockImplementation(
                () =>
                    new Promise<void>((resolve) => {
                        resolveSignIn = resolve;
                    }),
            ),
        });

        render(<SignInForm api={api} onSuccess={vi.fn()} onBack={vi.fn()} />);

        const user = userEvent.setup();
        const button = screen.getByRole('button', { name: 'sign in' });
        await user.type(
            screen.getByPlaceholderText('email'),
            'test@example.com',
        );
        await user.type(screen.getByPlaceholderText('password'), 'secret');
        await user.click(button);

        const dots = () =>
            Array.from(button.querySelectorAll<HTMLElement>('[data-dot]'));

        expect(dots()[0]).toHaveClass('opacity-100');
        expect(dots()[1]).toHaveClass('opacity-30');
        expect(dots()[2]).toHaveClass('opacity-30');

        await waitFor(
            () => {
                expect(dots()[1]).toHaveClass('opacity-100');
            },
            { timeout: 400 },
        );

        await waitFor(
            () => {
                expect(dots()[2]).toHaveClass('opacity-100');
            },
            { timeout: 400 },
        );

        await waitFor(
            () => {
                expect(dots()[0]).toHaveClass('opacity-100');
            },
            { timeout: 400 },
        );

        resolveSignIn?.();

        await waitFor(() => {
            expect(button).toHaveTextContent('✓');
        });
    });

    it('shows field errors on 422', async () => {
        const api = makeApi({
            signIn: vi.fn().mockRejectedValue({
                response: {
                    status: 422,
                    data: {
                        errors: {
                            email: [
                                'These credentials do not match our records.',
                            ],
                        },
                    },
                },
            }),
        });

        render(<SignInForm api={api} onSuccess={vi.fn()} onBack={vi.fn()} />);

        const user = userEvent.setup();
        await user.type(
            screen.getByPlaceholderText('email'),
            'test@example.com',
        );
        await user.type(screen.getByPlaceholderText('password'), 'password123');
        await user.click(screen.getByText('sign in'));

        expect(
            await screen.findByText(
                'These credentials do not match our records.',
            ),
        ).toBeInTheDocument();
    });

    it('calls onBack when back button is clicked', async () => {
        const onBack = vi.fn();

        render(
            <SignInForm api={makeApi()} onSuccess={vi.fn()} onBack={onBack} />,
        );

        const user = userEvent.setup();
        await user.click(screen.getByText('back'));

        expect(onBack).toHaveBeenCalledTimes(1);
    });
});
