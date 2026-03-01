<?php

namespace App\Services;

use App\Models\Location;
use App\Models\Map;
use App\Models\Player;
use App\Models\PlayerStats;
use App\Models\SoloGame;
use App\Models\SoloPersonalBest;
use Illuminate\Support\Facades\Cache;

class SoloGameService
{
    public const VALID_MODES = ['explorer', 'streak', 'time_attack', 'perfect_score'];

    public function start(Player $player, string $mode, ?string $mapId, array $options = []): SoloGame
    {
        $map = $mapId
            ? Map::findOrFail($mapId)
            : Map::where('name', config('game.default_map'))->firstOrFail();

        $config = [];
        $health = null;
        $difficulty = null;
        $roundTimeout = null;
        $maxRounds = null;
        $locationCount = 50;

        switch ($mode) {
            case 'explorer':
                $maxRounds = $options['max_rounds'] ?? 5;
                $roundTimeout = $options['round_timeout'] ?? null;
                $config = ['max_rounds' => $maxRounds, 'round_timeout' => $roundTimeout];
                $locationCount = $maxRounds === 0 ? 50 : $maxRounds; // 0 = unlimited
                break;

            case 'streak':
                $difficulty = $options['difficulty'] ?? 'normal';
                $health = config("game.solo.streak_hp.{$difficulty}", 5000);
                $roundTimeout = config('game.solo.streak_timeout');
                $locationCount = 50;
                break;

            case 'time_attack':
                $maxRounds = config('game.solo.time_attack_rounds');
                $roundTimeout = config('game.solo.time_attack_timeout');
                $locationCount = $maxRounds;
                break;

            case 'perfect_score':
                $maxRounds = config('game.solo.perfect_score_rounds');
                $roundTimeout = config('game.solo.perfect_score_timeout');
                $locationCount = $maxRounds;
                break;
        }

        $locations = Location::where('map_id', $map->getKey())
            ->inRandomOrder()
            ->limit($locationCount)
            ->get();

        if ($locations->isEmpty()) {
            throw new \RuntimeException('No locations available for the selected map.');
        }

        return SoloGame::create([
            'player_id' => $player->getKey(),
            'map_id' => $map->getKey(),
            'mode' => $mode,
            'difficulty' => $difficulty,
            'config' => $config ?: null,
            'status' => 'in_progress',
            'total_score' => 0,
            'rounds_completed' => 0,
            'health' => $health,
            'round_scores' => [],
            'location_ids' => $locations->pluck('id')->toArray(),
            'current_location_index' => 0,
            'round_started_at' => now(),
            'elapsed_seconds' => 0,
            'started_at' => now(),
        ]);
    }

