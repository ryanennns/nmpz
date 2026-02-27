<?php

namespace App\Console\Commands;

use App\Models\Location;
use App\Models\Map;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class GenerateMapillaryGlobalRandom extends Command
{
    protected $signature = 'mapillary:generate-global
                            {name : Target map name}
                            {--force : Replace existing map and output file}
                            {--limit=10000 : Max locations to create}
                            {--attempts=20000 : Max random bbox attempts}
                            {--delta=0.0005 : Bbox half-size in degrees}
                            {--sleep=150 : Delay between requests in ms}
                            {--pano-only : Keep only pano images}
                            {--output= : JSON output filename (default: {name}.json)}';

    protected $description = 'Generate a global Mapillary map by random bbox sampling.';

    public function handle(): int
    {
        $token = env('VITE_MAPILLARY_ACCESS_TOKEN');
        if (! $token) {
            $this->error('VITE_MAPILLARY_ACCESS_TOKEN is not set.');
            return 1;
        }

        $name = (string) $this->argument('name');
        $limit = max(1, (int) $this->option('limit'));
        $attempts = max(1, (int) $this->option('attempts'));
        $delta = (float) $this->option('delta');
        $sleepMs = (int) $this->option('sleep');
        $panoOnly = (bool) $this->option('pano-only');
        $output = (string) ($this->option('output') ?: "{$name}.json");
        $outputPath = base_path($output);

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

        $created = 0;
        $seenImageIds = [];
        $jsonRows = [];
        $pendingRows = [];

        $this->info("Sampling up to {$attempts} bbox(es) for {$limit} locations...");
        $this->output->progressStart($attempts);

        for ($i = 0; $i < $attempts; $i++) {
            if ($created >= $limit) {
                break;
            }

            $lat = $latMin + (mt_rand() / mt_getrandmax()) * ($latMax - $latMin);
            $lng = $lngMin + (mt_rand() / mt_getrandmax()) * ($lngMax - $lngMin);

            $bbox = implode(',', [
                $lng - $delta,
                $lat - $delta,
                $lng + $delta,
                $lat + $delta,
            ]);

            $response = Http::get('https://graph.mapillary.com/images', [
                'access_token' => $token,
                'fields' => 'id,computed_geometry,geometry,computed_compass_angle,compass_angle,is_pano',
                'bbox' => $bbox,
                'limit' => 2000,
                'is_pano' => $panoOnly ? 'true' : null,
            ]);

            if ($response->ok()) {
                $data = $response->json('data');
                if (is_array($data)) {
                    foreach ($data as $image) {
                        if ($created >= $limit) {
                            break;
                        }
                        if (! is_array($image) || empty($image['id'])) {
                            continue;
                        }
                        $imageId = (string) $image['id'];
                        if (isset($seenImageIds[$imageId])) {
                            continue;
                        }

                        $coords = $image['computed_geometry']['coordinates']
                            ?? $image['geometry']['coordinates']
                            ?? null;
                        if (! is_array($coords) || count($coords) !== 2) {
                            continue;
                        }

                        $heading = (int) round(
                            $image['computed_compass_angle']
                                ?? $image['compass_angle']
                                ?? 0,
                        );

                        $row = [
                            'map_id' => $map->getKey(),
                            'lat' => $coords[1],
                            'lng' => $coords[0],
                            'heading' => $heading,
                        ];

                        $pendingRows[] = $row;
                        $jsonRows[] = [
                            'lat' => $row['lat'],
                            'lng' => $row['lng'],
                            'heading' => $row['heading'],
                        ];

                        $seenImageIds[$imageId] = true;
                        $created++;

                        if (count($pendingRows) >= 1000) {
                            Location::query()->insert($pendingRows);
                            $pendingRows = [];
                        }
                    }
                }
            }

            if ($sleepMs > 0) {
                usleep($sleepMs * 1000);
            }

            $this->output->progressAdvance();
        }

        if (count($pendingRows) > 0) {
            Location::query()->insert($pendingRows);
        }

        $this->output->progressFinish();
        file_put_contents($outputPath, json_encode($jsonRows, JSON_PRETTY_PRINT));
        $this->info("Created {$created} location(s) in {$name}.");
        $this->info("Wrote JSON to {$output}.");

        return 0;
    }
}
