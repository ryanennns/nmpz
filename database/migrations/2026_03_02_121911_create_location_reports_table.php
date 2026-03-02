<?php

use App\Enums\ReportReason;
use App\Enums\ReportStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('location_reports', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('reported_by_id')->constrained('users')->restrictOnDelete();
            $table->foreignUuid('location_id')->constrained('locations')->cascadeOnDelete();
            $table->enum('reason', ReportReason::values());
            $table->enum('status', ReportStatus::values());
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('location_reports');
    }
};
