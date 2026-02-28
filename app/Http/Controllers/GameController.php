<?php

namespace App\Http\Controllers;

use App\Enums\GameStatus;
use App\Models\Game;
use App\Models\Player;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Inertia\Inertia;

class GameController extends Controller
{
    public function __invoke(Request $request)
    {
        $playerId = $request->session()->get('player_id');
        $player = $playerId ? Player::with('user')->find($playerId) : null;

        if (! $player) {
            $player = Player::query()->create(['name' => null]);
            $request->session()->put('player_id', $player->getKey());
            $player->load('user');
        }

        $game = null;
        $roundData = null;

        $gameId = $request->session()->get('game_id');

        if (! $gameId) {
            return Inertia::render('welcome', [
                'player' => $player,
                'queue_count' => count(Cache::get('matchmaking_queue', [])),
                'game' => $game,
                'round_data' => $roundData,
            ]);
        }

        $gameModel = Game::query()
            ->with(['playerOne.user', 'playerTwo.user'])
            ->find($gameId);

        if ($gameModel
            && $gameModel->status === GameStatus::InProgress
            && in_array($player->getKey(), [$gameModel->player_one_id, $gameModel->player_two_id], true)
        ) {
            $game = [
                'id' => $gameModel->getKey(),
                'player_one' => [
                    'id' => $gameModel->player_one_id,
                    'user' => ['name' => $gameModel->playerOne->user->name],
                ],
                'player_two' => [
                    'id' => $gameModel->player_two_id,
                    'user' => ['name' => $gameModel->playerTwo->user->name],
                ],
                'player_one_health' => $gameModel->player_one_health,
                'player_two_health' => $gameModel->player_two_health,
            ];

            $round = $gameModel->rounds()
                ->whereNull('finished_at')
                ->orderByDesc('round_number')
                ->first();

            if ($round) {
                $location = $round->location;

                $roundData = [
                    'game_id' => $gameModel->getKey(),
                    'round_id' => $round->getKey(),
                    'round_number' => $round->round_number,
                    'player_one_health' => $gameModel->player_one_health,
                    'player_two_health' => $gameModel->player_two_health,
                    'location_lat' => $location?->lat,
                    'location_lng' => $location?->lng,
                    'location_heading' => $location?->heading,
                    'location_image_id' => $location?->image_id,
                    'started_at' => optional($round->started_at)->toISOString(),
                    'player_one_locked_in' => $round->player_one_locked_in,
                    'player_two_locked_in' => $round->player_two_locked_in,
                ];
            }
        } else {
            $request->session()->forget('game_id');
        }

        return Inertia::render('welcome', [
            'player' => $player,
            'queue_count' => count(Cache::get('matchmaking_queue', [])),
            'game' => $game,
            'round_data' => $roundData,
        ]);
    }
}