    public function guess(SoloGame $game, float $lat, float $lng): array
    {
        $locationId = $game->location_ids[$game->current_location_index] ?? null;
        $location = $locationId ? Location::find($locationId) : null;

        if (! $location) {
            return ['error' => 'No location available'];
        }

        // Timer check
        $timedOut = false;
        $roundTimeout = $this->getRoundTimeout($game);
        $elapsedSeconds = 0;

        if ($game->round_started_at) {
            $elapsedSeconds = (int) $game->round_started_at->diffInSeconds(now());
            if ($roundTimeout && $elapsedSeconds > $roundTimeout) {
                $timedOut = true;
            }
        }

        // Score calculation
        $score = $timedOut ? 0 : ScoringService::calculateScore(
            $location->lat, $location->lng, $lat, $lng,
        );

        $speedBonus = 0;
        if ($game->mode === 'time_attack' && ! $timedOut) {
            $speedBonus = ScoringService::calculateSpeedBonus($elapsedSeconds, $roundTimeout);
        }

        $roundScore = $score + $speedBonus;

        $distanceKm = round(ScoringService::haversineDistanceKm(
            $location->lat, $location->lng, $lat, $lng,
        ), 2);

        // Update round scores
        $roundScores = $game->round_scores ?? [];
        $roundScores[] = [
            'round' => $game->rounds_completed + 1,
            'score' => $score,
            'speed_bonus' => $speedBonus,
            'distance_km' => $distanceKm,
            'timed_out' => $timedOut,
            'elapsed_seconds' => $elapsedSeconds,
        ];

        $totalScore = $game->total_score + $roundScore;
        $roundsCompleted = $game->rounds_completed + 1;
        $totalElapsed = $game->elapsed_seconds + $elapsedSeconds;

        // HP tracking for streak mode
        $damage = 0;
        $health = $game->health;
        $gameOver = false;

        if ($game->mode === 'streak') {
            $damage = config('game.max_health') - $score;
            $health = max(0, $game->health - $damage);
            if ($health <= 0) {
                $gameOver = true;
            }
        }

        // Check if game should end
        $maxRounds = $this->getMaxRounds($game);
        $isComplete = $gameOver || ($maxRounds && $roundsCompleted >= $maxRounds);

        $updateData = [
            'round_scores' => $roundScores,
            'total_score' => $totalScore,
            'rounds_completed' => $roundsCompleted,
            'health' => $health,
            'elapsed_seconds' => $totalElapsed,
        ];

        $response = [
            'score' => $score,
            'speed_bonus' => $speedBonus,
            'total_score' => $totalScore,
            'distance_km' => $distanceKm,
            'timed_out' => $timedOut,
            'rounds_completed' => $roundsCompleted,
            'health' => $health,
            'damage' => $damage,
            'game_over' => $isComplete,
            'location' => ['lat' => $location->lat, 'lng' => $location->lng],
            'elapsed_seconds' => $elapsedSeconds,
        ];

        if ($isComplete) {
            $updateData['status'] = 'completed';
            $updateData['completed_at'] = now();
            $updateData['round_started_at'] = null;

            if ($game->mode === 'perfect_score') {
                $tier = $this->calculateTier($totalScore);
                $updateData['tier'] = $tier;
                $response['tier'] = $tier;
            }

            $game->update($updateData);

            $pb = $this->updatePersonalBest($game);
            $response['personal_best'] = $pb ? [
                'best_score' => $pb->best_score,
                'best_rounds' => $pb->best_rounds,
                'is_new' => $pb->wasRecentlyCreated || $pb->wasChanged(),
            ] : null;

            $this->updatePlayerStats($game);
        } else {
            // Advance to next location
            $nextIndex = $game->current_location_index + 1;

            // For streak/unlimited explorer: refill locations if running low
            $locationIds = $game->location_ids;
            if ($nextIndex >= count($locationIds) && in_array($game->mode, ['streak', 'explorer'])) {
                $moreLocations = Location::where('map_id', $game->map_id)
                    ->inRandomOrder()
                    ->limit(50)
                    ->get();
                $locationIds = array_merge($locationIds, $moreLocations->pluck('id')->toArray());
                $updateData['location_ids'] = $locationIds;
            }

            $updateData['current_location_index'] = $nextIndex;
            $updateData['round_started_at'] = now();

            $game->update($updateData);

            $nextLocationId = $locationIds[$nextIndex] ?? null;
            $nextLocation = $nextLocationId ? Location::find($nextLocationId) : null;
            $response['next_location'] = $nextLocation ? [
                'lat' => $nextLocation->lat,
                'lng' => $nextLocation->lng,
                'heading' => $nextLocation->heading,
            ] : null;
        }

        return $response;
    }

    public function abandon(SoloGame $game): void
    {
        $game->update([
            'status' => 'abandoned',
            'completed_at' => now(),
            'round_started_at' => null,
        ]);

        $this->updatePlayerStats($game);
    }

    public function calculateTier(int $totalScore): string
    {
        if ($totalScore >= config('game.solo.perfect_score_tier_gold')) {
            return 'gold';
        }

        if ($totalScore >= config('game.solo.perfect_score_tier_silver')) {
            return 'silver';
        }

        return 'bronze';
    }

    public function updatePersonalBest(SoloGame $game): ?SoloPersonalBest
    {
        $pb = SoloPersonalBest::firstOrCreate(
            [
                'player_id' => $game->player_id,
                'map_id' => $game->map_id,
                'mode' => $game->mode,
            ],
            [
                'best_score' => 0,
                'best_rounds' => 0,
            ],
        );

        $changed = false;

        if ($game->total_score > $pb->best_score) {
            $pb->best_score = $game->total_score;
            $changed = true;
        }

        if ($game->rounds_completed > $pb->best_rounds) {
            $pb->best_rounds = $game->rounds_completed;
            $changed = true;
        }

        if ($game->mode === 'time_attack' && $game->elapsed_seconds > 0) {
            if ($pb->best_time_seconds === null || $game->elapsed_seconds < $pb->best_time_seconds) {
                $pb->best_time_seconds = $game->elapsed_seconds;
                $changed = true;
            }
        }

        if ($changed) {
            $pb->save();
        }

        return $pb;
    }

    public function updatePlayerStats(SoloGame $game): void
    {
        $stats = PlayerStats::firstOrCreate(['player_id' => $game->player_id]);

        $stats->solo_games_played++;
        $stats->solo_rounds_played += $game->rounds_completed;
        $stats->solo_total_score += $game->total_score;

        // Best round score
        $roundScores = $game->round_scores ?? [];
        foreach ($roundScores as $rs) {
            $rsTotal = ($rs['score'] ?? 0) + ($rs['speed_bonus'] ?? 0);
            if ($rsTotal > $stats->solo_best_round_score) {
                $stats->solo_best_round_score = $rsTotal;
            }
            if (($rs['score'] ?? 0) >= 5000) {
                $stats->solo_perfect_rounds++;
            }
        }

        // Best streak
        if ($game->mode === 'streak' && $game->rounds_completed > $stats->solo_best_streak) {
            $stats->solo_best_streak = $game->rounds_completed;
        }

        $stats->save();
    }

