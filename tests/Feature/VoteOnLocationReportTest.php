<?php

namespace Tests\Feature;

use App\Enums\ReportStatus;
use App\Models\Location;
use App\Models\LocationReport;
use App\Models\Player;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VoteOnLocationReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_request_without_auth_or_player_id_is_unauthorized(): void
    {
        $location = Location::factory()->create();
        $report = $this->createPendingReport($location);

        $this->post(route('location-reports.vote', $report), [
            'vote' => 'keep',
        ])->assertUnauthorized();
    }

    public function test_guest_player_can_vote_on_a_report(): void
    {
        $player = Player::factory()->create();
        $location = Location::factory()->create();
        $report = $this->createPendingReport($location);

        $this->postJson(route('location-reports.vote', $report), [
            'player_id' => $player->getKey(),
            'vote' => 'keep',
        ])->assertOk()
            ->assertJson([
                'report' => null,
            ]);

        $this->assertDatabaseHas('location_reports', [
            'id' => $report->getKey(),
            'votes_to_accept' => 1,
            'votes_to_reject' => 0,
            'status' => ReportStatus::Pending->value,
        ]);

        $this->assertDatabaseHas('location_report_votes', [
            'location_report_id' => $report->getKey(),
            'user_id' => null,
            'vote' => 'keep',
        ]);
    }

    public function test_vote_is_required(): void
    {
        $user = User::factory()->create();
        $location = Location::factory()->create();
        $report = $this->createPendingReport($location);

        $this->actingAs($user)
            ->post(route('location-reports.vote', $report), [])
            ->assertSessionHasErrors(['vote']);
    }

    public function test_vote_must_be_keep_or_remove(): void
    {
        $user = User::factory()->create();
        $location = Location::factory()->create();
        $report = $this->createPendingReport($location);

        $this->actingAs($user)
            ->post(route('location-reports.vote', $report), [
                'vote' => 'skip',
            ])
            ->assertSessionHasErrors(['vote']);
    }

    public function test_keep_vote_increments_votes_to_accept(): void
    {
        $user = User::factory()->create();
        $location = Location::factory()->create();
        $report = $this->createPendingReport($location);

        $this->actingAs($user)
            ->postJson(route('location-reports.vote', $report), [
                'vote' => 'keep',
            ])
            ->assertOk()
            ->assertJson([
                'report' => null,
            ]);

        $this->assertDatabaseHas('location_reports', [
            'id' => $report->getKey(),
            'votes_to_accept' => 1,
            'votes_to_reject' => 0,
            'status' => ReportStatus::Pending->value,
        ]);

        $this->assertDatabaseHas('location_report_votes', [
            'location_report_id' => $report->getKey(),
            'user_id' => $user->getKey(),
            'vote' => 'keep',
        ]);
    }

    public function test_third_keep_vote_marks_the_report_as_accepted(): void
    {
        $location = Location::factory()->create();
        $report = $this->createPendingReport($location, [
            'votes_to_accept' => 2,
        ]);

        $this->actingAs(User::factory()->create())
            ->postJson(route('location-reports.vote', $report), [
                'vote' => 'keep',
            ])
            ->assertOk()
            ->assertJson([
                'report' => null,
            ]);

        $this->assertDatabaseHas('location_reports', [
            'id' => $report->getKey(),
            'votes_to_accept' => 3,
            'status' => ReportStatus::Accepted->value,
        ]);

        $this->assertDatabaseHas('locations', [
            'id' => $location->getKey(),
        ]);
    }

    public function test_third_remove_vote_soft_deletes_the_location_and_marks_the_report_as_rejected(): void
    {
        $location = Location::factory()->create();
        $report = $this->createPendingReport($location, [
            'votes_to_reject' => 2,
        ]);

        $this->actingAs(User::factory()->create())
            ->postJson(route('location-reports.vote', $report), [
                'vote' => 'remove',
            ])
            ->assertOk()
            ->assertJson([
                'report' => null,
            ]);

        $this->assertDatabaseHas('location_reports', [
            'id' => $report->getKey(),
            'votes_to_reject' => 3,
            'status' => ReportStatus::Rejected->value,
        ]);
        $this->assertSoftDeleted('locations', [
            'id' => $location->getKey(),
        ]);
    }

    public function test_user_one_can_remove_a_location_immediately(): void
    {
        $user = User::factory()->create([
            'id' => 1,
        ]);
        $location = Location::factory()->create();
        $report = $this->createPendingReport($location);

        $this->actingAs($user)
            ->postJson(route('location-reports.vote', $report), [
                'vote' => 'remove',
            ])
            ->assertOk()
            ->assertJson([
                'report' => null,
            ]);

        $this->assertDatabaseHas('location_reports', [
            'id' => $report->getKey(),
            'votes_to_reject' => 1,
            'status' => ReportStatus::Rejected->value,
        ]);
        $this->assertSoftDeleted('locations', [
            'id' => $location->getKey(),
        ]);
        $this->assertDatabaseHas('location_report_votes', [
            'location_report_id' => $report->getKey(),
            'user_id' => 1,
            'vote' => 'remove',
        ]);
    }

    public function test_same_user_cannot_increment_the_vote_twice(): void
    {
        $user = User::factory()->create();
        $location = Location::factory()->create();
        $report = $this->createPendingReport($location);

        $this->actingAs($user)->postJson(route('location-reports.vote', $report), [
            'vote' => 'keep',
        ])->assertOk();

        $this->actingAs($user)->postJson(route('location-reports.vote', $report), [
            'vote' => 'keep',
        ])->assertOk();

        $this->assertDatabaseHas('location_reports', [
            'id' => $report->getKey(),
            'votes_to_accept' => 1,
        ]);
        $this->assertDatabaseCount('location_report_votes', 1);
    }

    public function test_voting_requires_a_pending_report_for_the_location(): void
    {
        $user = User::factory()->create();
        $location = Location::factory()->create();
        $report = $this->createPendingReport($location, [
            'status' => ReportStatus::Accepted,
        ]);

        $this->actingAs($user)
            ->post(route('location-reports.vote', $report), [
                'vote' => 'keep',
            ])
            ->assertUnprocessable();
    }

    public function test_vote_returns_the_next_available_report_for_the_user(): void
    {
        $user = User::factory()->create();
        $firstLocation = Location::factory()->create();
        $secondLocation = Location::factory()->create([
            'lat' => 35.6762,
            'lng' => 139.6503,
            'heading' => 90,
            'image_id' => 'image-2',
        ]);
        $firstReport = $this->createPendingReport($firstLocation);
        $secondReport = $this->createPendingReport($secondLocation, [
            'reason' => 'bad coverage',
        ]);

        $this->actingAs($user)
            ->postJson(route('location-reports.vote', $firstReport), [
                'vote' => 'keep',
            ])
            ->assertOk()
            ->assertJsonPath('report.id', $secondReport->getKey())
            ->assertJsonPath('report.reason', 'bad coverage')
            ->assertJsonPath('report.location.id', $secondLocation->getKey())
            ->assertJsonPath('report.location.image_id', 'image-2');
    }

    private function createPendingReport(Location $location, array $overrides = []): LocationReport
    {
        return LocationReport::query()->create([
            'reported_by_id' => User::factory()->create()->getKey(),
            'location_id' => $location->getKey(),
            'reason' => 'inaccurate',
            'status' => ReportStatus::Pending,
            'votes_to_accept' => 0,
            'votes_to_reject' => 0,
            ...$overrides,
        ]);
    }
}
