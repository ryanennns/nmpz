<?php

namespace App\Console\Commands;

use App\Models\Location;
use App\Models\Map;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class GenerateMapillaryMap extends Command
{
    protected $signature = 'mapillary:generate-map
                            {name : Target map name}
                            {--force : Replace existing map}
                            {--grid=1.0 : Grid step in degrees}
                            {--delta=0.0005 : Bbox half-size in degrees}
                            {--limit= : Max locations to create}
                            {--output= : JSON output filename (default: {name}.json)}
                            {--sleep=150 : Delay between requests in ms}';

    protected $description = 'Generate a map from a global lat/lng grid using Mapillary coverage.';

    public function handle(): int
    {
        $token = env('VITE_MAPILLARY_ACCESS_TOKEN');
        if (! $token) {
            $this->error('VITE_MAPILLARY_ACCESS_TOKEN is not set.');
            return 1;
        }

        $name = (string) $this->argument('name');
        $grid = (float) $this->option('grid');
        $delta = (float) $this->option('delta');
        $limit = $this->option('limit') ? (int) $this->option('limit') : null;
        $sleepMs = (int) $this->option('sleep');
        $output = (string) ($this->option('output') ?: "{$name}.json");
        $outputPath = base_path($output);

        if ($grid <= 0) {
            $this->error('--grid must be greater than 0.');
            return 1;
        }

        $existing = Map::query()->where('name', $name)->first();
        if ($existing) {
            if (! $this->option('force')) {
                $this->error('Target map already exists. Use --force to replace it.');
                return 1;
            }
            $existing->delete();
        }

        if (file_exists($outputPath) && ! $this->option('force')) {
            $this->error('Output file already exists. Use --force to overwrite it.');
            return 1;
        }

        $map = Map::query()->create(['name' => $name]);

        $latMin = -85.0;
        $latMax = 85.0;
        $lngMin = -180.0;
        $lngMax = 180.0;

        $latSteps = (int) floor(($latMax - $latMin) / $grid) + 1;
        $lngSteps = (int) floor(($lngMax - $lngMin) / $grid) + 1;
        $total = $latSteps * $lngSteps;

        $this->info("Scanning {$total} grid points...");
        $this->output->progressStart($total);

        $created = 0;
        $seenImageIds = [];
        $jsonRows = [];

        for ($lat = $latMin; $lat <= $latMax; $lat += $grid) {
            for ($lng = $lngMin; $lng <= $lngMax; $lng += $grid) {
                if ($limit && $created >= $limit) {
                    $this->output->progressFinish();
                    $this->info("Created {$created} location(s) in {$name}.");
                    return 0;
                }

                $bbox = implode(',', [
                    $lng - $delta,
                    $lat - $delta,
                    $lng + $delta,
                    $lat + $delta,
                ]);

                $response = Http::get('https://graph.mapillary.com/images', [
                    'access_token' => $token,
                    'fields' => 'id,computed_geometry,geometry,computed_compass_angle,compass_angle',
                    'bbox' => $bbox,
                    'limit' => 1,
                ]);

                if ($response->ok()) {
                    $image = $response->json('data.0');
                    if (is_array($image) && isset($image['id'])) {
                        $imageId = (string) $image['id'];
                        if (! isset($seenImageIds[$imageId])) {
                            $coords = $image['computed_geometry']['coordinates']
                                ?? $image['geometry']['coordinates']
                                ?? null;
                            if (is_array($coords) && count($coords) === 2) {
                                $heading = (int) round(
                                    $image['computed_compass_angle']
                                        ?? $image['compass_angle']
                                        ?? 0,
                                );

                                Location::query()->create([
                                    'map_id' => $map->getKey(),
                                    'lat' => $coords[1],
                                    'lng' => $coords[0],
                                    'heading' => $heading,
                                ]);

                                $jsonRows[] = [
                                    'lat' => $coords[1],
                                    'lng' => $coords[0],
                                    'heading' => $heading,
                                ];

                                $seenImageIds[$imageId] = true;
                                $created++;
                            }
                        }
                    }
                }

                if ($sleepMs > 0) {
                    usleep($sleepMs * 1000);
                }

                $this->output->progressAdvance();
            }
        }

        $this->output->progressFinish();
        file_put_contents($outputPath, json_encode($jsonRows, JSON_PRETTY_PRINT));
        $this->info("Created {$created} location(s) in {$name}.");
        $this->info("Wrote JSON to {$output}.");

        return 0;
    }
}
