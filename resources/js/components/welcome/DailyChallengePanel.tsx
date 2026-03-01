import axios from 'axios';
import { useEffect, useState } from 'react';
import { useApiClient } from '@/hooks/useApiClient';

type DailyInfo = {
    challenge_id: string;
    challenge_date: string;
    round_count: number;
};

type RoundState = {
    entry_id: string;
    round_number: number;
    total_rounds: number;
    current_score: number;
    location: { lat: number; lng: number; heading: number } | null;
};

type GuessResult = {
    score: number;
    total_score: number;
    rounds_completed: number;
    completed: boolean;
    location: { lat: number; lng: number };
    next_location?: { lat: number; lng: number; heading: number } | null;
};

type LeaderboardEntry = {
    player_name: string;
    player_id: string;
    total_score: number;
    completed_at: string;
};

export default function DailyChallengePanel({ playerId }: { playerId: string }) {
    const api = useApiClient(playerId);
    const [daily, setDaily] = useState<DailyInfo | null>(null);
    const [roundState, setRoundState] = useState<RoundState | null>(null);
    const [lastResult, setLastResult] = useState<GuessResult | null>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [tab, setTab] = useState<'play' | 'leaderboard'>('play');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [guessLat, setGuessLat] = useState('');
    const [guessLng, setGuessLng] = useState('');

    useEffect(() => {
        api.fetchDailyChallenge()
            .then((res) => setDaily(res.data as DailyInfo))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (tab === 'leaderboard') {
            api.fetchDailyLeaderboard()
                .then((res) => {
                    const data = res.data as { entries: LeaderboardEntry[] };
                    setLeaderboard(data.entries);
                })
                .catch(() => {});
        }
    }, [tab]);

    async function startChallenge() {
        setError(null);
        try {
            const res = await api.startDailyChallenge();
            const data = res.data as RoundState;
            if ((data as unknown as { error?: string }).error) {
                setError((data as unknown as { error: string }).error);
                return;
            }
            setRoundState(data);
        } catch (e) {
            if (axios.isAxiosError(e)) {
                setError((e.response?.data as { error?: string })?.error ?? 'Failed to start');
            }
        }
    }

    async function submitGuess() {
        if (!roundState?.entry_id || !guessLat || !guessLng) return;
        setError(null);
        try {
            const res = await api.dailyChallengeGuess(roundState.entry_id, {
                lat: parseFloat(guessLat),
                lng: parseFloat(guessLng),
            });
            const data = res.data as GuessResult;
            setLastResult(data);
            setGuessLat('');
            setGuessLng('');
            if (!data.completed && data.next_location) {
                setRoundState({
                    ...roundState,
                    round_number: data.rounds_completed + 1,
                    current_score: data.total_score,
                    location: data.next_location,
                });
            } else if (data.completed) {
                setRoundState(null);
            }
        } catch (e) {
            if (axios.isAxiosError(e)) {
                setError((e.response?.data as { error?: string })?.error ?? 'Failed to submit guess');
            }
        }
    }

    if (loading) {
        return (
            <div className="w-full rounded border border-white/10 bg-black/60 p-4 text-center text-xs text-white/40 backdrop-blur-sm">
                Loading daily challenge...
            </div>
        );
    }

    return (
        <div className="w-full rounded border border-white/10 bg-black/60 p-3 backdrop-blur-sm">
            <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-white/60">Daily Challenge</span>
                {daily && (
                    <span className="text-[10px] text-white/30">{daily.challenge_date}</span>
                )}
            </div>

            <div className="mb-2 flex gap-1">
                <button
                    type="button"
                    onClick={() => setTab('play')}
                    className={`rounded px-2 py-0.5 text-[10px] transition ${tab === 'play' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                >
                    Play
                </button>
                <button
                    type="button"
                    onClick={() => setTab('leaderboard')}
                    className={`rounded px-2 py-0.5 text-[10px] transition ${tab === 'leaderboard' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                >
                    Leaderboard
                </button>
            </div>

            {tab === 'play' && (
                <div className="space-y-2">
                    {lastResult?.completed ? (
                        <div className="rounded bg-white/5 p-3 text-center">
                            <div className="mb-1 text-sm font-semibold text-white">Challenge Complete!</div>
                            <div className="text-2xl font-bold text-amber-400">
                                {lastResult.total_score.toLocaleString()}
                            </div>
                            <div className="mt-1 text-[10px] text-white/40">Total Score</div>
                        </div>
                    ) : roundState ? (
                        <>
                            <div className="flex justify-between text-[10px] text-white/40">
                                <span>Round {roundState.round_number} / {roundState.total_rounds}</span>
                                <span>Score: {roundState.current_score.toLocaleString()}</span>
                            </div>
                            {roundState.location && (
                                <div className="rounded bg-white/5 p-2 text-[10px] text-white/60">
                                    Location loaded. Use the coordinates to guess where this is.
                                    <div className="mt-1 text-white/30">
                                        Hint: lat {roundState.location.lat.toFixed(1)}, lng {roundState.location.lng.toFixed(1)}
                                    </div>
                                </div>
                            )}
                            <div className="flex gap-1">
                                <input
                                    value={guessLat}
                                    onChange={(e) => setGuessLat(e.target.value)}
                                    placeholder="Lat"
                                    className="flex-1 rounded bg-white/10 px-2 py-1 text-[10px] text-white placeholder:text-white/30"
                                />
                                <input
                                    value={guessLng}
                                    onChange={(e) => setGuessLng(e.target.value)}
                                    placeholder="Lng"
                                    className="flex-1 rounded bg-white/10 px-2 py-1 text-[10px] text-white placeholder:text-white/30"
                                />
                                <button
                                    onClick={() => void submitGuess()}
                                    disabled={!guessLat || !guessLng}
                                    className="rounded bg-white/10 px-2 py-1 text-[10px] text-white hover:bg-white/20 disabled:opacity-30"
                                >
                                    Guess
                                </button>
                            </div>
                            {lastResult && !lastResult.completed && (
                                <div className="rounded bg-white/5 p-2 text-[10px]">
                                    <span className="text-amber-400">+{lastResult.score.toLocaleString()}</span>
                                    <span className="text-white/40"> points this round</span>
                                </div>
                            )}
                        </>
                    ) : (
                        <button
                            onClick={() => void startChallenge()}
                            className="w-full rounded bg-amber-500/20 px-3 py-2 text-xs text-amber-400 transition hover:bg-amber-500/30"
                        >
                            Start Today's Challenge
                        </button>
                    )}
                    {error && <div className="text-[10px] text-red-400">{error}</div>}
                </div>
            )}

            {tab === 'leaderboard' && (
                <div className="max-h-48 space-y-1 overflow-y-auto">
                    {leaderboard.length === 0 ? (
                        <div className="text-center text-[10px] text-white/30">No completions yet</div>
                    ) : (
                        leaderboard.map((entry, i) => (
                            <div
                                key={entry.player_id}
                                className="flex items-center justify-between rounded bg-white/5 px-2 py-1 text-[10px]"
                            >
                                <div className="flex items-center gap-2">
                                    <span className={`w-4 text-right ${i < 3 ? 'text-amber-400' : 'text-white/30'}`}>
                                        {i + 1}
                                    </span>
                                    <span className="text-white/80">{entry.player_name}</span>
                                </div>
                                <span className="text-amber-400">{entry.total_score.toLocaleString()}</span>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