    public function evaluateAchievements(Player $player, SoloGame $game, AchievementService $achievementService): void
    {
        $stats = PlayerStats::where('player_id', $player->getKey())->first();

        // solo_first_game: complete first solo game
        if (($stats->solo_games_played ?? 0) >= 1) {
            $achievementService->award($player, 'solo_first_game');
        }

        // solo_streak_10: survive 10 rounds in streak
        if ($game->mode === 'streak' && $game->rounds_completed >= 10) {
            $achievementService->award($player, 'solo_streak_10');
        }

        // solo_streak_25: survive 25 rounds in streak
        if ($game->mode === 'streak' && $game->rounds_completed >= 25) {
            $achievementService->award($player, 'solo_streak_25');
        }

        // solo_perfect_round: score 5000 in any solo round
        $roundScores = $game->round_scores ?? [];
        foreach ($roundScores as $rs) {
            if (($rs['score'] ?? 0) >= 5000) {
                $achievementService->award($player, 'solo_perfect_round');
                break;
            }
        }

        // solo_time_attack_master: score 25000+ in time attack
        if ($game->mode === 'time_attack' && $game->total_score >= 25000) {
            $achievementService->award($player, 'solo_time_attack_master');
        }

        // solo_explorer_100: complete 100 explorer rounds total
        if (($stats->solo_rounds_played ?? 0) >= 100) {
            $totalExplorerRounds = SoloGame::where('player_id', $player->getKey())
                ->where('mode', 'explorer')
                ->where('status', 'completed')
                ->sum('rounds_completed');
            if ($totalExplorerRounds >= 100) {
                $achievementService->award($player, 'solo_explorer_100');
            }
        }

        // solo_marathon: play 50 solo games
        if (($stats->solo_games_played ?? 0) >= 50) {
            $achievementService->award($player, 'solo_marathon');
        }

        // solo_perfectionist: earn gold in perfect score
        if ($game->mode === 'perfect_score' && $game->tier === 'gold') {
            $achievementService->award($player, 'solo_perfectionist');
        }
    }

    public function getLeaderboard(string $mode, ?string $mapId = null): array
    {
        $cacheKey = "solo_leaderboard_{$mode}_" . ($mapId ?? 'all');

        return Cache::remember($cacheKey, 300, function () use ($mode, $mapId) {
            $query = SoloGame::query()
                ->where('mode', $mode)
                ->where('status', 'completed')
                ->with('player.user');

            if ($mapId) {
                $query->where('map_id', $mapId);
            }

            // For streak mode, sort by rounds_completed (longest run)
            if ($mode === 'streak') {
                $query->orderByDesc('rounds_completed')->orderByDesc('total_score');
            } else {
                $query->orderByDesc('total_score');
            }

            $entries = $query->limit(50)->get();

            return $entries->map(fn (SoloGame $game, int $index) => [
                'rank' => $index + 1,
                'player_name' => $game->player?->user?->name ?? 'Unknown',
                'player_id' => $game->player_id,
                'total_score' => $game->total_score,
                'rounds_completed' => $game->rounds_completed,
                'elapsed_seconds' => $game->elapsed_seconds,
                'tier' => $game->tier,
                'difficulty' => $game->difficulty,
                'completed_at' => $game->completed_at?->toIso8601String(),
            ])->toArray();
        });
    }

    public function getPersonalBests(Player $player): array
    {
        return SoloPersonalBest::where('player_id', $player->getKey())
            ->with('map')
            ->get()
            ->groupBy('mode')
            ->map(fn ($bests) => $bests->map(fn (SoloPersonalBest $pb) => [
                'map_id' => $pb->map_id,
                'map_name' => $pb->map?->display_name ?? $pb->map?->name ?? 'Unknown',
                'best_score' => $pb->best_score,
                'best_rounds' => $pb->best_rounds,
                'best_time_seconds' => $pb->best_time_seconds,
            ])->toArray())
            ->toArray();
    }

    private function getRoundTimeout(SoloGame $game): ?int
    {
        return match ($game->mode) {
            'explorer' => $game->config['round_timeout'] ?? null,
            'streak' => config('game.solo.streak_timeout'),
            'time_attack' => config('game.solo.time_attack_timeout'),
            'perfect_score' => config('game.solo.perfect_score_timeout'),
            default => null,
        };
    }

    private function getMaxRounds(SoloGame $game): ?int
    {
        return match ($game->mode) {
            'explorer' => ($game->config['max_rounds'] ?? 0) ?: null, // 0 = unlimited
            'time_attack' => config('game.solo.time_attack_rounds'),
            'perfect_score' => config('game.solo.perfect_score_rounds'),
            'streak' => null, // unlimited until HP runs out
            default => null,
        };
    }
}
