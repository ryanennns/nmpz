import axios from 'axios';
import { useCallback, useState } from 'react';
import { useApiClient } from '@/hooks/useApiClient';
import { useSoloGameLoop } from '@/hooks/useSoloGameLoop';
import SoloGameOverlay from '@/components/game/SoloGameOverlay';
import type { OverlayRoundResult } from '@/components/game/SoloGameOverlay';
import MapSelector from '@/components/welcome/MapSelector';
import { tierColor } from '@/lib/tier';
import type { SoloMode, StreakDifficulty, SoloGameState, SoloGuessResult } from '@/types/solo';

type Phase = 'mode-select' | 'configure' | 'playing' | 'results';

const MODE_INFO: Record<SoloMode, { name: string; tagline: string; color: string }> = {
    explorer: { name: 'Explorer', tagline: 'Free play, no pressure', color: 'text-green-400' },
    streak: { name: 'Streak', tagline: 'Survive as long as you can', color: 'text-red-400' },
    time_attack: { name: 'Time Attack', tagline: 'Fast and accurate', color: 'text-blue-400' },
    perfect_score: { name: 'Perfect Score', tagline: 'Chase perfection', color: 'text-yellow-400' },
};

function getStreakMaxHealth(difficulty?: string): number {
    if (difficulty === 'casual') return 10000;
    if (difficulty === 'hardcore') return 2500;
    return 5000;
}

function toOverlayResult(data: SoloGuessResult): OverlayRoundResult {
    return {
        score: data.score,
        speed_bonus: data.speed_bonus,
        total_score: data.total_score,
        rounds_completed: data.rounds_completed,
        timed_out: data.timed_out,
        location: data.location,
        game_over: data.game_over,
        tier: data.tier,
        damage: data.damage,
        health: data.health,
        personal_best: data.personal_best,
    };
}

export default function SoloPlayPanel({ playerId }: { playerId: string }) {
    const api = useApiClient(playerId);
    const [phase, setPhase] = useState<Phase>('mode-select');
    const [selectedMode, setSelectedMode] = useState<SoloMode | null>(null);
    const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [completionResult, setCompletionResult] = useState<SoloGuessResult | null>(null);

    // Explorer config
    const [explorerRounds, setExplorerRounds] = useState(5);
    const [explorerTimer, setExplorerTimer] = useState(0);

    // Streak config
    const [streakDifficulty, setStreakDifficulty] = useState<StreakDifficulty>('normal');

    const gameLoop = useSoloGameLoop<SoloGameState, SoloGuessResult>({
        submitGuessApi: useCallback(async (rs, coords) => {
            const res = await api.soloGuess(rs.game_id, coords);
            return res.data as SoloGuessResult;
        }, [api]),
        onGuessResult: useCallback((data: SoloGuessResult, rs: SoloGameState) => {
            if (!data.game_over && data.next_location) {
                return {
                    nextRound: {
                        ...rs,
                        round_number: data.rounds_completed + 1,
                        current_score: data.total_score,
                        health: data.health,
                        location: data.next_location,
                    },
                    isDone: false,
                };
            }
            if (data.game_over) {
                setCompletionResult(data);
                return { nextRound: null, isDone: true };
            }
            return { nextRound: null, isDone: false };
        }, []),
        onFinished: useCallback(() => setPhase('results'), []),
    });

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
            setCompletionResult(null);
            gameLoop.startRound(data);
            setPhase('playing');
        } catch (e) {
            if (axios.isAxiosError(e)) {
                setError((e.response?.data as { error?: string })?.error ?? 'Failed to start');
            }
        }
    }

    function quitGame() {
        if (gameLoop.roundState) {
            void api.abandonSoloGame(gameLoop.roundState.game_id);
        }
        gameLoop.quit();
        setPhase('mode-select');
    }

    function playAgain() {
        setCompletionResult(null);
        setPhase('configure');
    }

    function backToModes() {
        setCompletionResult(null);
        setSelectedMode(null);
        setPhase('mode-select');
    }

    const gs = gameLoop.roundState;

    return (
        <>
            {/* Fullscreen game overlay */}
            {gs && phase === 'playing' && (
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
                    phase={gameLoop.phase === 'results' ? 'results' : 'guessing'}
                    pinCoords={gameLoop.pinCoords}
                    onPin={gameLoop.setPinCoords}
                    onSubmit={() => void gameLoop.submitGuess()}
                    onNextRound={gameLoop.advanceRound}
                    onClose={quitGame}
                    accentColor="green"
                    pinColor="#22c55e"
                    modeLabel={MODE_INFO[gs.mode].name}
                    modeLabelColor={MODE_INFO[gs.mode].color}
                    healthDisplay={gs.health !== null ? {
                        current: gs.health,
                        max: gs.mode === 'streak' ? getStreakMaxHealth(gs.difficulty) : 5000,
                    } : null}
                    showSpeedBonus
                    showDamage={gs.mode === 'streak'}
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

                        <MapSelector
                            playerId={playerId}
                            selectedMapId={selectedMapId}
                            onSelect={setSelectedMapId}
                        />

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

                        {selectedMode === 'time_attack' && (
                            <div className="rounded bg-white/5 px-3 py-2 text-[10px] text-white/40">
                                5 rounds &middot; 15s timer &middot; score + speed bonus
                            </div>
                        )}

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

                        {(error || gameLoop.error) && <div className="text-[10px] text-red-400">{error || gameLoop.error}</div>}
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
