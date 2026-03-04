<?php

namespace App\Http\Middleware;

use App\Models\Player;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PlayerUserGuard
{
    public function handle(Request $request, Closure $next): Response
    {
        $player = $request->route('player');

        if ($player === null) {
            $player = Player::query()->first($request->input('player_id'));
        }

        if (is_null($player) && ! $request->user()) {
            abort(401, 'Unauthorized');
        }

        if ($player instanceof Player && $player->user_id !== null && $request->user()?->getKey() !== $player->user_id) {
            abort(401, 'Unauthorized');
        }

        return $next($request);
    }
}
