import { useState } from 'react';
import MapillaryImagePanel from '@/components/welcome/MapillaryImagePanel';
import ResultsMap from '@/components/welcome/ResultsMap';
import { cn } from '@/lib/utils';
import type { SummaryRound } from './types';

export default function SummaryMap({ round }: { round: SummaryRound }) {
    const [imageHovered, setImageHovered] = useState(false);

    if (!round.location) return null;

    const mapillaryUrl = round.location.image_id
        ? `https://www.mapillary.com/app/?pKey=${round.location.image_id}`
        : null;

    return (
        <div className="relative h-full w-full">
            <ResultsMap
                result={{
                    location: round.location,
                    p1Guess: round.player_one_guess,
                    p2Guess: round.player_two_guess,
                }}
            />
            <button
                type="button"
                data-testid="summary-location-image"
                onMouseEnter={() => setImageHovered(true)}
                onMouseLeave={() => setImageHovered(false)}
                onClick={() => {
                    if (!mapillaryUrl) return;
                    window.open(mapillaryUrl, '_blank', 'noopener,noreferrer');
                }}
                className={cn(
                    'absolute right-4 bottom-4 z-10 overflow-hidden rounded shadow-lg transition-all duration-150',
                    imageHovered ? 'h-[70%] w-[55%]' : 'h-1/4 w-1/4',
                    mapillaryUrl ? 'cursor-pointer' : 'cursor-default',
                )}
            >
                <MapillaryImagePanel
                    location={{
                        lat: round.location.lat,
                        lng: round.location.lng,
                        heading: 0,
                        image_id: round.location.image_id,
                    }}
                />
            </button>
        </div>
    );
}
