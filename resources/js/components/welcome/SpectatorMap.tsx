import { importLibrary } from '@googlemaps/js-api-loader';
import { memo, useEffect, useRef } from 'react';
import type { LatLng } from '@/components/welcome/types';

function svgOpponentCircle() {
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
  <circle cx="10" cy="10" r="8" fill="#f59e0b" fill-opacity="0.7" stroke="white" stroke-width="2"/>
</svg>`;
    return {
        url: 'data:image/svg+xml,' + encodeURIComponent(svg),
        scaledSize: new google.maps.Size(20, 20),
        anchor: new google.maps.Point(10, 10),
    };
}

export default memo(function SpectatorMap({
    opponentGuess,
}: {
    opponentGuess: LatLng | null;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const markerRef = useRef<google.maps.Marker | null>(null);
    const mapRef = useRef<google.maps.Map | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function init() {
            await importLibrary('maps');
            if (cancelled || !containerRef.current) return;

            const map = new google.maps.Map(containerRef.current, {
                center: { lat: 20, lng: 0 },
                zoom: 1,
                disableDefaultUI: true,
                clickableIcons: false,
                draggableCursor: 'default',
            });
            mapRef.current = map;

            const observer = new ResizeObserver(() => {
                google.maps.event.trigger(map, 'resize');
            });
            if (containerRef.current) observer.observe(containerRef.current);
            return () => observer.disconnect();
        }

        init().catch(() => {});
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!mapRef.current || !opponentGuess) return;

        const position = new google.maps.LatLng(
            opponentGuess.lat,
            opponentGuess.lng,
        );

        if (markerRef.current) {
            markerRef.current.setPosition(position);
        } else {
            markerRef.current = new google.maps.Marker({
                position,
                map: mapRef.current,
                icon: svgOpponentCircle(),
                clickable: false,
            });
        }
    }, [opponentGuess?.lat, opponentGuess?.lng]);

    return (
        <div className="relative h-full w-full">
            <div ref={containerRef} className="h-full w-full" />
            <div className="pointer-events-none absolute top-2 left-2 rounded bg-black/60 px-2 py-1 font-mono text-[10px] text-amber-400 backdrop-blur-sm">
                {opponentGuess ? 'Watching opponent...' : 'Waiting for opponent...'}
            </div>
        </div>
    );
});
