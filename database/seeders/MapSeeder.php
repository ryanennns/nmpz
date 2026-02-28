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
        $mapName = 'likeacw-mapillary';
        $filePath = base_path('./maps/mapillary-global-urban.jsonl');

        if (! file_exists($filePath)) {
            throw new \RuntimeException("Seed file not found: {$filePath}");
        }

        $existing = Map::query()->where('name', $mapName)->first();
        if ($existing) {
            $existing->delete();
        }

        $map = Map::query()->create(['name' => $mapName]);

        $now = now()->toDateTimeString();

        $handle = fopen($filePath, 'rb');
        if (! $handle) {
            throw new \RuntimeException("Unable to open seed file: {$filePath}");
        }

        $batch = [];
        while (($line = fgets($handle)) !== false) {
            $line = trim($line);
            if ($line === '') {
                continue;
            }
            $row = json_decode($line, true);
            if (! is_array($row)) {
                continue;
            }
            $batch[] = [
                'id' => Str::uuid()->toString(),
                'map_id' => $map->getKey(),
                'lat' => $row['lat'],
                'lng' => $row['lng'],
                'heading' => $row['heading'],
                'image_id' => $row['image_id'] ?? null,
                'created_at' => $now,
                'updated_at' => $now,
            ];

            if (count($batch) >= 1000) {
                DB::table('locations')->insert($batch);
                $batch = [];
            }
        }

        if (count($batch) > 0) {
            DB::table('locations')->insert($batch);
        }

        fclose($handle);
    }
}
