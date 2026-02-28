import { setOptions } from '@googlemaps/js-api-loader';
import { Head } from '@inertiajs/react';
import { useState } from 'react';
import HealthBar from '@/components/welcome/HealthBar';
import RankBadge from '@/components/welcome/RankBadge';
import ResultsMap from '@/components/welcome/ResultsMap';
import SeriesScore from '@/components/welcome/SeriesScore';
import ShimmerText from '@/components/welcome/ShimmerText';
import type {
    Game,
    GameDetailRound,
    Message,
    Rank,
    RoundResult,
} from '@/components/welcome/types';
import { useSpectatorChannel } from '@/hooks/useSpectatorChannel';
import { MAX_HEALTH } from '@/lib/game-constants';

setOptions({
    key: import.meta.env.VITE_GOOGLE_MAPS_KEY as string,
    v: 'weekly',
});

export default function Spectate({
    game,
    completed_rounds: initialCompletedRounds,
    current_round_number: initialRoundNumber,
}: {
    game: Game;
    completed_rounds: GameDetailRound[];
    current_round_number: number | null;
}) {
    const [health, setHealth] = useState({
        p1: game.player_one_health,
        p2: game.player_two_health,
    });
    const [roundFinished, setRoundFinished] = useState(false);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [roundScores, setRoundScores] = useState<{ p1: number | null; p2: number | null }>({
        p1: null,
        p2: null,
    });
    const [roundDistances, setRoundDistances] = useState<{ p1: number | null; p2: number | null }>({
        p1: null,
        p2: null,
    });
    const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
    const [currentRoundNumber, setCurrentRoundNumber] = useState<number | null>(
        initialRoundNumber,
    );
    const [messages, setMessages] = useState<Message[]>([]);
    const [gameOver, setGameOver] = useState(false);
    const [winnerId, setWinnerId] = useState<string | null>(null);
    const [winnerName, setWinnerName] = useState<string | null>(null);
    const [playerOneLocked, setPlayerOneLocked] = useState(false);
    const [playerTwoLocked, setPlayerTwoLocked] = useState(false);
    const [wins, setWins] = useState({
        p1: game.player_one_wins ?? 0,
        p2: game.player_two_wins ?? 0,
    });
    const [completedRounds] = useState(initialCompletedRounds);

    useSpectatorChannel({
        gameId: game.id,
        playerOneName: game.player_one.user.name,
        playerTwoName: game.player_two.user.name,
        playerOneId: game.player_one.id,
        playerTwoId: game.player_two.id,
        setRoundFinished,
        setCountdown,
        setRoundScores,
        setRoundDistances,
        setHealth,
        setRoundResult,
        setCurrentRoundNumber,
        setMessages,
        setGameOver,
        setWinnerId,
        setWinnerName,
        setPlayerOneLocked,
        setPlayerTwoLocked,
        setWins,
    });

    const isBo = game.match_format && game.match_format !== 'classic';
    const p1Rank = game.player_one.rank as Rank | undefined;
    const p2Rank = game.player_two.rank as Rank | undefined;

    return (
        <>
            <Head title={`Spectating - ${game.player_one.user.name} vs ${game.player_two.user.name}`} />
            <div className="relative flex h-screen flex-col bg-neutral-900 font-mono text-sm text-white">
                {/* Top bar: player info */}
                <div className="flex items-center justify-between border-b border-white/10 bg-black/60 px-6 py-3 backdrop-blur-sm">
                    <div className="flex flex-col items-start gap-1">
                        <div className="flex items-center gap-2">
                            <span className="text-blue-400 font-semibold">{game.player_one.user.name}</span>
                            {p1Rank && <RankBadge rank={p1Rank} elo={game.player_one.elo_rating} size="xs" />}
                        </div>
                        {isBo ? null : (
                            <HealthBar health={health.p1} color="blue" />
                        )}
                    </div>

                    <div className="flex flex-col items-center gap-1">
                        {isBo ? (
                            <SeriesScore
                                p1Wins={wins.p1}
                                p2Wins={wins.p2}
                                winsNeeded={game.match_format === 'bo3' ? 2 : game.match_format === 'bo5' ? 3 : 4}
                            />
                        ) : (
                            <span className="text-white/30 text-xs">VS</span>
                        )}
                        <div className="text-[10px] text-white/30">
                            {gameOver
                                ? 'Game Over'
                                : currentRoundNumber
                                  ? `Round ${currentRoundNumber}`
                                  : 'Starting...'}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-green-400/60">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400/60" />
                            SPECTATING
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                            {p2Rank && <RankBadge rank={p2Rank} elo={game.player_two.elo_rating} size="xs" />}
                            <span className="text-red-400 font-semibold">{game.player_two.user.name}</span>
                        </div>
                        {isBo ? null : (
                            <HealthBar health={health.p2} color="red" />
                        )}
                    </div>
                </div>

                {/* Main content */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Center: round status */}
                    <div className="flex flex-1 flex-col items-center justify-center">
                        {gameOver ? (
                            <div className="flex flex-col items-center gap-4">
                                <div className="text-3xl font-bold text-white/80">Game Over</div>
                                {winnerName ? (
                                    <div className="text-lg text-white/60">
                                        <span className="text-white font-semibold">{winnerName}</span> wins!
                                    </div>
                                ) : (
                                    <div className="text-lg text-white/60">Draw</div>
                                )}
                                <a
                                    href="/"
                                    className="mt-4 rounded bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/20"
                                >
                                    Back to Lobby
                                </a>
                            </div>
                        ) : roundFinished && roundResult ? (
                            <div className="relative h-full w-full">
                                <ResultsMap result={roundResult} />
                                {roundScores.p1 !== null && roundScores.p2 !== null && (
                                    <div className="absolute top-4 left-1/2 z-10 flex -translate-x-1/2 gap-8 rounded bg-black/70 px-6 py-3 backdrop-blur-sm">
                                        <div className="flex flex-col items-center">
                                            <span className="text-[10px] text-blue-400/60">{game.player_one.user.name}</span>
                                            <span className="text-2xl font-bold text-blue-400">{roundScores.p1.toLocaleString()}</span>
                                            {roundDistances.p1 !== null && (
                                                <span className="text-[10px] text-white/30">{roundDistances.p1.toFixed(1)} km</span>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <span className="text-[10px] text-red-400/60">{game.player_two.user.name}</span>
                                            <span className="text-2xl font-bold text-red-400">{roundScores.p2.toLocaleString()}</span>
                                            {roundDistances.p2 !== null && (
                                                <span className="text-[10px] text-white/30">{roundDistances.p2.toFixed(1)} km</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {countdown !== null && (
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded bg-black/60 px-3 py-1 text-xs text-white/60 backdrop-blur-sm">
                                        Next round in {countdown}s
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-4">
                                <ShimmerText>
                                    {currentRoundNumber
                                        ? `Round ${currentRoundNumber} in progress`
                                        : 'Waiting for round to start'}
                                </ShimmerText>
                                <div className="flex gap-6 text-xs text-white/40">
                                    <div className="flex items-center gap-1">
                                        <span className={`inline-block h-2 w-2 rounded-full ${playerOneLocked ? 'bg-blue-400' : 'bg-white/10'}`} />
                                        <span className="text-blue-400/60">{game.player_one.user.name}</span>
                                        <span>{playerOneLocked ? 'locked in' : 'guessing...'}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className={`inline-block h-2 w-2 rounded-full ${playerTwoLocked ? 'bg-red-400' : 'bg-white/10'}`} />
                                        <span className="text-red-400/60">{game.player_two.user.name}</span>
                                        <span>{playerTwoLocked ? 'locked in' : 'guessing...'}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right sidebar: completed rounds + chat */}
                    <div className="flex w-72 flex-col border-l border-white/10 bg-black/40">
                        <div className="flex-1 overflow-y-auto p-3">
                            <div className="mb-2 text-[10px] font-semibold uppercase text-white/30">Completed Rounds</div>
                            {completedRounds.length === 0 ? (
                                <div className="text-xs text-white/20">No rounds completed yet</div>
                            ) : (
                                <div className="space-y-2">
                                    {completedRounds.map((r) => (
                                        <div key={r.round_number} className="rounded bg-white/5 px-2 py-1.5 text-[10px]">
                                            <div className="mb-1 text-white/40">Round {r.round_number}</div>
                                            <div className="flex justify-between">
                                                <span className="text-blue-400">{r.player_one_score}</span>
                                                <span className="text-white/20">-</span>
                                                <span className="text-red-400">{r.player_two_score}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Chat messages */}
                        <div className="border-t border-white/10 p-3">
                            <div className="mb-1 text-[10px] font-semibold uppercase text-white/30">Chat</div>
                            <div className="max-h-32 overflow-y-auto">
                                {messages.length === 0 ? (
                                    <div className="text-[10px] text-white/20">No messages</div>
                                ) : (
                                    messages.map((m) => (
                                        <div key={m.id} className="text-[10px] text-white/60">
                                            <span className="text-white/40">{m.ts}</span>{' '}
                                            <span className="text-white/80">{m.name}:</span>{' '}
                                            {m.text}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
