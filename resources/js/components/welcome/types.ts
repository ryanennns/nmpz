export type Rank = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Master';

export type Player = {
    id: string;
    name?: string | null;
    user: { name: string };
    elo_rating?: number;
    rank?: Rank;
};

export type Round = {
    id: string;
    round_number: number;
    player_one_locked_in: boolean;
    player_two_locked_in: boolean;
};

export type Location = { lat: number; lng: number; heading: number };

export type Game = {
    id: string;
    player_one: Player;
    player_two: Player;
    player_one_health: number;
    player_two_health: number;
};

export type RoundResult = {
    location: { lat: number; lng: number };
    p1Guess: { lat: number; lng: number } | null;
    p2Guess: { lat: number; lng: number } | null;
};

export type GameState = 'waiting' | 'one_guessed' | 'finished' | 'game_over';

export type GameEvent = {
    id: number;
    name:
        | 'PlayerGuessed'
        | 'RoundFinished'
        | 'RoundStarted'
        | 'GameFinished'
        | 'GameMessage';
    ts: string;
    data: unknown;
};

export type LatLng = { lat: number; lng: number };

export type RoundData = {
    game_id: string;
    round_id: string;
    round_number: number;
    player_one_health: number;
    player_two_health: number;
    location_lat: number;
    location_lng: number;
    location_heading: number;
    started_at?: string | null;
    player_one_locked_in?: boolean;
    player_two_locked_in?: boolean;
};

export type RoundFinishedData = {
    game_id: string;
    round_id: string;
    round_number: number;
    location_lat: number;
    location_lng: number;
    player_one_guess_lat: number | null;
    player_one_guess_lng: number | null;
    player_two_guess_lat: number | null;
    player_two_guess_lng: number | null;
    player_one_score: number;
    player_two_score: number;
    player_one_distance_km: number | null;
    player_two_distance_km: number | null;
};

export type GameFinishedData = {
    game_id: string;
    winner_id: string | null;
    player_one_health: number;
    player_two_health: number;
    player_one_rating_change: number | null;
    player_two_rating_change: number | null;
    player_one_elo: number | null;
    player_two_elo: number | null;
};

export type PlayerGuessedData = {
    player_id: string;
    player_one_locked_in: boolean;
    player_two_locked_in: boolean;
};

export type GameMessageData = {
    player_name: string;
    message: string;
};

export type RoundSummary = {
    myScore: number;
    opponentScore: number;
    myDistanceKm: number | null;
    opponentDistanceKm: number | null;
    myDamage: number;
    opponentDamage: number;
    myHealth: number;
    opponentHealth: number;
};

export type RematchState = 'none' | 'sent' | 'received' | 'declined';

export type RematchRequestedData = {
    game_id: string;
    player_id: string;
    player_name: string;
};

export type RematchAcceptedData = {
    game_id: string;
    new_game: Game;
};

export type RematchDeclinedData = {
    game_id: string;
    player_id: string;
};

export type OpponentGuessUpdateData = {
    player_id: string;
    lat: number;
    lng: number;
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

export interface GameStats {
    games_in_progress: number;
    rounds_played: number;
    total_players: number;
}

export interface Message {
    id: number;
    name: string;
    text: string;
    ts: string;
}
