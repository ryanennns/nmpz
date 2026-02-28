import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SimpleModal from './simple-modal';

describe('SimpleModal', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('does not render when closed', () => {
        render(
            <SimpleModal open={false} onClose={vi.fn()}>
                <div>content</div>
            </SimpleModal>,
        );

        expect(screen.queryByText('content')).not.toBeInTheDocument();
    });

    it('renders when open and closes on overlay click', async () => {
        const onClose = vi.fn();
        render(
            <SimpleModal open onClose={onClose}>
                <div>content</div>
            </SimpleModal>,
        );

        expect(screen.getByText('content')).toBeInTheDocument();

        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
        const closeButtons = screen.getAllByLabelText('Close modal');
        await user.click(closeButtons[0]);

        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
