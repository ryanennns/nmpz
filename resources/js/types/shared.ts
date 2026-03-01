export type LatLng = { lat: number; lng: number };

export type Location = { lat: number; lng: number; heading: number };

export interface Message {
    id: number;
    name: string;
    text: string;
    ts: string;
}

export type MapOption = {
    id: string;
    name: string;
    display_name: string | null;
    description: string | null;
    location_count: number;
};

export type PrivateLobby = {
    lobby_id: string;
    invite_code: string;
};

export interface GameStats {
    games_in_progress: number;
    rounds_played: number;
    total_players: number;
}
