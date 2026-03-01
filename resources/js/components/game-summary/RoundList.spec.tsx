import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import RoundList from './RoundList';
import type { GameSummary } from './types';

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
            player_two_guess: { lat: 49.0, lng: 2.5 },
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

describe('RoundList', () => {
    afterEach(() => cleanup());

    it('renders both player names', () => {
        render(
            <RoundList
                game={mockGame}
                selectedRoundId={null}
                onSelectRound={vi.fn()}
                onContinue={vi.fn()}
            />,
        );
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    it('renders total scores', () => {
        render(
            <RoundList
                game={mockGame}
                selectedRoundId={null}
                onSelectRound={vi.fn()}
                onContinue={vi.fn()}
            />,
        );
        expect(
            screen.getByText(mockGame.player_one_total_score.toLocaleString()),
        ).toBeInTheDocument();
        expect(
            screen.getByText(mockGame.player_two_total_score.toLocaleString()),
        ).toBeInTheDocument();
    });

    it('shows the winner name when there is a winner', () => {
        render(
            <RoundList
                game={mockGame}
                selectedRoundId={null}
                onSelectRound={vi.fn()}
                onContinue={vi.fn()}
            />,
        );
        expect(screen.getByText('Winner: Alice')).toBeInTheDocument();
    });

    it('does not show a winner line when winner_id is null', () => {
        render(
            <RoundList
                game={{ ...mockGame, winner_id: null }}
                selectedRoundId={null}
                onSelectRound={vi.fn()}
                onContinue={vi.fn()}
            />,
        );
        expect(screen.queryByText(/Winner:/)).not.toBeInTheDocument();
    });

    it('renders all rounds', () => {
        render(
            <RoundList
                game={mockGame}
                selectedRoundId={null}
                onSelectRound={vi.fn()}
                onContinue={vi.fn()}
            />,
        );
        expect(screen.getByText('Round 1')).toBeInTheDocument();
        expect(screen.getByText('Round 2')).toBeInTheDocument();
    });

    it('shows round scores', () => {
        render(
            <RoundList
                game={mockGame}
                selectedRoundId="round-1"
                onSelectRound={vi.fn()}
                onContinue={vi.fn()}
            />,
        );
        expect(screen.getByText((4500).toLocaleString())).toBeInTheDocument();
        expect(screen.getByText((3800).toLocaleString())).toBeInTheDocument();
    });

    it('shows dashes for missing scores', () => {
        const gameWithNullScores: GameSummary = {
            ...mockGame,
            rounds: [
                {
                    ...mockGame.rounds[0],
                    player_one_score: null,
                    player_two_score: null,
                },
            ],
        };
        render(
            <RoundList
                game={gameWithNullScores}
                selectedRoundId={null}
                onSelectRound={vi.fn()}
                onContinue={vi.fn()}
            />,
        );
        expect(screen.getAllByText('—')).toHaveLength(2);
    });

    it('calls onSelectRound with the round id when clicked', async () => {
        const onSelectRound = vi.fn();
        render(
            <RoundList
                game={mockGame}
                selectedRoundId={null}
                onSelectRound={onSelectRound}
                onContinue={vi.fn()}
            />,
        );
        const user = userEvent.setup();
        await user.click(screen.getByText('Round 1').closest('button')!);
        expect(onSelectRound).toHaveBeenCalledWith('round-1');
    });

    it('calls onSelectRound with the correct id for each round', async () => {
        const onSelectRound = vi.fn();
        render(
            <RoundList
                game={mockGame}
                selectedRoundId={null}
                onSelectRound={onSelectRound}
                onContinue={vi.fn()}
            />,
        );
        const user = userEvent.setup();
        await user.click(screen.getByText('Round 2').closest('button')!);
        expect(onSelectRound).toHaveBeenCalledWith('round-2');
    });

    it('calls onContinue when the continue button is clicked', async () => {
        const onContinue = vi.fn();
        render(
            <RoundList
                game={mockGame}
                selectedRoundId={null}
                onSelectRound={vi.fn()}
                onContinue={onContinue}
            />,
        );
        const user = userEvent.setup();
        await user.click(screen.getByText('continue'));
        expect(onContinue).toHaveBeenCalledTimes(1);
    });
});
