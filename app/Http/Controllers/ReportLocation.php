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
            ->where('location_id', $location->getKey())
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'Location already reported.',
            ], 409);
        }

        $pendingReport = LocationReport::query()
            ->where('location_id', $location->getKey())
            ->where('status', ReportStatus::Pending)
            ->exists();

        if ($pendingReport) {
            return response()->json([
                'message' => 'Location already has a pending report.',
            ], 409);
        }

        $lr = LocationReport::query()->create([
            'reported_by_id' => $request->user()->getKey(),
            'location_id' => $location->getKey(),
            'reason' => $validated['reason'],
            'status' => ReportStatus::Pending,
            'votes_to_accept' => 0,
            'votes_to_reject' => 0,
        ]);

        return response()->json($lr->toArray(), 201);
    }
}
