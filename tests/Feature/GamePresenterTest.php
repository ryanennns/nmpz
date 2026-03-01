<?php

namespace Tests\Feature;

use App\Models\Game;
use App\Models\Player;
use App\Presenters\GamePresenter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GamePresenterTest extends TestCase
{
    use RefreshDatabase;

    public function test_to_array_returns_correct_structure(): void
    {
        $game = Game::factory()->inProgress()->create([
            'player_one_health' => 4500,
            'player_two_health' => 3200,
        ]);
        $game->load(['playerOne.user', 'playerTwo.user']);

        $result = GamePresenter::toArray($game);

        $this->assertArrayHasKey('id', $result);
        $this->assertArrayHasKey('player_one', $result);
        $this->assertArrayHasKey('player_two', $result);
        $this->assertArrayHasKey('player_one_health', $result);
        $this->assertArrayHasKey('player_two_health', $result);

        $this->assertSame($game->getKey(), $result['id']);
        $this->assertSame(4500, $result['player_one_health']);
        $this->assertSame(3200, $result['player_two_health']);
    }

    public function test_player_to_array_includes_all_fields(): void
    {
        $player = Player::factory()->withElo(1200)->create();
        $player->load('user');

        $result = GamePresenter::playerToArray($player, $player->getKey());

        $this->assertSame($player->getKey(), $result['id']);
        $this->assertArrayHasKey('user', $result);
        $this->assertArrayHasKey('name', $result['user']);
        $this->assertSame($player->user->name, $result['user']['name']);
        $this->assertSame(1200, $result['elo_rating']);
        $this->assertArrayHasKey('rank', $result);
    }

    public function test_player_to_array_handles_null_player(): void
    {
        $result = GamePresenter::playerToArray(null, 'some-id');

        $this->assertSame('some-id', $result['id']);
        $this->assertSame('Unknown', $result['user']['name']);
        $this->assertSame(1000, $result['elo_rating']);
        $this->assertSame('Bronze', $result['rank']);
    }

    public function test_to_array_matches_old_inline_format(): void
    {
        $game = Game::factory()->inProgress()->create();
        $game->load(['playerOne.user', 'playerTwo.user']);

        $result = GamePresenter::toArray($game);

        // Verify the exact structure matches what routes/web.php used to produce
        $this->assertSame($game->player_one_id, $result['player_one']['id']);
        $this->assertSame($game->playerOne->user->name, $result['player_one']['user']['name']);
        $this->assertSame($game->playerOne->elo_rating, $result['player_one']['elo_rating']);
        $this->assertSame($game->playerOne->rank, $result['player_one']['rank']);

        $this->assertSame($game->player_two_id, $result['player_two']['id']);
        $this->assertSame($game->playerTwo->user->name, $result['player_two']['user']['name']);
        $this->assertSame($game->playerTwo->elo_rating, $result['player_two']['elo_rating']);
        $this->assertSame($game->playerTwo->rank, $result['player_two']['rank']);
    }
}
