import { setOptions } from '@googlemaps/js-api-loader';
import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import RoundList from '@/components/game-summary/RoundList';
import SummaryMap from '@/components/game-summary/SummaryMap';
import type { GameSummary } from '@/components/game-summary/types';

setOptions({
    key: import.meta.env.VITE_GOOGLE_MAPS_KEY as string,
    v: 'weekly',
});

const FADE_MS = 500;

export default function GameSummaryPage({ game }: { game: GameSummary }) {
    const [selectedRoundId, setSelectedRoundId] = useState<string | null>(
        game.rounds[0]?.id ?? null,
    );
    const [blackoutVisible, setBlackoutVisible] = useState(false);
    const [pageVisible, setPageVisible] = useState(false);

    useEffect(() => {
        const id = requestAnimationFrame(() => setPageVisible(true));
        return () => cancelAnimationFrame(id);
    }, []);

    const selectedRound =
        game.rounds.find((r) => r.id === selectedRoundId) ?? null;

    function handleContinue() {
        setBlackoutVisible(true);
        window.setTimeout(() => window.location.assign('/'), FADE_MS);
    }

    return (
        <>
            <Head title="Game Summary" />
            <div
                className={`transition-opacity duration-500 ${pageVisible ? 'opacity-100' : 'opacity-0'}`}
            >
                <div className="relative flex h-screen w-screen overflow-hidden bg-neutral-900 font-mono text-white">
                    <RoundList
                        game={game}
                        selectedRoundId={selectedRoundId}
                        onSelectRound={setSelectedRoundId}
                        onContinue={handleContinue}
                    />
                    <div className="relative flex-1">
                        {selectedRound?.location ? (
                            <SummaryMap round={selectedRound} />
                        ) : (
                            <div className="flex h-full items-center justify-center text-sm text-neutral-500">
                                No location data
                            </div>
                        )}
                    </div>
                    <div
                        className={`pointer-events-none absolute inset-0 z-40 bg-black transition-opacity duration-500 ${blackoutVisible ? 'opacity-100' : 'opacity-0'}`}
                    />
                </div>
            </div>
        </>
    );
}
