import type { Player } from './player';

export type Game = {
    id: string;
    player_one: Player;
    player_two: Player;
    player_one_health: number;
    player_two_health: number;
    match_format?: string;
    player_one_wins?: number;
    player_two_wins?: number;
    max_rounds?: number;
};

export type Round = {
    id: string;
    round_number: number;
    player_one_locked_in: boolean;
    player_two_locked_in: boolean;
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
        | 'GameMessage'
        | 'GameReaction';
    ts: string;
    data: unknown;
};

export type GameReactionData = {
    game_id: string;
    player_id: string;
    reaction: string;
};

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
    player_one_wins?: number;
    player_two_wins?: number;
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
    player_one_wins?: number;
    player_two_wins?: number;
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
    match_format?: string;
    player_one_wins?: number;
    player_two_wins?: number;
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

export type GameHistoryEntry = {
    game_id: string;
    opponent_name: string;
    opponent_elo: number;
    result: 'win' | 'loss' | 'draw';
    my_score: number;
    opponent_score: number;
    rating_change: number | null;
    map_name: string;
    played_at: string;
};

export type GameDetailRound = {
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

export type GameDetail = {
    game_id: string;
    player_one: { id: string; name: string };
    player_two: { id: string; name: string };
    winner_id: string | null;
    map_name: string;
    player_one_rating_change: number | null;
    player_two_rating_change: number | null;
    rounds: GameDetailRound[];
};

export type LiveGame = {
    game_id: string;
    player_one_name: string;
    player_two_name: string;
    player_one_elo: number;
    player_two_elo: number;
    spectator_count: number;
    match_format: string;
    created_at: string;
};
