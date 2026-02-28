<?php

namespace App\Console\Commands;

use App\Models\Location;
use Illuminate\Support\Str;

class GenerateMapillaryGlobalRandom extends MapillaryBaseCommand
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
        $token = $this->requireToken();
        if (! $token) {
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

        $map = $this->resolveOrCreateMap($name, (bool) $this->option('force'));
        if (! $map) {
            return 1;
        }

        if (! $this->checkOutputFile($outputPath, (bool) $this->option('force'))) {
            return 1;
        }

        $created = 0;
        $seenImageIds = [];
        $jsonRows = [];
        $pendingRows = [];

        $fields = ['id', 'computed_geometry', 'geometry', 'computed_compass_angle', 'compass_angle', 'is_pano'];

        $this->info("Sampling up to {$attempts} bbox(es) for {$limit} locations...");
        $this->output->progressStart($attempts);

        for ($i = 0; $i < $attempts; $i++) {
            if ($created >= $limit) {
                break;
            }

            $lat = -85.0 + (mt_rand() / mt_getrandmax()) * 170.0;
            $lng = -180.0 + (mt_rand() / mt_getrandmax()) * 360.0;
            $bbox = $this->buildBbox($lat, $lng, $delta);

            $data = $this->fetchMapillaryImages($bbox, $token, $fields, 2000);
            if (is_array($data)) {
                foreach ($data as $image) {
                    if ($created >= $limit) {
                        break;
                    }
                    if (! is_array($image) || empty($image['id'])) {
                        continue;
                    }
                    if ($panoOnly && empty($image['is_pano'])) {
                        continue;
                    }
                    $imageId = (string) $image['id'];
                    if (isset($seenImageIds[$imageId])) {
                        continue;
                    }

                    $coords = $this->extractCoordinates($image);
                    if (! $coords) {
                        continue;
                    }

                    $heading = $this->extractHeading($image);

                    $row = [
                        'id' => Str::orderedUuid()->toString(),
                        'map_id' => $map->getKey(),
                        'lat' => $coords['lat'],
                        'lng' => $coords['lng'],
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
