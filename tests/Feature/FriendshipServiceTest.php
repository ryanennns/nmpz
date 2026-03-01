<?php

namespace Tests\Feature;

use App\Models\Friendship;
use App\Models\Player;
use App\Services\FriendshipService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FriendshipServiceTest extends TestCase
{
    use RefreshDatabase;

    private FriendshipService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new FriendshipService();
    }

    public function test_get_friends_returns_accepted_friendships(): void
    {
        $player = Player::factory()->create();
        $friend1 = Player::factory()->create();
        $friend2 = Player::factory()->create();

        Friendship::create(['sender_id' => $player->getKey(), 'receiver_id' => $friend1->getKey(), 'status' => 'accepted']);
        Friendship::create(['sender_id' => $friend2->getKey(), 'receiver_id' => $player->getKey(), 'status' => 'accepted']);

        $friends = $this->service->getFriendsFor($player);

        $this->assertCount(2, $friends);
    }

    public function test_get_friends_excludes_pending_and_declined(): void
    {
        $player = Player::factory()->create();
        $pending = Player::factory()->create();
        $declined = Player::factory()->create();

        Friendship::create(['sender_id' => $player->getKey(), 'receiver_id' => $pending->getKey(), 'status' => 'pending']);
        Friendship::create(['sender_id' => $declined->getKey(), 'receiver_id' => $player->getKey(), 'status' => 'declined']);

        $friends = $this->service->getFriendsFor($player);

        $this->assertCount(0, $friends);
    }

    public function test_send_request_creates_pending_friendship(): void
    {
        $sender = Player::factory()->create();
        $receiver = Player::factory()->create();

        $result = $this->service->sendRequest($sender, $receiver->getKey());

        $this->assertEquals('pending', $result['status']);
        $this->assertArrayHasKey('friendship_id', $result);
        $this->assertDatabaseHas('friendships', [
            'sender_id' => $sender->getKey(),
            'receiver_id' => $receiver->getKey(),
            'status' => 'pending',
        ]);
    }

    public function test_send_request_fails_for_self(): void
    {
        $player = Player::factory()->create();

        $result = $this->service->sendRequest($player, $player->getKey());

        $this->assertEquals('error', $result['status']);
        $this->assertEquals('Cannot friend yourself', $result['error']);
    }

    public function test_send_request_fails_when_already_friends(): void
    {
        $p1 = Player::factory()->create();
        $p2 = Player::factory()->create();

        Friendship::create(['sender_id' => $p1->getKey(), 'receiver_id' => $p2->getKey(), 'status' => 'accepted']);

        $result = $this->service->sendRequest($p1, $p2->getKey());

        $this->assertEquals('error', $result['status']);
        $this->assertEquals('Already friends', $result['error']);
    }

    public function test_send_request_auto_accepts_mutual(): void
    {
        $p1 = Player::factory()->create();
        $p2 = Player::factory()->create();

        Friendship::create(['sender_id' => $p2->getKey(), 'receiver_id' => $p1->getKey(), 'status' => 'pending']);

        $result = $this->service->sendRequest($p1, $p2->getKey());

        $this->assertEquals('accepted', $result['status']);
        $this->assertDatabaseHas('friendships', [
            'sender_id' => $p2->getKey(),
            'receiver_id' => $p1->getKey(),
            'status' => 'accepted',
        ]);
    }

    public function test_send_request_fails_for_duplicate(): void
    {
        $sender = Player::factory()->create();
        $receiver = Player::factory()->create();

        Friendship::create(['sender_id' => $sender->getKey(), 'receiver_id' => $receiver->getKey(), 'status' => 'pending']);

        $result = $this->service->sendRequest($sender, $receiver->getKey());

        $this->assertEquals('error', $result['status']);
        $this->assertEquals('Request already sent', $result['error']);
    }

    public function test_accept_succeeds_for_receiver(): void
    {
        $sender = Player::factory()->create();
        $receiver = Player::factory()->create();
        $friendship = Friendship::create(['sender_id' => $sender->getKey(), 'receiver_id' => $receiver->getKey(), 'status' => 'pending']);

        $result = $this->service->accept($friendship, $receiver);

        $this->assertEquals('accepted', $result['status']);
        $this->assertEquals('accepted', $friendship->fresh()->status);
    }

    public function test_accept_fails_for_sender(): void
    {
        $sender = Player::factory()->create();
        $receiver = Player::factory()->create();
        $friendship = Friendship::create(['sender_id' => $sender->getKey(), 'receiver_id' => $receiver->getKey(), 'status' => 'pending']);

        $result = $this->service->accept($friendship, $sender);

        $this->assertArrayHasKey('error', $result);
        $this->assertEquals('Not your request', $result['error']);
    }

    public function test_accept_fails_for_non_pending(): void
    {
        $sender = Player::factory()->create();
        $receiver = Player::factory()->create();
        $friendship = Friendship::create(['sender_id' => $sender->getKey(), 'receiver_id' => $receiver->getKey(), 'status' => 'accepted']);

        $result = $this->service->accept($friendship, $receiver);

        $this->assertArrayHasKey('error', $result);
        $this->assertEquals('Request not pending', $result['error']);
    }

    public function test_decline_succeeds_for_receiver(): void
    {
        $sender = Player::factory()->create();
        $receiver = Player::factory()->create();
        $friendship = Friendship::create(['sender_id' => $sender->getKey(), 'receiver_id' => $receiver->getKey(), 'status' => 'pending']);

        $result = $this->service->decline($friendship, $receiver);

        $this->assertEquals('declined', $result['status']);
    }

    public function test_decline_fails_for_sender(): void
    {
        $sender = Player::factory()->create();
        $receiver = Player::factory()->create();
        $friendship = Friendship::create(['sender_id' => $sender->getKey(), 'receiver_id' => $receiver->getKey(), 'status' => 'pending']);

        $result = $this->service->decline($friendship, $sender);

        $this->assertArrayHasKey('error', $result);
    }

    public function test_remove_succeeds_for_sender(): void
    {
        $sender = Player::factory()->create();
        $receiver = Player::factory()->create();
        $friendship = Friendship::create(['sender_id' => $sender->getKey(), 'receiver_id' => $receiver->getKey(), 'status' => 'accepted']);

        $result = $this->service->remove($friendship, $sender);

        $this->assertTrue($result['removed']);
        $this->assertDatabaseMissing('friendships', ['id' => $friendship->getKey()]);
    }

    public function test_remove_succeeds_for_receiver(): void
    {
        $sender = Player::factory()->create();
        $receiver = Player::factory()->create();
        $friendship = Friendship::create(['sender_id' => $sender->getKey(), 'receiver_id' => $receiver->getKey(), 'status' => 'accepted']);

        $result = $this->service->remove($friendship, $receiver);

        $this->assertTrue($result['removed']);
    }

    public function test_remove_fails_for_outsider(): void
    {
        $sender = Player::factory()->create();
        $receiver = Player::factory()->create();
        $outsider = Player::factory()->create();
        $friendship = Friendship::create(['sender_id' => $sender->getKey(), 'receiver_id' => $receiver->getKey(), 'status' => 'accepted']);

        $result = $this->service->remove($friendship, $outsider);

        $this->assertArrayHasKey('error', $result);
        $this->assertEquals('Not your friendship', $result['error']);
    }

    public function test_get_pending_requests(): void
    {
        $sender = Player::factory()->create();
        $receiver = Player::factory()->create();

        Friendship::create(['sender_id' => $sender->getKey(), 'receiver_id' => $receiver->getKey(), 'status' => 'pending']);

        $pending = $this->service->getPendingRequestsFor($receiver);

        $this->assertCount(1, $pending);
        $this->assertEquals($sender->getKey(), $pending->first()['player_id']);
    }

    public function test_get_pending_excludes_accepted(): void
    {
        $sender = Player::factory()->create();
        $receiver = Player::factory()->create();

        Friendship::create(['sender_id' => $sender->getKey(), 'receiver_id' => $receiver->getKey(), 'status' => 'accepted']);

        $pending = $this->service->getPendingRequestsFor($receiver);

        $this->assertCount(0, $pending);
    }
}
