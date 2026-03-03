<?php

namespace App\Http\Controllers;

use App\Enums\ReportStatus;
use App\Models\LocationReport;
use App\Models\LocationReportVote;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Validation\Rule;

class VoteOnLocationReport extends Controller
{
    public function __invoke(Request $request, LocationReport $locationReport): JsonResponse
    {
        if ($locationReport->status !== ReportStatus::Pending) {
            return response()->json([
                'message' => 'This report has already been resolved.',
            ], 422);
        }

        if ($locationReport->votes()->where('user_id', $request->user()->getKey())->exists()) {
            return response()->json([
                'message' => 'You have already voted on this report.',
            ]);
        }

        $validated = $request->validate([
            'vote' => ['required', Rule::in(['keep', 'remove'])],
        ]);

        $vote = Arr::get($validated, 'vote');

        if (! $vote) {
            return response()->json([
                'message' => 'Invalid vote value.',
            ], 422);
        }

        if ($request->user()->getKey() === 1 && $vote === 'remove') {
            $locationReport->update(['status' => ReportStatus::Rejected]);
            $locationReport->location()->delete();
        }

        $locationReport->increment($vote === 'keep'
            ? 'votes_to_accept'
            : 'votes_to_reject');
        $locationReport->save();

        LocationReportVote::query()->create([
            'location_report_id' => $locationReport->getKey(),
            'user_id' => $request->user()->getKey(),
            'vote' => $vote,
        ]);

        if ($locationReport->votes_to_accept >= 3) {
            $locationReport->status = ReportStatus::Accepted;
        }

        if ($locationReport->votes_to_reject >= 3) {
            $locationReport->status = ReportStatus::Rejected;
            $locationReport->location()->delete();
        }

        $locationReport->save();

        $report = $this->nextPendingReportForUser(
            $request->user()->getKey(),
            $locationReport->getKey(),
        );

        if (! $report) {
            return response()->json([
                'report' => null,
            ]);
        }

        return response()->json([
            'report' => [
                'id' => $report->getKey(),
                'reason' => $report->reason,
                'status' => $report->status->value,
                'votes_to_accept' => $report->votes_to_accept,
                'votes_to_reject' => $report->votes_to_reject,
                'reported_by' => [
                    'id' => $report->reportedBy?->getKey(),
                    'name' => $report->reportedBy?->name,
                ],
                'location' => [
                    'id' => $report->location?->getKey(),
                    'lat' => $report->location?->lat,
                    'lng' => $report->location?->lng,
                    'heading' => $report->location?->heading,
                    'image_id' => $report->location?->image_id,
                ],
            ],
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
}
