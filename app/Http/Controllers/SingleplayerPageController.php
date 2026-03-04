<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithSoloGames;
use App\Models\SoloGame;
use Inertia\Inertia;
use Inertia\Response;

class SingleplayerPageController extends Controller
{
    use InteractsWithSoloGames;

    public function __invoke(SoloGame $soloGame): Response
    {
        return Inertia::render('singleplayer', [
            'authenticated' => auth()->check(),
            'soloGameId' => $soloGame->getKey(),
            'playerId' => $soloGame->player?->user_id !== null
                ? $soloGame->player?->getKey()
                : null,
        ]);
    }
}
