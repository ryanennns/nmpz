export type SummaryPlayer = {
    id: string;
    name: string;
};

export type SummaryRound = {
    id: string;
    round_number: number;
    player_one_score: number | null;
    player_two_score: number | null;
    location: { lat: number; lng: number } | null;
    player_one_guess: { lat: number; lng: number } | null;
    player_two_guess: { lat: number; lng: number } | null;
};

export type GameSummary = {
    id: string;
    player_one: SummaryPlayer;
    player_two: SummaryPlayer;
    winner_id: string | null;
    player_one_total_score: number;
    player_two_total_score: number;
    rounds: SummaryRound[];
};
