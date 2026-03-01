<?php

return [
    'default_map' => 'likeacw-mapillary',
    'max_health' => 5000,
    'round_timeout_seconds' => 60,
    'k_factor_new' => 40,      // < 10 games
    'k_factor_mid' => 32,      // < 1400 ELO
    'k_factor_high' => 24,     // default
    'k_factor_games_threshold' => 10,
    'k_factor_elo_threshold' => 1400,
    'elo_floor' => 100,
    'no_guess_forfeit_rounds' => 3,
    'max_name_length' => 32,
    'rush_round_timeout_seconds' => 15,
    'rush_max_rounds' => 7,
    'rush_speed_bonus_max' => 1000,

    'daily_challenge' => [
        'tier_gold' => 20000,
        'tier_silver' => 15000,
        'round_timeout_seconds' => 60,
    ],
];
