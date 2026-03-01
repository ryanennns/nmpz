import { importLibrary } from '@googlemaps/js-api-loader';
import { memo, useEffect, useRef } from 'react';
import type { LatLng } from '@/components/welcome/types';

function svgGuessCircle(circleColor: string) {
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="10" fill="${circleColor}" stroke="white" stroke-width="2"/>
</svg>`;
    return {
        url: 'data:image/svg+xml,' + encodeURIComponent(svg),
        scaledSize: new google.maps.Size(24, 24),
        anchor: new google.maps.Point(12, 12),
    };
}

export default memo(function MapPicker({
    onPin,
    pinColor,
    disabled,
}: {
    onPin: (coords: LatLng) => void;
    pinColor: string;
    disabled: boolean;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const markerRef = useRef<google.maps.Marker | null>(null);

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
                draggableCursor: 'crosshair',
            });

            map.addListener('click', (e: google.maps.MapMouseEvent) => {
                if (disabled) return;
                if (!e.latLng) return;
                const coords = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                if (markerRef.current) {
                    markerRef.current.setPosition(e.latLng);
                } else {
                    markerRef.current = new google.maps.Marker({
                        position: e.latLng,
                        map,
                        icon: svgGuessCircle(pinColor),
                        clickable: false,
                    });
                }
                onPin(coords);
            });

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

    return (
        <div
            ref={containerRef}
            className={`map-lock h-full w-full ${disabled ? 'cursor-not-allowed' : 'cursor-crosshair'}`}
        />
    );
});
