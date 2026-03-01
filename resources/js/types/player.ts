export type Rank = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Master';

export type Player = {
    id: string;
    name?: string | null;
    user: { name: string };
    elo_rating?: number;
    rank?: Rank;
};

export type PlayerStatsData = {
    games_played: number;
    games_won: number;
    games_lost: number;
    total_rounds: number;
    total_score: number;
    best_round_score: number;
    total_damage_dealt: number;
    total_damage_taken: number;
    current_win_streak: number;
    best_win_streak: number;
    perfect_rounds: number;
    closest_guess_km: number | null;
    total_distance_km: number;
    total_guesses_made: number;
    total_guesses_missed: number;
    win_rate: number;
    average_score: number;
    average_distance_km: number;
    elo_rating: number;
    rank: Rank;
};

export type LeaderboardEntry = {
    player_id: string;
    player_name: string;
    games_won: number;
    games_played: number;
    win_rate: number;
    best_win_streak: number;
    elo_rating: number;
    rank: Rank;
};

export type Achievement = {
    key: string;
    name: string;
    description: string;
    icon: string | null;
    earned_at: string | null;
};
