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
    }

    public function down(): void
    {
        Schema::table('locations', function (Blueprint $table) {
            if (Schema::hasColumn('locations', 'image_id')) {
                $table->dropColumn('image_id');
            }
        });
    }
};
