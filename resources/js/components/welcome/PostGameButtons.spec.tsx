import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PostGameButtons } from './PostGameButtons';

describe('PostGameButtons', () => {
    afterEach(() => cleanup());

    it('renders all three buttons', () => {
        render(
            <PostGameButtons
                visible
                onHome={vi.fn()}
                onRequeue={vi.fn()}
                onSummary={vi.fn()}
            />,
        );
        expect(screen.getByText('home')).toBeInTheDocument();
        expect(screen.getByText('requeue')).toBeInTheDocument();
        expect(screen.getByText('summary')).toBeInTheDocument();
    });

    it('calls onHome when home is clicked', async () => {
        const onHome = vi.fn();
        render(
            <PostGameButtons
                visible
                onHome={onHome}
                onRequeue={vi.fn()}
                onSummary={vi.fn()}
            />,
        );
        await userEvent.click(screen.getByText('home'));
        expect(onHome).toHaveBeenCalledTimes(1);
    });

    it('calls onRequeue when requeue is clicked', async () => {
        const onRequeue = vi.fn();
        render(
            <PostGameButtons
                visible
                onHome={vi.fn()}
                onRequeue={onRequeue}
                onSummary={vi.fn()}
            />,
        );
        await userEvent.click(screen.getByText('requeue'));
        expect(onRequeue).toHaveBeenCalledTimes(1);
    });

    it('calls onSummary when summary is clicked', async () => {
        const onSummary = vi.fn();
        render(
            <PostGameButtons
                visible
                onHome={vi.fn()}
                onRequeue={vi.fn()}
                onSummary={onSummary}
            />,
        );
        await userEvent.click(screen.getByText('summary'));
        expect(onSummary).toHaveBeenCalledTimes(1);
    });

    it('is fully opaque when visible', () => {
        const { container } = render(
            <PostGameButtons
                visible
                onHome={vi.fn()}
                onRequeue={vi.fn()}
                onSummary={vi.fn()}
            />,
        );
        expect(container.firstChild).toHaveClass('opacity-100');
        expect(container.firstChild).not.toHaveClass('opacity-0');
    });

    it('is transparent and non-interactive when not visible', () => {
        const { container } = render(
            <PostGameButtons
                visible={false}
                onHome={vi.fn()}
                onRequeue={vi.fn()}
                onSummary={vi.fn()}
            />,
        );
        expect(container.firstChild).toHaveClass('opacity-0');
        expect(container.firstChild).toHaveClass('pointer-events-none');
    });
});
