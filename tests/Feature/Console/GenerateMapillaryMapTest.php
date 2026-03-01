<?php

namespace Tests\Feature\Console;

use App\Models\Map;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GenerateMapillaryMapTest extends TestCase
{
    use RefreshDatabase;

    private function clearToken(): ?string
    {
        $original = getenv('VITE_MAPILLARY_ACCESS_TOKEN') ?: null;
        putenv('VITE_MAPILLARY_ACCESS_TOKEN');
        unset($_ENV['VITE_MAPILLARY_ACCESS_TOKEN'], $_SERVER['VITE_MAPILLARY_ACCESS_TOKEN']);

        return $original;
    }

    private function restoreToken(?string $token): void
    {
        if ($token) {
            putenv("VITE_MAPILLARY_ACCESS_TOKEN={$token}");
            $_ENV['VITE_MAPILLARY_ACCESS_TOKEN'] = $token;
            $_SERVER['VITE_MAPILLARY_ACCESS_TOKEN'] = $token;
        }
    }

    protected function tearDown(): void
    {
        foreach (['test-grid.json', 'test-grid-happy.json', 'test-grid-dedup.json', 'test-grid-force.json', 'test-grid-fb.json', 'test-file-exists.json', 'test-grid-sleep.json'] as $f) {
            $path = base_path($f);
            if (file_exists($path)) {
                unlink($path);
            }
        }
        parent::tearDown();
    }

    public function test_fails_without_mapillary_token(): void
    {
        $original = $this->clearToken();

        $this->artisan('mapillary:generate-map', [
            'name' => 'test-map',
            '--output' => 'test-grid.json',
            '--grid' => 170,
            '--limit' => 1,
            '--sleep' => 0,
        ])
            ->expectsOutput('VITE_MAPILLARY_ACCESS_TOKEN is not set.')
            ->assertExitCode(1);

        $this->restoreToken($original);
    }

    public function test_fails_with_zero_grid(): void
    {
        $this->artisan('mapillary:generate-map', [
            'name' => 'test-map',
            '--grid' => 0,
            '--output' => 'test-grid.json',
            '--limit' => 1,
            '--sleep' => 0,
        ])
            ->expectsOutput('--grid must be greater than 0.')
            ->assertExitCode(1);
    }

    public function test_fails_when_map_exists_without_force(): void
    {
        Map::query()->create(['name' => 'test-map']);

        $this->artisan('mapillary:generate-map', [
            'name' => 'test-map',
            '--output' => 'test-grid.json',
            '--grid' => 170,
            '--limit' => 1,
            '--sleep' => 0,
        ])
            ->expectsOutput('Target map already exists. Use --force to replace it.')
            ->assertExitCode(1);
    }

    public function test_output_file_exists_without_force_fails(): void
    {
        file_put_contents(base_path('test-file-exists.json'), '[]');

        $this->artisan('mapillary:generate-map', [
            'name' => 'test-file-exists',
            '--output' => 'test-file-exists.json',
            '--grid' => 170,
            '--limit' => 1,
            '--sleep' => 0,
        ])
            ->expectsOutput('Output file already exists. Use --force to overwrite it.')
            ->assertExitCode(1);
    }

    public function test_creates_locations_from_grid(): void
    {
        Http::fake([
            'graph.mapillary.com/*' => Http::response([
                'data' => [
                    [
                        'id' => 'grid-img-1',
                        'computed_geometry' => ['coordinates' => [2.3522, 48.8566]],
                        'computed_compass_angle' => 90,
                    ],
                ],
            ]),
        ]);

        $this->artisan('mapillary:generate-map', [
            'name' => 'test-grid-happy',
            '--grid' => 360,
            '--limit' => 1,
            '--sleep' => 0,
            '--output' => 'test-grid-happy.json',
        ])->assertExitCode(0);

        $map = Map::where('name', 'test-grid-happy')->first();
        $this->assertNotNull($map);
        // The --limit=1 causes early return before file_put_contents
        $this->assertSame(1, $map->locations()->count());
    }

    public function test_skips_duplicate_image_ids(): void
    {
        Http::fake([
            'graph.mapillary.com/*' => Http::response([
                'data' => [
                    [
                        'id' => 'same-grid-id',
                        'computed_geometry' => ['coordinates' => [2.0, 48.0]],
                        'computed_compass_angle' => 0,
                    ],
                ],
            ]),
        ]);

        $this->artisan('mapillary:generate-map', [
            'name' => 'test-grid-dedup',
            '--grid' => 170,
            '--limit' => 5,
            '--sleep' => 0,
            '--output' => 'test-grid-dedup.json',
        ])->assertExitCode(0);

        $map = Map::where('name', 'test-grid-dedup')->first();
        $this->assertSame(1, $map->locations()->count());
    }

    public function test_replaces_existing_map_with_force(): void
    {
        Http::fake([
            'graph.mapillary.com/*' => Http::response(['data' => []]),
        ]);

        Map::query()->create(['name' => 'test-grid-force']);

        $this->artisan('mapillary:generate-map', [
            'name' => 'test-grid-force',
            '--force' => true,
            '--grid' => 360,
            '--limit' => 1,
            '--sleep' => 0,
            '--output' => 'test-grid-force.json',
        ])->assertExitCode(0);

        $this->assertSame(1, Map::where('name', 'test-grid-force')->count());
    }

    public function test_with_sleep_between_requests(): void
    {
        Http::fake([
            'graph.mapillary.com/*' => Http::response(['data' => []]),
        ]);

        $this->artisan('mapillary:generate-map', [
            'name' => 'test-grid-sleep',
            '--grid' => 360,
            '--limit' => 1,
            '--sleep' => 1,
            '--output' => 'test-grid-happy.json',
        ])->assertExitCode(0);
    }

    public function test_falls_back_to_geometry_coordinates(): void
    {
        Http::fake([
            'graph.mapillary.com/*' => Http::response([
                'data' => [
                    [
                        'id' => 'fb-img',
                        'geometry' => ['coordinates' => [10.0, 20.0]],
                        'compass_angle' => 45,
                    ],
                ],
            ]),
        ]);

        $this->artisan('mapillary:generate-map', [
            'name' => 'test-grid-fb',
            '--grid' => 360,
            '--limit' => 1,
            '--sleep' => 0,
            '--output' => 'test-grid-fb.json',
        ])->assertExitCode(0);

        $map = Map::where('name', 'test-grid-fb')->first();
        $location = $map->locations()->first();
        $this->assertEqualsWithDelta(20.0, $location->lat, 0.001);
        $this->assertEqualsWithDelta(10.0, $location->lng, 0.001);
    }
}
