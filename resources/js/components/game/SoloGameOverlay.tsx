import { useState } from 'react';
import { createPortal } from 'react-dom';
import MapillaryImagePanel from '@/components/welcome/MapillaryImagePanel';
import MapPicker from '@/components/welcome/MapPicker';
import ResultsMap from '@/components/welcome/ResultsMap';
import { formatDistance } from '@/lib/format';
import { haversineKm } from '@/lib/geo';
import { tierColor } from '@/lib/tier';
import type { LatLng, Location } from '@/types/shared';

export interface OverlayRoundState {
    round_number: number;
    total_rounds: number | null;
    current_score: number;
    location: Location | null;
}

export interface OverlayHealthDisplay {
    current: number;
    max: number;
}

export interface OverlayRoundResult {
    score: number;
    speed_bonus?: number;
    total_score: number;
    rounds_completed: number;
    timed_out: boolean;
    location: LatLng;
    game_over: boolean;
    tier?: string;
    damage?: number;
    health?: number | null;
    personal_best?: { is_new: boolean } | null;
    streak?: { current_streak: number; best_streak: number };
}

export interface SoloGameOverlayProps {
    roundState: OverlayRoundState;
    timeLeft: number | null;
    roundResult: OverlayRoundResult | null;
    guessCoords: LatLng | null;
    phase: 'guessing' | 'results';
    pinCoords: LatLng | null;
    onPin: (c: LatLng) => void;
    onSubmit: () => void;
    onNextRound: () => void;
    onClose: () => void;
    // Theming
    accentColor: 'green' | 'amber';
    pinColor: string;
    // Optional features
    modeLabel?: string;
    modeLabelColor?: string;
    healthDisplay?: OverlayHealthDisplay | null;
    maxScoreLabel?: string;
    showSpeedBonus?: boolean;
    showDamage?: boolean;
    completionLabel?: string;
}

const ACCENT = {
    green: {
        score: 'text-green-400',
        btn: 'bg-green-500/90 hover:bg-green-400',
        nextBtn: 'bg-green-500/90 hover:bg-green-400',
    },
    amber: {
        score: 'text-amber-400',
        btn: 'bg-amber-500/90 hover:bg-amber-400',
        nextBtn: 'bg-amber-500/90 hover:bg-amber-400',
    },
};

export default function SoloGameOverlay({
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
    accentColor,
    pinColor,
    modeLabel,
    modeLabelColor,
    healthDisplay,
    maxScoreLabel,
    showSpeedBonus,
    showDamage,
    completionLabel = 'Complete!',
}: SoloGameOverlayProps) {
    const [mapExpanded, setMapExpanded] = useState(false);
    const theme = ACCENT[accentColor];

    return createPortal(
        <div className="fixed inset-0 z-50 bg-black">
            {phase === 'guessing' ? (
                <>
                    {roundState.location && (
                        <MapillaryImagePanel location={roundState.location} />
                    )}

                    {/* Top bar */}
                    <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                            <span className="rounded bg-black/60 px-2 py-1 text-xs text-white backdrop-blur-sm">
                                Round {roundState.round_number}
                                {roundState.total_rounds ? ` / ${roundState.total_rounds}` : ''}
                            </span>
                            <span className="rounded bg-black/60 px-2 py-1 text-xs text-amber-400 backdrop-blur-sm">
                                {roundState.current_score.toLocaleString()} pts
                            </span>
                            {healthDisplay && (
                                <div className="flex items-center gap-1.5 rounded bg-black/60 px-2 py-1 backdrop-blur-sm">
                                    <span className="text-[10px] text-red-400">HP</span>
                                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                                        <div
                                            className="h-full rounded-full bg-red-500 transition-all duration-300"
                                            style={{ width: `${Math.max(0, (healthDisplay.current / healthDisplay.max) * 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-white/50">{healthDisplay.current.toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            {timeLeft !== null && (
                                <span className={`rounded bg-black/60 px-2 py-1 text-xs font-mono backdrop-blur-sm ${timeLeft <= 10 ? 'text-red-400' : 'text-white'}`}>
                                    {timeLeft}s
                                </span>
                            )}
                            {modeLabel && (
                                <span className={`rounded bg-black/60 px-2 py-1 text-[10px] backdrop-blur-sm ${modeLabelColor ?? 'text-white/50'}`}>
                                    {modeLabel}
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
                        <MapPicker onPin={onPin} pinColor={pinColor} disabled={false} />
                    </div>

                    {/* Guess button */}
                    <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
                        <button
                            onClick={onSubmit}
                            disabled={!pinCoords}
                            className={`rounded px-6 py-2 text-sm font-semibold text-black transition disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30 ${theme.btn}`}
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
                                    {roundState.total_rounds ? ` / ${roundState.total_rounds}` : ''}
                                </div>
                                <div className={`text-3xl font-bold ${theme.score}`}>
                                    +{roundResult.score.toLocaleString()}
                                </div>
                                {showSpeedBonus && roundResult.speed_bonus != null && roundResult.speed_bonus > 0 && (
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
                                {showDamage && roundResult.damage != null && roundResult.damage > 0 && (
                                    <div className="mt-2 text-sm text-red-400">
                                        -{roundResult.damage.toLocaleString()} HP
                                    </div>
                                )}

                                <div className="mt-2 text-xs text-white/40">
                                    Total: {roundResult.total_score.toLocaleString()}
                                    {maxScoreLabel ? ` / ${maxScoreLabel}` : ''}
                                </div>

                                {/* Game over info */}
                                {roundResult.game_over && (
                                    <div className="mt-4">
                                        <div className="text-sm font-semibold text-white">
                                            {roundResult.health !== null && roundResult.health !== undefined && roundResult.health <= 0
                                                ? 'Game Over!'
                                                : completionLabel}
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
                                        {roundResult.streak && (
                                            <div className="mt-1 text-[10px] text-orange-400">
                                                {roundResult.streak.current_streak} day streak
                                                {roundResult.streak.best_streak > roundResult.streak.current_streak && (
                                                    <span className="text-white/30"> (best: {roundResult.streak.best_streak})</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={onNextRound}
                                className={`mt-4 rounded px-6 py-2 text-sm font-semibold text-black transition ${theme.nextBtn}`}
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
