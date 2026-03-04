import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SingleplayerPage from './singleplayer';

const mocks = vi.hoisted(() => ({
    axios: {
        post: vi.fn(),
    },
    maps: {
        importLibrary: vi.fn(),
        setOptions: vi.fn(),
    },
    locationAssign: vi.fn(),
    localStorage: {
        get: vi.fn(),
    },
}));

vi.mock('axios', () => ({
    default: mocks.axios,
}));

vi.mock('@googlemaps/js-api-loader', () => ({
    importLibrary: mocks.maps.importLibrary,
    setOptions: mocks.maps.setOptions,
}));

vi.mock('@inertiajs/react', () => ({
    Head: ({ title }: { title: string }) => <title>{title}</title>,
}));

vi.mock('@/components/welcome/MapillaryImagePanel', () => ({
    default: ({
        location,
    }: {
        location: { image_id: string | null; heading?: number };
    }) => (
        <div
            data-testid="mapillary-image-panel"
            data-image-id={location.image_id ?? ''}
            data-heading={location.heading ?? ''}
        />
    ),
}));

vi.mock('@/components/welcome/MapPicker', () => ({
    default: ({
        onPin,
        disabled,
    }: {
        onPin: (coords: { lat: number; lng: number }) => void;
        disabled: boolean;
    }) => (
        <button
            type="button"
            onClick={() => onPin({ lat: 12.34, lng: 56.78 })}
            disabled={disabled}
        >
            place pin
        </button>
    ),
}));

vi.mock('@/components/welcome/StandardCompass', () => ({
    StandardCompass: ({ heading }: { heading: number }) => (
        <div data-testid="compass">heading:{heading}</div>
    ),
}));

vi.mock('@/components/welcome/LocationReportMenu', () => ({
    LocationReportMenu: ({
        onSubmit,
        disabled,
    }: {
        onSubmit: (reason: 'bad coverage') => Promise<void>;
        disabled?: boolean;
    }) => (
        <button
            type="button"
            onClick={() => void onSubmit('bad coverage')}
            disabled={disabled}
        >
            report location
        </button>
    ),
}));

vi.mock('@/hooks/use-theme', () => ({
    getP1Color: () => '#00ff00',
}));

vi.mock('@/hooks/useLocalStorage', () => ({
    PLAYER_ID_KEY: 'player_id',
    useLocalStorage: () => mocks.localStorage,
}));

