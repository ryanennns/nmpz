<?php

namespace Tests\Feature;

use App\Enums\ReportReason;
use App\Enums\ReportStatus;
use App\Models\Location;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportLocationTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_report_a_location(): void
    {
        $location = Location::factory()->create();

        $this->postJson(route('locations.report', $location), [
            'reason' => ReportReason::Inaccurate->value,
        ])->assertUnauthorized();
    }

    public function test_authenticated_user_can_report_a_location(): void
    {
        $location = Location::factory()->create();
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson(
            route('locations.report', $location),
            [
                'reason' => ReportReason::Inaccurate->value,
            ],
        );

        $response->assertCreated()
            ->assertJsonPath('reported_by_id', $user->getKey())
            ->assertJsonPath('location_id', $location->getKey())
            ->assertJsonPath('reason', ReportReason::Inaccurate->value)
            ->assertJsonPath('status', ReportStatus::Pending->value)
            ->assertJsonStructure([
                'id',
                'reported_by_id',
                'location_id',
                'reason',
                'status',
                'created_at',
                'updated_at',
            ]);

        $this->assertDatabaseHas('location_reports', [
            'reported_by_id' => $user->getKey(),
            'location_id' => $location->getKey(),
            'reason' => ReportReason::Inaccurate->value,
            'status' => ReportStatus::Pending->value,
        ]);
    }

    public function test_reason_is_required(): void
    {
        $location = Location::factory()->create();
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson(route('locations.report', $location), [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['reason']);
    }

    public function test_reason_must_be_a_valid_enum_value(): void
    {
        $location = Location::factory()->create();
        $user = User::factory()->create();

        $this->actingAs($user)->postJson(route('locations.report', $location), [
            'reason' => 'not-a-real-reason',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['reason']);
    }

    public function test_user_cannot_report_the_same_location_twice(): void
    {
        $location = Location::factory()->create();
        $user = User::factory()->create();

        $this->actingAs($user)->postJson(route('locations.report', $location), [
            'reason' => ReportReason::Inaccurate->value,
        ])->assertCreated();

        $this->actingAs($user)->postJson(route('locations.report', $location), [
            'reason' => ReportReason::Inappropriate->value,
        ])->assertStatus(409)
            ->assertJsonPath('message', 'Location already reported.');

        $this->assertDatabaseCount('location_reports', 1);
        $this->assertDatabaseHas('location_reports', [
            'reported_by_id' => $user->getKey(),
            'location_id' => $location->getKey(),
            'reason' => ReportReason::Inaccurate->value,
            'status' => ReportStatus::Pending->value,
        ]);
    }
}
