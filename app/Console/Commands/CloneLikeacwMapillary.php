<?php

namespace App\Console\Commands;

use App\Models\Location;
use App\Models\Map;

class CloneLikeacwMapillary extends MapillaryBaseCommand
{
    protected $signature = 'mapillary:clone-likeacw
                            {--force : Replace existing map and output file}
                            {--limit= : Max locations to scan}
                            {--delta=0.0005 : Bbox half-size in degrees}
                            {--sleep=150 : Delay between requests in ms}
                            {--output= : JSON output filename (default: likeacw-mapillary.json)}';

    protected $description = 'Clone Like ACW into likeacw-mapillary with Mapillary coverage.';

    public function handle(): int
    {
        $token = $this->requireToken();
        if (! $token) {
            return 1;
        }

        $source = Map::query()->where('name', 'Like ACW')->first();
        if (! $source) {
            $this->error('Source map "Like ACW" not found.');
            return 1;
        }

        $targetName = 'likeacw-mapillary';
        $target = $this->resolveOrCreateMap($targetName, (bool) $this->option('force'));
        if (! $target) {
            return 1;
        }

        $output = (string) ($this->option('output') ?: 'likeacw-mapillary.jsonl');
        $outputPath = base_path($output);
        if ($this->option('force') && file_exists($outputPath)) {
            unlink($outputPath);
        }

        $limit = $this->option('limit') ? (int) $this->option('limit') : null;
        $delta = (float) $this->option('delta');
        $sleepMs = (int) $this->option('sleep');

        $query = $source->locations()->orderBy('id');
        if ($limit) {
            $query->limit($limit);
        }

        $total = $query->count();
        $kept = 0;
        $jsonHandle = fopen($outputPath, 'ab');
        if (! $jsonHandle) {
            $this->error("Unable to open {$output} for writing.");
            return 1;
        }

        $this->info("Scanning {$total} location(s) from {$source->name}...");
        $this->output->progressStart($total);

        $query->chunk(100, function ($locations) use (
            $token,
            $delta,
            $sleepMs,
            $target,
            &$kept,
            $jsonHandle
        ) {
            foreach ($locations as $location) {
                try {
                    $bbox = $this->buildBbox($location->lat, $location->lng, $delta);
                    $data = $this->fetchMapillaryImages($bbox, $token, ['id'], 1);

                    if (is_array($data) && count($data) > 0) {
                        Location::query()->create([
                            'map_id' => $target->getKey(),
                            'lat' => $location->lat,
                            'lng' => $location->lng,
                            'heading' => $location->heading,
                        ]);
                        $row = [
                            'lat' => $location->lat,
                            'lng' => $location->lng,
                            'heading' => $location->heading,
                        ];
                        fwrite($jsonHandle, json_encode($row) . PHP_EOL);
                        $kept++;
                    }
                } catch (\Exception $exception) {
                }

                if ($sleepMs > 0) {
                    usleep($sleepMs * 1000);
                }

                $this->output->progressAdvance();
            }
        });

        $this->output->progressFinish();
        fclose($jsonHandle);
        $this->info("Created {$kept} location(s) in {$targetName}.");
        $this->info("Appended JSON lines to {$output}.");

        return 0;
    }
}
