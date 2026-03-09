<?php

namespace Tests\Unit;

use App\Models\Location;
use App\Models\Player;
use App\Models\SoloGame;
use App\Models\SoloRound;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlayerTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_calculates_high_score_correctly()
    {
        /** @var Player $p */
        $p = Player::factory()->create();

        /** @var SoloGame $sg */
        $sg = SoloGame::query()->create([
            'player_id' => $p->getKey(),
            'status' => SoloGame::STATUS_IN_PROGRESS,
        ]);

        $l = Location::factory()->create();
        for ($i = 0; $i < 5; $i++) {
            $sg->rounds()->create(
                SoloRound::factory()->raw([
                    'solo_game_id' => $sg->getKey(),
                    'location_id' => $l->getKey(),
                    'round_number' => $i + 1,
                    'score' => 1000 * ($i + 1),
                ])
            );
        }

        $sg->complete();

        $this->assertEquals(15000, $p->highScore());
    }
}
