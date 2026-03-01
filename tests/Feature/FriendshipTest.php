<?php

namespace Tests\Feature;

use App\Models\Friendship;
use App\Models\Player;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FriendshipTest extends TestCase
{
    use RefreshDatabase;

    public function test_send_friend_request(): void
    {
        $sender = Player::factory()->create();
        $receiver = Player::factory()->create();

        $response = $this->postJson("/players/{$sender->getKey()}/friends", [
            'receiver_id' => $receiver->getKey(),
        ]);

        $response->assertOk();
        $response->assertJsonPath('status', 'pending');
        $this->assertDatabaseHas('friendships', [
            'sender_id' => $sender->getKey(),
            'receiver_id' => $receiver->getKey(),
            'status' => 'pending',
        ]);
    }

    public function test_cannot_friend_yourself(): void
    {
        $player = Player::factory()->create();

        $response = $this->postJson("/players/{$player->getKey()}/friends", [
            'receiver_id' => $player->getKey(),
        ]);

        $response->assertStatus(422);
    }

    public function test_accept_friend_request(): void
    {
        $sender = Player::factory()->create();
        $receiver = Player::factory()->create();

        $friendship = Friendship::create([
            'sender_id' => $sender->getKey(),
            'receiver_id' => $receiver->getKey(),
            'status' => 'pending',
        ]);

        $response = $this->postJson("/players/{$receiver->getKey()}/friends/{$friendship->getKey()}/accept");

        $response->assertOk();
        $response->assertJsonPath('status', 'accepted');
    }

    public function test_sender_cannot_accept_own_request(): void
    {
        $sender = Player::factory()->create();
        $receiver = Player::factory()->create();

        $friendship = Friendship::create([
            'sender_id' => $sender->getKey(),
            'receiver_id' => $receiver->getKey(),
            'status' => 'pending',
        ]);

        $response = $this->postJson("/players/{$sender->getKey()}/friends/{$friendship->getKey()}/accept");

        $response->assertStatus(403);
    }

    public function test_decline_friend_request(): void
    {
        $sender = Player::factory()->create();
        $receiver = Player::factory()->create();

        $friendship = Friendship::create([
            'sender_id' => $sender->getKey(),
            'receiver_id' => $receiver->getKey(),
            'status' => 'pending',
        ]);

        $response = $this->postJson("/players/{$receiver->getKey()}/friends/{$friendship->getKey()}/decline");

        $response->assertOk();
        $response->assertJsonPath('status', 'declined');
    }

    public function test_remove_friendship(): void
    {
        $sender = Player::factory()->create();
        $receiver = Player::factory()->create();

        $friendship = Friendship::create([
            'sender_id' => $sender->getKey(),
            'receiver_id' => $receiver->getKey(),
            'status' => 'accepted',
        ]);

        $response = $this->deleteJson("/players/{$sender->getKey()}/friends/{$friendship->getKey()}");

        $response->assertOk();
        $response->assertJson(['removed' => true]);
        $this->assertDatabaseMissing('friendships', ['id' => $friendship->getKey()]);
    }

    public function test_list_friends(): void
    {
        $player = Player::factory()->create();
        $friend = Player::factory()->create();

        Friendship::create([
            'sender_id' => $player->getKey(),
            'receiver_id' => $friend->getKey(),
            'status' => 'accepted',
        ]);

        $response = $this->getJson("/players/{$player->getKey()}/friends");

        $response->assertOk();
        $response->assertJsonCount(1);
        $response->assertJsonPath('0.player_id', $friend->getKey());
    }

    public function test_list_excludes_pending(): void
    {
        $player = Player::factory()->create();
        $other = Player::factory()->create();

        Friendship::create([
            'sender_id' => $player->getKey(),
            'receiver_id' => $other->getKey(),
            'status' => 'pending',
        ]);

        $response = $this->getJson("/players/{$player->getKey()}/friends");

        $response->assertOk();
        $response->assertJsonCount(0);
    }

    public function test_pending_requests(): void
    {
        $sender = Player::factory()->create();
        $receiver = Player::factory()->create();

        Friendship::create([
            'sender_id' => $sender->getKey(),
            'receiver_id' => $receiver->getKey(),
            'status' => 'pending',
        ]);

        $response = $this->getJson("/players/{$receiver->getKey()}/friends/pending");

        $response->assertOk();
        $response->assertJsonCount(1);
        $response->assertJsonPath('0.player_id', $sender->getKey());
    }

    public function test_mutual_request_auto_accepts(): void
    {
        $p1 = Player::factory()->create();
        $p2 = Player::factory()->create();

        // p2 sends request to p1
        Friendship::create([
            'sender_id' => $p2->getKey(),
            'receiver_id' => $p1->getKey(),
            'status' => 'pending',
        ]);

        // p1 sends request to p2 — should auto-accept
        $response = $this->postJson("/players/{$p1->getKey()}/friends", [
            'receiver_id' => $p2->getKey(),
        ]);

        $response->assertOk();
        $response->assertJsonPath('status', 'accepted');
    }

    public function test_are_friends_helper(): void
    {
        $p1 = Player::factory()->create();
        $p2 = Player::factory()->create();

        $this->assertFalse(Friendship::areFriends($p1->getKey(), $p2->getKey()));

        Friendship::create([
            'sender_id' => $p1->getKey(),
            'receiver_id' => $p2->getKey(),
            'status' => 'accepted',
        ]);

        $this->assertTrue(Friendship::areFriends($p1->getKey(), $p2->getKey()));
        $this->assertTrue(Friendship::areFriends($p2->getKey(), $p1->getKey()));
    }

    public function test_cannot_send_duplicate_request(): void
    {
        $sender = Player::factory()->create();
        $receiver = Player::factory()->create();

        $this->postJson("/players/{$sender->getKey()}/friends", [
            'receiver_id' => $receiver->getKey(),
        ]);

        $response = $this->postJson("/players/{$sender->getKey()}/friends", [
            'receiver_id' => $receiver->getKey(),
        ]);

        $response->assertStatus(422);
    }
}
