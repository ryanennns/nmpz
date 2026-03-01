export type DailyInfo = {
    challenge_id: string;
    challenge_date: string;
    round_count: number;
    participants: number;
    player?: {
        completed: boolean;
        tier: string | null;
        total_score: number | null;
        current_streak: number;
        best_streak: number;
    };
};

export type DailyRoundState = {
    entry_id: string;
    round_number: number;
    total_rounds: number;
    current_score: number;
    round_timeout: number;
    location: { lat: number; lng: number; heading: number } | null;
};

export type DailyGuessResult = {
    score: number;
    total_score: number;
    rounds_completed: number;
    completed: boolean;
    timed_out: boolean;
    location: { lat: number; lng: number };
    next_location?: { lat: number; lng: number; heading: number } | null;
    tier?: string;
    streak?: { current_streak: number; best_streak: number };
};

export type DailyLeaderboardEntry = {
    rank: number;
    player_name: string;
    player_id: string;
    total_score: number;
    tier: string | null;
    completed_at: string;
};

export type DailyLeaderboardData = {
    entries: DailyLeaderboardEntry[];
    total_participants: number;
    challenge_date: string;
};
