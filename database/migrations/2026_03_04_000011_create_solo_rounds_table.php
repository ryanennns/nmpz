<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('solo_rounds', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('solo_game_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('location_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('round_number');
            $table->decimal('guess_lat', 10, 7)->nullable();
            $table->decimal('guess_lng', 10, 7)->nullable();
            $table->unsignedInteger('score')->nullable();
            $table->decimal('distance_km', 10, 3)->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();

            $table->unique(['solo_game_id', 'round_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('solo_rounds');
    }
};
