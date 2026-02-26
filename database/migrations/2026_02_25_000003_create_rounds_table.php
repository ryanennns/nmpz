<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rounds', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('game_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('round_number');
            $table->decimal('location_lat', 10, 7);
            $table->decimal('location_lng', 10, 7);
            $table->decimal('player_one_guess_lat', 10, 7)->nullable();
            $table->decimal('player_one_guess_lng', 10, 7)->nullable();
            $table->decimal('player_two_guess_lat', 10, 7)->nullable();
            $table->decimal('player_two_guess_lng', 10, 7)->nullable();
            $table->unsignedSmallInteger('player_one_score')->nullable();
            $table->unsignedSmallInteger('player_two_score')->nullable();
            $table->boolean('player_one_locked_in')->default(false);
            $table->boolean('player_two_locked_in')->default(false);
            $table->timestamps();

            $table->unique(['game_id', 'round_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rounds');
    }
};
