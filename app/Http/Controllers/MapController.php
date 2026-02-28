<?php

namespace App\Http\Controllers;

use App\Models\Map;
use Illuminate\Http\JsonResponse;

class MapController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json(
            Map::active()->get(['id', 'name', 'display_name', 'description', 'location_count'])
        );
    }
}
