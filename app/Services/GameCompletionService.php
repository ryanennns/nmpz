<?php

namespace App\Services;

use App\Enums\GameStatus;
use App\Events\GameFinished;
use App\Models\Game;
use App\Models\Round;

class GameCompletionService
{
    public function __construct(
        private readonly PlayerStatsService $playerStatsService,
    ) {}

    public function checkAndComplete(Game $game, Round $round): bool
    {
        if ($game->player_one_health <= 0 || $game->player_two_health <= 0) {
            $game->update([
                'status' => GameStatus::Completed,
                'winner_id' => $game->player_one_health >= $game->player_two_health
                    ? $game->player_one_id
                    : $game->player_two_id,
            ]);

            $this->playerStatsService->recordGameEnd($game);
            EloCalculator::calculate($game);
            GameFinished::dispatch($game);

            return true;
        }

        $noGuesses =
            $round->player_one_guess_lat === null &&
            $round->player_one_guess_lng === null &&
            $round->player_two_guess_lat === null &&
            $round->player_two_guess_lng === null;

        if ($noGuesses) {
            $game->increment('no_guess_rounds');
            $game->refresh();
        } elseif ($game->no_guess_rounds > 0) {
            $game->update(['no_guess_rounds' => 0]);
        }

        if ($game->no_guess_rounds >= config('game.no_guess_forfeit_rounds')) {
            $game->update([
                'status' => GameStatus::Completed,
                'winner_id' => null,
            ]);

            $this->playerStatsService->recordGameEnd($game);
            EloCalculator::calculate($game);
            GameFinished::dispatch($game);

            return true;
        }

        return false;
    }
}
