import type { AxiosInstance } from 'axios';
import type { Game } from '@/types/game';
import type { LatLng } from '@/types/shared';

export function multiplayerApi(client: AxiosInstance, playerId: string, game: Game | null) {
    return {
        joinQueue: (name?: string, mapId?: string, matchFormat?: string) =>
            client.post(`/players/${playerId}/join-queue`, {
                ...(name ? { name } : {}),
                ...(mapId ? { map_id: mapId } : {}),
                ...(matchFormat ? { match_format: matchFormat } : {}),
            }),
        updatePlayer: (name: string) =>
            client.patch(`/players/${playerId}`, { name }),
        leaveQueue: () => client.post(`/players/${playerId}/leave-queue`),
        rememberGame: (active = true, gameId?: string) => {
            const id = gameId ?? game?.id;
            if (!id) return Promise.resolve(null);
            return client.post(`/players/${playerId}/games/${id}/remember`, { active });
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
            return client.post(`/players/${playerId}/games/${game.id}/send-message`, { message });
        },
        requestRematch: (gameId: string) =>
            client.post(`/players/${playerId}/games/${gameId}/rematch`),
        declineRematch: (gameId: string) =>
            client.post(`/players/${playerId}/games/${gameId}/decline-rematch`),
        sendReaction: (reaction: string) => {
            if (!game) return Promise.resolve(null);
            return client.post(`/players/${playerId}/games/${game.id}/reaction`, { reaction });
        },
        createPrivateLobby: (mapId?: string, matchFormat?: string) =>
            client.post(`/players/${playerId}/private-lobby`, {
                ...(mapId ? { map_id: mapId } : {}),
                ...(matchFormat ? { match_format: matchFormat } : {}),
            }),
        joinPrivateLobby: (code: string) =>
            client.post(`/players/${playerId}/private-lobby/join`, { code }),
        cancelPrivateLobby: (lobbyId: string) =>
            client.post(`/players/${playerId}/private-lobby/${lobbyId}/cancel`),
    };
}