describe('SingleplayerPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.maps.importLibrary.mockResolvedValue(undefined);
        mocks.locationAssign.mockReset();
        mocks.localStorage.get.mockReturnValue('player-1');

        vi.stubGlobal('google', {
            maps: {
                LatLngBounds: vi.fn(() => ({
                    extend: vi.fn(),
                })),
                Map: vi.fn(() => ({
                    fitBounds: vi.fn(),
                })),
                Marker: vi.fn(() => ({
                    addListener: vi.fn(),
                })),
                Polyline: vi.fn(),
                Size: vi.fn(),
                Point: vi.fn(),
                event: {
                    trigger: vi.fn(),
                },
            },
        });
        vi.stubGlobal(
            'requestAnimationFrame',
            (callback: FrameRequestCallback) => {
                callback(0);
                return 0;
            },
        );
        vi.stubGlobal('cancelAnimationFrame', vi.fn());

        vi.stubGlobal('location', {
            ...window.location,
            assign: mocks.locationAssign,
        });
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('loads the current game on mount, submits a guess, and advances to the next round', async () => {
        mocks.axios.post
            .mockResolvedValueOnce({
                data: {
                    game_id: 'game-1',
                    total_rounds: 5,
                    game_complete: false,
                    current_round: {
                        id: 'round-1',
                        round_number: 1,
                        location: {
                            id: 'location-1',
                            lat: 40.7128,
                            lng: -74.006,
                            heading: 180,
                            image_id: 'image-1',
                        },
                    },
                    completed_rounds: [],
                },
            })
            .mockResolvedValueOnce({
                data: {
                    score: 4321,
                    distance_km: 12.3,
                    location: { lat: 40.7128, lng: -74.006 },
                    guess: { lat: 12.34, lng: 56.78 },
                    total_score: 4321,
                    game_complete: false,
                    next_round: {
                        id: 'round-2',
                        round_number: 2,
                        location: {
                            id: 'location-2',
                            lat: 34.0522,
                            lng: -118.2437,
                            heading: 90,
                            image_id: 'image-2',
                        },
                    },
                },
            });

        render(
            <SingleplayerPage
                authenticated={false}
                soloGameId="game-1"
                playerId={null}
            />,
        );

        expect(mocks.axios.post).toHaveBeenCalledWith(
            '/singleplayer/game-1/round',
            {
                player_id: 'player-1',
            },
        );

        await screen.findByText('place pin');

        const user = userEvent.setup();
        await user.click(screen.getByText('place pin'));

        expect(screen.getByText('submit guess [space]')).toBeEnabled();

        await user.click(screen.getByText('submit guess [space]'));

        await screen.findByText('4,321');
        expect(mocks.axios.post).toHaveBeenLastCalledWith(
            '/singleplayer/game-1/guess',
            {
                player_id: 'player-1',
                round_id: 'round-1',
                lat: 12.34,
                lng: 56.78,
            },
        );

        await user.click(screen.getByText('next round'));

        await waitFor(() => {
            expect(screen.getByTestId('compass')).toHaveTextContent(
                'heading:90',
            );
        });
        expect(screen.getByTestId('mapillary-image-panel')).toHaveAttribute(
            'data-image-id',
            'image-2',
        );
    });

    it('submits a guess when spacebar is pressed after placing a pin', async () => {
        mocks.axios.post
            .mockResolvedValueOnce({
                data: {
                    game_id: 'game-1',
                    total_rounds: 5,
                    game_complete: false,
                    current_round: {
                        id: 'round-1',
                        round_number: 1,
                        location: {
                            id: 'location-1',
                            lat: 40.7128,
                            lng: -74.006,
                            heading: 180,
                            image_id: 'image-1',
                        },
                    },
                    completed_rounds: [],
                },
            })
            .mockResolvedValueOnce({
                data: {
                    score: 4321,
                    distance_km: 12.3,
                    location: { lat: 40.7128, lng: -74.006 },
                    guess: { lat: 12.34, lng: 56.78 },
                    total_score: 4321,
                    game_complete: false,
                    next_round: {
                        id: 'round-2',
                        round_number: 2,
                        location: {
                            id: 'location-2',
                            lat: 34.0522,
                            lng: -118.2437,
                            heading: 90,
                            image_id: 'image-2',
                        },
                    },
                },
            });

        render(
            <SingleplayerPage
                authenticated={false}
                soloGameId="game-1"
                playerId={null}
            />,
        );

        const user = userEvent.setup();
        await user.click(await screen.findByText('place pin'));
        await user.keyboard(' ');

        await waitFor(() => {
            expect(mocks.axios.post).toHaveBeenLastCalledWith(
                '/singleplayer/game-1/guess',
                {
                    player_id: 'player-1',
                    round_id: 'round-1',
                    lat: 12.34,
                    lng: 56.78,
                },
            );
        });
    });

    it('shows the report control for authenticated players and disables it after reporting', async () => {
        mocks.axios.post
            .mockResolvedValueOnce({
                data: {
                    game_id: 'game-1',
                    total_rounds: 5,
                    game_complete: false,
                    current_round: {
                        id: 'round-1',
                        round_number: 1,
                        location: {
                            id: 'location-1',
                            lat: 40.7128,
                            lng: -74.006,
                            heading: 180,
                            image_id: 'image-1',
                        },
                    },
                    completed_rounds: [],
                },
            })
            .mockResolvedValueOnce({ data: {} });

        render(
            <SingleplayerPage
                authenticated={true}
                soloGameId="game-1"
                playerId="player-1"
            />,
        );

        const reportButton = await screen.findByText('report location');
        expect(reportButton).toBeEnabled();

        const user = userEvent.setup();
        await user.click(reportButton);

        expect(mocks.axios.post).toHaveBeenLastCalledWith(
            '/locations/location-1/report',
            { reason: 'bad coverage' },
        );

        await waitFor(() => {
            expect(screen.getByText('report location')).toBeDisabled();
        });
    });

    it('shows the summary when the final round is completed', async () => {
        mocks.axios.post
            .mockResolvedValueOnce({
                data: {
                    game_id: 'game-1',
                    total_rounds: 5,
                    game_complete: false,
                    current_round: {
                        id: 'round-5',
                        round_number: 5,
                        location: {
                            id: 'location-5',
                            lat: 51.5074,
                            lng: -0.1278,
                            heading: 270,
                            image_id: 'image-5',
                        },
                    },
                    completed_rounds: [],
                },
            })
            .mockResolvedValueOnce({
                data: {
                    score: 4999,
                    distance_km: 0.1,
                    location: { lat: 51.5074, lng: -0.1278 },
                    guess: { lat: 12.34, lng: 56.78 },
                    total_score: 4999,
                    game_complete: true,
                    next_round: null,
                },
            });

        render(
            <SingleplayerPage
                authenticated={false}
                soloGameId="game-1"
                playerId={null}
            />,
        );

        const user = userEvent.setup();
        await user.click(await screen.findByText('place pin'));
        await user.click(screen.getByText('submit guess [space]'));
        await user.click(await screen.findByText('see summary'));

        await waitFor(() => {
            expect(screen.getByText('total score')).toBeInTheDocument();
        });
        expect(screen.getAllByText('4,999')).toHaveLength(2);
        expect(screen.getByText('play again [space]')).toBeInTheDocument();
        expect(screen.getByText('home')).toBeInTheDocument();
    });

    it('fades out before navigating home from the summary', async () => {
        mocks.axios.post
            .mockResolvedValueOnce({
                data: {
                    game_id: 'game-1',
                    total_rounds: 5,
                    game_complete: false,
                    current_round: {
                        id: 'round-5',
                        round_number: 5,
                        location: {
                            id: 'location-5',
                            lat: 51.5074,
                            lng: -0.1278,
                            heading: 270,
                            image_id: 'image-5',
                        },
                    },
                    completed_rounds: [],
                },
            })
            .mockResolvedValueOnce({
                data: {
                    score: 4999,
                    distance_km: 0.1,
                    location: { lat: 51.5074, lng: -0.1278 },
                    guess: { lat: 12.34, lng: 56.78 },
                    total_score: 4999,
                    game_complete: true,
                    next_round: null,
                },
            });

        render(
            <SingleplayerPage
                authenticated={false}
                soloGameId="game-1"
                playerId={null}
            />,
        );

        const user = userEvent.setup();
        await user.click(await screen.findByText('place pin'));
        await user.click(screen.getByText('submit guess [space]'));
        await user.click(await screen.findByText('see summary'));

        vi.useFakeTimers();

        fireEvent.click(screen.getByText('home'));

        expect(mocks.locationAssign).not.toHaveBeenCalled();

        await act(async () => {
            vi.advanceTimersByTime(500);
        });

        expect(mocks.locationAssign).toHaveBeenCalledWith('/');
    });

    it('resumes a completed game from the fetched state', async () => {
        mocks.axios.post.mockResolvedValueOnce({
            data: {
                game_id: 'game-1',
                total_rounds: 5,
                game_complete: true,
                current_round: null,
                completed_rounds: [
                    {
                        round_number: 1,
                        score: 4200,
                        distance_km: 22.5,
                        location: {
                            lat: 40.7128,
                            lng: -74.006,
                            heading: 180,
                            image_id: 'image-1',
                        },
                        guess: { lat: 40.73, lng: -73.93 },
                    },
                ],
            },
        });

        render(
            <SingleplayerPage
                authenticated={false}
                soloGameId="game-1"
                playerId={null}
            />,
        );

        await waitFor(() => {
            expect(screen.getByText('total score')).toBeInTheDocument();
        });
        expect(screen.getAllByText('4,200')).toHaveLength(2);
    });
});
