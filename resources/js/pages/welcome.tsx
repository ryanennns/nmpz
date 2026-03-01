import { Head } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import EventLog from '@/components/game/EventLog';
import GameHud from '@/components/game/GameHud';
import type { OpponentHudConfig, PlayerHudConfig } from '@/components/game/GameHud';
import GuessPanel from '@/components/game/GuessPanel';
import MuteButton from '@/components/game/MuteButton';
import { GameProvider, useGameContext } from '@/components/welcome/GameContext';
import Lobby from '@/components/welcome/Lobby';
import MapillaryImagePanel from '@/components/welcome/MapillaryImagePanel';
import ResultsMap from '@/components/welcome/ResultsMap';
import ShimmerText from '@/components/welcome/ShimmerText';
import AchievementToast from '@/components/welcome/AchievementToast';
import ReactionToast from '@/components/welcome/ReactionToast';
import type { ReactionEvent } from '@/components/welcome/ReactionToast';
import { StandardCompass } from '@/components/welcome/StandardCompass';
import RoundSummaryPanel from '@/components/welcome/RoundSummaryPanel';

import type {
    Game,
    GameEvent,
    GameState,
    RematchState,
    RoundData,
    RoundSummary,
} from '@/types/game';
import type { LatLng, Message } from '@/types/shared';
import type { Player, Rank } from '@/types/player';
import { SoundContext, useSoundContext } from '@/components/welcome/SoundContext';
import { WinnerOverlay } from '@/components/welcome/WinnerOverlay';
import { useApiClient } from '@/hooks/useApiClient';
import { useCountdown } from '@/hooks/useCountdown';
import { useDamageEffect } from '@/hooks/useDamageEffect';
import { useEndSequence } from '@/hooks/useEndSequence';
import { useGameActions } from '@/hooks/useGameActions';
import { useGameChannel } from '@/hooks/useGameChannel';
import { useKeyBindings } from '@/hooks/useKeyBindings';
import { useMatchmakingChannel } from '@/hooks/useMatchmakingChannel';
import { deriveGameState, useRoundState } from '@/hooks/useRoundState';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { ANIM_NORMAL, EASE_STANDARD, MAX_HEALTH, URGENT_COUNTDOWN_THRESHOLD } from '@/lib/game-constants';
import { initGoogleMaps } from '@/lib/google-maps';
import { cn } from '@/lib/utils';

