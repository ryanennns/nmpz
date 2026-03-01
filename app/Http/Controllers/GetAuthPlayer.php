<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GetAuthPlayer extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $player = $request->user()->player;

        if (! $player) {
            return response()->json(null, 404);
        }

        return response()->json([
            'player' => $player->toArray(),
            'user' => $request->user()->toArray(),
        ]);
    }
}
