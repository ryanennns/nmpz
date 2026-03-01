<?php

namespace App\Http\Controllers;

use App\Models\Player;
use App\Models\PlayerStats;
use App\Models\SoloGame;
use App\Services\AchievementService;
use App\Services\SoloGameService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SoloGameController extends Controller
{
    public function start(Request $request, Player $player, SoloGameService $service): JsonResponse
    {
        $validated = $request->validate([
            'mode' => ['required', 'string', 'in:explorer,streak,time_attack,perfect_score'],
            'map_id' => ['nullable', 'string'],
            'difficulty' => ['nullable', 'string', 'in:casual,normal,hardcore'],
            'max_rounds' => ['nullable', 'integer', 'min:0', 'max:100'],
            'round_timeout' => ['nullable', 'integer', 'min:0', 'max:300'],
        ]);

        // Check for existing in-progress game
        $existing = SoloGame::where('player_id', $player->getKey())
            ->inProgress()
            ->first();

        if ($existing) {
            return response()->json(['error' => 'You already have a solo game in progress'], 422);
        }

        $game = $service->start($player, $validated['mode'], $validated['map_id'] ?? null, $validated);

        $locationId = $game->location_ids[0] ?? null;
        $location = $locationId ? \App\Models\Location::find($locationId) : null;

        $maxRounds = match ($game->mode) {
            'explorer' => ($game->config['max_rounds'] ?? 0) ?: null,
            'time_attack' => config('game.solo.time_attack_rounds'),
            'perfect_score' => config('game.solo.perfect_score_rounds'),
            default => null,
        };

        $roundTimeout = match ($game->mode) {
            'explorer' => $game->config['round_timeout'] ?? null,
            'streak' => config('game.solo.streak_timeout'),
            'time_attack' => config('game.solo.time_attack_timeout'),
            'perfect_score' => config('game.solo.perfect_score_timeout'),
            default => null,
        };

        return response()->json([
            'game_id' => $game->getKey(),
            'mode' => $game->mode,
            'difficulty' => $game->difficulty,
            'round_number' => 1,
            'total_rounds' => $maxRounds,
            'health' => $game->health,
            'current_score' => 0,
            'round_timeout' => $roundTimeout,
            'location' => $location ? [
                'lat' => $location->lat,
                'lng' => $location->lng,
                'heading' => $location->heading,
            ] : null,
        ]);
    }

    public function guess(
        Request $request,
        Player $player,
        SoloGame $soloGame,
        SoloGameService $service,
        AchievementService $achievementService,
    ): JsonResponse {
        if ($soloGame->player_id !== $player->getKey()) {
            return response()->json(['error' => 'Not your game'], 403);
        }

        if ($soloGame->status !== 'in_progress') {
            return response()->json(['error' => 'Game is not in progress'], 422);
        }

        $validated = $request->validate([
            'lat' => ['required', 'numeric'],
            'lng' => ['required', 'numeric'],
        ]);

        $result = $service->guess($soloGame, $validated['lat'], $validated['lng']);

        if (isset($result['error'])) {
            return response()->json(['error' => $result['error']], 422);
        }

        if ($result['game_over']) {
            $soloGame->refresh();
            $service->evaluateAchievements($player, $soloGame, $achievementService);
        }

        return response()->json($result);
    }

    public function abandon(Player $player, SoloGame $soloGame, SoloGameService $service): JsonResponse
    {
        if ($soloGame->player_id !== $player->getKey()) {
            return response()->json(['error' => 'Not your game'], 403);
        }

        if ($soloGame->status !== 'in_progress') {
            return response()->json(['error' => 'Game is not in progress'], 422);
        }

        $service->abandon($soloGame);

        return response()->json(['abandoned' => true]);
    }

    public function leaderboard(Request $request, SoloGameService $service): JsonResponse
    {
        $validated = $request->validate([
            'mode' => ['required', 'string', 'in:explorer,streak,time_attack,perfect_score'],
            'map_id' => ['nullable', 'string'],
        ]);

        $entries = $service->getLeaderboard($validated['mode'], $validated['map_id'] ?? null);

        return response()->json([
            'mode' => $validated['mode'],
            'entries' => $entries,
        ]);
    }

    public function personalBests(Player $player, SoloGameService $service): JsonResponse
    {
        return response()->json($service->getPersonalBests($player));
    }

    public function stats(Player $player): JsonResponse
    {
        $stats = PlayerStats::where('player_id', $player->getKey())->first();

        return response()->json([
            'solo_games_played' => $stats->solo_games_played ?? 0,
            'solo_rounds_played' => $stats->solo_rounds_played ?? 0,
            'solo_total_score' => $stats->solo_total_score ?? 0,
            'solo_best_round_score' => $stats->solo_best_round_score ?? 0,
            'solo_perfect_rounds' => $stats->solo_perfect_rounds ?? 0,
            'solo_best_streak' => $stats->solo_best_streak ?? 0,
        ]);
    }
}
