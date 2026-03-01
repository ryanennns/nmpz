import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useRef } from 'react';
import type {
    GameFinishedData,
    GameMessageData,
    Message,
    PlayerGuessedData,
    RoundFinishedData,
    RoundResult,
} from '@/components/welcome/types';
import echo from '@/echo';
import {
    HEALTH_DEDUCT_DELAY_MS,
    MAX_MESSAGES,
    NEXT_ROUND_COUNTDOWN,
} from '@/lib/game-constants';

type SpectatorChannelDeps = {
    gameId: string | null;
    playerOneName: string;
    playerTwoName: string;
    playerOneId: string;
    playerTwoId: string;
    setRoundFinished: Dispatch<SetStateAction<boolean>>;
    setCountdown: Dispatch<SetStateAction<number | null>>;
    setRoundScores: Dispatch<SetStateAction<{ p1: number | null; p2: number | null }>>;
    setRoundDistances: Dispatch<SetStateAction<{ p1: number | null; p2: number | null }>>;
    setHealth: Dispatch<SetStateAction<{ p1: number; p2: number }>>;
    setRoundResult: Dispatch<SetStateAction<RoundResult | null>>;
    setCurrentRoundNumber: Dispatch<SetStateAction<number | null>>;
    setMessages: Dispatch<SetStateAction<Message[]>>;
    setGameOver: Dispatch<SetStateAction<boolean>>;
    setWinnerId: Dispatch<SetStateAction<string | null>>;
    setWinnerName: Dispatch<SetStateAction<string | null>>;
    setPlayerOneLocked: Dispatch<SetStateAction<boolean>>;
    setPlayerTwoLocked: Dispatch<SetStateAction<boolean>>;
    setWins: Dispatch<SetStateAction<{ p1: number; p2: number }>>;
};

export function useSpectatorChannel(deps: SpectatorChannelDeps) {
    const {
        gameId,
        playerOneName,
        playerTwoName,
        playerOneId,
        playerTwoId,
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
    } = deps;

    const msgSeqRef = useRef(0);

    useEffect(() => {
        if (!gameId) return;

        // Spectators only subscribe to game.{id} — NOT game.{id}.players
        const channel = echo.channel(`game.${gameId}`);

        channel.listen('.PlayerGuessed', (data: PlayerGuessedData) => {
            setPlayerOneLocked(data.player_one_locked_in);
            setPlayerTwoLocked(data.player_two_locked_in);
        });

        channel.listen('.RoundFinished', (data: RoundFinishedData) => {
            setRoundFinished(true);
            setCountdown(NEXT_ROUND_COUNTDOWN);

            const p1Score = data.player_one_score ?? 0;
            const p2Score = data.player_two_score ?? 0;
            setRoundScores({ p1: p1Score, p2: p2Score });
            setRoundDistances({
                p1: data.player_one_distance_km ?? null,
                p2: data.player_two_distance_km ?? null,
            });

            if (data.player_one_wins !== undefined && data.player_two_wins !== undefined) {
                setWins({ p1: data.player_one_wins, p2: data.player_two_wins });
            }

            const damage = Math.abs(p1Score - p2Score);
            window.setTimeout(() => {
                setHealth((prev) => {
                    if (p1Score < p2Score) return { p1: prev.p1 - damage, p2: prev.p2 };
                    if (p2Score < p1Score) return { p1: prev.p1, p2: prev.p2 - damage };
                    return prev;
                });
            }, HEALTH_DEDUCT_DELAY_MS);

            const locLat = Number(data.location_lat);
            const locLng = Number(data.location_lng);
            if (!Number.isFinite(locLat) || !Number.isFinite(locLng)) {
                setRoundResult(null);
                return;
            }
            setRoundResult({
                location: { lat: locLat, lng: locLng },
                p1Guess:
                    data.player_one_guess_lat != null && data.player_one_guess_lng != null
                        ? { lat: Number(data.player_one_guess_lat), lng: Number(data.player_one_guess_lng) }
                        : null,
                p2Guess:
                    data.player_two_guess_lat != null && data.player_two_guess_lng != null
                        ? { lat: Number(data.player_two_guess_lat), lng: Number(data.player_two_guess_lng) }
                        : null,
            });

            // Next round will bump the round number
            setCurrentRoundNumber((prev) => (prev ?? 0) + 1);
            // Reset locked-in state for new round
            window.setTimeout(() => {
                setPlayerOneLocked(false);
                setPlayerTwoLocked(false);
                setRoundFinished(false);
                setRoundResult(null);
                setRoundScores({ p1: null, p2: null });
                setCountdown(null);
            }, NEXT_ROUND_COUNTDOWN * 1000);
        });

        channel.listen('.GameFinished', (data: GameFinishedData) => {
            setCountdown(null);
            setHealth({ p1: data.player_one_health, p2: data.player_two_health });
            setGameOver(true);

            const wId = data.winner_id;
            setWinnerId(wId);
            const name =
                wId === playerOneId
                    ? playerOneName
                    : wId === playerTwoId
                      ? playerTwoName
                      : null;
            setWinnerName(name);
        });

        channel.listen('.GameMessage', (data: GameMessageData) => {
            setMessages((prev) =>
                [
                    ...prev,
                    {
                        id: msgSeqRef.current++,
                        name: data.player_name ?? 'Player',
                        text: data.message ?? '',
                        ts: new Date().toISOString().substring(11, 19),
                    },
                ].slice(-MAX_MESSAGES),
            );
        });

        return () => {
            echo.leaveChannel(`game.${gameId}`);
        };
    }, [gameId]);
}
