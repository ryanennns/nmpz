<?php

namespace Tests\Feature\Console;

use App\Models\Map;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GenerateMapillaryGlobalRandomTest extends TestCase
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
        foreach ([
            'test-global.json', 'test-happy.json', 'test-dedup.json',
            'test-no-coords.json', 'test-fallback.json', 'test-force.json',
            'test-file-exists.json', 'test-fail-api.json', 'test-batch.json',
            'test-empty.json', 'test-sleep.json', 'test-pano.json',
        ] as $f) {
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

        $this->artisan('mapillary:generate-global', [
            'name' => 'test-map',
            '--output' => 'test-global.json',
            '--attempts' => 1,
            '--limit' => 1,
            '--sleep' => 0,
        ])
            ->expectsOutput('VITE_MAPILLARY_ACCESS_TOKEN is not set.')
            ->assertExitCode(1);

        $this->restoreToken($original);
    }

    public function test_fails_when_map_already_exists_without_force(): void
    {
        Map::query()->create(['name' => 'test-map']);

        $this->artisan('mapillary:generate-global', [
            'name' => 'test-map',
            '--output' => 'test-global.json',
            '--attempts' => 1,
            '--limit' => 1,
            '--sleep' => 0,
        ])
            ->expectsOutput('Target map already exists. Use --force to replace it.')
            ->assertExitCode(1);
    }

    public function test_output_file_exists_without_force_fails(): void
    {
        file_put_contents(base_path('test-file-exists.json'), '[]');

        $this->artisan('mapillary:generate-global', [
            'name' => 'test-file-exists',
            '--output' => 'test-file-exists.json',
            '--attempts' => 1,
            '--limit' => 1,
            '--sleep' => 0,
        ])
            ->expectsOutput('Output file already exists. Use --force to overwrite it.')
            ->assertExitCode(1);
    }

    public function test_creates_locations_from_api(): void
    {
        Http::fake([
            'graph.mapillary.com/*' => Http::response([
                'data' => [
                    [
                        'id' => 'img-1',
                        'computed_geometry' => ['coordinates' => [2.3522, 48.8566]],
                        'computed_compass_angle' => 180,
                    ],
                ],
            ]),
        ]);

        $this->artisan('mapillary:generate-global', [
            'name' => 'test-happy',
            '--limit' => 1,
            '--attempts' => 1,
            '--sleep' => 0,
            '--output' => 'test-happy.json',
        ])->assertExitCode(0);

        $map = Map::where('name', 'test-happy')->first();
        $this->assertNotNull($map);
        $this->assertSame(1, $map->locations()->count());
        $this->assertTrue(file_exists(base_path('test-happy.json')));
    }

    public function test_skips_duplicate_image_ids(): void
    {
        Http::fake([
            'graph.mapillary.com/*' => Http::response([
                'data' => [
                    [
                        'id' => 'img-dup',
                        'computed_geometry' => ['coordinates' => [2.0, 48.0]],
                        'computed_compass_angle' => 90,
                    ],
                    [
                        'id' => 'img-dup',
                        'computed_geometry' => ['coordinates' => [3.0, 49.0]],
                        'computed_compass_angle' => 180,
                    ],
                ],
            ]),
        ]);

        $this->artisan('mapillary:generate-global', [
            'name' => 'test-dedup',
            '--limit' => 10,
            '--attempts' => 1,
            '--sleep' => 0,
            '--output' => 'test-dedup.json',
        ])->assertExitCode(0);

        $map = Map::where('name', 'test-dedup')->first();
        $this->assertSame(1, $map->locations()->count());
    }

    public function test_skips_images_without_valid_coordinates(): void
    {
        Http::fake([
            'graph.mapillary.com/*' => Http::response([
                'data' => [
                    ['id' => 'img-no-coords'],
                    ['id' => 'img-bad', 'geometry' => ['coordinates' => [1]]],
                    [],
                ],
            ]),
        ]);

        $this->artisan('mapillary:generate-global', [
            'name' => 'test-no-coords',
            '--limit' => 10,
            '--attempts' => 1,
            '--sleep' => 0,
            '--output' => 'test-no-coords.json',
        ])->assertExitCode(0);

        $map = Map::where('name', 'test-no-coords')->first();
        $this->assertSame(0, $map->locations()->count());
    }

    public function test_falls_back_to_geometry_and_compass_angle(): void
    {
        Http::fake([
            'graph.mapillary.com/*' => Http::response([
                'data' => [
                    [
                        'id' => 'img-fb',
                        'geometry' => ['coordinates' => [10.0, 20.0]],
                        'compass_angle' => 45,
                    ],
                ],
            ]),
        ]);

        $this->artisan('mapillary:generate-global', [
            'name' => 'test-fallback',
            '--limit' => 1,
            '--attempts' => 1,
            '--sleep' => 0,
            '--output' => 'test-fallback.json',
        ])->assertExitCode(0);

        $map = Map::where('name', 'test-fallback')->first();
        $location = $map->locations()->first();
        $this->assertEqualsWithDelta(20.0, $location->lat, 0.001);
        $this->assertEqualsWithDelta(10.0, $location->lng, 0.001);
        $this->assertSame(45, $location->heading);
    }

    public function test_replaces_existing_map_with_force(): void
    {
        Http::fake([
            'graph.mapillary.com/*' => Http::response(['data' => []]),
        ]);

        Map::query()->create(['name' => 'test-force']);

        $this->artisan('mapillary:generate-global', [
            'name' => 'test-force',
            '--force' => true,
            '--limit' => 1,
            '--attempts' => 1,
            '--sleep' => 0,
            '--output' => 'test-force.json',
        ])->assertExitCode(0);

        $this->assertSame(1, Map::where('name', 'test-force')->count());
    }

    public function test_handles_failed_api_response(): void
    {
        Http::fake([
            'graph.mapillary.com/*' => Http::response(null, 500),
        ]);

        $this->artisan('mapillary:generate-global', [
            'name' => 'test-fail-api',
            '--limit' => 1,
            '--attempts' => 1,
            '--sleep' => 0,
            '--output' => 'test-fail-api.json',
        ])->assertExitCode(0);

        $map = Map::where('name', 'test-fail-api')->first();
        $this->assertSame(0, $map->locations()->count());
    }

    public function test_empty_api_response(): void
    {
        Http::fake([
            'graph.mapillary.com/*' => Http::response(['data' => []]),
        ]);

        $this->artisan('mapillary:generate-global', [
            'name' => 'test-empty',
            '--limit' => 1,
            '--attempts' => 1,
            '--sleep' => 0,
            '--output' => 'test-empty.json',
        ])->assertExitCode(0);

        $map = Map::where('name', 'test-empty')->first();
        $this->assertSame(0, $map->locations()->count());
    }

    public function test_batch_insert_multiple_locations(): void
    {
        $images = [];
        for ($i = 0; $i < 5; $i++) {
            $images[] = [
                'id' => "batch-img-{$i}",
                'computed_geometry' => ['coordinates' => [2.0 + $i * 0.01, 48.0 + $i * 0.01]],
                'computed_compass_angle' => $i * 10,
            ];
        }

        Http::fake([
            'graph.mapillary.com/*' => Http::response(['data' => $images]),
        ]);

        $this->artisan('mapillary:generate-global', [
            'name' => 'test-batch',
            '--limit' => 5,
            '--attempts' => 1,
            '--sleep' => 0,
            '--output' => 'test-batch.json',
        ])->assertExitCode(0);

        $map = Map::where('name', 'test-batch')->first();
        $this->assertSame(5, $map->locations()->count());
    }

    public function test_with_sleep_between_requests(): void
    {
        Http::fake([
            'graph.mapillary.com/*' => Http::response([
                'data' => [
                    [
                        'id' => 'sleep-img',
                        'computed_geometry' => ['coordinates' => [2.0, 48.0]],
                        'computed_compass_angle' => 0,
                    ],
                ],
            ]),
        ]);

        $this->artisan('mapillary:generate-global', [
            'name' => 'test-sleep',
            '--limit' => 1,
            '--attempts' => 1,
            '--sleep' => 1,
            '--output' => 'test-empty.json',
        ])->assertExitCode(0);
    }

    public function test_pano_only_flag(): void
    {
        Http::fake([
            'graph.mapillary.com/*' => Http::response([
                'data' => [
                    [
                        'id' => 'pano-img',
                        'computed_geometry' => ['coordinates' => [2.0, 48.0]],
                        'computed_compass_angle' => 0,
                        'is_pano' => true,
                    ],
                ],
            ]),
        ]);

        $this->artisan('mapillary:generate-global', [
            'name' => 'test-pano',
            '--limit' => 1,
            '--attempts' => 1,
            '--sleep' => 0,
            '--pano-only' => true,
            '--output' => 'test-empty.json',
        ])->assertExitCode(0);
    }
}
