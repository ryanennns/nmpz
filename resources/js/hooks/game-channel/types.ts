import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type {
    Game,
    GameEvent,
    GameReactionData,
    RematchState,
    Round,
    RoundData,
    RoundResult,
} from '@/types/game';
import type { Message } from '@/types/shared';
import type { SoundName } from '@/hooks/useSoundEffects';

export type GameChannelDeps = {
    game: Game | null;
    setGame: (game: Game) => void;
    setRound: Dispatch<SetStateAction<Round | null>>;
    setRoundFinished: Dispatch<SetStateAction<boolean>>;
    setCountdown: Dispatch<SetStateAction<number | null>>;
    setUrgentCountdown: Dispatch<SetStateAction<number | null>>;
    setRoundScores: Dispatch<SetStateAction<{ p1: number | null; p2: number | null }>>;
    setRoundDistances: Dispatch<SetStateAction<{ p1: number | null; p2: number | null }>>;
    setHealth: Dispatch<SetStateAction<{ p1: number; p2: number }>>;
    setRoundResult: Dispatch<SetStateAction<RoundResult | null>>;
    setPendingRoundData: Dispatch<SetStateAction<RoundData | null>>;
    setEvents: Dispatch<SetStateAction<GameEvent[]>>;
    setMessages: Dispatch<SetStateAction<Message[]>>;
    setGameOver: Dispatch<SetStateAction<boolean>>;
    setWinnerId: (id: string | null) => void;
    setWinnerName: (name: string | null) => void;
    setRematchState: Dispatch<SetStateAction<RematchState>>;
    setOpponentLiveGuess: Dispatch<SetStateAction<{ lat: number; lng: number } | null>>;
    setRatingChange: Dispatch<SetStateAction<{ my: number | null; opponent: number | null }>>;
    setWins: Dispatch<SetStateAction<{ p1: number; p2: number }>>;
    setPostGameButtonsVisible: (v: boolean) => void;
    setWinnerOverlayVisible: (v: boolean) => void;
    setPageVisible: (v: boolean) => void;
    setBlackoutVisible: (v: boolean) => void;
    scheduleEndSequence: () => void;
    clearEndSequenceTimers: () => void;
    resetGameState: () => void;
    roundStartedAtRef: MutableRefObject<Date | null>;
    onReaction: (data: GameReactionData) => void;
    playerId: string;
    playSound: (name: SoundName) => void;
};
