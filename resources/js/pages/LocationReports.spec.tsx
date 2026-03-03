import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
} from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LocationReportsPage from './LocationReports';

const mocks = vi.hoisted(() => ({
    api: {
        voteOnLocationReport: vi.fn(),
    },
}));

vi.mock('@inertiajs/react', () => ({
    Head: ({ title }: { title: string }) => <title>{title}</title>,
}));

vi.mock('@/hooks/useApiClient', () => ({
    useUnauthedApiClient: () => mocks.api,
}));

vi.mock('@/components/welcome/MapillaryImagePanel', () => ({
    default: ({
        location,
        displayMode,
    }: {
        location: { id: string };
        displayMode?: string;
    }) => (
        <div
            data-testid="mapillary-image-panel"
            data-location-id={location.id}
            data-display-mode={displayMode}
        />
    ),
}));

describe('LocationReportsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('renders the empty state when there is no pending report', () => {
        render(<LocationReportsPage report={null} />);

        expect(
            screen.queryByText('no pending location reports'),
        ).not.toBeInTheDocument();
        expect(
            screen.getByText('no new location reports to review.'),
        ).toBeInTheDocument();
        expect(screen.getByText('queue')).toBeInTheDocument();
        expect(screen.getByText('home')).toBeInTheDocument();
        expect(screen.getByText('keep location')).toBeDisabled();
        expect(screen.getByText('remove location')).toBeDisabled();
    });

    it('fades in on mount', async () => {
        const { container } = render(<LocationReportsPage report={null} />);
        const wrapper = container.firstChild as HTMLElement;

        expect(wrapper).toHaveClass('opacity-0');

        await waitFor(() => {
            expect(wrapper).toHaveClass('opacity-100');
        });
    });

    it('renders the current report details', () => {
        render(
            <LocationReportsPage
                report={{
                    id: 'report-1',
                    reason: 'inaccurate',
                    status: 'pending',
                    votes_to_accept: 1,
                    votes_to_reject: 2,
                    reported_by: { id: 1, name: 'alice' },
                    location: {
                        id: 'location-1',
                        lat: 48.85661,
                        lng: 2.35222,
                        heading: 180,
                        image_id: 'image-1',
                    },
                }}
            />,
        );

        expect(screen.getByText('alice')).toBeInTheDocument();
        expect(screen.getByText('inaccurate')).toBeInTheDocument();
        expect(screen.getByText('keep: 1')).toBeInTheDocument();
        expect(screen.getByText('remove: 2')).toBeInTheDocument();
        expect(screen.getByText('48.85661, 2.35222')).toBeInTheDocument();
        expect(screen.getByText('180')).toBeInTheDocument();
        expect(screen.getByText('image-1')).toBeInTheDocument();
        expect(screen.getByTestId('mapillary-image-panel')).toHaveAttribute(
            'data-location-id',
            'location-1',
        );
        expect(screen.getByTestId('mapillary-image-panel')).toHaveAttribute(
            'data-display-mode',
            'cover',
        );
    });

    it('casts a keep vote', async () => {
        mocks.api.voteOnLocationReport.mockResolvedValue({
            data: {
                report: {
                    id: 'report-2',
                    reason: 'bad coverage',
                    status: 'pending',
                    votes_to_accept: 0,
                    votes_to_reject: 1,
                    reported_by: { id: 2, name: 'bob' },
                    location: {
                        id: 'location-2',
                        lat: 35.6762,
                        lng: 139.6503,
                        heading: 90,
                        image_id: 'image-2',
                    },
                },
            },
        });

        render(
            <LocationReportsPage
                report={{
                    id: 'report-1',
                    reason: 'inaccurate',
                    status: 'pending',
                    votes_to_accept: 1,
                    votes_to_reject: 0,
                    reported_by: { id: 1, name: 'alice' },
                    location: {
                        id: 'location-1',
                        lat: 48.85661,
                        lng: 2.35222,
                        heading: 180,
                        image_id: null,
                    },
                }}
            />,
        );

        const user = userEvent.setup();
        await user.click(screen.getByText('keep location'));

        expect(mocks.api.voteOnLocationReport).toHaveBeenCalledWith(
            'report-1',
            'keep',
        );

        await waitFor(() => {
            expect(screen.getByText('bad coverage')).toBeInTheDocument();
        });
        expect(screen.getByText('remove: 1')).toBeInTheDocument();
    });

    it('casts a remove vote', async () => {
        mocks.api.voteOnLocationReport.mockResolvedValue({
            data: {
                report: null,
            },
        });

        render(
            <LocationReportsPage
                report={{
                    id: 'report-1',
                    reason: 'bad coverage',
                    status: 'pending',
                    votes_to_accept: 0,
                    votes_to_reject: 1,
                    reported_by: { id: 2, name: 'bob' },
                    location: {
                        id: 'location-2',
                        lat: 35.6762,
                        lng: 139.6503,
                        heading: 90,
                        image_id: 'image-2',
                    },
                }}
            />,
        );

        const user = userEvent.setup();
        await user.click(screen.getByText('remove location'));

        expect(mocks.api.voteOnLocationReport).toHaveBeenCalledWith(
            'report-1',
            'remove',
        );

        await waitFor(() => {
            expect(
                screen.getByText('no new location reports to review.'),
            ).toBeInTheDocument();
        });
        expect(screen.getByText('keep location')).toBeDisabled();
        expect(screen.getByText('remove location')).toBeDisabled();
    });

    it('fades out before navigating home', async () => {
        vi.useFakeTimers();
        const assignSpy = vi.fn();
        vi.stubGlobal('location', { ...window.location, assign: assignSpy });

        const { container } = render(<LocationReportsPage report={null} />);
        const wrapper = container.firstChild as HTMLElement;

        fireEvent.click(screen.getByText('home'));

        expect(wrapper).toHaveClass('opacity-0');
        expect(assignSpy).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(300);
        });

        expect(assignSpy).toHaveBeenCalledWith('/');

        vi.useRealTimers();
        vi.unstubAllGlobals();
    });
});
