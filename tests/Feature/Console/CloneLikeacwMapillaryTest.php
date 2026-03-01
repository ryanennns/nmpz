<?php

namespace Tests\Feature\Console;

use App\Models\Location;
use App\Models\Map;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class CloneLikeacwMapillaryTest extends TestCase
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
        foreach (['test-clone.jsonl', 'likeacw-mapillary.jsonl'] as $f) {
            $path = base_path($f);
            if (file_exists($path)) {
                unlink($path);
            }
        }
        parent::tearDown();
    }

    private function createSourceMap(int $locationCount = 1): Map
    {
        $source = Map::query()->create(['name' => 'Like ACW']);
        for ($i = 0; $i < $locationCount; $i++) {
            Location::query()->create([
                'map_id' => $source->getKey(),
                'lat' => 48.0 + $i,
                'lng' => 2.0 + $i,
                'heading' => $i * 10,
            ]);
        }

        return $source;
    }

    public function test_fails_without_mapillary_token(): void
    {
        $original = $this->clearToken();

        $this->artisan('mapillary:clone-likeacw', [
            '--output' => 'test-clone.jsonl',
            '--sleep' => 0,
        ])
            ->expectsOutput('VITE_MAPILLARY_ACCESS_TOKEN is not set.')
            ->assertExitCode(1);

        $this->restoreToken($original);
    }

    public function test_fails_when_source_map_not_found(): void
    {
        $this->artisan('mapillary:clone-likeacw', [
            '--output' => 'test-clone.jsonl',
            '--sleep' => 0,
        ])
            ->expectsOutput('Source map "Like ACW" not found.')
            ->assertExitCode(1);
    }

    public function test_fails_when_target_exists_without_force(): void
    {
        Map::query()->create(['name' => 'Like ACW']);
        Map::query()->create(['name' => 'likeacw-mapillary']);

        $this->artisan('mapillary:clone-likeacw', [
            '--output' => 'test-clone.jsonl',
            '--sleep' => 0,
        ])
            ->expectsOutput('Target map already exists. Use --force to replace it.')
            ->assertExitCode(1);
    }

    public function test_clones_locations_with_coverage(): void
    {
        $this->createSourceMap();

        Http::fake([
            'graph.mapillary.com/*' => Http::response([
                'data' => [['id' => 'clone-img']],
            ]),
        ]);

        $this->artisan('mapillary:clone-likeacw', [
            '--sleep' => 0,
            '--output' => 'test-clone.jsonl',
        ])->assertExitCode(0);

        $target = Map::where('name', 'likeacw-mapillary')->first();
        $this->assertNotNull($target);
        $this->assertSame(1, $target->locations()->count());
        $this->assertTrue(file_exists(base_path('test-clone.jsonl')));
    }

    public function test_skips_locations_without_coverage(): void
    {
        $this->createSourceMap();

        Http::fake([
            'graph.mapillary.com/*' => Http::response(['data' => []]),
        ]);

        $this->artisan('mapillary:clone-likeacw', [
            '--sleep' => 0,
            '--output' => 'test-clone.jsonl',
        ])->assertExitCode(0);

        $target = Map::where('name', 'likeacw-mapillary')->first();
        $this->assertSame(0, $target->locations()->count());
    }

    public function test_replaces_target_with_force(): void
    {
        $this->createSourceMap();
        Map::query()->create(['name' => 'likeacw-mapillary']);

        Http::fake([
            'graph.mapillary.com/*' => Http::response(['data' => []]),
        ]);

        file_put_contents(base_path('test-clone.jsonl'), 'existing');

        $this->artisan('mapillary:clone-likeacw', [
            '--force' => true,
            '--sleep' => 0,
            '--output' => 'test-clone.jsonl',
        ])->assertExitCode(0);

        $this->assertSame(1, Map::where('name', 'likeacw-mapillary')->count());
    }

    public function test_handles_api_not_found_response(): void
    {
        $this->createSourceMap();

        Http::fake([
            'graph.mapillary.com/*' => Http::response(null, 404),
        ]);

        $this->artisan('mapillary:clone-likeacw', [
            '--sleep' => 0,
            '--output' => 'test-clone.jsonl',
        ])->assertExitCode(0);

        $target = Map::where('name', 'likeacw-mapillary')->first();
        $this->assertSame(0, $target->locations()->count());
    }

    public function test_handles_api_error_response(): void
    {
        $this->createSourceMap();

        Http::fake([
            'graph.mapillary.com/*' => Http::response(null, 500),
        ]);

        $this->artisan('mapillary:clone-likeacw', [
            '--sleep' => 0,
            '--output' => 'test-clone.jsonl',
        ])->assertExitCode(0);
    }

    public function test_with_sleep_between_requests(): void
    {
        $this->createSourceMap();

        Http::fake([
            'graph.mapillary.com/*' => Http::response(['data' => []]),
        ]);

        $this->artisan('mapillary:clone-likeacw', [
            '--sleep' => 1,
            '--output' => 'test-clone.jsonl',
        ])->assertExitCode(0);
    }

    public function test_respects_limit_option(): void
    {
        $this->createSourceMap(5);

        Http::fake([
            'graph.mapillary.com/*' => Http::response([
                'data' => [['id' => 'limit-img-' . uniqid()]],
            ]),
        ]);

        $this->artisan('mapillary:clone-likeacw', [
            '--limit' => 2,
            '--sleep' => 0,
            '--output' => 'test-clone.jsonl',
        ])->assertExitCode(0);
    }
}
