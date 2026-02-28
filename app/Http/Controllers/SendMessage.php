<?php

namespace App\Http\Controllers;

use App\Events\GameMessage;
use App\Http\Requests\SendMessageRequest;
use App\Models\Game;
use App\Models\Player;
use Illuminate\Http\JsonResponse;

class SendMessage extends Controller
{
    public function __invoke(SendMessageRequest $request, Player $player, Game $game): JsonResponse
    {
        $player->loadMissing('user');

        GameMessage::dispatch($game, $player, $request->validated('message'));

        return response()->json(['ok' => true]);
    }
}
