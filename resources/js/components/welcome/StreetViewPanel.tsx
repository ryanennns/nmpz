import { importLibrary } from '@googlemaps/js-api-loader';
import { useEffect, useRef } from 'react';
import type { Location } from '@/components/welcome/types';

export default function StreetViewPanel({
    location,
    onHeadingChange,
}: {
    location: Location;
    onHeadingChange?: (heading: number) => void;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);
    const lastViewToggleRef = useRef<'north' | 'ground' | null>(null);
    const lastPovRef = useRef<{ heading: number; pitch: number } | null>(null);
    const ignoreNextPovRef = useRef(false);
    const userMovedSinceToggleRef = useRef(false);

    useEffect(() => {
        let cancelled = false;

        async function init() {
            const { StreetViewPanorama } = await importLibrary('streetView');
            if (cancelled || !containerRef.current) return;
            const panorama = new StreetViewPanorama(containerRef.current, {
                position: { lat: location.lat, lng: location.lng },
                pov: { heading: location.heading, pitch: 0 },
                disableDefaultUI: true,
                clickToGo: false,
                disableDoubleClickZoom: true,
                scrollwheel: true,
                showRoadLabels: false,
                motionTracking: false,
                motionTrackingControl: false,
                linksControl: false,
                panControl: false,
                zoomControl: true,
                addressControl: false,
                fullscreenControl: false,
            });

            panoramaRef.current = panorama;

            panorama.addListener('pov_changed', () => {
                const pov = panorama.getPov();
                if (ignoreNextPovRef.current) {
                    ignoreNextPovRef.current = false;
                } else {
                    const last = lastPovRef.current;
                    if (
                        last &&
                        (Math.abs(pov.heading - last.heading) > 0.5 ||
                            Math.abs(pov.pitch - last.pitch) > 0.5)
                    ) {
                        userMovedSinceToggleRef.current = true;
                    }
                }
                lastPovRef.current = { heading: pov.heading, pitch: pov.pitch };
                if (typeof onHeadingChange === 'function') {
                    onHeadingChange(pov.heading);
                }
            });
        }

        init().catch(() => {});
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (e.code !== 'KeyN' || e.repeat) return;
            const target = e.target as HTMLElement | null;
            if (
                target &&
                (target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.isContentEditable)
            ) {
                return;
            }

            const panorama = panoramaRef.current;
            if (!panorama) return;

            if (
                lastViewToggleRef.current === 'north' &&
                !userMovedSinceToggleRef.current
            ) {
                ignoreNextPovRef.current = true;
                panorama.setPov({ heading: 0, pitch: -90 });
                panorama.setZoom(0);
                lastViewToggleRef.current = 'ground';
                return;
            }

            ignoreNextPovRef.current = true;
            panorama.setPov({ heading: 0, pitch: 0 });
            panorama.setZoom(0);
            lastViewToggleRef.current = 'north';
            userMovedSinceToggleRef.current = false;
        }

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    return <div ref={containerRef} className="absolute inset-0" />;
}
