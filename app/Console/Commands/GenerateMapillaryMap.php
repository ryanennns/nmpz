<?php

namespace App\Console\Commands;

use App\Models\Location;

class GenerateMapillaryMap extends MapillaryBaseCommand
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
        $token = $this->requireToken();
        if (! $token) {
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

        $map = $this->resolveOrCreateMap($name, (bool) $this->option('force'));
        if (! $map) {
            return 1;
        }

        if (! $this->checkOutputFile($outputPath, (bool) $this->option('force'))) {
            return 1;
        }

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
        $fields = ['id', 'computed_geometry', 'geometry', 'computed_compass_angle', 'compass_angle'];

        for ($lat = $latMin; $lat <= $latMax; $lat += $grid) {
            for ($lng = $lngMin; $lng <= $lngMax; $lng += $grid) {
                if ($limit && $created >= $limit) {
                    $this->output->progressFinish();
                    $this->info("Created {$created} location(s) in {$name}.");
                    return 0;
                }

                $bbox = $this->buildBbox($lat, $lng, $delta);

                $data = $this->fetchMapillaryImages($bbox, $token, $fields, 1);
                if (is_array($data)) {
                    $image = $data[0] ?? null;
                    if (is_array($image) && isset($image['id'])) {
                        $imageId = (string) $image['id'];
                        if (! isset($seenImageIds[$imageId])) {
                            $coords = $this->extractCoordinates($image);
                            if ($coords) {
                                $heading = $this->extractHeading($image);

                                Location::query()->create([
                                    'map_id' => $map->getKey(),
                                    'lat' => $coords['lat'],
                                    'lng' => $coords['lng'],
                                    'heading' => $heading,
                                ]);

                                $jsonRows[] = [
                                    'lat' => $coords['lat'],
                                    'lng' => $coords['lng'],
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
