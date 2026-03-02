import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { WinnerOverlay } from './WinnerOverlay';

describe('WinnerOverlay', () => {
    afterEach(() => cleanup());

    it('shows signed elo deltas for both players', () => {
        render(
            <WinnerOverlay
                visible
                winnerId="player-1"
                winnerName="Alice"
                id="player-1"
                opponentId="player-2"
                opponentName="Bob"
                eloDelta={{
                    'player-1': 16,
                    'player-2': -16,
                }}
            />,
        );

        expect(screen.getByText('you won')).toBeInTheDocument();
        expect(screen.getByText('winner: Alice')).toBeInTheDocument();
        expect(screen.getByText('you: elo +16')).toBeInTheDocument();
        expect(screen.getByText('Bob: elo -16')).toBeInTheDocument();
    });

    it('omits elo rows when the game has no elo update', () => {
        render(
            <WinnerOverlay
                visible
                winnerId={null}
                winnerName={null}
                id="player-1"
                opponentId="player-2"
                opponentName="Bob"
                eloDelta={{}}
            />,
        );

        expect(screen.getByText('no contest')).toBeInTheDocument();
        expect(screen.queryByText(/elo/)).not.toBeInTheDocument();
    });
});
