import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useApiClient } from '@/hooks/useApiClient';
import MapillaryImagePanel from '@/components/welcome/MapillaryImagePanel';
import MapPicker from '@/components/welcome/MapPicker';
import MapSelector from '@/components/welcome/MapSelector';
import ResultsMap from '@/components/welcome/ResultsMap';
import type { LatLng } from '@/components/welcome/types';
import type { SoloMode, StreakDifficulty, SoloGameState, SoloGuessResult } from '@/types/solo';

type Phase = 'mode-select' | 'configure' | 'playing' | 'results';

/* ─── Helpers ─── */

function tierColor(tier: string | undefined): string {
    if (tier === 'gold') return 'text-yellow-400';
    if (tier === 'silver') return 'text-gray-300';
    if (tier === 'bronze') return 'text-amber-700';
    return 'text-white/40';
}

function formatDistance(km: number): string {
    if (km < 1) return `${Math.round(km * 1000)} m`;
    if (km < 100) return `${km.toFixed(1)} km`;
    return `${Math.round(km).toLocaleString()} km`;
}

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

const MODE_INFO: Record<SoloMode, { name: string; tagline: string; color: string }> = {
    explorer: { name: 'Explorer', tagline: 'Free play, no pressure', color: 'text-green-400' },
    streak: { name: 'Streak', tagline: 'Survive as long as you can', color: 'text-red-400' },
    time_attack: { name: 'Time Attack', tagline: 'Fast and accurate', color: 'text-blue-400' },
    perfect_score: { name: 'Perfect Score', tagline: 'Chase perfection', color: 'text-yellow-400' },
};

/* ─── Game Overlay (portal) ─── */

