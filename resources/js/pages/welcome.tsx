import { setOptions } from '@googlemaps/js-api-loader';
import { Head } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import ChatSidebar from '@/components/welcome/ChatSidebar';
import { CountdownTimer } from '@/components/welcome/CountdownTimer';
import { GameProvider, useGameContext } from '@/components/welcome/GameContext';
import HealthBar from '@/components/welcome/HealthBar';
import Lobby from '@/components/welcome/Lobby';
import MapillaryImagePanel from '@/components/welcome/MapillaryImagePanel';
import MapPicker from '@/components/welcome/MapPicker';
import ResultsMap from '@/components/welcome/ResultsMap';
import ShimmerText from '@/components/welcome/ShimmerText';
import SpectatorMap from '@/components/welcome/SpectatorMap';
import { StandardCompass } from '@/components/welcome/StandardCompass';

import RankBadge from '@/components/welcome/RankBadge';
import RoundSummaryPanel from '@/components/welcome/RoundSummaryPanel';

import type {
    Game,
    GameEvent,
    GameState,
    LatLng,
    Message,
    Player,
    Rank,
    RematchState,
    Round,
    RoundData,
    RoundSummary,
} from '@/components/welcome/types';
import { SoundContext, useSoundContext } from '@/components/welcome/SoundContext';
import { WinnerOverlay } from '@/components/welcome/WinnerOverlay';
import { useApiClient } from '@/hooks/useApiClient';
import { useCountdown } from '@/hooks/useCountdown';
import { useDamageEffect } from '@/hooks/useDamageEffect';
import { useEndSequence } from '@/hooks/useEndSequence';
import { useGameChannel } from '@/hooks/useGameChannel';
import { useKeyBindings } from '@/hooks/useKeyBindings';
import { useMatchmakingChannel } from '@/hooks/useMatchmakingChannel';
import { deriveGameState, useRoundState } from '@/hooks/useRoundState';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { MAX_HEALTH, URGENT_COUNTDOWN_THRESHOLD } from '@/lib/game-constants';
import { cn } from '@/lib/utils';

setOptions({
    key: import.meta.env.VITE_GOOGLE_MAPS_KEY as string,
    v: 'weekly',
});

const panel = 'rounded border border-white/10 bg-black/60 p-3 backdrop-blur-sm';

export default function Welcome({
    player,
    game: initialGame,
    queue_count: initialQueueCount,
    round_data: initialRoundData,
}: {
    player: Player;
    game: Game | null;
    queue_count: number;
    round_data?: RoundData | null;
}) {
    const soundEffects = useSoundEffects();

    return (
        <SoundContext.Provider value={soundEffects}>
            <GameProvider initialGame={initialGame}>
                <WelcomePage
                    player={player}
                    queue_count={initialQueueCount}
                    round_data={initialRoundData}
                />
            </GameProvider>
        </SoundContext.Provider>
    );
}

