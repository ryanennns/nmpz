<?php

namespace Tests;

use App\Models\Achievement;
use App\Models\Location;
use App\Models\Map;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setupMap(int $locationCount = 10, array $attributes = []): Map
    {
        $map = Map::factory()->create(array_merge(['name' => 'likeacw-mapillary'], $attributes));
        Location::factory()->for($map)->count($locationCount)->create();

        return $map;
    }

    protected function seedAchievements(array $achievements): void
    {
        foreach ($achievements as $data) {
            Achievement::create($data);
        }
    }
}
