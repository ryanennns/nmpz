import { setOptions } from '@googlemaps/js-api-loader';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import { LocationReportMenu } from '@/components/welcome/LocationReportMenu';
import MapillaryImagePanel from '@/components/welcome/MapillaryImagePanel';
import MapPicker from '@/components/welcome/MapPicker';
import { StandardCompass } from '@/components/welcome/StandardCompass';
import type {
    LatLng,
    LocationReportReason,
    Player,
} from '@/components/welcome/types';
import { getP1Color } from '@/hooks/use-theme';
import { PLAYER_ID_KEY, useLocalStorage } from '@/hooks/useLocalStorage';

setOptions({
    key: import.meta.env.VITE_GOOGLE_MAPS_KEY as string,
    v: 'weekly',
});

const TOTAL_ROUNDS = 5;

// ── Types ────────────────────────────────────────────────────────────────────

type RoundData = {
    id: string;
    round_number: number;
    location: {
        id: string;
        lat: number;
        lng: number;
        heading: number;
        image_id: string | null;
    };
};

type GuessResult = {
    score: number;
    distance_km: number;
    location: { lat: number; lng: number };
    guess: { lat: number; lng: number };
    total_score: number;
    game_complete: boolean;
    next_round: RoundData | null;
};

type CompletedRound = {
    round_number: number;
    score: number;
    distance_km: number;
    location: {
        lat: number;
        lng: number;
        heading: number;
        image_id: string | null;
    };
    guess: { lat: number; lng: number };
};

type Phase = 'loading' | 'playing' | 'result' | 'complete';

