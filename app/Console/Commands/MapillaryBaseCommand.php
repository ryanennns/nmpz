<?php

namespace App\Console\Commands;

use App\Models\Map;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

abstract class MapillaryBaseCommand extends Command
{
    protected function requireToken(): ?string
    {
        $token = env('VITE_MAPILLARY_ACCESS_TOKEN');
        if (! $token) {
            $this->error('VITE_MAPILLARY_ACCESS_TOKEN is not set.');
        }

        return $token;
    }

    protected function resolveOrCreateMap(string $name, bool $force): ?Map
    {
        $existing = Map::query()->where('name', $name)->first();
        if ($existing) {
            if (! $force) {
                $this->error('Target map already exists. Use --force to replace it.');
                return null;
            }
            $existing->delete();
        }

        return Map::query()->create(['name' => $name]);
    }

    protected function checkOutputFile(string $path, bool $force): bool
    {
        if (file_exists($path) && ! $force) {
            $this->error('Output file already exists. Use --force to overwrite it.');
            return false;
        }

        return true;
    }

    protected function fetchMapillaryImages(string $bbox, string $token, array $fields, int $limit): ?array
    {
        $response = Http::get('https://graph.mapillary.com/images', [
            'access_token' => $token,
            'fields' => implode(',', $fields),
            'bbox' => $bbox,
            'limit' => $limit,
        ]);

        if (! $response->ok()) {
            return null;
        }

        return $response->json('data');
    }

    protected function extractCoordinates(array $image): ?array
    {
        $coords = $image['computed_geometry']['coordinates']
            ?? $image['geometry']['coordinates']
            ?? null;

        if (! is_array($coords) || count($coords) !== 2) {
            return null;
        }

        return ['lat' => $coords[1], 'lng' => $coords[0]];
    }

    protected function extractHeading(array $image): int
    {
        return (int) round(
            $image['computed_compass_angle']
                ?? $image['compass_angle']
                ?? 0,
        );
    }

    protected function buildBbox(float $lat, float $lng, float $delta): string
    {
        return implode(',', [
            $lng - $delta,
            $lat - $delta,
            $lng + $delta,
            $lat + $delta,
        ]);
    }
}
