import ChatSidebar from '@/components/welcome/ChatSidebar';
import { CountdownTimer } from '@/components/welcome/CountdownTimer';
import HealthBar from '@/components/welcome/HealthBar';
import RankBadge from '@/components/welcome/RankBadge';
import ReactionBar from '@/components/welcome/ReactionBar';
import SeriesScore from '@/components/welcome/SeriesScore';
import { ANIM_NORMAL, ANIM_SLOW, EASE_STANDARD } from '@/lib/game-constants';
import type { Message } from '@/types/shared';
import type { Rank } from '@/types/player';

type PlayerColour = 'blue' | 'red';

export interface PlayerHudConfig {
    color: string;
    colorDim: string;
    health: number;
    score: number | null;
    barColor: PlayerColour;
    elo: number | undefined;
    rank: Rank | undefined;
}

export interface OpponentHudConfig extends PlayerHudConfig {
    name: string;
}

export default function GameHud({
    me,
    opponent,
    matchFormat,
    isPlayerOne,
    wins,
    roundFinished,
    messages,
    chatOpen,
    chatText,
    onChatTextChange,
    onSendMessage,
    onReact,
    gameOver,
    countdownConfig,
}: {
    me: PlayerHudConfig;
    opponent: OpponentHudConfig;
    matchFormat: string | undefined;
    isPlayerOne: boolean;
    wins: { p1: number; p2: number };
    roundFinished: boolean;
    messages: Message[];
    chatOpen: boolean;
    chatText: string;
    onChatTextChange: (text: string) => void;
    onSendMessage: () => void;
    onReact: (reaction: string) => void;
    gameOver: boolean;
    countdownConfig: { value: number; label: string; valueClass: string } | null;
}) {
    return (
        <>
            {/* Left panel — my score, health/series, chat, reactions */}
            <div className="pointer-events-none absolute top-6 left-8 z-20 flex w-72 flex-col gap-3">
                <div className="rounded bg-black/50 px-4 py-3 backdrop-blur-sm">
                    {roundFinished && me.score !== null && (
                        <div
                            className={`${me.color} mb-3 font-mono text-6xl font-bold tabular-nums`}
                            style={{
                                opacity: 1,
                                transform: 'translateY(0)',
                                transition: `all ${ANIM_SLOW}ms ${EASE_STANDARD} ${ANIM_NORMAL}ms`,
                                animation: `tuiFadeIn ${ANIM_SLOW}ms ${EASE_STANDARD} ${ANIM_NORMAL}ms both`,
                            }}
                        >
                            {me.score?.toLocaleString()}
                        </div>
                    )}
                    <div className={`${me.colorDim} mb-1 flex items-center gap-2 font-mono text-xs`}>
                        <span>You</span>
                        {me.rank && <RankBadge rank={me.rank} elo={me.elo} size="xs" />}
                    </div>
                    {matchFormat && matchFormat !== 'classic' ? (
                        <SeriesScore
                            p1Wins={isPlayerOne ? wins.p1 : wins.p2}
                            p2Wins={isPlayerOne ? wins.p2 : wins.p1}
                            winsNeeded={matchFormat === 'bo3' ? 2 : matchFormat === 'bo5' ? 3 : 4}
                            p1Color={me.color}
                            p2Color={opponent.color}
                        />
                    ) : (
                        <HealthBar health={me.health} color={me.barColor} />
                    )}
                </div>
                <ChatSidebar
                    messages={messages}
                    chatOpen={chatOpen}
                    chatText={chatText}
                    onChatTextChange={onChatTextChange}
                    onSendMessage={onSendMessage}
                />
                <div className="pointer-events-auto rounded bg-black/50 px-2 py-1.5 backdrop-blur-sm">
                    <ReactionBar onReact={onReact} disabled={gameOver} />
                </div>
            </div>

            {/* Countdown timer */}
            {countdownConfig && <CountdownTimer config={countdownConfig} />}

            {/* Right panel — opponent score, health */}
            <div className="pointer-events-none absolute top-6 right-8 z-20 rounded bg-black/50 px-4 py-3 text-right backdrop-blur-sm">
                {roundFinished && opponent.score !== null && (
                    <div
                        className={`${opponent.color} mb-3 font-mono text-6xl font-bold tabular-nums`}
                        style={{
                            opacity: 1,
                            transform: 'translateY(0)',
                            animation: `tuiFadeIn ${ANIM_SLOW}ms ${EASE_STANDARD} ${ANIM_NORMAL}ms both`,
                        }}
                    >
                        {opponent.score?.toLocaleString()}
                    </div>
                )}
                <div className={`${opponent.colorDim} mb-1 flex items-center justify-end gap-2 font-mono text-xs`}>
                    {opponent.rank && <RankBadge rank={opponent.rank} elo={opponent.elo} size="xs" />}
                    <span>{opponent.name}</span>
                </div>
                {matchFormat && matchFormat !== 'classic' ? null : (
                    <HealthBar health={opponent.health} color={opponent.barColor} />
                )}
            </div>
        </>
    );
}
