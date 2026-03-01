<?php

namespace App\Http\Controllers;

use App\Models\Friendship;
use App\Models\Player;
use App\Services\FriendshipService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FriendshipController extends Controller
{
    public function __construct(
        private readonly FriendshipService $friendshipService,
    ) {}

    public function index(Player $player): JsonResponse
    {
        return response()->json($this->friendshipService->getFriendsFor($player));
    }

    public function send(Request $request, Player $player): JsonResponse
    {
        $validated = $request->validate([
            'receiver_id' => ['required', 'uuid', 'exists:players,id'],
        ]);

        $result = $this->friendshipService->sendRequest($player, $validated['receiver_id']);

        if (isset($result['error'])) {
            $code = $result['error'] === 'Cannot friend yourself' || $result['error'] === 'Already friends' || $result['error'] === 'Request already sent' ? 422 : 400;

            return response()->json(['error' => $result['error']], $code);
        }

        return response()->json($result);
    }

    public function accept(Player $player, Friendship $friendship): JsonResponse
    {
        $result = $this->friendshipService->accept($friendship, $player);

        if (isset($result['error'])) {
            $code = $result['error'] === 'Not your request' ? 403 : 422;

            return response()->json(['error' => $result['error']], $code);
        }

        return response()->json($result);
    }

    public function decline(Player $player, Friendship $friendship): JsonResponse
    {
        $result = $this->friendshipService->decline($friendship, $player);

        if (isset($result['error'])) {
            return response()->json(['error' => $result['error']], 403);
        }

        return response()->json($result);
    }

    public function remove(Player $player, Friendship $friendship): JsonResponse
    {
        $result = $this->friendshipService->remove($friendship, $player);

        if (isset($result['error'])) {
            return response()->json(['error' => $result['error']], 403);
        }

        return response()->json($result);
    }

    public function pending(Player $player): JsonResponse
    {
        return response()->json($this->friendshipService->getPendingRequestsFor($player));
    }
}
