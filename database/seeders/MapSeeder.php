<?php

namespace Database\Seeders;

use App\Models\Map;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class MapSeeder extends Seeder
{
    public function run(): void
    {
        $mapsDirectory = base_path('maps');
        $files = glob($mapsDirectory.'/*.jsonl') ?: [];
        sort($files);

        if (count($files) === 0) {
            throw new \RuntimeException("No jsonl files found in: {$mapsDirectory}");
        }

        $masterMapName = 'all';
        $legacyMapName = 'likeacw-mapillary';
        $fileMapNames = array_map(
            fn (string $file): string => pathinfo($file, PATHINFO_FILENAME),
            $files,
        );
        $mapNames = array_values(array_unique([
            ...$fileMapNames,
            $masterMapName,
            $legacyMapName,
        ]));

        Map::query()->whereIn('name', $mapNames)->delete();

        $mapsByName = [];
        foreach ($mapNames as $name) {
            $mapsByName[$name] = Map::query()->create(['name' => $name]);
        }

        $masterMapId = $mapsByName[$masterMapName]->getKey();
        $now = now()->toDateTimeString();

        foreach ($files as $filePath) {
            $fileMapName = pathinfo($filePath, PATHINFO_FILENAME);
            $mapIds = [
                $mapsByName[$fileMapName]->getKey(),
                $masterMapId,
            ];

            if ($fileMapName === 'mapillary-global-urban') {
                $mapIds[] = $mapsByName[$legacyMapName]->getKey();
            }

            $handle = fopen($filePath, 'rb');
            if (! $handle) {
                throw new \RuntimeException("Unable to open seed file: {$filePath}");
            }

            $batch = [];
            $mapLocationBatch = [];

            while (($line = fgets($handle)) !== false) {
                $line = trim($line);
                if ($line === '') {
                    continue;
                }

                $row = json_decode($line, true);
                if (! is_array($row)) {
                    continue;
                }

                $locationId = Str::uuid()->toString();
                $batch[] = [
                    'id' => $locationId,
                    'lat' => $row['lat'],
                    'lng' => $row['lng'],
                    'heading' => $row['heading'],
                    'image_id' => $row['image_id'] ?? null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];

                foreach ($mapIds as $mapId) {
                    $mapLocationBatch[] = [
                        'map_id' => $mapId,
                        'location_id' => $locationId,
                    ];
                }

                if (count($batch) >= 1000) {
                    DB::table('locations')->insert($batch);
                    DB::table('map_locations')->insert($mapLocationBatch);
                    $batch = [];
                    $mapLocationBatch = [];
                }
            }

            if (count($batch) > 0) {
                DB::table('locations')->insert($batch);
                DB::table('map_locations')->insert($mapLocationBatch);
            }

            fclose($handle);
        }

        DB::table('locations')
            ->whereNotExists(function ($query) {
                $query->selectRaw('1')
                    ->from('map_locations')
                    ->whereColumn('map_locations.location_id', 'locations.id');
            })
            ->delete();
    }
}
