<?php

namespace App\Http\Controllers;

use App\Enums\ReportReason;
use App\Enums\ReportStatus;
use App\Models\Location;
use App\Models\LocationReport;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ReportLocation extends Controller
{
    public function __invoke(Request $request, Location $location)
    {
        $validated = $request->validate([
            'reason' => ['required', Rule::enum(ReportReason::class)],
        ]);

        $existing = LocationReport::query()
            ->where('reported_by_id', $request->user()->getKey())
            ->where('location_id', $location->getKey())
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'Location already reported.',
            ], 409);
        }

        $lr = LocationReport::query()->create([
            'reported_by_id' => $request->user()->getKey(),
            'location_id' => $location->getKey(),
            'reason' => $validated['reason'],
            'status' => ReportStatus::Pending,
        ]);

        return response()->json($lr->toArray(), 201);
    }
}