function WelcomePage({
    player,
    queue_count: initialQueueCount,
    round_data: initialRoundData,
}: {
    player: Player;
    queue_count: number;
    round_data?: RoundData | null;
}) {
    const { game, setGame } = useGameContext();
    const { play: playSound, muted, setMuted } = useSoundContext();
    const [playerName, setPlayerName] = useState<string | null>(
        player.name ?? null,
    );
    const [health, setHealth] = useState({
        p1: game?.player_one_health ?? MAX_HEALTH,
        p2: game?.player_two_health ?? MAX_HEALTH,
    });
    const [gameOver, setGameOver] = useState(false);
    const [events, setEvents] = useState<GameEvent[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [rematchState, setRematchState] = useState<RematchState>('none');
    const [lastGameId, setLastGameId] = useState<string | null>(null);
    const [ratingChange, setRatingChange] = useState<{ my: number | null; opponent: number | null }>({ my: null, opponent: null });
    const [chatOpen, setChatOpen] = useState(false);
    const [chatText, setChatText] = useState('');
    const [mapHovered, setMapHovered] = useState(false);
    const guessRef = useRef<() => void>(() => {});
    const lastRememberedGameId = useRef<string | null>(null);
    const api = useApiClient(player.id);

    // --- Hooks ---
    const { countdown, setCountdown, urgentCountdown, setUrgentCountdown } =
        useCountdown(playSound);

    const endSequence = useEndSequence();

    const roundState = useRoundState({
        countdown,
        setCountdown,
        setUrgentCountdown,
        setHealth,
    });
    const {
        round, setRound,
        location, setLocation,
        heading, setHeading,
        pin, setPin,
        roundFinished, setRoundFinished,
        roundResult, setRoundResult,
        roundScores, setRoundScores,
        roundDistances, setRoundDistances,
        setPendingRoundData,
        opponentLiveGuess, setOpponentLiveGuess,
        roundStartedAtRef,
        applyRoundData,
        resetRoundState,
    } = roundState;

    const isPlayerOne = game ? player.id === game.player_one.id : false;
    const myHealth = isPlayerOne ? health.p1 : health.p2;
    const { myDamageKey, gameContainerRef } = useDamageEffect(
        myHealth,
        !!game,
        playSound,
    );

    useKeyBindings(
        !!location,
        chatOpen,
        setChatOpen,
        setChatText,
        guessRef,
    );

    useMatchmakingChannel(
        game?.id ?? null,
        player.id,
        setGame,
        setHealth,
        endSequence.setPageVisible,
        endSequence.clearEndSequenceTimers,
        endSequence.setBlackoutVisible,
        endSequence.setWinnerOverlayVisible,
        playSound,
    );

    const resetGameState = useCallback(() => {
        setGame(null);
        resetRoundState();
        setHealth({ p1: MAX_HEALTH, p2: MAX_HEALTH });
        setGameOver(false);
        setEvents([]);
        setMessages([]);
        setCountdown(null);
        setUrgentCountdown(null);
        setMapHovered(false);
        setChatOpen(false);
        setChatText('');
        setRematchState('none');
        setRatingChange({ my: null, opponent: null });
        endSequence.setWinnerId(null);
        endSequence.setWinnerName(null);
        endSequence.setWinnerOverlayVisible(false);
        endSequence.setPostGameButtonsVisible(false);
    }, [resetRoundState]);

    useGameChannel({
        game,
        setGame,
        setRound,
        setRoundFinished,
        setCountdown,
        setUrgentCountdown,
        setRoundScores,
        setRoundDistances,
        setHealth,
        setRoundResult,
        setPendingRoundData,
        setEvents,
        setMessages,
        setGameOver,
        setWinnerId: endSequence.setWinnerId,
        setWinnerName: endSequence.setWinnerName,
        setRematchState,
        setOpponentLiveGuess,
        setRatingChange,
        setPostGameButtonsVisible: endSequence.setPostGameButtonsVisible,
        setWinnerOverlayVisible: endSequence.setWinnerOverlayVisible,
        setPageVisible: endSequence.setPageVisible,
        setBlackoutVisible: endSequence.setBlackoutVisible,
        scheduleEndSequence: endSequence.scheduleEndSequence,
        clearEndSequenceTimers: endSequence.clearEndSequenceTimers,
        resetGameState,
        roundStartedAtRef,
        playerId: player.id,
        playSound,
    });

    // Apply initial round data on mount
    useEffect(() => {
        if (!initialRoundData) return;
        setCountdown(null);
        applyRoundData(initialRoundData);
    }, []);

    // Remember ongoing game in session
    useEffect(() => {
        if (!game) {
            if (lastRememberedGameId.current) {
                void api
                    .rememberGame(false, lastRememberedGameId.current)
                    .catch(() => {});
                lastRememberedGameId.current = null;
            }
            return;
        }

        if (lastRememberedGameId.current === game.id) return;

        lastRememberedGameId.current = game.id;
        void api.rememberGame(true).catch(() => {});
    }, [game?.id, player.id]);

    // Track lastGameId for rematch
    useEffect(() => {
        if (game && gameOver) {
            setLastGameId(game.id);
        }
    }, [game?.id, gameOver]);

    // --- Actions ---
    const myLocked = round
        ? isPlayerOne
            ? round.player_one_locked_in
            : round.player_two_locked_in
        : false;

    async function guess() {
        if (!pin || !round || !game || myLocked || gameOver) return;
        setMapHovered(false);
        playSound('lock-in');
        const res = await api.guess(round.id, pin, true);
        if (res?.data) setRound(res.data as Round);
    }

    async function updateGuess(coords: LatLng) {
        if (!round || !game || myLocked || gameOver) return;
        const res = await api.guess(round.id, coords, false);
        if (res?.data) setRound(res.data as Round);
    }

    async function sendMessage() {
        if (!game || !chatText.trim()) return;
        const res = await api.sendMessage(chatText.trim());
        if (res) {
            setChatText('');
            setChatOpen(false);
        }
    }

    guessRef.current = guess;

    function handleRematch() {
        const gid = lastGameId ?? game?.id;
        if (!gid) return;
        void api.requestRematch(gid);
        setRematchState('sent');
    }

    function handleRequeue() {
        endSequence.dismissEndSequence(resetGameState);
        void api.joinQueue(playerName ?? undefined);
    }

    function handleExit() {
        if (rematchState === 'received') {
            const gid = lastGameId ?? game?.id;
            if (gid) void api.declineRematch(gid);
        }
        endSequence.dismissEndSequence(resetGameState);
    }

    function handleDeclineRematch() {
        const gid = lastGameId ?? game?.id;
        if (!gid) return;
        void api.declineRematch(gid);
        setRematchState('declined');
    }

    // --- Derived state ---
    type PlayerColour = 'blue' | 'red';
    const playerConfig = game
        ? {
              me: {
                  color: isPlayerOne ? 'text-blue-400' : 'text-red-400',
                  colorDim: isPlayerOne
                      ? 'text-blue-400/60'
                      : 'text-red-400/60',
                  health: isPlayerOne ? health.p1 : health.p2,
                  score: isPlayerOne ? roundScores.p1 : roundScores.p2,
                  barColor: isPlayerOne ? 'blue' : ('red' as PlayerColour),
                  elo: isPlayerOne ? game.player_one.elo_rating : game.player_two.elo_rating,
                  rank: (isPlayerOne ? game.player_one.rank : game.player_two.rank) as Rank | undefined,
              },
              opponent: {
                  color: isPlayerOne ? 'text-red-400' : 'text-blue-400',
                  colorDim: isPlayerOne
                      ? 'text-red-400/60'
                      : 'text-blue-400/60',
                  health: isPlayerOne ? health.p2 : health.p1,
                  score: isPlayerOne ? roundScores.p2 : roundScores.p1,
                  barColor: isPlayerOne ? 'red' : ('blue' as PlayerColour),
                  name: isPlayerOne
                      ? game.player_two.user.name
                      : game.player_one.user.name,
                  elo: isPlayerOne ? game.player_two.elo_rating : game.player_one.elo_rating,
                  rank: (isPlayerOne ? game.player_two.rank : game.player_one.rank) as Rank | undefined,
              },
          }
        : null;

    const gameState = round
        ? deriveGameState(round, gameOver, roundFinished)
        : 'waiting';

    const roundSummary: RoundSummary | null =
        roundFinished && roundScores.p1 !== null && roundScores.p2 !== null
            ? (() => {
                  const myScore = isPlayerOne ? roundScores.p1! : roundScores.p2!;
                  const opponentScore = isPlayerOne ? roundScores.p2! : roundScores.p1!;
                  const damage = Math.abs(myScore - opponentScore);
                  return {
                      myScore,
                      opponentScore,
                      myDistanceKm: isPlayerOne ? roundDistances.p1 : roundDistances.p2,
                      opponentDistanceKm: isPlayerOne ? roundDistances.p2 : roundDistances.p1,
                      myDamage: myScore > opponentScore ? damage : 0,
                      opponentDamage: opponentScore > myScore ? damage : 0,
                      myHealth: isPlayerOne ? health.p1 : health.p2,
                      opponentHealth: isPlayerOne ? health.p2 : health.p1,
                  };
              })()
            : null;

    const hasRoundCountdown = roundFinished && countdown !== null;
    const hasUrgentCountdown =
        (gameState === 'one_guessed' || gameState === 'waiting') &&
        urgentCountdown !== null;
    const countdownConfig = hasRoundCountdown
        ? {
              value: countdown as number,
              label: 'next round',
              valueClass: 'text-white',
          }
        : hasUrgentCountdown
          ? {
                value: urgentCountdown as number,
                label:
                    gameState === 'waiting'
                        ? 'time to guess'
                        : myLocked
                          ? 'waiting for opponent'
                          : 'time to guess',
                valueClass: cn({
                    'text-red-400': (urgentCountdown as number) <= URGENT_COUNTDOWN_THRESHOLD,
                    'text-amber-400': (urgentCountdown as number) > URGENT_COUNTDOWN_THRESHOLD,
                }),
            }
          : null;

    const stateLabel: Record<GameState, ReactNode> = {
        waiting:
            urgentCountdown !== null ? (
                `${urgentCountdown}s to guess`
            ) : (
                <ShimmerText>Waiting for guesses</ShimmerText>
            ),
        one_guessed:
            urgentCountdown !== null ? (
                `${urgentCountdown}s to guess`
            ) : (
                <ShimmerText>waiting for opponent</ShimmerText>
            ),
        finished:
            countdown !== null
                ? `Next round in ${countdown}s`
                : 'Round finished',
        game_over: 'Game over',
    };

    // --- Render ---
    return (
        <>
            <Head title="nmpz.dev" />
            <div
                className={`transition-opacity duration-500 ${endSequence.pageVisible ? 'opacity-100' : 'opacity-0'}`}
            >
                {!game ? (
                    <Lobby
                        player={player}
                        initialQueueCount={initialQueueCount}
                        playerName={playerName}
                        onNameChange={setPlayerName}
                    />
                ) : (
                    <div
                        ref={gameContainerRef}
                        className="relative h-screen w-screen overflow-hidden font-mono text-white"
                    >
                        {urgentCountdown !== null && urgentCountdown <= URGENT_COUNTDOWN_THRESHOLD && (
                            <div className="urgent-screen-halo pointer-events-none absolute inset-0 z-10" />
                        )}
                        {myDamageKey > 0 && (
                            <div
                                key={myDamageKey}
                                className="damage-vignette pointer-events-none absolute inset-0 z-30"
                            />
                        )}
                        {roundFinished && roundResult ? (
                            <>
                                <ResultsMap
                                    key={`result-${round?.id ?? 'pending'}`}
                                    result={roundResult}
                                />
                                {roundSummary && playerConfig && (
                                    <RoundSummaryPanel
                                        summary={roundSummary}
                                        myColor={playerConfig.me.color}
                                        opponentColor={playerConfig.opponent.color}
                                        opponentName={playerConfig.opponent.name}
                                    />
                                )}
                            </>
                        ) : location ? (
                            <MapillaryImagePanel
                                key={`${location.lat},${location.lng}`}
                                location={location}
                                onHeadingChange={setHeading}
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 text-sm text-neutral-500">
                                <ShimmerText>
                                    Waiting for round to start
                                </ShimmerText>
                            </div>
                        )}

                        {(() => {
                            const { me, opponent } = playerConfig ?? {};
                            return (
                                <>
                                    <div className="pointer-events-none absolute top-6 left-8 z-20 flex w-72 flex-col gap-3">
                                        <div className="rounded bg-black/50 px-4 py-3 backdrop-blur-sm">
                                            {roundFinished &&
                                                me?.score !== null && (
                                                    <div
                                                        className={`${me?.color} mb-3 font-mono text-6xl font-bold tabular-nums`}
                                                    >
                                                        {me?.score?.toLocaleString()}
                                                    </div>
                                                )}
                                            <div
                                                className={`${me?.colorDim} mb-1 flex items-center gap-2 font-mono text-xs`}
                                            >
                                                <span>You</span>
                                                {me?.rank && <RankBadge rank={me.rank} elo={me.elo} size="xs" />}
                                            </div>
                                            <HealthBar
                                                health={me?.health ?? 0}
                                                color={me?.barColor ?? 'blue'}
                                            />
                                        </div>
                                        <ChatSidebar
                                            messages={messages}
                                            chatOpen={chatOpen}
                                            chatText={chatText}
                                            onChatTextChange={setChatText}
                                            onSendMessage={() =>
                                                void sendMessage()
                                            }
                                        />
                                    </div>
                                    {countdownConfig && (
                                        <CountdownTimer
                                            config={countdownConfig}
                                        />
                                    )}
                                    <div className="pointer-events-none absolute top-6 right-8 z-20 rounded bg-black/50 px-4 py-3 text-right backdrop-blur-sm">
                                        {roundFinished &&
                                            opponent?.score !== null && (
                                                <div
                                                    className={`${opponent?.color} mb-3 font-mono text-6xl font-bold tabular-nums`}
                                                >
                                                    {opponent?.score?.toLocaleString()}
                                                </div>
                                            )}
                                        <div
                                            className={`${opponent?.colorDim} mb-1 flex items-center justify-end gap-2 font-mono text-xs`}
                                        >
                                            {opponent?.rank && <RankBadge rank={opponent.rank} elo={opponent.elo} size="xs" />}
                                            <span>{opponent?.name}</span>
                                        </div>
                                        <HealthBar
                                            health={opponent?.health ?? 0}
                                            color={opponent?.barColor ?? 'red'}
                                        />
                                    </div>
                                </>
                            );
                        })()}

                        <div
                            className={`absolute bottom-4 left-4 z-10 w-80 space-y-2 text-xs ${panel}`}
                        >
                            {round && (
                                <>
                                    <div className="flex justify-between text-xs opacity-70">
                                        <span>Round {round.round_number}</span>
                                        <span>{stateLabel[gameState]}</span>
                                    </div>
                                    {events.length > 0 && (
                                        <div className="border-t border-white/10" />
                                    )}
                                </>
                            )}
                            {events.length === 0 ? (
                                <p className="opacity-30">no events yet</p>
                            ) : (
                                events.map((e) => (
                                    <div
                                        key={e.id}
                                        className="flex gap-2 opacity-40"
                                    >
                                        <span>{e.ts}</span>
                                        <span className="truncate text-white/70">
                                            {e.name}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>

                        {location && heading && (
                            <StandardCompass heading={heading} />
                        )}

                        {round && !roundFinished && (
                            <div
                                className={`absolute right-4 bottom-4 z-10 overflow-hidden rounded transition-all duration-150 ${mapHovered ? 'h-[70vh] w-[55vw]' : 'h-40 w-64'}`}
                                onMouseEnter={() => setMapHovered(true)}
                                onMouseLeave={() => setMapHovered(false)}
                            >
                                {myLocked && !gameOver ? (
                                    <SpectatorMap
                                        key={`spectator-${round.id}`}
                                        opponentGuess={opponentLiveGuess}
                                    />
                                ) : (
                                    <>
                                        <MapPicker
                                            key={round.id}
                                            onPin={(coords) => {
                                                setPin(coords);
                                                void updateGuess(coords);
                                            }}
                                            pinColor={
                                                isPlayerOne ? '#60a5fa' : '#f87171'
                                            }
                                            disabled={myLocked || gameOver}
                                        />
                                        <div className="absolute right-2 bottom-2 left-2 font-mono">
                                            <button
                                                onClick={guess}
                                                disabled={!pin || myLocked || gameOver}
                                                className="w-full rounded bg-black/60 px-2 py-1 text-xs text-white backdrop-blur-sm enabled:hover:bg-black/80 disabled:opacity-30"
                                            >
                                                {pin
                                                    ? 'Lock in guess [space]'
                                                    : 'Click map to place pin'}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={() => setMuted(!muted)}
                            className="absolute top-2 left-2 z-20 flex h-7 w-7 items-center justify-center rounded bg-black/50 text-white/40 backdrop-blur-sm transition hover:text-white/80"
                            title={muted ? 'Unmute' : 'Mute'}
                        >
                            {muted ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                            )}
                        </button>

                        <div
                            className={`pointer-events-none absolute inset-0 z-40 bg-black transition-opacity duration-500 ${endSequence.blackoutVisible ? 'opacity-100' : 'opacity-0'}`}
                        />
                        <WinnerOverlay
                            visible={endSequence.winnerOverlayVisible}
                            winnerId={endSequence.winnerId}
                            id={player.id}
                            winnerName={endSequence.winnerName}
                            postGameButtonsVisible={endSequence.postGameButtonsVisible}
                            rematchState={rematchState}
                            ratingChange={ratingChange}
                            onRematch={handleRematch}
                            onRequeue={handleRequeue}
                            onExit={handleExit}
                            onAcceptRematch={handleRematch}
                            onDeclineRematch={handleDeclineRematch}
                        />
                    </div>
                )}
            </div>
        </>
    );
}
