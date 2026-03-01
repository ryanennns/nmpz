import ResultsMap from '@/components/welcome/ResultsMap';
import type { SummaryRound } from './types';

export default function SummaryMap({ round }: { round: SummaryRound }) {
    if (!round.location) return null;

    return (
        <ResultsMap
            result={{
                location: round.location,
                p1Guess: round.player_one_guess,
                p2Guess: round.player_two_guess,
            }}
        />
    );
}
