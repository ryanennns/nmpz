import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useApiClient } from '@/hooks/useApiClient';
import MapillaryImagePanel from '@/components/welcome/MapillaryImagePanel';
import MapPicker from '@/components/welcome/MapPicker';
import ResultsMap from '@/components/welcome/ResultsMap';
import type { LatLng } from '@/components/welcome/types';
import type {
    DailyInfo,
    DailyRoundState,
    DailyGuessResult,
    DailyLeaderboardEntry,
    DailyLeaderboardData,
} from '@/types/daily';

function tierColor(tier: string | null | undefined): string {
    if (tier === 'gold') return 'text-yellow-400';
    if (tier === 'silver') return 'text-gray-300';
    if (tier === 'bronze') return 'text-amber-700';
    return 'text-white/40';
}

function tierBg(tier: string | null | undefined): string {
    if (tier === 'gold') return 'bg-yellow-400/20 text-yellow-400';
    if (tier === 'silver') return 'bg-gray-300/20 text-gray-300';
    if (tier === 'bronze') return 'bg-amber-700/20 text-amber-700';
    return 'bg-white/10 text-white/40';
}

function formatDistance(km: number): string {
    if (km < 1) return `${Math.round(km * 1000)} m`;
    if (km < 100) return `${km.toFixed(1)} km`;
    return `${Math.round(km).toLocaleString()} km`;
}

