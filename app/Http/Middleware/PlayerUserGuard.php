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
            $player = Player::query()->find($request->input('player_id'));
        }

        if ($player === null && !$request->user()) {
            abort(Response::HTTP_UNAUTHORIZED);
        }

        if ($player) {
            $mismatchPlayer = $request->user()?->getKey() !== $player->user()->first()?->getKey();
            abort_if($mismatchPlayer, Response::HTTP_UNAUTHORIZED, 'Unauthorized');
        }

        return $next($request);
    }
}
