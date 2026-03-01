# NMPZ

GeoGuessr-style competitive multiplayer game built with Laravel, Inertia.js, and React.

## Stack

- **Backend**: Laravel 12, PHP 8.4
- **Frontend**: React 19, TypeScript, Inertia.js, Tailwind CSS
- **Database**: SQLite (dev), UUIDs for all model PKs
- **Real-time**: Laravel Echo, Reverb (WebSockets)

## Commands

- `php artisan test` — run full test suite (516 tests)
- `npx tsc --noEmit` — TypeScript type check
- `php artisan test --filter=ClassName` — run a specific test class
- `php artisan db:seed` — seeds maps and achievements

## Architecture

### Models
- All models use `HasUuids` and `HasFactory` traits, `$guarded = []`
- Use `$model->getKey()` instead of `$model->id`
- Casts are defined via the `casts()` method

### Controllers
- Invokable controllers for single actions (e.g., `JoinQueue`, `PlayerMakesGuess`)
- Resource-style controllers for feature groups (e.g., `DailyChallengeController`, `SoloGameController`)
- Controllers should be thin — business logic belongs in Services

### Services
- `ScoringService` — static methods: `calculateScore()`, `haversineDistanceKm()`, `calculateSpeedBonus()`
- `SoloGameService` — solo play game loop (start, guess, abandon, leaderboard)
- `DailyChallengeService` — daily challenge logic (start, guess, reset, streaks, leaderboard)
- `AchievementService` — idempotent `award(player, key)` method
- `HealthService`, `GameCompletionService`, `EloCalculator`, `QueueService`, `PlayerStatsService`

### Events
- Implement `ShouldBroadcastNow`
- Channels: `game.{id}` (public), `game.{id}.players` (location-sensitive), `player.{id}` (personal)

### Config
- `config/game.php` — all game settings
- `game.default_map` = `likeacw-mapillary`
- `game.max_health` = 5000
- `game.round_timeout_seconds` = 60

## Testing

- Always use `RefreshDatabase` trait
- Player factory: `Player::factory()->withElo(1000)->create()`
- Game factory states: `->inProgress()`, `->completed()`, `->bestOfThree()`, etc.
- Use `Carbon::setTestNow()` for time-dependent tests (reset with `Carbon::setTestNow()` after)
- Shared test helpers in `tests/TestCase.php`: `setupMap()`, `seedAchievements()`
- Use `Event::fake()`, `Queue::fake()` where needed

## File Structure

```
app/
  Actions/          — CreateMatch, MatchmakeQueue
  Http/Controllers/ — Invokable and resource controllers
  Models/           — Eloquent models with UUIDs
  Presenters/       — GamePresenter
  Services/         — Business logic
config/game.php     — Game configuration
database/
  factories/        — Model factories
  migrations/       — Database migrations
  seeders/          — MapSeeder, AchievementSeeder
resources/js/
  components/welcome/ — Game UI components
  hooks/            — useApiClient, etc.
  types/            — TypeScript type definitions (solo.ts, daily.ts, etc.)
routes/web.php      — All routes, grouped by feature
tests/Feature/      — Feature tests
```

## Key Patterns

- Frontend game views use fullscreen portal overlays (`createPortal`)
- Reusable game components: `MapillaryImagePanel`, `MapPicker`, `ResultsMap`, `MapSelector`
- API methods centralized in `useApiClient.ts`
- Routes grouped by feature with `Route::prefix()->group()`
