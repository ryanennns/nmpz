import { importLibrary } from '@googlemaps/js-api-loader';
import { useEffect, useRef } from 'react';
import type { RoundResult } from '@/components/welcome/types';

function svgDot(color: string) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><circle cx="8" cy="8" r="7" fill="${color}" stroke="white" stroke-width="2"/></svg>`;
    return {
        url: 'data:image/svg+xml,' + encodeURIComponent(svg),
        scaledSize: new google.maps.Size(16, 16),
        anchor: new google.maps.Point(8, 8),
    };
}

function svgFlagDot(circleColor: string) {
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
  <circle cx="18" cy="18" r="16" fill="${circleColor}" stroke="white" stroke-width="2.5"/>
  <path d="M16 9v18" stroke="white" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M16 9h12l-3 4 3 4H16" fill="white"/>
</svg>`;
    return {
        url: 'data:image/svg+xml,' + encodeURIComponent(svg),
        scaledSize: new google.maps.Size(36, 36),
        anchor: new google.maps.Point(18, 18),
    };
}

export default function ResultsMap({ result }: { result: RoundResult }) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let cancelled = false;

        async function init() {
            await importLibrary('maps');
            await importLibrary('marker');
            if (cancelled || !containerRef.current) return;

            const map = new google.maps.Map(containerRef.current, {
                center: result.location,
                zoom: 3,
                disableDefaultUI: true,
                clickableIcons: false,
            });

            const bounds = new google.maps.LatLngBounds();

            new google.maps.Marker({
                position: result.location,
                map,
                icon: svgFlagDot('#facc15'),
            });
            bounds.extend(result.location);

            const dashedLine = {
                strokeColor: '#000000',
                strokeOpacity: 0,
                strokeWeight: 0,
                icons: [
                    {
                        icon: {
                            path: 'M 0,-1 0,1',
                            strokeOpacity: 0.6,
                            strokeWeight: 2,
                            scale: 3,
                        },
                        offset: '0',
                        repeat: '12px',
                    },
                ],
            };

            if (result.p1Guess) {
                new google.maps.Marker({
                    position: result.p1Guess,
                    map,
                    icon: svgDot('#60a5fa'),
                });
                bounds.extend(result.p1Guess);
                new google.maps.Polyline({
                    path: [result.location, result.p1Guess],
                    map,
                    ...dashedLine,
                });
            }

            if (result.p2Guess) {
                new google.maps.Marker({
                    position: result.p2Guess,
                    map,
                    icon: svgDot('#f87171'),
                });
                bounds.extend(result.p2Guess);
                new google.maps.Polyline({
                    path: [result.location, result.p2Guess],
                    map,
                    ...dashedLine,
                });
            }

            requestAnimationFrame(() =>
                google.maps.event.trigger(map, 'resize'),
            );
            map.fitBounds(bounds, 80);
        }

        init().catch(console.error);
        return () => {
            cancelled = true;
        };
    }, [result]);

    return (
        <div ref={containerRef} className="streetview-lock absolute inset-0" />
    );
}