/* ─── Fullscreen game overlay (portal) ─── */
function DailyChallengeGame({
    roundState,
    timeLeft,
    roundResult,
    guessCoords,
    phase,
    pinCoords,
    onPin,
    onSubmit,
    onNextRound,
    onClose,
}: {
    roundState: DailyRoundState;
    timeLeft: number | null;
    roundResult: DailyGuessResult | null;
    guessCoords: LatLng | null;
    phase: 'guessing' | 'results';
    pinCoords: LatLng | null;
    onPin: (c: LatLng) => void;
    onSubmit: () => void;
    onNextRound: () => void;
    onClose: () => void;
}) {
    const [mapExpanded, setMapExpanded] = useState(false);

    return createPortal(
        <div className="fixed inset-0 z-50 bg-black">
            {phase === 'guessing' ? (
                <>
                    {/* Panorama backdrop */}
                    {roundState.location && (
                        <MapillaryImagePanel location={roundState.location} />
                    )}

                    {/* Top bar */}
                    <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                            <span className="rounded bg-black/60 px-2 py-1 text-xs text-white backdrop-blur-sm">
                                Round {roundState.round_number} / {roundState.total_rounds}
                            </span>
                            <span className="rounded bg-black/60 px-2 py-1 text-xs text-amber-400 backdrop-blur-sm">
                                {roundState.current_score.toLocaleString()} pts
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            {timeLeft !== null && (
                                <span className={`rounded bg-black/60 px-2 py-1 text-xs font-mono backdrop-blur-sm ${timeLeft <= 10 ? 'text-red-400' : 'text-white'}`}>
                                    {timeLeft}s
                                </span>
                            )}
                            <button
                                onClick={onClose}
                                className="rounded bg-black/60 px-2 py-1 text-xs text-white/50 backdrop-blur-sm hover:text-white"
                            >
                                Quit
                            </button>
                        </div>
                    </div>

                    {/* Map picker — bottom right, expandable */}
                    <div
                        className="absolute bottom-4 right-4 z-10 overflow-hidden rounded border border-white/20 transition-all duration-200"
                        style={{
                            width: mapExpanded ? '600px' : '280px',
                            height: mapExpanded ? '400px' : '180px',
                        }}
                        onMouseEnter={() => setMapExpanded(true)}
                        onMouseLeave={() => setMapExpanded(false)}
                    >
                        <MapPicker
                            onPin={onPin}
                            pinColor="#f59e0b"
                            disabled={false}
                        />
                    </div>

                    {/* Guess button — bottom center */}
                    <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
                        <button
                            onClick={onSubmit}
                            disabled={!pinCoords}
                            className="rounded bg-amber-500/90 px-6 py-2 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30"
                        >
                            {pinCoords ? 'Lock in guess' : 'Place pin on map'}
                        </button>
                    </div>
                </>
            ) : (
                <>
                    {/* Results map showing actual location + guess */}
                    {roundResult && (
                        <ResultsMap
                            result={{
                                location: roundResult.location,
                                p1Guess: guessCoords,
                                p2Guess: null,
                            }}
                        />
                    )}

                    {/* Results overlay */}
                    {roundResult && (
                        <div className="absolute inset-x-0 top-0 z-10 flex flex-col items-center pt-6">
                            {/* Score card */}
                            <div className="rounded-lg bg-black/70 px-6 py-4 text-center backdrop-blur-sm">
                                <div className="text-xs text-white/50 mb-1">
                                    Round {roundResult.rounds_completed} / {roundState.total_rounds}
                                </div>
                                <div className="text-3xl font-bold text-amber-400">
                                    +{roundResult.score.toLocaleString()}
                                </div>
                                <div className="mt-1 text-xs text-white/50">
                                    {roundResult.timed_out
                                        ? 'Timed out'
                                        : guessCoords
                                            ? formatDistance(
                                                haversineKm(
                                                    roundResult.location.lat, roundResult.location.lng,
                                                    guessCoords.lat, guessCoords.lng,
                                                )
                                            ) + ' away'
                                            : ''
                                    }
                                </div>
                                <div className="mt-2 text-xs text-white/40">
                                    Total: {roundResult.total_score.toLocaleString()} / 25,000
                                </div>

                                {/* Completion result */}
                                {roundResult.completed ? (
                                    <div className="mt-4">
                                        <div className="text-sm font-semibold text-white">Challenge Complete!</div>
                                        {roundResult.tier && (
                                            <div className={`mt-1 text-sm font-bold uppercase ${tierColor(roundResult.tier)}`}>
                                                {roundResult.tier} tier
                                            </div>
                                        )}
                                        {roundResult.streak && (
                                            <div className="mt-1 text-[10px] text-orange-400">
                                                {roundResult.streak.current_streak} day streak
                                                {roundResult.streak.best_streak > roundResult.streak.current_streak && (
                                                    <span className="text-white/30"> (best: {roundResult.streak.best_streak})</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : null}
                            </div>

                            {/* Next / Finish button */}
                            <button
                                onClick={onNextRound}
                                className="mt-4 rounded bg-amber-500/90 px-6 py-2 text-sm font-semibold text-black transition hover:bg-amber-400"
                            >
                                {roundResult.completed ? 'Finish' : 'Next Round'}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>,
        document.body,
    );
}

/** Simple haversine for client-side distance display */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ─── Main panel (lobby card) ─── */
export default function DailyChallengePanel({ playerId }: { playerId: string }) {
    const api = useApiClient(playerId);
    const [daily, setDaily] = useState<DailyInfo | null>(null);
    const [roundState, setDailyRoundState] = useState<DailyRoundState | null>(null);
    const [roundResult, setRoundResult] = useState<DailyGuessResult | null>(null);
    const [lastGuessCoords, setLastGuessCoords] = useState<LatLng | null>(null);
    const [completionResult, setCompletionResult] = useState<DailyGuessResult | null>(null);
    const [pendingNextRound, setPendingNextRound] = useState<DailyRoundState | null>(null);
    const [leaderboard, setLeaderboard] = useState<DailyLeaderboardData | null>(null);
    const [tab, setTab] = useState<'play' | 'leaderboard'>('play');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pinCoords, setPinCoords] = useState<LatLng | null>(null);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [phase, setPhase] = useState<'guessing' | 'results'>('guessing');
    const submittingRef = useRef(false);

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

    // Timer countdown
    useEffect(() => {
        if (timeLeft === null || !roundState || phase !== 'guessing') return;
        if (timeLeft <= 0) {
            if (!submittingRef.current) {
                submittingRef.current = true;
                void submitGuess(true);
            }
            return;
        }
        const timer = setInterval(() => setTimeLeft((t) => (t !== null ? t - 1 : null)), 1000);
        return () => clearInterval(timer);
    }, [timeLeft, roundState, phase]);

    async function startChallenge() {
        setError(null);
        try {
            const res = await api.startDailyChallenge();
            const data = res.data as DailyRoundState;
            if ((data as unknown as { error?: string }).error) {
                setError((data as unknown as { error: string }).error);
                return;
            }
            setDailyRoundState(data);
            setRoundResult(null);
            setCompletionResult(null);
            setPinCoords(null);
            setPhase('guessing');
            setTimeLeft(data.round_timeout);
        } catch (e) {
            if (axios.isAxiosError(e)) {
                setError((e.response?.data as { error?: string })?.error ?? 'Failed to start');
            }
        }
    }

    const submitGuess = useCallback(async (timedOut = false) => {
        if (!roundState?.entry_id) return;
        if (!timedOut && !pinCoords) return;
        setError(null);
        try {
            const coords = timedOut ? { lat: 0, lng: 0 } : pinCoords!;
            setLastGuessCoords(timedOut ? null : coords);
            const res = await api.dailyChallengeGuess(roundState.entry_id, coords);
            const data = res.data as DailyGuessResult;
            setRoundResult(data);
            setTimeLeft(null);
            submittingRef.current = false;

            // Pause on results screen
            setPhase('results');

            if (!data.completed && data.next_location) {
                // Queue up the next round — don't advance yet
                setPendingNextRound({
                    ...roundState,
                    round_number: data.rounds_completed + 1,
                    current_score: data.total_score,
                    location: data.next_location,
                });
            } else if (data.completed) {
                setPendingNextRound(null);
                setCompletionResult(data);
            }
        } catch (e) {
            submittingRef.current = false;
            if (axios.isAxiosError(e)) {
                setError((e.response?.data as { error?: string })?.error ?? 'Failed to submit guess');
            }
        }
    }, [roundState, pinCoords, api]);

    function advanceRound() {
        if (roundResult?.completed) {
            // Done — close the overlay
            setDailyRoundState(null);
            setTimeLeft(null);
            setPinCoords(null);
            setPhase('guessing');
            api.fetchDailyChallenge()
                .then((res) => setDaily(res.data as DailyInfo))
                .catch(() => {});
        } else if (pendingNextRound) {
            setDailyRoundState(pendingNextRound);
            setPendingNextRound(null);
            setPinCoords(null);
            setPhase('guessing');
            setTimeLeft(pendingNextRound.round_timeout);
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

    function closeGame() {
        setDailyRoundState(null);
        setTimeLeft(null);
        setPinCoords(null);
        setPhase('guessing');
    }

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
            {roundState && (
                <DailyChallengeGame
                    roundState={roundState}
                    timeLeft={timeLeft}
                    roundResult={roundResult}
                    guessCoords={lastGuessCoords}
                    phase={phase}
                    pinCoords={pinCoords}
                    onPin={setPinCoords}
                    onSubmit={() => void submitGuess()}
                    onNextRound={advanceRound}
                    onClose={closeGame}
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
                        {/* Completed — just finished */}
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
                        {error && <div className="text-[10px] text-red-400">{error}</div>}
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
