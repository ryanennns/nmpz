import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Lobby from './Lobby';

const mocks = vi.hoisted(() => {
    const listenHandlers: Record<
        string,
        (data: { game: { id: string } }) => void
    > = {};

    const channelMock = {
        listen: vi.fn((event: string, handler: any) => {
            listenHandlers[event] = handler;
            return channelMock;
        }),
    };

    return {
        api: {
            createPlayer: vi.fn(),
            updatePlayer: vi.fn(),
            joinQueue: vi.fn(),
            leaveQueue: vi.fn(),
            getPlayer: vi.fn(),
        },
        stats: {
            fetchStats: vi.fn(),
        },
        localStorage: {
            get: vi.fn(),
            set: vi.fn(),
        },
        echo: {
            channel: vi.fn(),
            leaveChannel: vi.fn(),
        },
        channelMock,
        listenHandlers,
    };
});

vi.mock('@/hooks/useApiClient', () => ({
    useUnauthedApiClient: () => mocks.api,
    useStatsClient: () => mocks.stats,
}));

vi.mock('@/hooks/useLocalStorage', () => ({
    PLAYER_ID_KEY: 'player_id',
    useLocalStorage: () => mocks.localStorage,
}));

vi.mock('@/echo', () => ({
    default: mocks.echo,
}));

describe('Lobby', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.localStorage.get.mockReturnValue(null);
        mocks.echo.channel.mockReturnValue(mocks.channelMock);
        Object.keys(mocks.listenHandlers).forEach((key) => {
            delete mocks.listenHandlers[key];
        });
    });

    afterEach(() => {
        cleanup();
    });

    it('renders the name prompt by default and opens help modal', async () => {
        render(<Lobby />);

        expect(screen.getByText('continue')).toBeInTheDocument();
        expect(screen.getByText('sign in')).toBeInTheDocument();
        expect(screen.queryByTestId('modal')).not.toBeInTheDocument();

        const user = userEvent.setup();
        await user.click(screen.getByTestId('help-button'));
        expect(screen.getByTestId('modal')).toBeInTheDocument();

        await user.click(screen.getByTestId('close-modal'));
        await waitFor(() => {
            expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
        });
    });

    it('creates a player and transitions to queue ready', async () => {
        mocks.api.createPlayer.mockResolvedValue({
            status: 201,
            data: { id: 'player-1', name: 'ryan' },
        });

        render(<Lobby />);

        const user = userEvent.setup();
        await user.type(screen.getByPlaceholderText('your name'), 'ryan');
        await user.click(screen.getByText('continue'));

        expect(await screen.findByText('Join queue')).toBeInTheDocument();
        expect(screen.getByText('ryan')).toBeInTheDocument();
        expect(mocks.api.createPlayer).toHaveBeenCalledWith('ryan');
    });

    it('joins the queue and shows the waiting room', async () => {
        mocks.api.createPlayer.mockResolvedValue({
            status: 201,
            data: { id: 'player-2', name: 'ryan' },
        });

        render(<Lobby />);
        const user = userEvent.setup();
        await user.type(screen.getByPlaceholderText('your name'), 'ryan');
        await user.click(screen.getByText('continue'));

        await screen.findByText('Join queue');
        await user.click(screen.getByText('Join queue'));

        expect(
            await screen.findByText('waiting for opponent'),
        ).toBeInTheDocument();
        expect(screen.getByText('leave queue')).toBeInTheDocument();
        expect(mocks.api.joinQueue).toHaveBeenCalledWith('player-2');
    });

    it('loads an existing player from local storage', async () => {
        mocks.localStorage.get.mockReturnValue('stored-player');
        mocks.api.getPlayer.mockResolvedValue({
            status: 200,
            data: { id: 'stored-player', name: 'sam' },
        });

        render(<Lobby />);

        expect(await screen.findByText('Join queue')).toBeInTheDocument();
        expect(mocks.api.getPlayer).toHaveBeenCalledWith('stored-player');
        expect(screen.getByText('sam')).toBeInTheDocument();
    });

    it('redirects when a game is ready', async () => {
        mocks.api.createPlayer.mockResolvedValue({
            status: 201,
            data: { id: 'player-3', name: 'ryan' },
        });

        const assignSpy = vi.fn();
        const originalLocation = window.location;
        vi.stubGlobal('location', {
            ...originalLocation,
            assign: assignSpy,
        });

        render(<Lobby />);
        const user = userEvent.setup();
        await user.type(screen.getByPlaceholderText('your name'), 'ryan');
        await user.click(screen.getByText('continue'));
        await screen.findByText('Join queue');

        const handler = mocks.listenHandlers['.GameReady'];
        expect(handler).toBeDefined();
        handler?.({ game: { id: 'game-9' } });

        expect(assignSpy).toHaveBeenCalledWith('/game/game-9?player=player-3');
        vi.unstubAllGlobals();
    });
});
