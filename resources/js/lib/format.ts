export function formatDistance(km: number | null, nullLabel = 'No guess'): string {
    if (km === null) return nullLabel;
    if (km < 1) return `${Math.round(km * 1000)} m`;
    if (km < 100) return `${km.toFixed(1)} km`;
    return `${Math.round(km).toLocaleString()} km`;
}
