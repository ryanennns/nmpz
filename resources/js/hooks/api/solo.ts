import type { AxiosInstance } from 'axios';
import type { LatLng } from '@/types/shared';

export function soloApi(client: AxiosInstance, playerId: string) {
    return {
        startSoloGame: (mode: string, options?: Record<string, unknown>) =>
            client.post(`/players/${playerId}/solo/start`, { mode, ...options }),
        soloGuess: (gameId: string, coords: LatLng) =>
            client.post(`/players/${playerId}/solo/${gameId}/guess`, coords),
        abandonSoloGame: (gameId: string) =>
            client.post(`/players/${playerId}/solo/${gameId}/abandon`),
        fetchSoloLeaderboard: (mode: string, mapId?: string) =>
            client.get(`/solo/leaderboard?mode=${mode}${mapId ? `&map_id=${mapId}` : ''}`),
        fetchSoloPersonalBests: () =>
            client.get(`/players/${playerId}/solo/personal-bests`),
        fetchSoloStats: () =>
            client.get(`/players/${playerId}/solo/stats`),
    };
}
