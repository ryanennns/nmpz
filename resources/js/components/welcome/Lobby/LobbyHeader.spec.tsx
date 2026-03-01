import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LobbyHeader } from './LobbyHeader';

describe('LobbyHeader', () => {
    it('fires onClick when the help button is clicked', async () => {
        const onClick = vi.fn();
        render(<LobbyHeader onClick={onClick} />);

        const user = userEvent.setup();
        await user.click(screen.getByLabelText('Open help'));

        expect(onClick).toHaveBeenCalledTimes(1);
    });
});
