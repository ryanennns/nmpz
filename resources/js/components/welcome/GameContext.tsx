import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import type { Game } from '@/components/welcome/types';

type GameContextValue = {
    game: Game;
    setGame: Dispatch<SetStateAction<Game>>;
};

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({
    game: providedGame,
    children,
}: {
    game: Game;
    children: ReactNode;
}) {
    const [game, setGame] = useState<Game>(providedGame);

    useEffect(() => {
        setGame(providedGame);
    }, [providedGame]);

    return (
        <GameContext.Provider value={{ game, setGame }}>
            {children}
        </GameContext.Provider>
    );
}

export function useGameContext(): GameContextValue {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error('useGameContext must be used within GameProvider');
    }
    return context;
}
