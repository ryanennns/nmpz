<?php

namespace Tests\Unit;

use Tests\TestCase;

class GameConfigTest extends TestCase
{
    public function test_game_config_has_all_required_keys(): void
    {
        $config = config('game');

        $this->assertNotNull($config);
        $this->assertArrayHasKey('max_health', $config);
        $this->assertArrayHasKey('round_timeout_seconds', $config);
        $this->assertArrayHasKey('k_factor_new', $config);
        $this->assertArrayHasKey('k_factor_mid', $config);
        $this->assertArrayHasKey('k_factor_high', $config);
        $this->assertArrayHasKey('k_factor_games_threshold', $config);
        $this->assertArrayHasKey('k_factor_elo_threshold', $config);
        $this->assertArrayHasKey('elo_floor', $config);
        $this->assertArrayHasKey('no_guess_forfeit_rounds', $config);
        $this->assertArrayHasKey('max_name_length', $config);
    }

    public function test_max_health_is_5000(): void
    {
        $this->assertSame(5000, config('game.max_health'));
    }

    public function test_round_timeout_is_60_seconds(): void
    {
        $this->assertSame(60, config('game.round_timeout_seconds'));
    }

    public function test_k_factors_are_in_descending_order(): void
    {
        $this->assertGreaterThan(config('game.k_factor_mid'), config('game.k_factor_new'));
        $this->assertGreaterThan(config('game.k_factor_high'), config('game.k_factor_mid'));
    }

    public function test_elo_floor_is_positive(): void
    {
        $this->assertGreaterThan(0, config('game.elo_floor'));
    }

    public function test_no_guess_forfeit_rounds_is_3(): void
    {
        $this->assertSame(3, config('game.no_guess_forfeit_rounds'));
    }

    public function test_max_name_length_is_32(): void
    {
        $this->assertSame(32, config('game.max_name_length'));
    }
}
