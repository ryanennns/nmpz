import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NamePrompt from './NamePrompt';

describe('NamePrompt', () => {
    afterEach(() => cleanup());

    it('submits a trimmed name', async () => {
        const onSubmit = vi.fn();
        render(<NamePrompt onSubmit={onSubmit} onSignIn={vi.fn()} />);

        const user = userEvent.setup();
        await user.type(screen.getByPlaceholderText('your name'), '  ryan  ');
        await user.click(screen.getByText('continue'));

        expect(onSubmit).toHaveBeenCalledWith('ryan');
    });

    it('does not submit an empty name', async () => {
        const onSubmit = vi.fn();
        render(<NamePrompt onSubmit={onSubmit} onSignIn={vi.fn()} />);

        const user = userEvent.setup();
        await user.click(screen.getByText('continue'));

        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('shows the error styles when error is true', () => {
        const onSubmit = vi.fn();
        render(<NamePrompt onSubmit={onSubmit} onSignIn={vi.fn()} error />);

        expect(screen.getByPlaceholderText('your name')).toHaveClass(
            'border-red-500',
        );
    });

    it('calls onSignIn when the sign in button is clicked', async () => {
        const onSignIn = vi.fn();
        render(<NamePrompt onSubmit={vi.fn()} onSignIn={onSignIn} />);

        const user = userEvent.setup();
        await user.click(screen.getByText('sign in'));

        expect(onSignIn).toHaveBeenCalledTimes(1);
    });
});
