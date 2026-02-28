<?php

namespace App\Services;

class ScoringService
{
    public static function calculateScore(float $lat1, float $lng1, float $lat2, float $lng2): int
    {
        $distanceKm = self::haversineDistanceKm($lat1, $lng1, $lat2, $lng2);

        if ($distanceKm < 0.025) {
            return 5000;
        }

        return (int) round(5000 * exp(-$distanceKm / 2000.0));
    }

    public static function haversineDistanceKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadiusKm = 6371.0;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);

        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return $earthRadiusKm * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
