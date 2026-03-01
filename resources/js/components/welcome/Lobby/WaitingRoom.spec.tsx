import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WaitingRoom } from './WaitingRoom';

const fetchStats = vi.fn();

vi.mock('@/hooks/useApiClient', () => ({
    useStatsClient: () => ({
        fetchStats,
    }),
}));

describe('WaitingRoom', () => {
    beforeEach(() => {
        fetchStats.mockResolvedValue({
            data: {
                games_in_progress: 2,
                rounds_played: 5,
                total_players: 9,
                queue_count: 1,
            },
        });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
        cleanup();
    });

    it('shows the player name and lets them leave the queue', async () => {
        const onLeaveQueue = vi.fn();

        render(
            <WaitingRoom
                playerName="ryan"
                onLeaveQueue={onLeaveQueue}
                active
            />,
        );

        expect(screen.getByText('ryan')).toBeInTheDocument();

        const user = userEvent.setup();
        await user.click(screen.getByText('leave queue'));

        expect(onLeaveQueue).toHaveBeenCalledTimes(1);
    });

    it('polls stats when active', async () => {
        const onLeaveQueue = vi.fn();

        vi.useFakeTimers();

        render(
            <WaitingRoom
                playerName="ryan"
                onLeaveQueue={onLeaveQueue}
                active
            />,
        );

        await vi.advanceTimersByTimeAsync(5000);

        expect(fetchStats).toHaveBeenCalledTimes(1);
    });
});
