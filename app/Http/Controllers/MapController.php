<?php

namespace App\Http\Controllers;

use App\Models\Map;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class MapController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $maps = Cache::remember('maps_active', 3600, function () {
            return Map::active()->get(['id', 'name', 'display_name', 'description', 'location_count']);
        });

        return response()->json($maps);
    }
}
