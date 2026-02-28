<?php

namespace App\Services;

use App\Events\OpponentGuessUpdate;
use App\Events\PlayerGuessed;
use App\Events\RoundFinished;
use App\Jobs\ForceEndRound;
use App\Models\Game;
use App\Models\Player;
use App\Models\Round;
use Illuminate\Support\Facades\Cache;

class GuessService
{
    public function processGuess(Player $player, Game $game, Round $round, array $validated): Round
    {
        $isPlayerOne = $player->getKey() === $game->player_one_id;

        $lockedInAlready = $isPlayerOne ? $round->player_one_locked_in : $round->player_two_locked_in;
        if ($lockedInAlready) {
            return $round;
        }

        $this->saveGuess($round, $isPlayerOne, $validated);
        $this->broadcastLiveGuess($round, $game, $player, $isPlayerOne, $validated);

        if (($validated['locked_in'] ?? false) === true) {
            PlayerGuessed::dispatch($round, $player);
        }

        if ($round->player_one_locked_in && $round->player_two_locked_in) {
            $this->finishRound($round);
        } elseif (($validated['locked_in'] ?? false) === true) {
            $this->scheduleTimeout($round);
        }

        return $round;
    }

    private function saveGuess(Round $round, bool $isPlayerOne, array $validated): void
    {
        if ($isPlayerOne) {
            $round->player_one_guess_lat = $validated['lat'];
            $round->player_one_guess_lng = $validated['lng'];
            if (($validated['locked_in'] ?? false) === true) {
                $round->player_one_locked_in = true;
                $round->player_one_locked_in_at = now();
            }
        } else {
            $round->player_two_guess_lat = $validated['lat'];
            $round->player_two_guess_lng = $validated['lng'];
            if (($validated['locked_in'] ?? false) === true) {
                $round->player_two_locked_in = true;
                $round->player_two_locked_in_at = now();
            }
        }

        $round->save();
    }

    private function broadcastLiveGuess(Round $round, Game $game, Player $player, bool $isPlayerOne, array $validated): void
    {
        $opponentLocked = $isPlayerOne ? $round->player_two_locked_in : $round->player_one_locked_in;
        $myLocked = $isPlayerOne ? $round->player_one_locked_in : $round->player_two_locked_in;

        if ($opponentLocked && ! $myLocked) {
            $cacheKey = "opponent_guess_throttle:{$round->getKey()}:{$player->getKey()}";
            if (! Cache::has($cacheKey)) {
                Cache::put($cacheKey, true, now()->addMilliseconds(500));
                OpponentGuessUpdate::dispatch($game, $player->getKey(), (float) $validated['lat'], (float) $validated['lng']);
            }
        }
    }

    private function finishRound(Round $round): void
    {
        $updated = Round::query()->where('id', $round->getKey())
            ->whereNull('finished_at')
            ->update(['finished_at' => now()]);

        if ($updated) {
            $round->evaluateScores();
            RoundFinished::dispatch($round);
            ForceEndRound::cancelPending($round->getKey());
        }
    }

    private function scheduleTimeout(Round $round): void
    {
        $startedAt = $round->started_at ?? now();
        if ($round->started_at === null) {
            $round->forceFill(['started_at' => $startedAt])->save();
        }

        $deadline = $startedAt->addSeconds(config('game.round_timeout_seconds'));
        $remaining = max(0, now()->diffInSeconds($deadline, false));
        $delaySeconds = min($remaining, 15);

        ForceEndRound::cancelPending($round->getKey());
        ForceEndRound::dispatch($round->getKey())->delay(now()->addSeconds($delaySeconds));
    }
}
