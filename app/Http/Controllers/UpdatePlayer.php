<?php

namespace App\Http\Controllers;

use App\Models\Player;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UpdatePlayer extends Controller
{
    public function __invoke(Request $request, Player $player): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:32'],
        ]);

        $player->update(['name' => $validated['name']]);
        $player->user()->update(['name' => $validated['name']]);

        return response()->json([
            'updated' => true,
            'name' => $validated['name'],
        ]);
    }
}
