<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('locations', function (Blueprint $table) {
            if (! Schema::hasColumn('locations', 'image_id')) {
                $table->string('image_id')->nullable()->after('heading');
            }
        });

        Schema::table('rounds', function (Blueprint $table) {
            if (! Schema::hasColumn('rounds', 'location_image_id')) {
                $table->string('location_image_id')->nullable()->after('location_heading');
            }
        });
    }

    public function down(): void
    {
        Schema::table('locations', function (Blueprint $table) {
            if (Schema::hasColumn('locations', 'image_id')) {
                $table->dropColumn('image_id');
            }
        });

        Schema::table('rounds', function (Blueprint $table) {
            if (Schema::hasColumn('rounds', 'location_image_id')) {
                $table->dropColumn('location_image_id');
            }
        });
    }
};
