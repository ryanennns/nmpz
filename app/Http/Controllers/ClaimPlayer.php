<?php

namespace App\Http\Controllers;

use App\Models\Player;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rules\Password;

class ClaimPlayer extends Controller
{
    public function __invoke(Request $request, Player $player): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'unique:users'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        $user = User::query()->create([
            'name' => $player->name,
            'email' => $validated['email'],
            'password' => $validated['password'],
        ]);

        $player->user_id = $user->id;
        $player->save();

        Auth::login($user);

        return response()->json(['player' => $player->fresh()->toArray(), 'user' => $user->toArray()], 201);
    }
}
