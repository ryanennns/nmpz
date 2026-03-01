import MapillaryImagePanel from '@/components/welcome/MapillaryImagePanel';
import ResultsMap from '@/components/welcome/ResultsMap';
import type { SummaryRound } from './types';

export default function SummaryMap({ round }: { round: SummaryRound }) {
    if (!round.location) return null;

    return (
        <div className="relative h-full w-full">
            <ResultsMap
                result={{
                    location: round.location,
                    p1Guess: round.player_one_guess,
                    p2Guess: round.player_two_guess,
                }}
            />
            <div className="absolute right-4 bottom-4 h-1/4 w-1/4 overflow-hidden rounded shadow-lg">
                <MapillaryImagePanel
                    location={{
                        lat: round.location.lat,
                        lng: round.location.lng,
                        heading: 0,
                        image_id: round.location.image_id,
                    }}
                />
            </div>
        </div>
    );
}
