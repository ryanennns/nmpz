import type { AxiosInstance } from 'axios';

export function metaApi(client: AxiosInstance, playerId: string) {
    return {
        fetchStats: () => client.get('/stats'),
        fetchLeaderboard: () => client.get('/leaderboard'),
        fetchPlayerStats: () => client.get(`/players/${playerId}/stats`),
        fetchMaps: () => client.get('/maps'),
        fetchGameHistory: (page = 1) => client.get(`/players/${playerId}/games?page=${page}`),
        fetchGameDetail: (gameId: string) => client.get(`/games/${gameId}/history`),
        fetchAchievements: () => client.get(`/players/${playerId}/achievements`),
        fetchLiveGames: () => client.get('/games/live'),
        fetchCurrentSeason: () => client.get('/seasons/current'),
        fetchSeasonLeaderboard: (seasonId: string) => client.get(`/seasons/${seasonId}/leaderboard`),
        fetchSeasonHistory: () => client.get('/seasons/history'),
        fetchFeaturedMatch: () => client.get('/games/featured'),
        fetchReplay: (gameId: string) => client.get(`/games/${gameId}/replay`),
        sendSpectatorChat: (gameId: string, playerName: string, message: string) =>
            client.post(`/games/${gameId}/spectator-chat`, { player_name: playerName, message }),
    };
}
