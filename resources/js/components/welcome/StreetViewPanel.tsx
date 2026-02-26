import { importLibrary } from '@googlemaps/js-api-loader';
import { useEffect, useRef } from 'react';
import type { Location } from '@/components/welcome/types';

export default function StreetViewPanel({ location }: { location: Location }) {
    const containerRef = useRef<HTMLDivElement>(null);

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

            const baseHeading = location.heading;
            const basePitch = 0;
            panorama.addListener('pov_changed', () => {
                const pov = panorama.getPov();
                if (
                    Math.abs(pov.heading - baseHeading) > 0.01 ||
                    Math.abs(pov.pitch - basePitch) > 0.01
                ) {
                    panorama.setPov({
                        heading: baseHeading,
                        pitch: basePitch,
                    });
                }
            });
        }

        init().catch(console.error);
        return () => {
            cancelled = true;
        };
    }, []);

    return <div ref={containerRef} className="absolute inset-0" />;
}
