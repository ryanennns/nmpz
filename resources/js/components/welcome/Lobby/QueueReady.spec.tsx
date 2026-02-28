import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { QueueReady } from './QueueReady';

describe('QueueReady', () => {
    it('calls onJoinQueue when clicking join', async () => {
        const onJoinQueue = vi.fn();
        const onEditName = vi.fn();

        render(
            <QueueReady
                playerName="ryan"
                onJoinQueue={onJoinQueue}
                onEditName={onEditName}
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
});
