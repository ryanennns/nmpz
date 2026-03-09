<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithSoloGames;
use App\Http\Middleware\PlayerUserGuard;
use App\Models\SoloGame;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SingleplayerPageController extends Controller
{
    use InteractsWithSoloGames;

    public function __invoke(Request $request, SoloGame $soloGame): Response
    {
        if (!$soloGame->isComplete()) {
            PlayerUserGuard::canAccessResource($request);
        }

        return Inertia::render('singleplayer', [
            'authenticated' => auth()->check(),
            'soloGameId' => $soloGame->getKey(),
            'player' => $soloGame->player?->loadMissing('user'),
            'playerId' => $soloGame->player?->user_id !== null
                ? $soloGame->player?->getKey()
                : null,
        ]);
    }
}
