<?php

namespace Tests\Feature;

use App\Models\Map;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MapControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_active_maps(): void
    {
        $active = Map::factory()->create(['is_active' => true]);
        Map::factory()->create(['is_active' => false]);

        $response = $this->getJson('/maps');

        $response->assertOk();
        $response->assertJsonCount(1);
        $response->assertJsonFragment(['id' => $active->getKey()]);
    }

    public function test_returns_correct_fields(): void
    {
        $map = Map::factory()->create([
            'is_active' => true,
            'display_name' => 'World Map',
            'description' => 'All locations',
            'location_count' => 500,
        ]);

        $response = $this->getJson('/maps');

        $response->assertOk();
        $response->assertJsonFragment([
            'id' => $map->getKey(),
            'name' => $map->name,
            'display_name' => 'World Map',
            'description' => 'All locations',
            'location_count' => 500,
        ]);
    }

    public function test_returns_empty_when_no_active_maps(): void
    {
        Map::factory()->create(['is_active' => false]);

        $response = $this->getJson('/maps');

        $response->assertOk();
        $response->assertJson([]);
        $response->assertJsonCount(0);
    }

    public function test_excludes_inactive_maps(): void
    {
        $inactive = Map::factory()->create(['is_active' => false]);
        $active = Map::factory()->create(['is_active' => true]);

        $response = $this->getJson('/maps');

        $response->assertOk();
        $response->assertJsonCount(1);
        $response->assertJsonMissing(['id' => $inactive->getKey()]);
        $response->assertJsonFragment(['id' => $active->getKey()]);
    }
}
