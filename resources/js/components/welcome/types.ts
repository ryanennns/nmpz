export type Player = {
    id: string;
    name: string;
    user_id?: number | null;
    user?: { name: string };
};

export type Round = {
    id: string;
    round_number: number;
    player_one_locked_in: boolean;
    player_two_locked_in: boolean;
};

export type Location = {
    id: string;
    lat: number;
    lng: number;
    heading: number;
    image_id?: string | null;
};

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
    p1DistanceKm: number | null;
    p2DistanceKm: number | null;
};

export type EloDeltaMap = Record<string, number>;

export type LocationReportReason =
    | 'inaccurate'
    | 'inappropriate'
    | 'bad coverage';

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