initGoogleMaps();

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
    const [achievementToast, setAchievementToast] = useState<{ name: string; description: string } | null>(null);
    const [wins, setWins] = useState({ p1: game?.player_one_wins ?? 0, p2: game?.player_two_wins ?? 0 });
    const [reactionToasts, setReactionToasts] = useState<ReactionEvent[]>([]);
    const reactionSeqRef = useRef(0);
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
        roundTransitionPhase,
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

    const myLocked = round
        ? isPlayerOne
            ? round.player_one_locked_in
            : round.player_two_locked_in
        : false;

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
        setWins({ p1: 0, p2: 0 });
        endSequence.setWinnerId(null);
        endSequence.setWinnerName(null);
        endSequence.setWinnerOverlayVisible(false);
        endSequence.setPostGameButtonsVisible(false);
    }, [resetRoundState]);

    const actions = useGameActions({
        pin,
        round,
        game,
        myLocked,
        gameOver,
        api,
        setRound,
        setMapHovered,
        playSound,
        chatText,
        setChatText,
        setChatOpen,
        lastGameId,
        rematchState,
        setRematchState,
        endSequence,
        resetGameState,
        playerName,
    });

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
        setAchievementToast,
    );

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
        setWins,
        setPostGameButtonsVisible: endSequence.setPostGameButtonsVisible,
        setWinnerOverlayVisible: endSequence.setWinnerOverlayVisible,
        setPageVisible: endSequence.setPageVisible,
        setBlackoutVisible: endSequence.setBlackoutVisible,
        scheduleEndSequence: endSequence.scheduleEndSequence,
        clearEndSequenceTimers: endSequence.clearEndSequenceTimers,
        onReaction: (data) => {
            const name = data.player_id === game?.player_one.id
                ? game.player_one.user.name
                : data.player_id === game?.player_two.id
                  ? game.player_two.user.name
                  : 'Player';
            setReactionToasts((prev) => [
                ...prev,
                { id: reactionSeqRef.current++, playerName: name, reaction: data.reaction },
            ]);
        },
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

    guessRef.current = actions.guess;

    // --- Derived state ---
    const playerConfig = useMemo(() => game
        ? {
              me: {
                  color: isPlayerOne ? 'text-blue-400' : 'text-red-400',
                  colorDim: isPlayerOne ? 'text-blue-400/60' : 'text-red-400/60',
                  health: isPlayerOne ? health.p1 : health.p2,
                  score: isPlayerOne ? roundScores.p1 : roundScores.p2,
                  barColor: (isPlayerOne ? 'blue' : 'red') as 'blue' | 'red',
                  elo: isPlayerOne ? game.player_one.elo_rating : game.player_two.elo_rating,
                  rank: (isPlayerOne ? game.player_one.rank : game.player_two.rank) as Rank | undefined,
              } satisfies PlayerHudConfig,
              opponent: {
                  color: isPlayerOne ? 'text-red-400' : 'text-blue-400',
                  colorDim: isPlayerOne ? 'text-red-400/60' : 'text-blue-400/60',
                  health: isPlayerOne ? health.p2 : health.p1,
                  score: isPlayerOne ? roundScores.p2 : roundScores.p1,
                  barColor: (isPlayerOne ? 'red' : 'blue') as 'blue' | 'red',
                  name: isPlayerOne ? game.player_two.user.name : game.player_one.user.name,
                  elo: isPlayerOne ? game.player_two.elo_rating : game.player_one.elo_rating,
                  rank: (isPlayerOne ? game.player_two.rank : game.player_one.rank) as Rank | undefined,
              } satisfies OpponentHudConfig,
          }
        : null, [game, isPlayerOne, health.p1, health.p2, roundScores.p1, roundScores.p2]);

    const gameState = round
        ? deriveGameState(round, gameOver, roundFinished)
        : 'waiting';

    const roundSummary: RoundSummary | null = useMemo(() =>
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
            : null, [roundFinished, roundScores.p1, roundScores.p2, roundDistances.p1, roundDistances.p2, isPlayerOne, health.p1, health.p2]);

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

                        {/* Panorama layer */}
                        {location && (
                            <div
                                className="absolute inset-0"
                                style={{
                                    opacity: roundFinished ? 0 : 1,
                                    transition: `opacity ${ANIM_NORMAL}ms ${EASE_STANDARD}`,
                                    zIndex: roundFinished ? 0 : 1,
                                }}
                            >
                                <MapillaryImagePanel
                                    key={`${location.lat},${location.lng}`}
                                    location={location}
                                    onHeadingChange={setHeading}
                                />
                            </div>
                        )}

                        {/* Results layer */}
                        {roundFinished && roundResult && (
                            <div
                                className="results-enter absolute inset-0"
                                style={{
                                    opacity: roundTransitionPhase === 'results-out' ? 0 : 1,
                                    transition: `opacity ${ANIM_NORMAL}ms ${EASE_STANDARD}`,
                                    zIndex: 2,
                                }}
                            >
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
                            </div>
                        )}

                        {/* Waiting state */}
                        {!location && !roundFinished && (
                            <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 text-sm text-neutral-500">
                                <ShimmerText>Waiting for round to start</ShimmerText>
                            </div>
                        )}

                        {/* HUD — player scores, health, chat, reactions */}
                        {playerConfig && (
                            <GameHud
                                me={playerConfig.me}
                                opponent={playerConfig.opponent}
                                matchFormat={game.match_format}
                                isPlayerOne={isPlayerOne}
                                wins={wins}
                                roundFinished={roundFinished}
                                messages={messages}
                                chatOpen={chatOpen}
                                chatText={chatText}
                                onChatTextChange={setChatText}
                                onSendMessage={() => void actions.sendMessage()}
                                onReact={(r) => void api.sendReaction(r)}
                                gameOver={gameOver}
                                countdownConfig={countdownConfig}
                            />
                        )}

                        {/* Event log */}
                        <EventLog
                            events={events}
                            roundNumber={round?.round_number ?? null}
                            gameState={gameState}
                            stateLabel={stateLabel}
                        />

                        {/* Compass */}
                        {location && heading && (
                            <StandardCompass heading={heading} />
                        )}

                        {/* Guess panel — map picker + lock-in */}
                        {round && !roundFinished && (
                            <GuessPanel
                                roundId={round.id}
                                myLocked={myLocked}
                                gameOver={gameOver}
                                mapHovered={mapHovered}
                                onMapHover={setMapHovered}
                                onPin={(coords) => {
                                    setPin(coords);
                                    void actions.updateGuess(coords);
                                }}
                                onGuess={actions.guess}
                                pin={pin}
                                pinColor={isPlayerOne ? '#60a5fa' : '#f87171'}
                                opponentLiveGuess={opponentLiveGuess}
                            />
                        )}

                        <MuteButton muted={muted} onToggle={() => setMuted(!muted)} />

                        {reactionToasts.length > 0 && (
                            <div className="pointer-events-none absolute top-1/2 left-8 z-30 flex -translate-y-1/2 flex-col items-start gap-1.5">
                                {reactionToasts.slice(-3).map((rt) => (
                                    <ReactionToast
                                        key={rt.id}
                                        event={rt}
                                        onDone={() =>
                                            setReactionToasts((prev) =>
                                                prev.filter((e) => e.id !== rt.id),
                                            )
                                        }
                                    />
                                ))}
                            </div>
                        )}

                        <div
                            className={`pointer-events-none absolute inset-0 z-40 bg-black ${endSequence.blackoutVisible ? 'opacity-100' : 'opacity-0'}`}
                            style={{ transition: `opacity 800ms ${EASE_STANDARD}` }}
                        />
                        <WinnerOverlay
                            visible={endSequence.winnerOverlayVisible}
                            winnerId={endSequence.winnerId}
                            id={player.id}
                            winnerName={endSequence.winnerName}
                            postGameButtonsVisible={endSequence.postGameButtonsVisible}
                            rematchState={rematchState}
                            ratingChange={ratingChange}
                            onRematch={actions.handleRematch}
                            onRequeue={actions.handleRequeue}
                            onExit={actions.handleExit}
                            onAcceptRematch={actions.handleRematch}
                            onDeclineRematch={actions.handleDeclineRematch}
                        />
                    </div>
                )}
            </div>
            {achievementToast && (
                <AchievementToast
                    key={achievementToast.name}
                    name={achievementToast.name}
                    description={achievementToast.description}
                    onDone={() => setAchievementToast(null)}
                />
            )}
        </>
    );
}
