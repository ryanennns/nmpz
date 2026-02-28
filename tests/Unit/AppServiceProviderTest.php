<?php

namespace Tests\Unit;

use Carbon\CarbonImmutable;
use Illuminate\Validation\Rules\Password;
use Tests\TestCase;

class AppServiceProviderTest extends TestCase
{
    public function test_date_uses_carbon_immutable(): void
    {
        $this->assertInstanceOf(CarbonImmutable::class, now());
    }

    public function test_password_defaults_in_production(): void
    {
        $original = app()->environment();
        app()->detectEnvironment(fn () => 'production');

        $provider = new \App\Providers\AppServiceProvider(app());
        $provider->boot();

        $defaults = Password::defaults();

        $this->assertInstanceOf(Password::class, $defaults);

        // Restore
        app()->detectEnvironment(fn () => $original);
        $provider->boot();
    }
}
