<?php

namespace App\Http\Controllers;

use App\Enums\ReportStatus;
use App\Models\LocationReport;
use App\Models\LocationReportVote;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class GetLocationReports extends Controller
{
    public function __invoke(Request $request): Response
    {
        $request->validate([
            'player_id' => ['nullable', 'uuid', 'exists:players,id'],
        ]);

        if (! $request->user() && ! $request->filled('player_id')) {
            abort(401);
        }

        $report = $this->nextPendingReportForUser($request->user()?->getKey());

        return Inertia::render('LocationReports', [
            'report' => $this->serializeReport($report),
            'playerId' => $request->string('player_id')->value() ?: null,
        ]);
    }

    private function nextPendingReportForUser(?int $userId): ?LocationReport
    {
        return LocationReport::query()
            ->with(['location', 'reportedBy'])
            ->where('status', ReportStatus::Pending)
            ->when(
                $userId !== null,
                fn ($query) => $query->whereDoesntHave('votes', function ($voteQuery) use ($userId) {
                    $voteQuery->where('user_id', $userId);
                }),
            )
            ->oldest()
            ->first();
    }

    private function serializeReport(?LocationReport $report): ?array
    {
        if (!$report) {
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
