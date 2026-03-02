import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { WinnerOverlay } from './WinnerOverlay';

describe('WinnerOverlay', () => {
    afterEach(() => cleanup());

    it('shows the current player elo delta only', () => {
        render(
            <WinnerOverlay
                visible
                winnerId="player-1"
                winnerName="Alice"
                id="player-1"
                eloDelta={{
                    'player-1': 16,
                    'player-2': -16,
                }}
            />,
        );

        expect(screen.getByText('you won')).toBeInTheDocument();
        expect(screen.getByText('winner: Alice')).toBeInTheDocument();
        expect(screen.getByText('+16 elo')).toBeInTheDocument();
        expect(screen.queryByText(/-16/)).not.toBeInTheDocument();
    });

    it('omits elo rows when the game has no elo update', () => {
        render(
            <WinnerOverlay
                visible
                winnerId={null}
                winnerName={null}
                id="player-1"
                eloDelta={{}}
            />,
        );

        expect(screen.getByText('no contest')).toBeInTheDocument();
        expect(screen.queryByText(/elo/)).not.toBeInTheDocument();
    });
});
