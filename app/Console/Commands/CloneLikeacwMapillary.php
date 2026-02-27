<?php

namespace App\Console\Commands;

use App\Models\Location;
use App\Models\Map;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class CloneLikeacwMapillary extends Command
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
        $token = env('VITE_MAPILLARY_ACCESS_TOKEN');
        if (! $token) {
            $this->error('VITE_MAPILLARY_ACCESS_TOKEN is not set.');
            return 1;
        }

        $source = Map::query()->where('name', 'Like ACW')->first();
        if (! $source) {
            $this->error('Source map "Like ACW" not found.');
            return 1;
        }

        $targetName = 'likeacw-mapillary';
        $existing = Map::query()->where('name', $targetName)->first();
        if ($existing) {
            if (! $this->option('force')) {
                $this->error('Target map already exists. Use --force to replace it.');
                return 1;
            }
            $existing->delete();
        }

        $output = (string) ($this->option('output') ?: 'likeacw-mapillary.json');
        $outputPath = base_path($output);
        if (file_exists($outputPath) && ! $this->option('force')) {
            $this->error('Output file already exists. Use --force to overwrite it.');
            return 1;
        }

        $limit = $this->option('limit') ? (int) $this->option('limit') : null;
        $delta = (float) $this->option('delta');
        $sleepMs = (int) $this->option('sleep');

        $target = Map::query()->create(['name' => $targetName]);

        $query = $source->locations()->orderBy('id');
        if ($limit) {
            $query->limit($limit);
        }

        $total = $query->count();
        $kept = 0;
        $jsonRows = [];

        $this->info("Scanning {$total} location(s) from {$source->name}...");
        $this->output->progressStart($total);

        $query->chunk(100, function ($locations) use (
            $token,
            $delta,
            $sleepMs,
            $target,
            &$kept,
            &$jsonRows
        ) {
            foreach ($locations as $location) {
                $bbox = implode(',', [
                    $location->lng - $delta,
                    $location->lat - $delta,
                    $location->lng + $delta,
                    $location->lat + $delta,
                ]);

                $response = Http::get('https://graph.mapillary.com/images', [
                    'access_token' => $token,
                    'fields' => 'id',
                    'bbox' => $bbox,
                    'limit' => 1,
                ]);

                if ($response->ok()) {
                    $data = $response->json('data');
                    if (is_array($data) && count($data) > 0) {
                        Location::query()->create([
                            'map_id' => $target->getKey(),
                            'lat' => $location->lat,
                            'lng' => $location->lng,
                            'heading' => $location->heading,
                        ]);
                        $jsonRows[] = [
                            'lat' => $location->lat,
                            'lng' => $location->lng,
                            'heading' => $location->heading,
                        ];
                        $kept++;
                    }
                }
                elseif ($response->notFound()) {}
                else {
                    $this->info('API ERROR');
                }

                if ($sleepMs > 0) {
                    usleep($sleepMs * 1000);
                }

                $this->output->progressAdvance();
            }
        });

        $this->output->progressFinish();
        file_put_contents($outputPath, json_encode($jsonRows, JSON_PRETTY_PRINT));
        $this->info("Created {$kept} location(s) in {$targetName}.");
        $this->info("Wrote JSON to {$output}.");

        return 0;
    }
}
