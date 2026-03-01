<?php

namespace App\Services;

use App\Enums\GameStatus;
use App\Models\Game;
use App\Models\Player;
use App\Models\User;
use App\Presenters\GamePresenter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class PlayerSessionService
{
    public function resolveOrCreatePlayer(Request $request): Player
    {
        $playerId = $request->session()->get('player_id');
        $player = $playerId ? Player::with('user')->find($playerId) : null;

        if (! $player) {
            $user = User::query()->create([
                'name' => 'Guest',
                'email' => Str::uuid().'@guest.local',
                'password' => Hash::make(Str::random(32)),
            ]);
            $player = Player::query()->create([
                'user_id' => $user->getKey(),
                'name' => null,
            ]);
            $request->session()->put('player_id', $player->getKey());
            $player->load('user');
        }

        return $player;
    }

    /**
     * @return array{0: array|null, 1: array|null}
     */
    public function resolveActiveGame(Request $request, Player $player): array
    {
        $gameId = $request->session()->get('game_id');
        if (! $gameId) {
            return [null, null];
        }

        $gameModel = Game::query()
            ->with(['playerOne.user', 'playerTwo.user'])
            ->find($gameId);

        if (! $gameModel
            || $gameModel->status !== GameStatus::InProgress
            || ! in_array($player->getKey(), [$gameModel->player_one_id, $gameModel->player_two_id], true)
        ) {
            $request->session()->forget('game_id');

            return [null, null];
        }

        $game = GamePresenter::toArray($gameModel);

        $round = $gameModel->rounds()
            ->whereNull('finished_at')
            ->orderByDesc('round_number')
            ->first();

        $roundData = null;
        if ($round) {
            $roundData = [
                'game_id' => $gameModel->getKey(),
                'round_id' => $round->getKey(),
                'round_number' => $round->round_number,
                'player_one_health' => $gameModel->player_one_health,
                'player_two_health' => $gameModel->player_two_health,
                'location_lat' => $round->location_lat,
                'location_lng' => $round->location_lng,
                'location_heading' => $round->location_heading,
                'started_at' => optional($round->started_at)->toISOString(),
                'player_one_locked_in' => $round->player_one_locked_in,
                'player_two_locked_in' => $round->player_two_locked_in,
            ];
        }

        return [$game, $roundData];
    }
}
