import type { ComponentProps, ReactNode } from 'react';
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
            getAuthPlayer: vi.fn(),
            signIn: vi.fn(),
            claimPlayer: vi.fn(),
        },
        stats: {
            fetchStats: vi.fn(),
        },
        localStorage: {
            get: vi.fn(),
            set: vi.fn(),
            remove: vi.fn(),
        },
        echo: {
            channel: vi.fn(),
            leaveChannel: vi.fn(),
        },
        channelMock,
        listenHandlers,
        page: {
            props: {
                auth: { user: null as { id: number; name: string } | null },
            },
        },
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

vi.mock('@inertiajs/react', () => ({
    usePage: () => mocks.page,
    Link: ({
        children,
        onClick,
        ...props
    }: ComponentProps<'button'> & { children: ReactNode }) => (
        <button type="button" onClick={onClick} {...props}>
            {children}
        </button>
    ),
}));

describe('Lobby', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.localStorage.get.mockReturnValue(null);
        mocks.echo.channel.mockReturnValue(mocks.channelMock);
        mocks.page.props.auth.user = null;
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

        expect(assignSpy).toHaveBeenCalledWith('/games/game-9?player=player-3');
        vi.unstubAllGlobals();
    });

    it('auto-queues when auto_queue param is present', async () => {
        mocks.localStorage.get.mockReturnValue('stored-player');
        mocks.api.getPlayer.mockResolvedValue({
            status: 200,
            data: { id: 'stored-player', name: 'sam' },
        });
        mocks.api.joinQueue.mockResolvedValue({ status: 200 });

        vi.stubGlobal('location', {
            ...window.location,
            search: '?auto_queue=1',
        });

        render(<Lobby />);

        expect(
            await screen.findByText('waiting for opponent'),
        ).toBeInTheDocument();
        expect(mocks.api.joinQueue).toHaveBeenCalledWith('stored-player');

        vi.unstubAllGlobals();
    });

    it('loads player via getAuthPlayer when auth.user is present', async () => {
        mocks.page.props.auth.user = { id: 1, name: 'alice' };
        mocks.api.getAuthPlayer.mockResolvedValue({
            status: 200,
            data: { id: 'auth-player', name: 'alice' },
        });

        render(<Lobby />);

        expect(await screen.findByText('Join queue')).toBeInTheDocument();
        expect(mocks.api.getAuthPlayer).toHaveBeenCalledTimes(1);
        expect(mocks.api.getPlayer).not.toHaveBeenCalled();
        expect(screen.getByText('alice')).toBeInTheDocument();
    });

    it('clears local auth state when signing out', async () => {
        mocks.page.props.auth.user = { id: 1, name: 'alice' };
        mocks.api.getAuthPlayer.mockResolvedValue({
            status: 200,
            data: { id: 'auth-player', name: 'alice' },
        });

        render(<Lobby />);

        const user = userEvent.setup();

        await screen.findByText('Join queue');
        await user.click(screen.getByText('sign out'));

        expect(mocks.localStorage.remove).toHaveBeenCalledWith('player_id');
        expect(
            await screen.findByPlaceholderText('your name'),
        ).toBeInTheDocument();
        expect(screen.queryByText('alice')).not.toBeInTheDocument();
    });

    it('transitions to sign_in phase when clicking "sign in" on NamePrompt', async () => {
        render(<Lobby />);

        const user = userEvent.setup();
        await user.click(screen.getByText('sign in'));

        expect(await screen.findByPlaceholderText('email')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('password')).toBeInTheDocument();
    });

    it('returns to guest_signin when clicking back on SignInForm', async () => {
        render(<Lobby />);

        const user = userEvent.setup();
        await user.click(screen.getByText('sign in'));
        await screen.findByPlaceholderText('email');

        await user.click(screen.getByText('back'));

        expect(
            await screen.findByPlaceholderText('your name'),
        ).toBeInTheDocument();
    });

    it('transitions to sign_up phase when clicking "create account" on QueueReady', async () => {
        mocks.api.createPlayer.mockResolvedValue({
            status: 201,
            data: { id: 'player-4', name: 'bob' },
        });

        render(<Lobby />);
        const user = userEvent.setup();
        await user.type(screen.getByPlaceholderText('your name'), 'bob');
        await user.click(screen.getByText('continue'));

        await screen.findByText('Join queue');
        await user.click(screen.getByText('create account'));

        expect(
            await screen.findByPlaceholderText('confirm password'),
        ).toBeInTheDocument();
    });

    it('returns to queue_ready when clicking back on SignUpForm', async () => {
        mocks.api.createPlayer.mockResolvedValue({
            status: 201,
            data: { id: 'player-5', name: 'bob' },
        });

        render(<Lobby />);
        const user = userEvent.setup();
        await user.type(screen.getByPlaceholderText('your name'), 'bob');
        await user.click(screen.getByText('continue'));

        await screen.findByText('Join queue');
        await user.click(screen.getByText('create account'));

        await screen.findByPlaceholderText('confirm password');
        await user.click(screen.getByText('back'));

        expect(await screen.findByText('Join queue')).toBeInTheDocument();
    });
});
