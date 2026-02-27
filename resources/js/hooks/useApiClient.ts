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
        joinQueue: (name?: string) =>
            client.post(
                `/players/${playerId}/join-queue`,
                name ? { name } : {},
            ),
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
        client,
    };
}