type GameState = {
    game_id: string;
    total_rounds: number;
    game_complete: boolean;
    current_round: RoundData | null;
    completed_rounds: CompletedRound[];
    highest_singleplayer_score?: number;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDistance(km: number): string {
    if (km < 1) return `${Math.round(km * 1000).toLocaleString()} m`;
    return `${Math.round(km).toLocaleString()} km`;
}

// ── Result map ───────────────────────────────────────────────────────────────

function ResultOverlay({
    location,
    guess,
}: {
    location: { lat: number; lng: number };
    guess: { lat: number; lng: number };
}) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let cancelled = false;

        async function init() {
            const { importLibrary } = await import('@googlemaps/js-api-loader');
            await importLibrary('maps');
            if (cancelled || !containerRef.current) return;

            const bounds = new google.maps.LatLngBounds();
            bounds.extend(location);
            bounds.extend(guess);

            const map = new google.maps.Map(containerRef.current, {
                disableDefaultUI: true,
                clickableIcons: false,
            });

            const flagSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" fill="#facc15" stroke="white" stroke-width="2.5"/><path d="M16 9v18" stroke="white" stroke-width="2.6" stroke-linecap="round"/><path d="M16 9h12l-3 4 3 4H16" fill="white"/></svg>`;
            new google.maps.Marker({
                position: location,
                map,
                icon: {
                    url: 'data:image/svg+xml,' + encodeURIComponent(flagSvg),
                    scaledSize: new google.maps.Size(36, 36),
                    anchor: new google.maps.Point(18, 18),
                },
            });

            const p1Color = getP1Color();
            const dotSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><circle cx="8" cy="8" r="7" fill="${p1Color}" stroke="white" stroke-width="2"/></svg>`;
            new google.maps.Marker({
                position: guess,
                map,
                icon: {
                    url: 'data:image/svg+xml,' + encodeURIComponent(dotSvg),
                    scaledSize: new google.maps.Size(16, 16),
                    anchor: new google.maps.Point(8, 8),
                },
            });

            new google.maps.Polyline({
                path: [location, guess],
                map,
                strokeColor: '#000000',
                strokeOpacity: 0,
                icons: [
                    {
                        icon: {
                            path: 'M 0,-1 0,1',
                            strokeOpacity: 0.6,
                            strokeWeight: 2,
                            scale: 3,
                        },
                        offset: '0',
                        repeat: '12px',
                    },
                ],
            });

            requestAnimationFrame(() =>
                google.maps.event.trigger(map, 'resize'),
            );
            map.fitBounds(bounds, 80);
        }

        init().catch(console.error);
        return () => {
            cancelled = true;
        };
    }, []);

    return <div ref={containerRef} className="absolute inset-0" />;
}

// ── Summary map ──────────────────────────────────────────────────────────────

function SummaryMap({
    rounds,
    onLocationClick,
}: {
    rounds: CompletedRound[];
    onLocationClick: (roundNumber: number) => void;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const onLocationClickRef = useRef(onLocationClick);
    useEffect(() => {
        onLocationClickRef.current = onLocationClick;
    }, [onLocationClick]);

    useEffect(() => {
        let cancelled = false;

        async function init() {
            const { importLibrary } = await import('@googlemaps/js-api-loader');
            await importLibrary('maps');
            if (cancelled || !containerRef.current) return;

            const bounds = new google.maps.LatLngBounds();
            rounds.forEach((r) => {
                bounds.extend(r.location);
                bounds.extend(r.guess);
            });

            const map = new google.maps.Map(containerRef.current, {
                clickableIcons: false,
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false,
            });

            const p1Color = getP1Color();

            const flagSvg = (n: number) =>
                `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" fill="#facc15" stroke="white" stroke-width="2.5"/><text x="18" y="23" text-anchor="middle" font-family="monospace" font-size="13" font-weight="bold" fill="#000">${n}</text></svg>`;

            const dotSvg = (n: number) =>
                `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="12" fill="${p1Color}" stroke="white" stroke-width="2"/><text x="14" y="19" text-anchor="middle" font-family="monospace" font-size="11" font-weight="bold" fill="#000">${n}</text></svg>`;

            rounds.forEach((r) => {
                const locationMarker = new google.maps.Marker({
                    position: r.location,
                    map,
                    cursor: 'pointer',
                    icon: {
                        url:
                            'data:image/svg+xml,' +
                            encodeURIComponent(flagSvg(r.round_number)),
                        scaledSize: new google.maps.Size(36, 36),
                        anchor: new google.maps.Point(18, 18),
                    },
                });
                locationMarker.addListener('click', () =>
                    onLocationClickRef.current(r.round_number),
                );

                new google.maps.Marker({
                    position: r.guess,
                    map,
                    icon: {
                        url:
                            'data:image/svg+xml,' +
                            encodeURIComponent(dotSvg(r.round_number)),
                        scaledSize: new google.maps.Size(28, 28),
                        anchor: new google.maps.Point(14, 14),
                    },
                });

                new google.maps.Polyline({
                    path: [r.location, r.guess],
                    map,
                    strokeColor: '#000000',
                    strokeOpacity: 0,
                    icons: [
                        {
                            icon: {
                                path: 'M 0,-1 0,1',
                                strokeOpacity: 0.5,
                                strokeWeight: 2,
                                scale: 3,
                            },
                            offset: '0',
                            repeat: '12px',
                        },
                    ],
                });
            });

            requestAnimationFrame(() =>
                google.maps.event.trigger(map, 'resize'),
            );
            map.fitBounds(bounds, 80);
        }

        init().catch(console.error);
        return () => {
            cancelled = true;
        };
    }, []);

    return <div ref={containerRef} className="absolute inset-0" />;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SingleplayerPage({
    authenticated,
    soloGameId,
    player,
    playerId,
}: {
    authenticated: boolean;
    soloGameId: string;
    player: Player | null;
    playerId: string | null;
}) {
    const localStorage = useLocalStorage();
    const [phase, setPhase] = useState<Phase>('loading');
    const [pageVisible, setPageVisible] = useState(false);
    const [blackoutVisible, setBlackoutVisible] = useState(false);
    const [currentRound, setCurrentRound] = useState<RoundData | null>(null);
    const [heading, setHeading] = useState<number | null>(null);
    const [pin, setPin] = useState<LatLng | null>(null);
    const [mapHovered, setMapHovered] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [lastResult, setLastResult] = useState<GuessResult | null>(null);
    const [completedRounds, setCompletedRounds] = useState<CompletedRound[]>(
        [],
    );
    const [reportedLocations, setReportedLocations] = useState<
        Record<string, true>
    >({});
    const [selectedSummaryRound, setSelectedSummaryRound] = useState(1);
    const [summaryPanelHovered, setSummaryPanelHovered] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [highestSingleplayerScore, setHighestSingleplayerScore] = useState(0);

    useEffect(() => {
        const id = requestAnimationFrame(() => setPageVisible(true));
        return () => cancelAnimationFrame(id);
    }, []);

    function getResolvedPlayerId() {
        return player?.id ?? playerId ?? localStorage.get(PLAYER_ID_KEY);
    }

    function getPlayerPayload() {
        if (authenticated) {
            return {};
        }

        const resolvedPlayerId = getResolvedPlayerId();
        return resolvedPlayerId ? { player_id: resolvedPlayerId } : {};
    }

    function applyGameState(gameState: GameState) {
        setCompletedRounds(gameState.completed_rounds);
        setLastResult(null);
        setHighestSingleplayerScore(gameState.highest_singleplayer_score ?? 0);
        setSelectedSummaryRound(
            gameState.completed_rounds.at(-1)?.round_number ?? 1,
        );

        if (gameState.game_complete || !gameState.current_round) {
            setCurrentRound(null);
            setHeading(null);
            setPin(null);
            setSubmitting(false);
            setPhase('complete');
            return;
        }

        applyRound(gameState.current_round);
        setPhase('playing');
    }

    async function loadGame() {
        setPhase('loading');
        setPin(null);
        setCurrentRound(null);
        setBlackoutVisible(false);
        setSummaryPanelHovered(false);
        setLoadError(null);

        try {
            const res = await axios.post<GameState>(
                `/singleplayer/${soloGameId}/round`,
                getPlayerPayload(),
            );
            applyGameState(res.data);
        } catch {
            setLoadError('unable to load solo game');
        }
    }

    useEffect(() => {
        void loadGame();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function applyRound(round: RoundData) {
        setCurrentRound(round);
        setHeading(round.location.heading);
        setPin(null);
        setSubmitting(false);
    }

    async function submitGuess() {
        if (!pin || !currentRound || submitting) return;
        setSubmitting(true);
        setMapHovered(false);
        try {
            const res = await axios.post<GuessResult>(
                `/singleplayer/${soloGameId}/guess`,
                {
                    ...getPlayerPayload(),
                    round_id: currentRound.id,
                    lat: pin.lat,
                    lng: pin.lng,
                },
            );
            const result = res.data;
            setLastResult(result);
            setCompletedRounds((prev) => [
                ...prev,
                {
                    round_number: currentRound.round_number,
                    score: result.score,
                    distance_km: result.distance_km,
                    location: {
                        ...result.location,
                        heading: currentRound.location.heading,
                        image_id: currentRound.location.image_id,
                    },
                    guess: result.guess,
                },
            ]);
            setPhase('result');
        } catch {
            setSubmitting(false);
        }
    }

    function nextRound() {
        if (!lastResult) return;
        if (lastResult.game_complete) {
            setPhase('complete');
        } else if (lastResult.next_round) {
            applyRound(lastResult.next_round);
            setPhase('playing');
        }
    }

    async function reportLocation(reason: LocationReportReason) {
        if (!currentRound || reportedLocations[currentRound.location.id])
            return;
        await axios.post(`/locations/${currentRound.location.id}/report`, {
            reason,
            ...(authenticated ? {} : { player_id: getResolvedPlayerId() }),
        });
        setReportedLocations((prev) => ({
            ...prev,
            [currentRound.location.id]: true,
        }));
    }

    function goHome() {
        setBlackoutVisible(true);
        setTimeout(() => window.location.assign('/'), 500);
    }

    async function playAgain() {
        const resolvedPlayerId = getResolvedPlayerId();

        if (!resolvedPlayerId) {
            setLoadError('unable to start a new solo game');
            return;
        }

        setBlackoutVisible(true);

        try {
            const res = await axios.post<{ game_id: string }>(
                '/singleplayer/games',
                {
                    player_id: resolvedPlayerId,
                },
            );

            setTimeout(() => {
                window.location.assign(`/singleplayer/${res.data.game_id}`);
            }, 500);
        } catch {
            setBlackoutVisible(false);
            setLoadError('unable to start a new solo game');
        }
    }

    // Space to submit
    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            const t = e.target as HTMLElement | null;
            if (
                t &&
                (t.tagName === 'INPUT' ||
                    t.tagName === 'TEXTAREA' ||
                    t.isContentEditable)
            )
                return;
            if (e.code === 'Space' && !e.repeat) {
                e.preventDefault();
                if (phase === 'playing') void submitGuess();
                else if (phase === 'result') nextRound();
                else if (phase === 'complete') void playAgain();
            }
        }
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [
        phase,
        pin,
        currentRound,
        lastResult,
        playerId,
        soloGameId,
        submitting,
    ]);

    const totalScore = completedRounds.reduce((s, r) => s + r.score, 0);
    const bestSingleplayerScore = Math.max(
        highestSingleplayerScore,
        totalScore,
    );
    const summaryPlayerName = player?.name ?? null;
    const summaryUserName = player?.user?.name ?? null;

    return (
        <>
            <Head title="singleplayer — nmpz.dev" />
            <div
                className={`transition-opacity duration-500 ${pageVisible ? 'opacity-100' : 'opacity-0'}`}
            >
                <div className="relative h-screen w-screen overflow-hidden font-mono text-white">
                    {/* Loading */}
                    {phase === 'loading' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black">
                            <span className="text-sm text-white/40">
                                {loadError ?? 'loading…'}
                            </span>
                        </div>
                    )}

                    {/* Playing + result share the location header */}
                    {(phase === 'playing' || phase === 'result') &&
                        currentRound && (
                            <>
                                {/* Background: streetview or result map */}
                                {phase === 'playing' ? (
                                    <MapillaryImagePanel
                                        key={`${currentRound.location.image_id ?? ''}-${currentRound.location.lat},${currentRound.location.lng}`}
                                        location={{
                                            lat: currentRound.location.lat,
                                            lng: currentRound.location.lng,
                                            heading:
                                                currentRound.location.heading,
                                            image_id:
                                                currentRound.location.image_id,
                                        }}
                                        onHeadingChange={setHeading}
                                    />
                                ) : (
                                    lastResult && (
                                        <ResultOverlay
                                            location={lastResult.location}
                                            guess={lastResult.guess}
                                        />
                                    )
                                )}

                                {/* Round + score — top left */}
                                <div className="pointer-events-none absolute top-6 left-8 z-20">
                                    <div className="rounded bg-black/50 px-4 py-3 backdrop-blur-sm">
                                        <div className="text-xs text-white/40">
                                            round{' '}
                                            <span className="text-p1">
                                                {currentRound.round_number}
                                            </span>
                                            <span className="text-white/25">
                                                /{TOTAL_ROUNDS}
                                            </span>
                                        </div>
                                        {completedRounds.length > 0 && (
                                            <div className="mt-0.5 text-xs text-white/50 tabular-nums">
                                                {totalScore.toLocaleString()}{' '}
                                                pts
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Compass */}
                                {phase === 'playing' && heading !== null && (
                                    <StandardCompass heading={heading} />
                                )}

                                {/* Report menu — bottom left, auth only */}
                                {phase === 'playing' && currentRound && (
                                    <div className="absolute bottom-4 left-4 z-20">
                                        <LocationReportMenu
                                            key={currentRound.location.id}
                                            onSubmit={reportLocation}
                                            disabled={
                                                reportedLocations[
                                                    currentRound.location.id
                                                ] === true
                                            }
                                        />
                                    </div>
                                )}

                                {/* Round result panel — bottom left */}
                                {phase === 'result' && lastResult && (
                                    <div className="absolute bottom-6 left-8 z-20">
                                        <div className="rounded border border-p1/20 bg-black/80 px-5 py-4 backdrop-blur-sm">
                                            <div className="mb-3">
                                                <div className="text-4xl font-bold text-p1 tabular-nums">
                                                    {lastResult.score.toLocaleString()}
                                                </div>
                                                <div className="mt-1 text-xs text-white/50">
                                                    {formatDistance(
                                                        lastResult.distance_km,
                                                    )}{' '}
                                                    away
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={nextRound}
                                                className="w-full rounded bg-p1/15 px-4 py-2 text-xs text-p1 transition hover:bg-p1/25"
                                            >
                                                {lastResult.game_complete
                                                    ? 'see summary'
                                                    : 'next round'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Map picker — bottom right, only while guessing */}
                                {phase === 'playing' && (
                                    <div
                                        className={`absolute right-4 bottom-4 z-10 overflow-hidden rounded transition-all duration-150 ${mapHovered ? 'h-[70vh] w-[55vw]' : 'h-40 w-64'}`}
                                        onMouseEnter={() => setMapHovered(true)}
                                        onMouseLeave={() =>
                                            setMapHovered(false)
                                        }
                                    >
                                        <MapPicker
                                            key={currentRound.id}
                                            onPin={(coords) => setPin(coords)}
                                            pinColor={getP1Color()}
                                            disabled={submitting}
                                        />
                                        <div className="absolute right-2 bottom-2 left-2 font-mono">
                                            <button
                                                onClick={() =>
                                                    void submitGuess()
                                                }
                                                disabled={!pin || submitting}
                                                className="w-full rounded bg-black/60 px-2 py-1 text-xs text-white backdrop-blur-sm transition enabled:hover:bg-p1/20 enabled:hover:text-p1 disabled:opacity-30"
                                            >
                                                {submitting
                                                    ? 'submitting…'
                                                    : pin
                                                      ? 'submit guess [space]'
                                                      : 'click map to place pin'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                    {/* Game complete */}
                    {phase === 'complete' && (
                        <div className="absolute inset-0">
                            <SummaryMap
                                rounds={completedRounds}
                                onLocationClick={setSelectedSummaryRound}
                            />
                            <div className="absolute bottom-6 left-8 z-20">
                                <div className="rounded border border-p1/20 bg-black/80 px-5 py-4 backdrop-blur-sm">
                                    {summaryPlayerName && (
                                        <div className="mb-3 text-center text-xs text-p1">
                                            {`> ${summaryPlayerName}`}
                                        </div>
                                    )}
                                    <div className="mb-3 text-center">
                                        <div className="text-4xl font-bold text-p1 tabular-nums">
                                            {totalScore.toLocaleString()}
                                        </div>
                                        <div className="mt-0.5 text-xs text-white/40">
                                            total score
                                        </div>
                                    </div>
                                    <div className="mb-4 text-center text-xs text-white/50">
                                        highschore{' '}
                                        <span className="text-p1 tabular-nums">
                                            {bestSingleplayerScore.toLocaleString()}
                                        </span>
                                    </div>
                                    {summaryUserName &&
                                        summaryUserName !==
                                            summaryPlayerName && (
                                            <div className="mb-4 text-center text-xs text-white/50">
                                                <div>
                                                    account{' '}
                                                    <span className="text-p1">
                                                        {summaryUserName}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    <div className="mb-4 space-y-0.5">
                                        {completedRounds.map((r) => (
                                            <div
                                                key={r.round_number}
                                                className="flex items-center gap-4 text-xs"
                                            >
                                                <span className="text-white/30">
                                                    {r.round_number}
                                                </span>
                                                <span className="text-p1 tabular-nums">
                                                    {r.score.toLocaleString()}
                                                </span>
                                                <span className="text-white/40 tabular-nums">
                                                    {formatDistance(
                                                        r.distance_km,
                                                    )}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => void playAgain()}
                                            className="w-full rounded bg-p1/15 px-4 py-2 text-xs text-p1 transition hover:bg-p1/25"
                                        >
                                            play again [space]
                                        </button>
                                        <button
                                            type="button"
                                            onClick={goHome}
                                            className="w-full rounded px-4 py-2 text-xs text-white/40 transition hover:text-p1"
                                        >
                                            home
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Mapillary panel — bottom right */}
                            {(() => {
                                const sel = completedRounds.find(
                                    (r) =>
                                        r.round_number === selectedSummaryRound,
                                );
                                return sel ? (
                                    <div
                                        className={`absolute right-4 bottom-4 z-10 overflow-hidden rounded transition-all duration-150 ${summaryPanelHovered ? 'h-[70vh] w-[55vw]' : 'h-40 w-64'}`}
                                        onMouseEnter={() =>
                                            setSummaryPanelHovered(true)
                                        }
                                        onMouseLeave={() =>
                                            setSummaryPanelHovered(false)
                                        }
                                    >
                                        <MapillaryImagePanel
                                            key={`${sel.location.image_id ?? ''}-${sel.location.lat},${sel.location.lng}`}
                                            location={{
                                                lat: sel.location.lat,
                                                lng: sel.location.lng,
                                                heading: sel.location.heading,
                                                image_id: sel.location.image_id,
                                            }}
                                        />
                                    </div>
                                ) : null;
                            })()}
                        </div>
                    )}

                    {/* Fade-to-black overlay for navigation */}
                    <div
                        className={`pointer-events-none absolute inset-0 z-50 bg-black transition-opacity duration-500 ${blackoutVisible ? 'opacity-100' : 'opacity-0'}`}
                    />
                </div>
            </div>
        </>
    );
}
