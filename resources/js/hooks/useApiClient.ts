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

export const useStatsClient = () => {
    const client = useMemo(() => createClient(), []);
    return {
        fetchStats: () => client.get('/stats'),
    };
};

export const useUnauthedApiClient = () => {
    const client = useMemo(() => createClient(), []);

    return {
        createPlayer: (name: string) => client.post(`/players`, { name }),
        updatePlayer: (playerId: string, name: string) =>
            client.patch(`/players/${playerId}`, { name }),
        joinQueue: (playerId: string, name?: string) =>
            client.post(
                `/players/${playerId}/join-queue`,
                name ? { name } : {},
            ),
        leaveQueue: (playerId: string) =>
            client.post(`/players/${playerId}/leave-queue`),
    };
};

export function useApiClient() {
    const client = useMemo(() => createClient(), []);
    const { game } = useGameContext();

    return {
        joinQueue: (playerId: string, name?: string) =>
            client.post(
                `/players/${playerId}/join-queue`,
                name ? { name } : {},
            ),
        leaveQueue: (playerId: string) =>
            client.post(`/players/${playerId}/leave-queue`),
        updatePlayer: (playerId: string, name: string) =>
            client.patch(`/players/${playerId}`, { name }),
        rememberGame: (playerId: string, active = true, gameId?: string) => {
            const id = gameId ?? game?.id;
            if (!id) return Promise.resolve(null);
            return client.post(`/players/${playerId}/games/${id}/remember`, {
                active,
            });
        },
        guess: (
            playerId: string,
            roundId: string,
            coords: LatLng,
            lockedIn = false,
        ) => {
            if (!game) return Promise.resolve(null);
            return client.post(
                `/players/${playerId}/games/${game.id}/rounds/${roundId}/guess`,
                lockedIn ? { ...coords, locked_in: true } : coords,
            );
        },
        sendMessage: (playerId: string, message: string) => {
            if (!game) return Promise.resolve(null);
            return client.post(
                `/players/${playerId}/games/${game.id}/send-message`,
                { message },
            );
        },
        fetchStats: () => client.get('/stats'),
        client,
    };
}
