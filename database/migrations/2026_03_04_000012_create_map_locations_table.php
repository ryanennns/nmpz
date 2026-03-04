<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('map_locations', function (Blueprint $table) {
            $table->foreignUuid('map_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('location_id')->constrained()->cascadeOnDelete();
            $table->primary(['map_id', 'location_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('map_locations');
    }
};
