import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SimpleModal from './simple-modal';

describe('SimpleModal', () => {
    afterEach(() => cleanup())

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

        const user = userEvent.setup();
        await user.click(screen.getByLabelText('Close modal'));

        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
