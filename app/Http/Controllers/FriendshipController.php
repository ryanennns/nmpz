<?php

namespace App\Http\Controllers;

use App\Models\Friendship;
use App\Models\Player;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FriendshipController extends Controller
{
    public function index(Player $player): JsonResponse
    {
        $friends = Friendship::query()
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

        return response()->json($friends);
    }

    public function send(Request $request, Player $player): JsonResponse
    {
        $validated = $request->validate([
            'receiver_id' => ['required', 'uuid', 'exists:players,id'],
        ]);

        if ($validated['receiver_id'] === $player->getKey()) {
            return response()->json(['error' => 'Cannot friend yourself'], 422);
        }

        if (Friendship::areFriends($player->getKey(), $validated['receiver_id'])) {
            return response()->json(['error' => 'Already friends'], 422);
        }

        $existing = Friendship::query()
            ->where('sender_id', $player->getKey())
            ->where('receiver_id', $validated['receiver_id'])
            ->first();

        if ($existing) {
            return response()->json(['error' => 'Request already sent'], 422);
        }

        // Check if they sent us a request — auto-accept
        $incoming = Friendship::query()
            ->where('sender_id', $validated['receiver_id'])
            ->where('receiver_id', $player->getKey())
            ->where('status', 'pending')
            ->first();

        if ($incoming) {
            $incoming->update(['status' => 'accepted']);

            return response()->json(['status' => 'accepted', 'friendship_id' => $incoming->getKey()]);
        }

        $friendship = Friendship::create([
            'sender_id' => $player->getKey(),
            'receiver_id' => $validated['receiver_id'],
            'status' => 'pending',
        ]);

        return response()->json(['status' => 'pending', 'friendship_id' => $friendship->getKey()]);
    }

    public function accept(Player $player, Friendship $friendship): JsonResponse
    {
        if ($friendship->receiver_id !== $player->getKey()) {
            return response()->json(['error' => 'Not your request'], 403);
        }

        if ($friendship->status !== 'pending') {
            return response()->json(['error' => 'Request not pending'], 422);
        }

        $friendship->update(['status' => 'accepted']);

        return response()->json(['status' => 'accepted']);
    }

    public function decline(Player $player, Friendship $friendship): JsonResponse
    {
        if ($friendship->receiver_id !== $player->getKey()) {
            return response()->json(['error' => 'Not your request'], 403);
        }

        $friendship->update(['status' => 'declined']);

        return response()->json(['status' => 'declined']);
    }

    public function remove(Player $player, Friendship $friendship): JsonResponse
    {
        if ($friendship->sender_id !== $player->getKey() && $friendship->receiver_id !== $player->getKey()) {
            return response()->json(['error' => 'Not your friendship'], 403);
        }

        $friendship->delete();

        return response()->json(['removed' => true]);
    }

    public function pending(Player $player): JsonResponse
    {
        $requests = Friendship::query()
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

        return response()->json($requests);
    }
}
