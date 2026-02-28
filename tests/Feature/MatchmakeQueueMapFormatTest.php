<?php

namespace Tests\Feature;

use App\Actions\MatchmakeQueue;
use App\Models\Game;
use App\Models\Location;
use App\Models\Map;
use App\Models\Player;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class MatchmakeQueueMapFormatTest extends TestCase
{
    use RefreshDatabase;

    private function setupMap(?string $name = null): Map
    {
        $map = Map::factory()->create(['name' => $name ?? 'likeacw-mapillary', 'is_active' => true]);
        Location::factory()->for($map)->create();

        return $map;
    }

    private function queuePlayers(Player $p1, Player $p2, array $options = []): void
    {
        Cache::put('matchmaking_queue', [$p1->getKey(), $p2->getKey()]);
        Cache::put('matchmaking_queue_times', [
            $p1->getKey() => time(),
            $p2->getKey() => time(),
        ]);

        if (isset($options['maps'])) {
            Cache::put('matchmaking_queue_maps', $options['maps']);
        }
        if (isset($options['formats'])) {
            Cache::put('matchmaking_queue_formats', $options['formats']);
        }
    }

    // --- Map preference filtering ---

    public function test_matches_players_with_same_map(): void
    {
        Event::fake();
        Queue::fake();
        $map = $this->setupMap();

        $p1 = Player::factory()->withElo(1000)->create();
        $p2 = Player::factory()->withElo(1000)->create();

        $this->queuePlayers($p1, $p2, [
            'maps' => [$p1->getKey() => $map->getKey(), $p2->getKey() => $map->getKey()],
        ]);

        $result = app(MatchmakeQueue::class)->handle();

        $this->assertSame(1, $result);
    }

    public function test_does_not_match_players_with_different_maps(): void
    {
        $map1 = $this->setupMap('map-one');
        $map2 = $this->setupMap('map-two');

        $p1 = Player::factory()->withElo(1000)->create();
        $p2 = Player::factory()->withElo(1000)->create();

        $this->queuePlayers($p1, $p2, [
            'maps' => [$p1->getKey() => $map1->getKey(), $p2->getKey() => $map2->getKey()],
        ]);

        $result = app(MatchmakeQueue::class)->handle();

        $this->assertSame(0, $result);
    }

    public function test_matches_any_map_with_specific_map(): void
    {
        Event::fake();
        Queue::fake();
        $map = $this->setupMap();

        $p1 = Player::factory()->withElo(1000)->create();
        $p2 = Player::factory()->withElo(1000)->create();

        $this->queuePlayers($p1, $p2, [
            'maps' => [$p2->getKey() => $map->getKey()],
        ]);

        $result = app(MatchmakeQueue::class)->handle();

        $this->assertSame(1, $result);
    }

    public function test_matched_game_uses_specific_map(): void
    {
        Event::fake();
        Queue::fake();
        $defaultMap = $this->setupMap();
        $specificMap = $this->setupMap('specific-map');

        $p1 = Player::factory()->withElo(1000)->create();
        $p2 = Player::factory()->withElo(1000)->create();

        $this->queuePlayers($p1, $p2, [
            'maps' => [$p1->getKey() => $specificMap->getKey()],
        ]);

        app(MatchmakeQueue::class)->handle();

        $game = Game::where('player_one_id', $p1->getKey())
            ->orWhere('player_two_id', $p1->getKey())
            ->first();
        $this->assertNotNull($game);
        $this->assertSame($specificMap->getKey(), $game->map_id);
    }

    // --- Format preference filtering ---

    public function test_matches_players_with_same_format(): void
    {
        Event::fake();
        Queue::fake();
        $this->setupMap();

        $p1 = Player::factory()->withElo(1000)->create();
        $p2 = Player::factory()->withElo(1000)->create();

        $this->queuePlayers($p1, $p2, [
            'formats' => [$p1->getKey() => 'bo3', $p2->getKey() => 'bo3'],
        ]);

        $result = app(MatchmakeQueue::class)->handle();

        $this->assertSame(1, $result);
    }

    public function test_does_not_match_players_with_different_formats(): void
    {
        $this->setupMap();

        $p1 = Player::factory()->withElo(1000)->create();
        $p2 = Player::factory()->withElo(1000)->create();

        $this->queuePlayers($p1, $p2, [
            'formats' => [$p1->getKey() => 'bo3', $p2->getKey() => 'bo5'],
        ]);

        $result = app(MatchmakeQueue::class)->handle();

        $this->assertSame(0, $result);
    }

    public function test_matches_classic_with_specific_format(): void
    {
        Event::fake();
        Queue::fake();
        $this->setupMap();

        $p1 = Player::factory()->withElo(1000)->create();
        $p2 = Player::factory()->withElo(1000)->create();

        // p1 has no format preference (classic), p2 wants bo3
        $this->queuePlayers($p1, $p2, [
            'formats' => [$p2->getKey() => 'bo3'],
        ]);

        $result = app(MatchmakeQueue::class)->handle();

        $this->assertSame(1, $result);
    }

    public function test_matched_game_uses_specific_format(): void
    {
        Event::fake();
        Queue::fake();
        $this->setupMap();

        $p1 = Player::factory()->withElo(1000)->create();
        $p2 = Player::factory()->withElo(1000)->create();

        $this->queuePlayers($p1, $p2, [
            'formats' => [$p1->getKey() => 'bo3'],
        ]);

        app(MatchmakeQueue::class)->handle();

        $game = Game::where('player_one_id', $p1->getKey())
            ->orWhere('player_two_id', $p1->getKey())
            ->first();
        $this->assertNotNull($game);
        $this->assertSame('bo3', $game->match_format);
    }
}
