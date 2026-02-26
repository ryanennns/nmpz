<?php

namespace App\Http\Controllers;

use App\Events\PlayerGuessed;
use App\Events\RoundFinished;
use App\Jobs\ForceEndRound;
use App\Models\Game;
use App\Models\Player;
use App\Models\Round;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlayerMakesGuess extends Controller
{
    public function __invoke(Request $request, Player $player, Game $game, Round $round): JsonResponse
    {
        abort_if(
            ! in_array($player->getKey(), [$game->player_one_id, $game->player_two_id]),
            403,
        );
        abort_if($round->game_id !== $game->getKey(), 404);

        $isPlayerOne = $player->getKey() === $game->player_one_id;

        $validated = $request->validate([
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
            'locked_in' => ['sometimes', 'boolean'],
        ]);

        $lockedInAlready = $isPlayerOne ? $round->player_one_locked_in : $round->player_two_locked_in;
        if ($lockedInAlready) {
            return response()->json($round);
        }

        if ($isPlayerOne) {
            $round->player_one_guess_lat = $validated['lat'];
            $round->player_one_guess_lng = $validated['lng'];
            if (($validated['locked_in'] ?? false) === true) {
                $round->player_one_locked_in = true;
            }
        } else {
            $round->player_two_guess_lat = $validated['lat'];
            $round->player_two_guess_lng = $validated['lng'];
            if (($validated['locked_in'] ?? false) === true) {
                $round->player_two_locked_in = true;
            }
        }

        $round->save();

        if (($validated['locked_in'] ?? false) === true) {
            PlayerGuessed::dispatch($round, $player);
        }

        if ($round->player_one_locked_in && $round->player_two_locked_in) {
            $updated = Round::query()->where('id', $round->getKey())
                ->whereNull('finished_at')
                ->update(['finished_at' => now()]);

            if ($updated) {
                $round->evaluateScores();
                RoundFinished::dispatch($round);
                ForceEndRound::cancelPending($round->getKey());
            }
        } elseif (($validated['locked_in'] ?? false) === true) {
            $startedAt = $round->started_at ?? now();
            if ($round->started_at === null) {
                $round->forceFill(['started_at' => $startedAt])->save();
            }

            $deadline = $startedAt->addSeconds(60);
            $remaining = max(0, now()->diffInSeconds($deadline, false));
            $delaySeconds = min($remaining, 15);

            ForceEndRound::cancelPending($round->getKey());
            ForceEndRound::dispatch($round->getKey())->delay(now()->addSeconds($delaySeconds));
        }

        return response()->json($round);
    }
}
