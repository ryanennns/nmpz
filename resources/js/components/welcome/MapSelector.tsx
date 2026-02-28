import { useEffect, useState } from 'react';
import type { MapOption } from '@/components/welcome/types';
import { useApiClient } from '@/hooks/useApiClient';

export default function MapSelector({
    playerId,
    selectedMapId,
    onSelect,
}: {
    playerId: string;
    selectedMapId: string | null;
    onSelect: (mapId: string | null) => void;
}) {
    const [maps, setMaps] = useState<MapOption[]>([]);
    const api = useApiClient(playerId);

    useEffect(() => {
        void api.fetchMaps().then((res) => {
            setMaps(res.data as MapOption[]);
        });
    }, []);

    if (maps.length <= 1) return null;

    return (
        <select
            value={selectedMapId ?? ''}
            onChange={(e) => onSelect(e.target.value || null)}
            className="w-full rounded bg-white/10 px-2 py-1 text-xs text-white"
        >
            <option value="">Any map</option>
            {maps.map((m) => (
                <option key={m.id} value={m.id}>
                    {m.display_name ?? m.name}
                    {m.location_count > 0 ? ` (${m.location_count})` : ''}
                </option>
            ))}
        </select>
    );
}
