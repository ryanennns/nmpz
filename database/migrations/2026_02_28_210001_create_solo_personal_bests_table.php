<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('solo_personal_bests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('player_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('map_id')->constrained()->cascadeOnDelete();
            $table->string('mode');
            $table->unsignedInteger('best_score')->default(0);
            $table->unsignedInteger('best_rounds')->default(0);
            $table->unsignedInteger('best_time_seconds')->nullable();
            $table->timestamps();

            $table->unique(['player_id', 'map_id', 'mode']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('solo_personal_bests');
    }
};
