import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayerStats } from './PlayerStats';

const mocks = vi.hoisted(() => ({
    api: {
        getPlayerStats: vi.fn(),
    },
}));

vi.mock('@/hooks/useApiClient', () => ({
    useUnauthedApiClient: () => mocks.api,
}));

describe('PlayerStats', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('shows loading state initially', () => {
        mocks.api.getPlayerStats.mockReturnValue(new Promise(() => {}));

        render(<PlayerStats playerId="player-1" />);

        expect(screen.getByText('loading stats...')).toBeInTheDocument();
    });

    it('displays win/loss record and elo after loading', async () => {
        mocks.api.getPlayerStats.mockResolvedValue({
            data: {
                wins: 5,
                losses: 3,
                draws: 0,
                elo: 1150,
                recent_matches: [],
            },
        });

        render(<PlayerStats playerId="player-1" />);

        expect(await screen.findByText('5W')).toBeInTheDocument();
        expect(screen.getByText('3L')).toBeInTheDocument();
        expect(screen.getByText('elo 1150')).toBeInTheDocument();
    });

    it('displays draws when present', async () => {
        mocks.api.getPlayerStats.mockResolvedValue({
            data: {
                wins: 2,
                losses: 1,
                draws: 3,
                elo: 1000,
                recent_matches: [],
            },
        });

        render(<PlayerStats playerId="player-1" />);

        await screen.findByText('2W');
        expect(screen.getByText('3D')).toBeInTheDocument();
    });

    it('hides draws when zero', async () => {
        mocks.api.getPlayerStats.mockResolvedValue({
            data: {
                wins: 1,
                losses: 1,
                draws: 0,
                elo: 1000,
                recent_matches: [],
            },
        });

        render(<PlayerStats playerId="player-1" />);

        await screen.findByText('1W');
        expect(screen.queryByText('0D')).not.toBeInTheDocument();
    });

    it('displays recent matches with opponent name and result', async () => {
        mocks.api.getPlayerStats.mockResolvedValue({
            data: {
                wins: 2,
                losses: 1,
                draws: 0,
                elo: 1100,
                recent_matches: [
                    {
                        game_id: 'g1',
                        opponent_name: 'Bob',
                        result: 'win',
                        played_at: new Date().toISOString(),
                    },
                    {
                        game_id: 'g2',
                        opponent_name: 'Alice',
                        result: 'loss',
                        played_at: new Date(Date.now() - 3600000).toISOString(),
                    },
                ],
            },
        });

        render(<PlayerStats playerId="player-1" />);

        expect(await screen.findByText('recent matches')).toBeInTheDocument();
        expect(screen.getByText('vs Bob')).toBeInTheDocument();
        expect(screen.getByText('vs Alice')).toBeInTheDocument();

        const winLabels = screen.getAllByText('W');
        expect(winLabels.length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('L')).toBeInTheDocument();
    });

    it('hides recent matches section when there are none', async () => {
        mocks.api.getPlayerStats.mockResolvedValue({
            data: {
                wins: 0,
                losses: 0,
                draws: 0,
                elo: 1000,
                recent_matches: [],
            },
        });

        render(<PlayerStats playerId="player-1" />);

        await screen.findByText('elo 1000');
        expect(screen.queryByText('recent matches')).not.toBeInTheDocument();
    });

    it('renders nothing when API call fails', async () => {
        mocks.api.getPlayerStats.mockRejectedValue(new Error('network error'));

        const { container } = render(<PlayerStats playerId="player-1" />);

        await waitFor(() => {
            expect(
                screen.queryByText('loading stats...'),
            ).not.toBeInTheDocument();
        });

        expect(container.innerHTML).toBe('');
    });

    it('calls getPlayerStats with the correct playerId', () => {
        mocks.api.getPlayerStats.mockReturnValue(new Promise(() => {}));

        render(<PlayerStats playerId="abc-123" />);

        expect(mocks.api.getPlayerStats).toHaveBeenCalledWith('abc-123');
    });
});
