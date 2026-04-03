import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import MapillaryImagePanel from '@/components/welcome/MapillaryImagePanel';
import { useUnauthedApiClient } from '@/hooks/useApiClient';

type LocationReportPageData = {
    id: string;
    reason: string;
    status: string;
    votes_to_accept: number;
    votes_to_reject: number;
    reported_by: {
        id: number | null;
        name: string | null;
    } | null;
    location: {
        id: string;
        lat: number;
        lng: number;
        heading: number;
        image_id: string | null;
    } | null;
} | null;

const FADE_MS = 300;

export default function LocationReportsPage({
    report,
    playerId,
}: {
    report: LocationReportPageData;
    playerId: string | null;
}) {
    const api = useUnauthedApiClient();
    const [activeReport, setActiveReport] =
        useState<LocationReportPageData>(report);
    const [pendingVote, setPendingVote] = useState<'keep' | 'remove' | null>(
        null,
    );
    const [pageVisible, setPageVisible] = useState(false);
    const [blackoutVisible, setBlackoutVisible] = useState(false);

    useEffect(() => {
        const id = window.requestAnimationFrame(() => {
            setPageVisible(true);
        });

        return () => {
            window.cancelAnimationFrame(id);
        };
    }, []);

    const navigateWithFade = (href: string) => {
        setPageVisible(false);
        setBlackoutVisible(true);
        window.setTimeout(() => {
            window.location.assign(href);
        }, FADE_MS);
    };

    const castVote = async (vote: 'keep' | 'remove') => {
        if (!activeReport?.location || pendingVote) {
            return;
        }

        setPendingVote(vote);
        try {
            const response = await api.voteOnLocationReport(
                activeReport.id,
                vote,
                playerId,
            );
            const payload = response.data as {
                report: LocationReportPageData;
            };
            setActiveReport(payload.report);
        } finally {
            setPendingVote(null);
        }
    };

    return (
        <>
            <Head title="Location Reports" />
            <div
                className={`relative min-h-screen overflow-hidden bg-black font-mono text-white transition-opacity duration-300 ${pageVisible ? 'opacity-100' : 'opacity-0'}`}
            >
                {activeReport?.location && (
                    <MapillaryImagePanel
                        location={activeReport.location}
                        displayMode="cover"
                    />
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/70" />

                <div className="relative z-10 min-h-screen">
                    {!activeReport || !activeReport.location ? (
                        <div className="flex min-h-screen items-center justify-center px-4">
                            <div className="flex w-full max-w-sm flex-col gap-4 rounded border border-p1/20 bg-black/70 p-6 text-center text-xs text-white/60 backdrop-blur-sm">
                                <div>no new location reports to review.</div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <button
                                        type="button"
                                        onClick={() => navigateWithFade('/')}
                                        className="rounded border border-p1/20 px-3 py-2 text-center text-xs text-p1/70 transition hover:bg-p1/10 hover:text-p1"
                                    >
                                        home
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            navigateWithFade('/?auto_queue=1')
                                        }
                                        className="rounded border border-p1/20 px-3 py-2 text-center text-xs text-p1/70 transition hover:bg-p1/10 hover:text-p1"
                                    >
                                        queue
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="absolute top-4 left-4 max-w-sm rounded border border-p1/20 bg-black/70 p-4 shadow-2xl backdrop-blur-sm">
                                <div className="mb-4 flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-xs tracking-[0.2em] text-white/40 uppercase">
                                            moderation
                                        </p>
                                        <h1 className="text-lg text-white">
                                            location reports
                                        </h1>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => navigateWithFade('/')}
                                        className="rounded border border-p1/20 px-2 py-1 text-[11px] text-p1/70 transition hover:bg-p1/10 hover:text-p1"
                                    >
                                        back
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <p className="text-[10px] tracking-[0.2em] text-white/35 uppercase">
                                            reported by
                                        </p>
                                        <p className="mt-1 text-sm text-white/80">
                                            {activeReport.reported_by?.name ??
                                                'unknown'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] tracking-[0.2em] text-white/35 uppercase">
                                            reason
                                        </p>
                                        <p className="mt-1 text-sm text-white/80">
                                            {activeReport.reason}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] tracking-[0.2em] text-white/35 uppercase">
                                            current votes
                                        </p>
                                        <p className="mt-1 text-sm text-white/80">
                                            keep: {activeReport.votes_to_accept}
                                        </p>
                                        <p className="text-sm text-white/80">
                                            remove:{' '}
                                            {activeReport.votes_to_reject}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] tracking-[0.2em] text-white/35 uppercase">
                                            coordinates
                                        </p>
                                        <p className="mt-1 text-sm text-white/80">
                                            {activeReport.location.lat.toFixed(
                                                5,
                                            )}
                                            ,{' '}
                                            {activeReport.location.lng.toFixed(
                                                5,
                                            )}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] tracking-[0.2em] text-white/35 uppercase">
                                            heading
                                        </p>
                                        <p className="mt-1 text-sm text-white/80">
                                            {activeReport.location.heading}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] tracking-[0.2em] text-white/35 uppercase">
                                            image id
                                        </p>
                                        <p className="mt-1 text-sm break-all text-white/80">
                                            {activeReport.location.image_id ??
                                                'unavailable'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="fixed right-0 bottom-0 left-0 z-20 p-4">
                        <div className="mx-auto grid w-full max-w-3xl gap-3 rounded border border-white/10 bg-black/75 p-4 shadow-2xl backdrop-blur-sm sm:grid-cols-2">
                            <button
                                type="button"
                                onClick={() => void castVote('keep')}
                                disabled={
                                    pendingVote !== null ||
                                    !activeReport?.location
                                }
                                className="rounded border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {pendingVote === 'keep'
                                    ? 'submitting...'
                                    : 'keep location'}
                            </button>
                            <button
                                type="button"
                                onClick={() => void castVote('remove')}
                                disabled={
                                    pendingVote !== null ||
                                    !activeReport?.location
                                }
                                className="rounded border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {pendingVote === 'remove'
                                    ? 'submitting...'
                                    : 'remove location'}
                            </button>
                        </div>
                    </div>
                </div>
                <div
                    className={`pointer-events-none absolute inset-0 z-30 bg-black transition-opacity duration-300 ${blackoutVisible ? 'opacity-100' : 'opacity-0'}`}
                />
            </div>
        </>
    );
}
