<?php

namespace App\Http\Middleware;

use App\Models\Game;
use App\Models\Player;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePlayerInGame
{
    public function handle(Request $request, Closure $next): Response
    {
        $player = $request->route('player');
        $game = $request->route('game');

        if ($player instanceof Player && $game instanceof Game) {
            abort_unless($game->hasPlayer($player), 403);
        }

        return $next($request);
    }
}
