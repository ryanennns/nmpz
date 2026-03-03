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
        $report = $this->nextPendingReportForUser($request->user()->getKey());

        return Inertia::render('LocationReports', [
            'report' => $this->serializeReport($report),
        ]);
    }

    private function nextPendingReportForUser(int $userId): ?LocationReport
    {
        return LocationReport::query()
            ->with(['location', 'reportedBy'])
            ->where('status', ReportStatus::Pending)
            ->whereDoesntHave('votes', function ($query) use ($userId) {
                $query->where('user_id', $userId);
            })
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
