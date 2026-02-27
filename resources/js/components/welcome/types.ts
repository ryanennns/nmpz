export type Player = {
    id: string;
    name?: string | null;
    user: { name: string };
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
    data: Record<string, unknown>;
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
};

export type GameFinishedData = {
    game_id: string;
    winner_id: string | null;
    player_one_health: number;
    player_two_health: number;
};

export type PlayerGuessedData = {
    player_one_locked_in: boolean;
    player_two_locked_in: boolean;
};

export type GameMessageData = {
    player_name: string;
    message: string;
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
