import { useEffect, useRef } from 'react';
import type {
    GameFinishedData,
    GameMessageData,
    GameReactionData,
    PlayerGuessedData,
    RematchAcceptedData,
    RematchDeclinedData,
    RematchRequestedData,
    OpponentGuessUpdateData,
    RoundData,
    RoundFinishedData,
} from '@/types/game';
import echo from '@/echo';
import {
    handlePlayerGuessed,
    handleRoundFinished,
    handleRoundStarted,
    handleGameMessage,
    handleGameFinished,
    handleOpponentGuessUpdate,
    handleRematchRequested,
    handleRematchAccepted,
    handleRematchDeclined,
    handleGameReaction,
} from '@/hooks/game-channel/handlers';
import type { GameChannelDeps } from '@/hooks/game-channel/types';

export type { GameChannelDeps };

export function useGameChannel(deps: GameChannelDeps) {
    const {
        game, setGame, setRound, setRoundFinished, setCountdown, setUrgentCountdown,
        setRoundScores, setRoundDistances, setHealth, setRoundResult, setPendingRoundData,
        setEvents, setMessages, setGameOver, setWinnerId, setWinnerName, setRematchState,
        setOpponentLiveGuess, setRatingChange, setWins, setPostGameButtonsVisible,
        setWinnerOverlayVisible, setPageVisible, setBlackoutVisible, scheduleEndSequence,
        clearEndSequenceTimers, onReaction, resetGameState, roundStartedAtRef, playerId,
        playSound,
    } = deps;

    const eventSeqRef = useRef(0);

    useEffect(() => {
        if (!game) return;

        const channel = echo.channel(`game.${game.id}`);
        const playersChannel = echo.channel(`game.${game.id}.players`);

        channel.listen('.PlayerGuessed', (data: PlayerGuessedData) =>
            handlePlayerGuessed(data, eventSeqRef, setEvents, setRound, setUrgentCountdown, roundStartedAtRef, playerId, playSound));

        channel.listen('.RoundFinished', (data: RoundFinishedData) =>
            handleRoundFinished(data, eventSeqRef, setEvents, setRoundFinished, setOpponentLiveGuess, setUrgentCountdown, setCountdown, setRoundScores, setRoundDistances, setHealth, setRoundResult, playSound));

        playersChannel.listen('.RoundStarted', (data: RoundData) =>
            handleRoundStarted(data, eventSeqRef, setEvents, setWins, setPendingRoundData));

        channel.listen('.GameMessage', (data: GameMessageData) =>
            handleGameMessage(data, eventSeqRef, setEvents, setMessages));

        channel.listen('.GameFinished', (data: GameFinishedData) =>
            handleGameFinished(data, game, eventSeqRef, setEvents, setCountdown, setUrgentCountdown, roundStartedAtRef, setHealth, setGameOver, setRatingChange, setWinnerId, setWinnerName, playerId, playSound, scheduleEndSequence));

        playersChannel.listen('.OpponentGuessUpdate', (data: OpponentGuessUpdateData) =>
            handleOpponentGuessUpdate(data, playerId, setOpponentLiveGuess));

        channel.listen('.RematchRequested', (data: RematchRequestedData) =>
            handleRematchRequested(data, playerId, setRematchState));

        channel.listen('.RematchAccepted', (data: RematchAcceptedData) =>
            handleRematchAccepted(data, clearEndSequenceTimers, setRematchState, setPostGameButtonsVisible, setWinnerOverlayVisible, setPageVisible, setBlackoutVisible, resetGameState, setGame, setHealth));

        channel.listen('.RematchDeclined', (data: RematchDeclinedData) =>
            handleRematchDeclined(data, playerId, setRematchState));

        channel.listen('.GameReaction', (data: GameReactionData) =>
            handleGameReaction(data, eventSeqRef, setEvents, onReaction));

        return () => {
            clearEndSequenceTimers();
            echo.leaveChannel(`game.${game.id}`);
            echo.leaveChannel(`game.${game.id}.players`);
        };
    }, [game?.id]);
}
