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

        if (is_string($player)) {
            $player = Player::query()->find($player);
        }

        if ($player instanceof Player && $player->user_id !== null && $request->user()?->getKey() !== $player->user_id) {
            abort(401, 'Unauthorized');
        }

        return $next($request);
    }
}