function SoloGameOverlay({
    gameState,
    timeLeft,
    roundResult,
    guessCoords,
    gamePhase,
    pinCoords,
    onPin,
    onSubmit,
    onNextRound,
    onClose,
}: {
    gameState: SoloGameState;
    timeLeft: number | null;
    roundResult: SoloGuessResult | null;
    guessCoords: LatLng | null;
    gamePhase: 'guessing' | 'round-results';
    pinCoords: LatLng | null;
    onPin: (c: LatLng) => void;
    onSubmit: () => void;
    onNextRound: () => void;
    onClose: () => void;
}) {
    const [mapExpanded, setMapExpanded] = useState(false);

    return createPortal(
        <div className="fixed inset-0 z-50 bg-black">
            {gamePhase === 'guessing' ? (
                <>
                    {gameState.location && (
                        <MapillaryImagePanel location={gameState.location} />
                    )}

                    {/* Top bar */}
                    <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                            <span className="rounded bg-black/60 px-2 py-1 text-xs text-white backdrop-blur-sm">
                                Round {gameState.round_number}
                                {gameState.total_rounds ? ` / ${gameState.total_rounds}` : ''}
                            </span>
                            <span className="rounded bg-black/60 px-2 py-1 text-xs text-amber-400 backdrop-blur-sm">
                                {gameState.current_score.toLocaleString()} pts
                            </span>
                            {gameState.health !== null && (
                                <div className="flex items-center gap-1.5 rounded bg-black/60 px-2 py-1 backdrop-blur-sm">
                                    <span className="text-[10px] text-red-400">HP</span>
                                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                                        <div
                                            className="h-full rounded-full bg-red-500 transition-all duration-300"
                                            style={{
                                                width: `${Math.max(0, (gameState.health / (gameState.mode === 'streak' ? (gameState.difficulty === 'casual' ? 10000 : gameState.difficulty === 'hardcore' ? 2500 : 5000) : 5000)) * 100)}%`,
                                            }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-white/50">{gameState.health.toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            {timeLeft !== null && (
                                <span className={`rounded bg-black/60 px-2 py-1 text-xs font-mono backdrop-blur-sm ${timeLeft <= 10 ? 'text-red-400' : 'text-white'}`}>
                                    {timeLeft}s
                                </span>
                            )}
                            <span className={`rounded bg-black/60 px-2 py-1 text-[10px] backdrop-blur-sm ${MODE_INFO[gameState.mode].color}`}>
                                {MODE_INFO[gameState.mode].name}
                            </span>
                            <button
                                onClick={onClose}
                                className="rounded bg-black/60 px-2 py-1 text-xs text-white/50 backdrop-blur-sm hover:text-white"
                            >
                                Quit
                            </button>
                        </div>
                    </div>

                    {/* Map picker */}
                    <div
                        className="absolute bottom-4 right-4 z-10 overflow-hidden rounded border border-white/20 transition-all duration-200"
                        style={{
                            width: mapExpanded ? '600px' : '280px',
                            height: mapExpanded ? '400px' : '180px',
                        }}
                        onMouseEnter={() => setMapExpanded(true)}
                        onMouseLeave={() => setMapExpanded(false)}
                    >
                        <MapPicker onPin={onPin} pinColor="#22c55e" disabled={false} />
                    </div>

                    {/* Guess button */}
                    <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
                        <button
                            onClick={onSubmit}
                            disabled={!pinCoords}
                            className="rounded bg-green-500/90 px-6 py-2 text-sm font-semibold text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30"
                        >
                            {pinCoords ? 'Lock in guess' : 'Place pin on map'}
                        </button>
                    </div>
                </>
            ) : (
                <>
                    {/* Results map */}
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
                            <div className="rounded-lg bg-black/70 px-6 py-4 text-center backdrop-blur-sm">
                                <div className="text-xs text-white/50 mb-1">
                                    Round {roundResult.rounds_completed}
                                    {gameState.total_rounds ? ` / ${gameState.total_rounds}` : ''}
                                </div>
                                <div className="text-3xl font-bold text-green-400">
                                    +{roundResult.score.toLocaleString()}
                                </div>
                                {roundResult.speed_bonus > 0 && (
                                    <div className="text-sm text-blue-400">
                                        +{roundResult.speed_bonus.toLocaleString()} speed bonus
                                    </div>
                                )}
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

                                {/* Streak damage */}
                                {gameState.mode === 'streak' && roundResult.damage > 0 && (
                                    <div className="mt-2 text-sm text-red-400">
                                        -{roundResult.damage.toLocaleString()} HP
                                    </div>
                                )}

                                <div className="mt-2 text-xs text-white/40">
                                    Total: {roundResult.total_score.toLocaleString()}
                                </div>

                                {/* Game over info */}
                                {roundResult.game_over && (
                                    <div className="mt-4">
                                        <div className="text-sm font-semibold text-white">
                                            {gameState.mode === 'streak' && roundResult.health !== null && roundResult.health <= 0
                                                ? 'Game Over!'
                                                : 'Complete!'}
                                        </div>
                                        {roundResult.tier && (
                                            <div className={`mt-1 text-sm font-bold uppercase ${tierColor(roundResult.tier)}`}>
                                                {roundResult.tier} tier
                                            </div>
                                        )}
                                        {roundResult.personal_best?.is_new && (
                                            <div className="mt-1 text-[10px] text-green-400">
                                                New personal best!
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={onNextRound}
                                className="mt-4 rounded bg-green-500/90 px-6 py-2 text-sm font-semibold text-black transition hover:bg-green-400"
                            >
                                {roundResult.game_over ? 'Finish' : 'Next Round'}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>,
        document.body,
    );
}

/* ─── Main Panel (lobby card) ─── */

export default function SoloPlayPanel({ playerId }: { playerId: string }) {
    const api = useApiClient(playerId);
    const [phase, setPhase] = useState<Phase>('mode-select');
    const [selectedMode, setSelectedMode] = useState<SoloMode | null>(null);
    const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Explorer config
    const [explorerRounds, setExplorerRounds] = useState(5);
    const [explorerTimer, setExplorerTimer] = useState(0);

    // Streak config
    const [streakDifficulty, setStreakDifficulty] = useState<StreakDifficulty>('normal');

    // Game state
    const [gameState, setSoloGameState] = useState<SoloGameState | null>(null);
    const [roundResult, setRoundResult] = useState<SoloGuessResult | null>(null);
    const [lastGuessCoords, setLastGuessCoords] = useState<LatLng | null>(null);
    const [completionResult, setCompletionResult] = useState<SoloGuessResult | null>(null);
    const [pendingNextRound, setPendingNextRound] = useState<SoloGameState | null>(null);
    const [pinCoords, setPinCoords] = useState<LatLng | null>(null);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [gamePhase, setGamePhase] = useState<'guessing' | 'round-results'>('guessing');
    const submittingRef = useRef(false);

    // Timer countdown
    useEffect(() => {
        if (timeLeft === null || !gameState || gamePhase !== 'guessing') return;
        if (timeLeft <= 0) {
            if (!submittingRef.current) {
                submittingRef.current = true;
                void submitGuess(true);
            }
            return;
        }
        const timer = setInterval(() => setTimeLeft((t) => (t !== null ? t - 1 : null)), 1000);
        return () => clearInterval(timer);
    }, [timeLeft, gameState, gamePhase]);

    async function startGame() {
        if (!selectedMode) return;
        setError(null);
        try {
            const options: Record<string, unknown> = {};
            if (selectedMapId) options.map_id = selectedMapId;

            if (selectedMode === 'explorer') {
                options.max_rounds = explorerRounds;
                options.round_timeout = explorerTimer || 0;
            } else if (selectedMode === 'streak') {
                options.difficulty = streakDifficulty;
            }

            const res = await api.startSoloGame(selectedMode, options);
            const data = res.data as SoloGameState;
            if ((data as unknown as { error?: string }).error) {
                setError((data as unknown as { error: string }).error);
                return;
            }
            setSoloGameState(data);
            setRoundResult(null);
            setCompletionResult(null);
            setPinCoords(null);
            setGamePhase('guessing');
            setTimeLeft(data.round_timeout);
            setPhase('playing');
        } catch (e) {
            if (axios.isAxiosError(e)) {
                setError((e.response?.data as { error?: string })?.error ?? 'Failed to start');
            }
        }
    }

    const submitGuess = useCallback(async (timedOut = false) => {
        if (!gameState?.game_id) return;
        if (!timedOut && !pinCoords) return;
        setError(null);
        try {
            const coords = timedOut ? { lat: 0, lng: 0 } : pinCoords!;
            setLastGuessCoords(timedOut ? null : coords);
            const res = await api.soloGuess(gameState.game_id, coords);
            const data = res.data as SoloGuessResult;
            setRoundResult(data);
            setTimeLeft(null);
            submittingRef.current = false;
            setGamePhase('round-results');

            if (!data.game_over && data.next_location) {
                setPendingNextRound({
                    ...gameState,
                    round_number: data.rounds_completed + 1,
                    current_score: data.total_score,
                    health: data.health,
                    location: data.next_location,
                });
            } else if (data.game_over) {
                setPendingNextRound(null);
                setCompletionResult(data);
            }
        } catch (e) {
            submittingRef.current = false;
            if (axios.isAxiosError(e)) {
                setError((e.response?.data as { error?: string })?.error ?? 'Failed to submit guess');
            }
        }
    }, [gameState, pinCoords, api]);

    function advanceRound() {
        if (roundResult?.game_over) {
            setSoloGameState(null);
            setTimeLeft(null);
            setPinCoords(null);
            setGamePhase('guessing');
            setPhase('results');
        } else if (pendingNextRound) {
            setSoloGameState(pendingNextRound);
            setPendingNextRound(null);
            setPinCoords(null);
            setGamePhase('guessing');
            setTimeLeft(pendingNextRound.round_timeout);
        }
    }

    function quitGame() {
        if (gameState) {
            void api.abandonSoloGame(gameState.game_id);
        }
        setSoloGameState(null);
        setTimeLeft(null);
        setPinCoords(null);
        setGamePhase('guessing');
        setPhase('mode-select');
    }

    function playAgain() {
        setCompletionResult(null);
        setRoundResult(null);
        setPhase('configure');
    }

    function backToModes() {
        setCompletionResult(null);
        setRoundResult(null);
        setSelectedMode(null);
        setPhase('mode-select');
    }

    return (
        <>
            {/* Fullscreen game overlay */}
            {gameState && phase === 'playing' && (
                <SoloGameOverlay
                    gameState={gameState}
                    timeLeft={timeLeft}
                    roundResult={roundResult}
                    guessCoords={lastGuessCoords}
                    gamePhase={gamePhase}
                    pinCoords={pinCoords}
                    onPin={setPinCoords}
                    onSubmit={() => void submitGuess()}
                    onNextRound={advanceRound}
                    onClose={quitGame}
                />
            )}

            {/* Lobby card */}
            <div className="w-full">
                {/* ─── Mode Select ─── */}
                {phase === 'mode-select' && (
                    <div className="grid grid-cols-2 gap-1.5">
                        {(Object.keys(MODE_INFO) as SoloMode[]).map((mode) => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => {
                                    setSelectedMode(mode);
                                    setPhase('configure');
                                }}
                                className="group rounded border border-white/10 bg-white/5 px-3 py-2.5 text-left transition hover:border-white/20 hover:bg-white/10"
                            >
                                <div className={`text-xs font-semibold ${MODE_INFO[mode].color}`}>
                                    {MODE_INFO[mode].name}
                                </div>
                                <div className="mt-0.5 text-[10px] text-white/40 group-hover:text-white/50">
                                    {MODE_INFO[mode].tagline}
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* ─── Configure ─── */}
                {phase === 'configure' && selectedMode && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className={`text-xs font-semibold ${MODE_INFO[selectedMode].color}`}>
                                {MODE_INFO[selectedMode].name}
                            </span>
                            <button
                                type="button"
                                onClick={backToModes}
                                className="text-[10px] text-white/30 hover:text-white/50"
                            >
                                back
                            </button>
                        </div>

                        {/* Map selector */}
                        <MapSelector
                            playerId={playerId}
                            selectedMapId={selectedMapId}
                            onSelect={setSelectedMapId}
                        />

                        {/* Explorer options */}
                        {selectedMode === 'explorer' && (
                            <>
                                <div>
                                    <div className="mb-1 text-[10px] text-white/30">Rounds</div>
                                    <div className="flex gap-1">
                                        {[5, 10, 20, 0].map((n) => (
                                            <button
                                                key={n}
                                                type="button"
                                                onClick={() => setExplorerRounds(n)}
                                                className={`flex-1 rounded px-2 py-1 text-[10px] transition ${
                                                    explorerRounds === n
                                                        ? 'bg-green-500/20 text-green-400'
                                                        : 'bg-white/5 text-white/40 hover:bg-white/10'
                                                }`}
                                            >
                                                {n === 0 ? '∞' : n}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <div className="mb-1 text-[10px] text-white/30">Timer</div>
                                    <div className="flex gap-1">
                                        {[0, 30, 60].map((t) => (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => setExplorerTimer(t)}
                                                className={`flex-1 rounded px-2 py-1 text-[10px] transition ${
                                                    explorerTimer === t
                                                        ? 'bg-green-500/20 text-green-400'
                                                        : 'bg-white/5 text-white/40 hover:bg-white/10'
                                                }`}
                                            >
                                                {t === 0 ? 'None' : `${t}s`}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Streak difficulty */}
                        {selectedMode === 'streak' && (
                            <div>
                                <div className="mb-1 text-[10px] text-white/30">Difficulty</div>
                                <div className="flex gap-1">
                                    {([
                                        { key: 'casual' as StreakDifficulty, label: 'Casual', hp: '10,000' },
                                        { key: 'normal' as StreakDifficulty, label: 'Normal', hp: '5,000' },
                                        { key: 'hardcore' as StreakDifficulty, label: 'Hardcore', hp: '2,500' },
                                    ]).map(({ key, label, hp }) => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => setStreakDifficulty(key)}
                                            className={`flex-1 rounded px-2 py-1.5 text-center transition ${
                                                streakDifficulty === key
                                                    ? 'bg-red-500/20 text-red-400'
                                                    : 'bg-white/5 text-white/40 hover:bg-white/10'
                                            }`}
                                        >
                                            <div className="text-[10px] font-semibold">{label}</div>
                                            <div className="text-[9px] text-white/25">{hp} HP</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Time Attack info */}
                        {selectedMode === 'time_attack' && (
                            <div className="rounded bg-white/5 px-3 py-2 text-[10px] text-white/40">
                                5 rounds &middot; 15s timer &middot; score + speed bonus
                            </div>
                        )}

                        {/* Perfect Score info */}
                        {selectedMode === 'perfect_score' && (
                            <div className="rounded bg-white/5 px-3 py-2 text-[10px] text-white/40">
                                10 rounds &middot; 120s timer &middot; Gold ≥ 40k / Silver ≥ 30k
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={() => void startGame()}
                            className={`w-full rounded py-2 text-xs font-semibold text-black transition ${
                                selectedMode === 'explorer' ? 'bg-green-500/80 hover:bg-green-400' :
                                selectedMode === 'streak' ? 'bg-red-500/80 hover:bg-red-400' :
                                selectedMode === 'time_attack' ? 'bg-blue-500/80 hover:bg-blue-400' :
                                'bg-yellow-500/80 hover:bg-yellow-400'
                            }`}
                        >
                            Start {MODE_INFO[selectedMode].name}
                        </button>

                        {error && <div className="text-[10px] text-red-400">{error}</div>}
                    </div>
                )}

                {/* ─── Results ─── */}
                {phase === 'results' && completionResult && (
                    <div className="rounded bg-white/5 p-3 text-center">
                        <div className={`mb-1 text-xs font-semibold ${selectedMode ? MODE_INFO[selectedMode].color : 'text-white'}`}>
                            {selectedMode ? MODE_INFO[selectedMode].name : 'Solo'} Complete!
                        </div>
                        {completionResult.tier && (
                            <div className={`mb-1 text-xs font-bold uppercase ${tierColor(completionResult.tier)}`}>
                                {completionResult.tier} tier
                            </div>
                        )}
                        <div className="text-2xl font-bold text-green-400">
                            {completionResult.total_score.toLocaleString()}
                        </div>
                        <div className="mt-1 text-[10px] text-white/40">
                            {completionResult.rounds_completed} round{completionResult.rounds_completed !== 1 ? 's' : ''}
                            {completionResult.health !== null && completionResult.health <= 0 && ' — HP depleted'}
                        </div>
                        {completionResult.personal_best?.is_new && (
                            <div className="mt-2 text-[10px] text-green-400">
                                New personal best!
                            </div>
                        )}
                        <div className="mt-3 flex gap-2">
                            <button
                                type="button"
                                onClick={playAgain}
                                className="flex-1 rounded bg-white/10 px-3 py-1 text-[10px] text-white/50 transition hover:bg-white/20 hover:text-white"
                            >
                                Play Again
                            </button>
                            <button
                                type="button"
                                onClick={backToModes}
                                className="flex-1 rounded bg-white/10 px-3 py-1 text-[10px] text-white/50 transition hover:bg-white/20 hover:text-white"
                            >
                                Back to Modes
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
