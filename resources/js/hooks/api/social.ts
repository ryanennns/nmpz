import type { AxiosInstance } from 'axios';

export function socialApi(client: AxiosInstance, playerId: string) {
    return {
        fetchPlayerProfile: (targetPlayerId: string) => client.get(`/players/${targetPlayerId}/profile`),
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
    };
}
