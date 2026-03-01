import type { AxiosInstance } from 'axios';
import type { LatLng } from '@/types/shared';

export function dailyApi(client: AxiosInstance, playerId: string) {
    return {
        fetchDailyChallenge: () => client.get(`/daily-challenge?player_id=${playerId}`),
        startDailyChallenge: () => client.post(`/players/${playerId}/daily-challenge/start`),
        dailyChallengeGuess: (entryId: string, coords: LatLng) =>
            client.post(`/players/${playerId}/daily-challenge/${entryId}/guess`, coords),
        fetchDailyLeaderboard: () => client.get('/daily-challenge/leaderboard'),
        resetDailyChallenge: () => client.post(`/players/${playerId}/daily-challenge/reset`),
        fetchDailyChallengeStats: () => client.get(`/players/${playerId}/daily-challenge/stats`),
    };
}
