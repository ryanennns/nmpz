import MapPicker from '@/components/welcome/MapPicker';
import SpectatorMap from '@/components/welcome/SpectatorMap';
import type { LatLng } from '@/types/shared';

export default function GuessPanel({
    roundId,
    myLocked,
    gameOver,
    mapHovered,
    onMapHover,
    onPin,
    onGuess,
    pin,
    pinColor,
    opponentLiveGuess,
}: {
    roundId: string;
    myLocked: boolean;
    gameOver: boolean;
    mapHovered: boolean;
    onMapHover: (hovered: boolean) => void;
    onPin: (coords: LatLng) => void;
    onGuess: () => void;
    pin: LatLng | null;
    pinColor: string;
    opponentLiveGuess: LatLng | null;
}) {
    return (
        <div
            className={`absolute right-4 bottom-4 z-10 overflow-hidden rounded transition-all duration-150 ${mapHovered ? 'h-[70vh] w-[55vw]' : 'h-40 w-64'}`}
            onMouseEnter={() => onMapHover(true)}
            onMouseLeave={() => onMapHover(false)}
        >
            {myLocked && !gameOver ? (
                <SpectatorMap
                    key={`spectator-${roundId}`}
                    opponentGuess={opponentLiveGuess}
                />
            ) : (
                <>
                    <MapPicker
                        key={roundId}
                        onPin={onPin}
                        pinColor={pinColor}
                        disabled={myLocked || gameOver}
                    />
                    <div className="absolute right-2 bottom-2 left-2 font-mono">
                        <button
                            onClick={onGuess}
                            disabled={!pin || myLocked || gameOver}
                            className="w-full rounded bg-black/60 px-2 py-1 text-xs text-white backdrop-blur-sm enabled:hover:bg-black/80 disabled:opacity-30"
                        >
                            {pin ? 'Lock in guess [space]' : 'Click map to place pin'}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
