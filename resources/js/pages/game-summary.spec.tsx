import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import GameSummaryPage from './game-summary';
import type { GameSummary } from '@/components/game-summary/types';

vi.mock('@inertiajs/react', () => ({
    Head: ({ title }: { title: string }) => <title>{title}</title>,
}));

vi.mock('@/components/game-summary/SummaryMap', () => ({
    default: ({ round }: { round: { id: string } }) => (
        <div data-testid="summary-map" data-round-id={round.id} />
    ),
}));

const mockGame: GameSummary = {
    id: 'game-1',
    player_one: { id: 'p1', name: 'Alice' },
    player_two: { id: 'p2', name: 'Bob' },
    winner_id: 'p1',
    player_one_total_score: 8500,
    player_two_total_score: 7200,
    rounds: [
        {
            id: 'round-1',
            round_number: 1,
            player_one_score: 4500,
            player_two_score: 3800,
            location: { lat: 48.8566, lng: 2.3522 },
            player_one_guess: { lat: 48.9, lng: 2.4 },
            player_two_guess: null,
        },
        {
            id: 'round-2',
            round_number: 2,
            player_one_score: 4000,
            player_two_score: 3400,
            location: { lat: 51.5074, lng: -0.1278 },
            player_one_guess: null,
            player_two_guess: null,
        },
    ],
};

describe('GameSummaryPage', () => {
    afterEach(() => cleanup());

    it('renders player names', () => {
        render(<GameSummaryPage game={mockGame} />);
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    it('selects the first round by default', () => {
        render(<GameSummaryPage game={mockGame} />);
        expect(screen.getByTestId('summary-map')).toHaveAttribute(
            'data-round-id',
            'round-1',
        );
    });

    it('updates the map when a different round is selected', async () => {
        render(<GameSummaryPage game={mockGame} />);
        const user = userEvent.setup();
        await user.click(screen.getByText('Round 2').closest('button')!);
        expect(screen.getByTestId('summary-map')).toHaveAttribute(
            'data-round-id',
            'round-2',
        );
    });

    it('shows the no location data message when the selected round has no location', () => {
        const gameWithNoLocation: GameSummary = {
            ...mockGame,
            rounds: [{ ...mockGame.rounds[0], location: null }],
        };
        render(<GameSummaryPage game={gameWithNoLocation} />);
        expect(screen.getByText('No location data')).toBeInTheDocument();
    });

    it('renders the page title', () => {
        render(<GameSummaryPage game={mockGame} />);
        expect(document.title).toBe('Game Summary');
    });

    it('handles an empty rounds list gracefully', () => {
        const emptyGame: GameSummary = { ...mockGame, rounds: [] };
        render(<GameSummaryPage game={emptyGame} />);
        expect(screen.queryByTestId('summary-map')).not.toBeInTheDocument();
        expect(screen.getByText('No location data')).toBeInTheDocument();
    });

    it('starts invisible and fades in on mount', async () => {
        const { container } = render(<GameSummaryPage game={mockGame} />);
        const wrapper = container.firstChild as HTMLElement;
        expect(wrapper).toHaveClass('opacity-0');
        await waitFor(() => expect(wrapper).toHaveClass('opacity-100'));
    });

    it('shows the blackout overlay after continue is clicked', async () => {
        render(<GameSummaryPage game={mockGame} />);
        const user = userEvent.setup();

        const blackout = document.querySelector('.bg-black') as HTMLElement;
        expect(blackout).toHaveClass('opacity-0');

        await user.click(screen.getByText('continue'));

        expect(blackout).toHaveClass('opacity-100');
    });

    it('redirects to / after the fade completes', () => {
        vi.useFakeTimers();
        const assignSpy = vi.fn();
        vi.stubGlobal('location', { ...window.location, assign: assignSpy });

        render(<GameSummaryPage game={mockGame} />);

        act(() => {
            fireEvent.click(screen.getByText('continue'));
        });
        expect(assignSpy).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(500);
        });
        expect(assignSpy).toHaveBeenCalledWith('/');

        vi.useRealTimers();
        vi.unstubAllGlobals();
    });
});
