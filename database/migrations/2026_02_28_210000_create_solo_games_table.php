<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('solo_games', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('player_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('map_id')->constrained()->cascadeOnDelete();
            $table->string('mode'); // explorer, streak, time_attack, perfect_score
            $table->string('difficulty')->nullable(); // casual, normal, hardcore (streak only)
            $table->json('config')->nullable(); // { max_rounds, round_timeout }
            $table->string('status')->default('in_progress'); // in_progress, completed, abandoned
            $table->unsignedInteger('total_score')->default(0);
            $table->unsignedInteger('rounds_completed')->default(0);
            $table->integer('health')->nullable(); // streak mode HP
            $table->json('round_scores')->nullable();
            $table->json('location_ids')->nullable();
            $table->unsignedInteger('current_location_index')->default(0);
            $table->timestamp('round_started_at')->nullable();
            $table->string('tier')->nullable(); // gold, silver, bronze
            $table->unsignedInteger('elapsed_seconds')->default(0);
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['player_id', 'mode', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('solo_games');
    }
};
