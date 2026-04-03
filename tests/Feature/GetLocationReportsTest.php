<?php

namespace Tests\Feature;

use App\Enums\ReportStatus;
use App\Models\Location;
use App\Models\LocationReport;
use App\Models\LocationReportVote;
use App\Models\Player;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class GetLocationReportsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    public function test_request_without_auth_or_player_id_is_unauthorized(): void
    {
        $this->get('/locations/reports')->assertUnauthorized();
    }

    public function test_guest_player_can_view_the_oldest_pending_report(): void
    {
        $player = Player::factory()->create();
        $location = Location::factory()->create();
        $report = LocationReport::query()->create([
            'reported_by_id' => null,
            'location_id' => $location->getKey(),
            'reason' => 'inaccurate',
            'status' => ReportStatus::Pending,
            'votes_to_accept' => 0,
            'votes_to_reject' => 0,
        ]);

        $this->get('/locations/reports?player_id=' . $player->getKey())
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('LocationReports')
                ->where('report.id', $report->getKey())
                ->where('playerId', $player->getKey()),
            );
    }

    public function test_authenticated_user_can_view_the_oldest_pending_report(): void
    {
        $user = User::factory()->create(['name' => 'Moderator']);
        $reportingUser = User::factory()->create(['name' => 'Alice']);
        $firstLocation = Location::factory()->create([
            'lat' => 48.8566,
            'lng' => 2.3522,
            'heading' => 180,
            'image_id' => 'image-1',
        ]);
        $secondLocation = Location::factory()->create();

        $oldestReport = LocationReport::query()->create([
            'reported_by_id' => $reportingUser->getKey(),
            'location_id' => $firstLocation->getKey(),
            'reason' => 'inaccurate',
            'status' => ReportStatus::Pending,
            'votes_to_accept' => 1,
            'votes_to_reject' => 2,
            'created_at' => now()->subMinute(),
            'updated_at' => now()->subMinute(),
        ]);

        LocationReport::query()->create([
            'reported_by_id' => $reportingUser->getKey(),
            'location_id' => $secondLocation->getKey(),
            'reason' => 'bad coverage',
            'status' => ReportStatus::Pending,
            'votes_to_accept' => 0,
            'votes_to_reject' => 0,
        ]);

        $this->actingAs($user)
            ->get('/locations/reports')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('LocationReports')
                ->where('report.id', $oldestReport->getKey())
                ->where('report.reason', 'inaccurate')
                ->where('report.status', ReportStatus::Pending->value)
                ->where('report.votes_to_accept', 1)
                ->where('report.votes_to_reject', 2)
                ->where('report.reported_by.name', 'Alice')
                ->where('report.location.id', $firstLocation->getKey())
                ->where('report.location.lat', 48.8566)
                ->where('report.location.lng', 2.3522)
                ->where('report.location.heading', 180)
                ->where('report.location.image_id', 'image-1'),
            );
    }

    public function test_page_returns_null_when_there_are_no_pending_reports(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/locations/reports')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('LocationReports')
                ->where('report', null),
            );
    }

    public function test_page_skips_pending_reports_the_current_user_has_already_voted_on(): void
    {
        $user = User::factory()->create();
        $reportingUser = User::factory()->create();
        $firstLocation = Location::factory()->create();
        $secondLocation = Location::factory()->create();

        $firstReport = LocationReport::query()->create([
            'reported_by_id' => $reportingUser->getKey(),
            'location_id' => $firstLocation->getKey(),
            'reason' => 'inaccurate',
            'status' => ReportStatus::Pending,
            'votes_to_accept' => 1,
            'votes_to_reject' => 0,
        ]);

        $secondReport = LocationReport::query()->create([
            'reported_by_id' => $reportingUser->getKey(),
            'location_id' => $secondLocation->getKey(),
            'reason' => 'bad coverage',
            'status' => ReportStatus::Pending,
            'votes_to_accept' => 0,
            'votes_to_reject' => 1,
        ]);

        LocationReportVote::query()->create([
            'location_report_id' => $firstReport->getKey(),
            'user_id' => $user->getKey(),
            'vote' => 'keep',
        ]);

        $this->actingAs($user)
            ->get('/locations/reports')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('LocationReports')
                ->where('report.id', $secondReport->getKey()),
            );
    }
}
