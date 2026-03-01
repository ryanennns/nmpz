import { setOptions } from '@googlemaps/js-api-loader';

export function initGoogleMaps() {
    setOptions({
        key: import.meta.env.VITE_GOOGLE_MAPS_KEY as string,
        v: 'weekly',
    });
}
