<?php

namespace App\Http\Controllers;

use App\Actions\CreateMatch;
use App\Enums\GameStatus;
use App\Events\RematchAccepted;
use App\Events\RematchRequested;
use App\Models\Game;
use App\Models\Player;
use Illuminate\Http\JsonResponse;

class RequestRematch extends Controller
{
    public function __invoke(Player $player, Game $game, CreateMatch $createMatch): JsonResponse
    {
        abort_if(
            ! in_array($player->getKey(), [$game->player_one_id, $game->player_two_id]),
            403,
        );
        abort_if($game->status !== GameStatus::Completed, 422, 'Game is not completed.');
        abort_if($game->rematch_game_id !== null, 422, 'Rematch already created.');

        $isPlayerOne = $player->getKey() === $game->player_one_id;

        if ($isPlayerOne) {
            $game->update(['player_one_rematch_requested' => true]);
        } else {
            $game->update(['player_two_rematch_requested' => true]);
        }

        $game->refresh();

        if ($game->player_one_rematch_requested && $game->player_two_rematch_requested) {
            $p1 = Player::findOrFail($game->player_one_id);
            $p2 = Player::findOrFail($game->player_two_id);
            $newGame = $createMatch->handle($p1, $p2);

            $game->update(['rematch_game_id' => $newGame->getKey()]);

            RematchAccepted::dispatch($game, $newGame);

            return response()->json(['status' => 'accepted', 'new_game_id' => $newGame->getKey()]);
        }

        $player->load('user');
        RematchRequested::dispatch($game, $player);

        return response()->json(['status' => 'requested']);
    }
}
