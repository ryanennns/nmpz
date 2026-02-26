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
        $map = Map::query()->create(['name' => 'Like ACW']);

        $json = json_decode(file_get_contents(base_path('likeacw.json')), true);

        $now = now()->toDateTimeString();

        $chunks = array_chunk($json, 1000);

        foreach ($chunks as $chunk) {
            DB::table('locations')->insert(array_map(fn ($row) => [
                'id' => Str::uuid()->toString(),
                'map_id' => $map->getKey(),
                'lat' => $row['lat'],
                'lng' => $row['lng'],
                'heading' => $row['heading'],
                'created_at' => $now,
                'updated_at' => $now,
            ], $chunk));
        }
    }
}
