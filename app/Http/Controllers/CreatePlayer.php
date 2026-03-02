<?php

namespace App\Http\Controllers;

use App\Http\Resources\PlayerResource;
use App\Models\Player;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CreatePlayer extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate(['name' => 'required|string|max:32']);

        $p = Player::query()->create([
            'name' => $validated['name'],
            'user_id' => $request->user()?->id,
        ]);

        return (new PlayerResource($p))->response()->setStatusCode(201);
    }
}
