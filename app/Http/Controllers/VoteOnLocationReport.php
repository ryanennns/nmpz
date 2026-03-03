<?php

namespace App\Http\Controllers;

use App\Enums\ReportStatus;
use App\Models\Location;
use App\Models\LocationReport;
use App\Models\LocationReportVote;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class VoteOnLocationReport extends Controller
{
    public function __invoke(Request $request, Location $location): JsonResponse
    {
        $validated = $request->validate([
            'vote' => ['required', Rule::in(['keep', 'remove'])],
        ]);

        DB::transaction(function () use ($location, $request, $validated) {
            $report = LocationReport::query()
                ->where('location_id', $location->getKey())
                ->where('status', ReportStatus::Pending)
                ->oldest()
                ->lockForUpdate()
                ->first();

            if (! $report) {
                abort(404);
            }

            $alreadyVoted = LocationReportVote::query()
                ->where('location_report_id', $report->getKey())
                ->where('user_id', $request->user()->getKey())
                ->exists();

            if ($alreadyVoted) {
                return $report;
            }

            LocationReportVote::query()->create([
                'location_report_id' => $report->getKey(),
                'user_id' => $request->user()->getKey(),
                'vote' => $validated['vote'],
            ]);

            $column = $validated['vote'] === 'keep'
                ? 'votes_to_accept'
                : 'votes_to_reject';

            $report->increment($column);
            $report->refresh();

            if ($report->votes_to_accept >= 3) {
                $report->update([
                    'status' => ReportStatus::Accepted,
                ]);
            }

            if ($report->votes_to_reject >= 3) {
                $location->delete();
                $report->update([
                    'status' => ReportStatus::Rejected,
                ]);
            }

            return $report;
        });

        $currentReport = LocationReport::query()
            ->where('location_id', $location->getKey())
            ->where('status', ReportStatus::Pending)
            ->oldest()
            ->first();

        $votedReportId = $currentReport?->getKey();

        $nextReport = $this->nextPendingReportForUser(
            $request->user()->getKey(),
            $votedReportId,
        );

        return response()->json([
            'report' => $this->serializeReport($nextReport),
        ]);
    }

    private function nextPendingReportForUser(
        int $userId,
        ?string $excludeReportId = null,
    ): ?LocationReport {
        return LocationReport::query()
            ->with(['location', 'reportedBy'])
            ->where('status', ReportStatus::Pending)
            ->when(
                $excludeReportId,
                fn ($query) => $query->whereKeyNot($excludeReportId),
            )
            ->whereDoesntHave('votes', function ($query) use ($userId) {
                $query->where('user_id', $userId);
            })
            ->oldest()
            ->first();
    }

    private function serializeReport(?LocationReport $report): ?array
    {
        if (! $report) {
            return null;
        }

        return [
            'id' => $report->getKey(),
            'reason' => $report->reason,
            'status' => $report->status->value,
            'votes_to_accept' => $report->votes_to_accept,
            'votes_to_reject' => $report->votes_to_reject,
            'reported_by' => [
                'id' => $report->reportedBy?->getKey(),
                'name' => $report->reportedBy?->name,
            ],
            'location' => $report->location
                ? [
                    'id' => $report->location->getKey(),
                    'lat' => $report->location->lat,
                    'lng' => $report->location->lng,
                    'heading' => $report->location->heading,
                    'image_id' => $report->location->image_id,
                ]
                : null,
        ];
    }
}
