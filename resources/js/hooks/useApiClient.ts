import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { useMemo } from 'react';
import { useGameContext } from '@/components/welcome/GameContext';
import type { LatLng } from '@/components/welcome/types';

function getCsrfToken() {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

function createClient(): AxiosInstance {
    const client = axios.create({
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        },
    });

    client.interceptors.request.use((config) => {
        config.headers = config.headers ?? {};
        config.headers['X-XSRF-TOKEN'] = getCsrfToken();
        return config;
    });

    return client;
}

export function useApiClient(playerId: string) {
    const client = useMemo(() => createClient(), []);
    const { game } = useGameContext();

    return {
        joinQueue: (name?: string, mapId?: string, matchFormat?: string) =>
            client.post(
                `/players/${playerId}/join-queue`,
                {
                    ...(name ? { name } : {}),
                    ...(mapId ? { map_id: mapId } : {}),
                    ...(matchFormat ? { match_format: matchFormat } : {}),
                },
            ),
        updatePlayer: (name: string) =>
            client.patch(`/players/${playerId}`, { name }),
        leaveQueue: () => client.post(`/players/${playerId}/leave-queue`),
        rememberGame: (active = true, gameId?: string) => {
            const id = gameId ?? game?.id;
            if (!id) return Promise.resolve(null);
            return client.post(`/players/${playerId}/games/${id}/remember`, {
                active,
            });
        },
        guess: (roundId: string, coords: LatLng, lockedIn = false) => {
            if (!game) return Promise.resolve(null);
            return client.post(
                `/players/${playerId}/games/${game.id}/rounds/${roundId}/guess`,
                lockedIn ? { ...coords, locked_in: true } : coords,
            );
        },
        sendMessage: (message: string) => {
            if (!game) return Promise.resolve(null);
            return client.post(
                `/players/${playerId}/games/${game.id}/send-message`,
                { message },
            );
        },
        fetchStats: () => client.get('/stats'),
        fetchLeaderboard: () => client.get('/leaderboard'),
        fetchPlayerStats: () => client.get(`/players/${playerId}/stats`),
        requestRematch: (gameId: string) =>
            client.post(`/players/${playerId}/games/${gameId}/rematch`),
        declineRematch: (gameId: string) =>
            client.post(`/players/${playerId}/games/${gameId}/decline-rematch`),
        fetchMaps: () => client.get('/maps'),
        fetchGameHistory: (page = 1) => client.get(`/players/${playerId}/games?page=${page}`),
        fetchGameDetail: (gameId: string) => client.get(`/games/${gameId}/history`),
        fetchAchievements: () => client.get(`/players/${playerId}/achievements`),
        createPrivateLobby: (mapId?: string, matchFormat?: string) =>
            client.post(`/players/${playerId}/private-lobby`, {
                ...(mapId ? { map_id: mapId } : {}),
                ...(matchFormat ? { match_format: matchFormat } : {}),
            }),
        joinPrivateLobby: (code: string) =>
            client.post(`/players/${playerId}/private-lobby/join`, { code }),
        cancelPrivateLobby: (lobbyId: string) =>
            client.post(`/players/${playerId}/private-lobby/${lobbyId}/cancel`),
        fetchLiveGames: () => client.get('/games/live'),
        sendReaction: (reaction: string) => {
            if (!game) return Promise.resolve(null);
            return client.post(
                `/players/${playerId}/games/${game.id}/reaction`,
                { reaction },
            );
        },
        // Daily Challenge
        fetchDailyChallenge: () => client.get('/daily-challenge'),
        startDailyChallenge: () => client.post(`/players/${playerId}/daily-challenge/start`),
        dailyChallengeGuess: (entryId: string, coords: LatLng) =>
            client.post(`/players/${playerId}/daily-challenge/${entryId}/guess`, coords),
        fetchDailyLeaderboard: () => client.get('/daily-challenge/leaderboard'),
        // Seasons
        fetchCurrentSeason: () => client.get('/seasons/current'),
        fetchSeasonLeaderboard: (seasonId: string) => client.get(`/seasons/${seasonId}/leaderboard`),
        fetchSeasonHistory: () => client.get('/seasons/history'),
        // Player Profiles
        fetchPlayerProfile: (targetPlayerId: string) => client.get(`/players/${targetPlayerId}/profile`),
        // Friends
        fetchFriends: () => client.get(`/players/${playerId}/friends`),
        sendFriendRequest: (receiverId: string) =>
            client.post(`/players/${playerId}/friends`, { receiver_id: receiverId }),
        acceptFriendRequest: (friendshipId: string) =>
            client.post(`/players/${playerId}/friends/${friendshipId}/accept`),
        declineFriendRequest: (friendshipId: string) =>
            client.post(`/players/${playerId}/friends/${friendshipId}/decline`),
        removeFriend: (friendshipId: string) =>
            client.delete(`/players/${playerId}/friends/${friendshipId}`),
        fetchPendingFriends: () => client.get(`/players/${playerId}/friends/pending`),
        // Featured Match
        fetchFeaturedMatch: () => client.get('/games/featured'),
        // Replay
        fetchReplay: (gameId: string) => client.get(`/games/${gameId}/replay`),
        // Spectator Chat
        sendSpectatorChat: (gameId: string, playerName: string, message: string) =>
            client.post(`/games/${gameId}/spectator-chat`, { player_name: playerName, message }),
        client,
    };
}
