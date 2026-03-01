import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SummaryMap from './SummaryMap';
import type { SummaryRound } from './types';

vi.mock('@/components/welcome/ResultsMap', () => ({
    default: ({
        result,
    }: {
        result: {
            location: { lat: number; lng: number };
            p1Guess: { lat: number; lng: number } | null;
            p2Guess: { lat: number; lng: number } | null;
        };
    }) => (
        <div
            data-testid="results-map"
            data-lat={result.location.lat}
            data-lng={result.location.lng}
            data-p1={result.p1Guess ? JSON.stringify(result.p1Guess) : 'null'}
            data-p2={result.p2Guess ? JSON.stringify(result.p2Guess) : 'null'}
        />
    ),
}));

const round: SummaryRound = {
    id: 'round-1',
    round_number: 1,
    player_one_score: 4500,
    player_two_score: 3800,
    location: { lat: 48.8566, lng: 2.3522 },
    player_one_guess: { lat: 48.9, lng: 2.4 },
    player_two_guess: { lat: 49.0, lng: 2.5 },
};

describe('SummaryMap', () => {
    afterEach(() => cleanup());

    it('renders the results map with the correct location', () => {
        render(<SummaryMap round={round} />);
        const map = screen.getByTestId('results-map');
        expect(map).toBeInTheDocument();
        expect(map).toHaveAttribute('data-lat', '48.8566');
        expect(map).toHaveAttribute('data-lng', '2.3522');
    });

    it('passes player guesses to the results map', () => {
        render(<SummaryMap round={round} />);
        const map = screen.getByTestId('results-map');
        expect(map).toHaveAttribute(
            'data-p1',
            JSON.stringify({ lat: 48.9, lng: 2.4 }),
        );
        expect(map).toHaveAttribute(
            'data-p2',
            JSON.stringify({ lat: 49.0, lng: 2.5 }),
        );
    });

    it('passes null guesses through correctly', () => {
        render(<SummaryMap round={{ ...round, player_one_guess: null }} />);
        const map = screen.getByTestId('results-map');
        expect(map).toHaveAttribute('data-p1', 'null');
    });

    it('renders nothing when the round has no location', () => {
        const { container } = render(
            <SummaryMap round={{ ...round, location: null }} />,
        );
        expect(container).toBeEmptyDOMElement();
    });
});
