import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocationReportMenu } from './LocationReportMenu';

describe('LocationReportMenu', () => {
    afterEach(() => cleanup());

    it('submits the selected reason', async () => {
        const onSubmit = vi.fn().mockResolvedValue(undefined);

        render(<LocationReportMenu onSubmit={onSubmit} />);
        const toggle = screen.getByLabelText('Report location');
        const panel = screen.getByTestId('location-report-panel');

        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        expect(panel).toHaveAttribute('aria-hidden', 'true');

        await userEvent.click(toggle);
        await userEvent.click(screen.getByLabelText('Inappropriate'));
        expect(screen.getByText('submit')).toBeInTheDocument();
        await userEvent.click(screen.getByText('submit'));

        expect(onSubmit).toHaveBeenCalledWith('inappropriate');
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        expect(panel).toHaveAttribute('aria-hidden', 'true');
        expect(screen.queryByText('sending...')).not.toBeInTheDocument();
    });

    it('closes the menu when submit fails', async () => {
        const onSubmit = vi.fn().mockRejectedValue(new Error('nope'));

        render(<LocationReportMenu onSubmit={onSubmit} />);
        const toggle = screen.getByLabelText('Report location');
        const panel = screen.getByTestId('location-report-panel');

        await userEvent.click(toggle);
        await userEvent.click(screen.getByText('submit'));

        expect(onSubmit).toHaveBeenCalledWith('inaccurate');
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        expect(panel).toHaveAttribute('aria-hidden', 'true');
    });

    it('does not open when disabled', async () => {
        const onSubmit = vi.fn().mockResolvedValue(undefined);

        render(<LocationReportMenu onSubmit={onSubmit} disabled />);

        const toggle = screen.getByLabelText('Report location');
        const panel = screen.getByTestId('location-report-panel');

        expect(toggle).toBeDisabled();
        expect(panel).toHaveAttribute('aria-hidden', 'true');

        await userEvent.click(toggle);

        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        expect(panel).toHaveAttribute('aria-hidden', 'true');
        expect(onSubmit).not.toHaveBeenCalled();
    });
});
