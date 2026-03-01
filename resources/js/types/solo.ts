export type SoloMode = 'explorer' | 'streak' | 'time_attack' | 'perfect_score';
export type StreakDifficulty = 'casual' | 'normal' | 'hardcore';

export type SoloGameState = {
    game_id: string;
    mode: SoloMode;
    difficulty?: string;
    round_number: number;
    total_rounds: number | null;
    health: number | null;
    current_score: number;
    round_timeout: number | null;
    location: { lat: number; lng: number; heading: number } | null;
};

export type SoloGuessResult = {
    score: number;
    speed_bonus: number;
    total_score: number;
    distance_km: number;
    timed_out: boolean;
    rounds_completed: number;
    health: number | null;
    damage: number;
    game_over: boolean;
    location: { lat: number; lng: number };
    next_location?: { lat: number; lng: number; heading: number } | null;
    tier?: string;
    personal_best?: { best_score: number; best_rounds: number; is_new: boolean } | null;
    elapsed_seconds: number;
};

export type SoloLeaderboardEntry = {
    rank: number;
    player_name: string;
    player_id: string;
    total_score: number;
    rounds_completed: number;
    elapsed_seconds: number;
    tier: string | null;
    difficulty: string | null;
    completed_at: string;
};

export type PersonalBest = {
    map_name: string;
    best_score: number;
    best_rounds: number;
    best_time_seconds: number | null;
};

export type SoloStats = {
    solo_games_played: number;
    solo_rounds_played: number;
    solo_total_score: number;
    solo_best_round_score: number;
    solo_perfect_rounds: number;
    solo_best_streak: number;
};
