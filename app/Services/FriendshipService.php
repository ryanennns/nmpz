<?php

namespace App\Services;

use App\Models\Friendship;
use App\Models\Player;
use Illuminate\Support\Collection;

class FriendshipService
{
    public function getFriendsFor(Player $player): Collection
    {
        return Friendship::query()
            ->where('status', 'accepted')
            ->where(fn ($q) => $q->where('sender_id', $player->getKey())
                ->orWhere('receiver_id', $player->getKey()))
            ->with(['sender.user', 'receiver.user'])
            ->get()
            ->map(function (Friendship $f) use ($player) {
                $friend = $f->sender_id === $player->getKey() ? $f->receiver : $f->sender;

                return [
                    'friendship_id' => $f->getKey(),
                    'player_id' => $friend->getKey(),
                    'name' => $friend->user?->name ?? 'Unknown',
                    'elo_rating' => $friend->elo_rating,
                    'rank' => $friend->rank,
                ];
            });
    }

    /**
     * @return array{status: string, friendship_id?: string, error?: string}
     */
    public function sendRequest(Player $sender, string $receiverId): array
    {
        if ($receiverId === $sender->getKey()) {
            return ['status' => 'error', 'error' => 'Cannot friend yourself'];
        }

        if (Friendship::areFriends($sender->getKey(), $receiverId)) {
            return ['status' => 'error', 'error' => 'Already friends'];
        }

        $existing = Friendship::query()
            ->where('sender_id', $sender->getKey())
            ->where('receiver_id', $receiverId)
            ->first();

        if ($existing) {
            return ['status' => 'error', 'error' => 'Request already sent'];
        }

        // Check if they sent us a request — auto-accept
        $incoming = Friendship::query()
            ->where('sender_id', $receiverId)
            ->where('receiver_id', $sender->getKey())
            ->where('status', 'pending')
            ->first();

        if ($incoming) {
            $incoming->update(['status' => 'accepted']);

            return ['status' => 'accepted', 'friendship_id' => $incoming->getKey()];
        }

        $friendship = Friendship::create([
            'sender_id' => $sender->getKey(),
            'receiver_id' => $receiverId,
            'status' => 'pending',
        ]);

        return ['status' => 'pending', 'friendship_id' => $friendship->getKey()];
    }

    /**
     * @return array{status?: string, error?: string}
     */
    public function accept(Friendship $friendship, Player $player): array
    {
        if ($friendship->receiver_id !== $player->getKey()) {
            return ['error' => 'Not your request'];
        }

        if ($friendship->status !== 'pending') {
            return ['error' => 'Request not pending'];
        }

        $friendship->update(['status' => 'accepted']);

        return ['status' => 'accepted'];
    }

    /**
     * @return array{status?: string, error?: string}
     */
    public function decline(Friendship $friendship, Player $player): array
    {
        if ($friendship->receiver_id !== $player->getKey()) {
            return ['error' => 'Not your request'];
        }

        $friendship->update(['status' => 'declined']);

        return ['status' => 'declined'];
    }

    /**
     * @return array{removed?: bool, error?: string}
     */
    public function remove(Friendship $friendship, Player $player): array
    {
        if ($friendship->sender_id !== $player->getKey() && $friendship->receiver_id !== $player->getKey()) {
            return ['error' => 'Not your friendship'];
        }

        $friendship->delete();

        return ['removed' => true];
    }

    public function getPendingRequestsFor(Player $player): Collection
    {
        return Friendship::query()
            ->where('receiver_id', $player->getKey())
            ->where('status', 'pending')
            ->with('sender.user')
            ->get()
            ->map(fn (Friendship $f) => [
                'friendship_id' => $f->getKey(),
                'player_id' => $f->sender_id,
                'name' => $f->sender?->user?->name ?? 'Unknown',
                'elo_rating' => $f->sender?->elo_rating,
            ]);
    }
}
