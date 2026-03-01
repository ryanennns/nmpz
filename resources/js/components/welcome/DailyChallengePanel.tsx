import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { useApiClient } from '@/hooks/useApiClient';
import { useSoloGameLoop } from '@/hooks/useSoloGameLoop';
import SoloGameOverlay from '@/components/game/SoloGameOverlay';
import type { OverlayRoundResult } from '@/components/game/SoloGameOverlay';
import { tierBg, tierColor } from '@/lib/tier';
import type {
    DailyInfo,
    DailyRoundState,
    DailyGuessResult,
    DailyLeaderboardData,
} from '@/types/daily';

function toOverlayResult(data: DailyGuessResult): OverlayRoundResult {
    return {
        score: data.score,
        total_score: data.total_score,
        rounds_completed: data.rounds_completed,
        timed_out: data.timed_out,
        location: data.location,
        game_over: data.completed,
        tier: data.tier,
        streak: data.streak,
    };
}

export default function DailyChallengePanel({ playerId }: { playerId: string }) {
    const api = useApiClient(playerId);
    const [daily, setDaily] = useState<DailyInfo | null>(null);
    const [completionResult, setCompletionResult] = useState<DailyGuessResult | null>(null);
    const [leaderboard, setLeaderboard] = useState<DailyLeaderboardData | null>(null);
    const [tab, setTab] = useState<'play' | 'leaderboard'>('play');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const gameLoop = useSoloGameLoop<DailyRoundState, DailyGuessResult>({
        submitGuessApi: useCallback(async (rs, coords) => {
            const res = await api.dailyChallengeGuess(rs.entry_id, coords);
            return res.data as DailyGuessResult;
        }, [api]),
        onGuessResult: useCallback((data: DailyGuessResult, rs: DailyRoundState) => {
            if (!data.completed && data.next_location) {
                return {
                    nextRound: {
                        ...rs,
                        round_number: data.rounds_completed + 1,
                        current_score: data.total_score,
                        location: data.next_location,
                    },
                    isDone: false,
                };
            }
            if (data.completed) {
                setCompletionResult(data);
                return { nextRound: null, isDone: true };
            }
            return { nextRound: null, isDone: false };
        }, []),
        onFinished: useCallback(() => {
            api.fetchDailyChallenge()
                .then((res) => setDaily(res.data as DailyInfo))
                .catch(() => {});
        }, [api]),
    });

    useEffect(() => {
        api.fetchDailyChallenge()
            .then((res) => setDaily(res.data as DailyInfo))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (tab === 'leaderboard') {
            api.fetchDailyLeaderboard()
                .then((res) => setLeaderboard(res.data as DailyLeaderboardData))
                .catch(() => {});
        }
    }, [tab]);

    async function startChallenge() {
        setError(null);
        try {
            const res = await api.startDailyChallenge();
            const data = res.data as DailyRoundState;
            if ((data as unknown as { error?: string }).error) {
                setError((data as unknown as { error: string }).error);
                return;
            }
            setCompletionResult(null);
            gameLoop.startRound(data);
        } catch (e) {
            if (axios.isAxiosError(e)) {
                setError((e.response?.data as { error?: string })?.error ?? 'Failed to start');
            }
        }
    }

    async function playAgain() {
        setError(null);
        try {
            await api.resetDailyChallenge();
            setCompletionResult(null);
            setDaily((d) => d ? { ...d, player: undefined } : d);
            void startChallenge();
        } catch (e) {
            if (axios.isAxiosError(e)) {
                setError((e.response?.data as { error?: string })?.error ?? 'Failed to reset');
            }
        }
    }

    const gs = gameLoop.roundState;

    if (loading) {
        return (
            <div className="w-full rounded border border-white/10 bg-black/60 p-4 text-center text-xs text-white/40 backdrop-blur-sm">
                Loading daily challenge...
            </div>
        );
    }

    return (
        <>
            {/* Fullscreen game overlay when playing */}
            {gs && (
                <SoloGameOverlay
                    roundState={{
                        round_number: gs.round_number,
                        total_rounds: gs.total_rounds,
                        current_score: gs.current_score,
                        location: gs.location,
                    }}
                    timeLeft={gameLoop.timeLeft}
                    roundResult={gameLoop.roundResult ? toOverlayResult(gameLoop.roundResult) : null}
                    guessCoords={gameLoop.lastGuessCoords}
                    phase={gameLoop.phase}
                    pinCoords={gameLoop.pinCoords}
                    onPin={gameLoop.setPinCoords}
                    onSubmit={() => void gameLoop.submitGuess()}
                    onNextRound={gameLoop.advanceRound}
                    onClose={gameLoop.quit}
                    accentColor="amber"
                    pinColor="#f59e0b"
                    maxScoreLabel="25,000"
                    completionLabel="Challenge Complete!"
                />
            )}

            {/* Lobby card */}
            <div className="w-full rounded border border-white/10 bg-black/60 p-3 backdrop-blur-sm">
                {/* Header with streak */}
                <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white/60">Daily Challenge</span>
                        {daily?.player && daily.player.current_streak > 0 && (
                            <span className="text-[10px] text-orange-400" title={`Best: ${daily.player.best_streak}`}>
                                {daily.player.current_streak}d streak
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {daily && daily.participants > 0 && (
                            <span className="text-[10px] text-white/20">{daily.participants} played</span>
                        )}
                        {daily && (
                            <span className="text-[10px] text-white/30">{daily.challenge_date}</span>
                        )}
                    </div>
                </div>

                {/* Tabs */}
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
                        {completionResult?.completed ? (
                            <div className="rounded bg-white/5 p-3 text-center">
                                <div className="mb-1 text-sm font-semibold text-white">Challenge Complete!</div>
                                {completionResult.tier && (
                                    <div className={`mb-1 text-xs font-bold uppercase ${tierColor(completionResult.tier)}`}>
                                        {completionResult.tier} tier
                                    </div>
                                )}
                                <div className="text-2xl font-bold text-amber-400">
                                    {completionResult.total_score.toLocaleString()}
                                </div>
                                <div className="mt-1 text-[10px] text-white/40">/ 25,000</div>
                                {completionResult.streak && (
                                    <div className="mt-2 text-[10px] text-orange-400">
                                        {completionResult.streak.current_streak} day streak
                                        {completionResult.streak.best_streak > completionResult.streak.current_streak && (
                                            <span className="text-white/30"> (best: {completionResult.streak.best_streak})</span>
                                        )}
                                    </div>
                                )}
                                <button
                                    onClick={() => void playAgain()}
                                    className="mt-3 rounded bg-white/10 px-3 py-1 text-[10px] text-white/50 transition hover:bg-white/20 hover:text-white"
                                >
                                    Play Again
                                </button>
                            </div>
                        ) : daily?.player?.completed ? (
                            <div className="rounded bg-white/5 p-3 text-center">
                                <div className="mb-1 text-sm font-semibold text-white">Completed</div>
                                {daily.player.tier && (
                                    <div className={`mb-1 text-xs font-bold uppercase ${tierColor(daily.player.tier)}`}>
                                        {daily.player.tier} tier
                                    </div>
                                )}
                                <div className="text-2xl font-bold text-amber-400">
                                    {daily.player.total_score?.toLocaleString() ?? 0}
                                </div>
                                <div className="mt-1 text-[10px] text-white/40">/ 25,000</div>
                                <button
                                    onClick={() => void playAgain()}
                                    className="mt-3 rounded bg-white/10 px-3 py-1 text-[10px] text-white/50 transition hover:bg-white/20 hover:text-white"
                                >
                                    Play Again
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => void startChallenge()}
                                className="w-full rounded bg-amber-500/20 px-3 py-2 text-xs text-amber-400 transition hover:bg-amber-500/30"
                            >
                                Start Today's Challenge
                            </button>
                        )}
                        {(error || gameLoop.error) && <div className="text-[10px] text-red-400">{error || gameLoop.error}</div>}
                    </div>
                )}

                {tab === 'leaderboard' && (
                    <div className="space-y-1">
                        {leaderboard && leaderboard.total_participants > 0 && (
                            <div className="text-[10px] text-white/20 mb-1">
                                {leaderboard.total_participants} player{leaderboard.total_participants !== 1 ? 's' : ''} completed
                            </div>
                        )}
                        <div className="max-h-48 space-y-1 overflow-y-auto">
                            {!leaderboard || leaderboard.entries.length === 0 ? (
                                <div className="text-center text-[10px] text-white/30">No completions yet</div>
                            ) : (
                                leaderboard.entries.map((entry) => (
                                    <div
                                        key={entry.player_id}
                                        className="flex items-center justify-between rounded bg-white/5 px-2 py-1 text-[10px]"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className={`w-4 text-right ${entry.rank <= 3 ? 'text-amber-400' : 'text-white/30'}`}>
                                                {entry.rank}
                                            </span>
                                            {entry.tier && (
                                                <span className={`rounded px-1 text-[8px] font-bold uppercase ${tierBg(entry.tier)}`}>
                                                    {entry.tier[0]}
                                                </span>
                                            )}
                                            <span className="text-white/80">{entry.player_name}</span>
                                        </div>
                                        <span className="text-amber-400">{entry.total_score.toLocaleString()}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
