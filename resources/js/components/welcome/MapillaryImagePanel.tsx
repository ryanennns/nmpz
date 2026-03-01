import { useEffect, useRef, useState } from 'react';
import type { Location } from '@/components/welcome/types';

type MapillaryImage = {
    id: string;
    thumb_2048_url?: string;
    thumb_1024_url?: string;
    computed_compass_angle?: number;
    compass_angle?: number;
};

function buildBbox(lat: number, lng: number, delta = 0.0005) {
    const left = lng - delta;
    const bottom = lat - delta;
    const right = lng + delta;
    const top = lat + delta;
    return `${left},${bottom},${right},${top}`;
}

export default function MapillaryImagePanel({
    location,
    onHeadingChange,
}: {
    location: Location;
    onHeadingChange?: (heading: number) => void;
}) {
    const token = import.meta.env.VITE_MAPILLARY_ACCESS_TOKEN as string;
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(Boolean(token));
    const [error, setError] = useState<string | null>(
        token ? null : 'Missing Mapillary access token.',
    );
    const headingCallbackRef = useRef(onHeadingChange);

    useEffect(() => {
        headingCallbackRef.current = onHeadingChange;
    }, [onHeadingChange]);

    useEffect(() => {
        if (!token) {
            return;
        }

        const controller = new AbortController();
        const fields =
            'id,thumb_2048_url,thumb_1024_url,computed_compass_angle,compass_angle';
        const imageId = location.image_id?.trim();
        const url = imageId
            ? `https://graph.mapillary.com/${imageId}?access_token=${token}&fields=${fields}`
            : `https://graph.mapillary.com/images?access_token=${token}&fields=${fields}&bbox=${buildBbox(location.lat, location.lng)}&limit=1`;

        queueMicrotask(() => {
            setLoading(true);
            setError(null);
            setImageUrl(null);
        });

        fetch(url, { signal: controller.signal })
            .then(async (res) => {
                if (!res.ok) {
                    throw new Error(`Mapillary error ${res.status}`);
                }
                const payload = (await res.json()) as
                    | { data?: MapillaryImage[] }
                    | MapillaryImage;
                const image = imageId
                    ? (payload as MapillaryImage)
                    : (payload as { data?: MapillaryImage[] })?.data?.[0];
                if (!image) {
                    throw new Error('No images found.');
                }
                const url =
                    image.thumb_2048_url ?? image.thumb_1024_url ?? null;
                if (!url) {
                    throw new Error('No image URL found.');
                }
                const heading =
                    Number(
                        image.computed_compass_angle ?? image.compass_angle,
                    ) || location.heading;
                if (
                    Number.isFinite(heading) &&
                    typeof headingCallbackRef.current === 'function'
                ) {
                    headingCallbackRef.current(heading);
                }
                setImageUrl(url);
            })
            .catch((err) => {
                if (err?.name === 'AbortError') return;
                setError(err?.message ?? 'Failed to load image.');
            })
            .finally(() => {
                setLoading(false);
            });

        return () => controller.abort();
    }, [
        location.heading,
        location.lat,
        location.lng,
        location.image_id,
        token,
    ]);

    return (
        <div className="absolute inset-0 bg-neutral-900">
            {imageUrl && (
                <img
                    src={imageUrl}
                    alt="Street view"
                    className="h-full w-full object-cover"
                />
            )}
            {(loading || error) && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-neutral-400">
                    {error ?? 'Loading Mapillary…'}
                </div>
            )}
        </div>
    );
}
