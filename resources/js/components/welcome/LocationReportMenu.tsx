import { AlertCircleIcon } from 'lucide-react';
import { useState } from 'react';
import type { LocationReportReason } from '@/components/welcome/types';

const REPORT_REASONS: Array<{
    label: string;
    value: LocationReportReason;
}> = [
    { label: 'Inaccurate', value: 'inaccurate' },
    { label: 'Inappropriate', value: 'inappropriate' },
    { label: 'Bad coverage', value: 'bad coverage' },
];

export function LocationReportMenu({
    onSubmit,
    disabled = false,
}: {
    onSubmit: (reason: LocationReportReason) => Promise<void>;
    disabled?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState<LocationReportReason>('inaccurate');
    const [submitting, setSubmitting] = useState(false);

    async function submit() {
        if (submitting || disabled) return;

        setSubmitting(true);

        try {
            await onSubmit(reason);
        } catch {
            // Silent failure by design.
        } finally {
            setOpen(false);
            setSubmitting(false);
        }
    }

    return (
        <div className="relative z-20 flex items-end gap-2">
            <div className="relative">
                <div
                    aria-hidden={!open}
                    data-testid="location-report-panel"
                    className={`absolute bottom-12 left-0 w-44 rounded border border-p1/20 bg-black/80 p-3 shadow-2xl backdrop-blur-sm transition-all duration-150 ${open ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'}`}
                >
                    <div className="mb-2 font-mono text-[10px] tracking-wide text-white/50 uppercase">
                        Report location
                    </div>
                    <div className="space-y-2">
                        {REPORT_REASONS.map((option) => (
                            <label
                                key={option.value}
                                className="flex cursor-pointer items-center gap-2 text-xs text-white/80"
                            >
                                <input
                                    type="radio"
                                    name="location-report-reason"
                                    value={option.value}
                                    checked={reason === option.value}
                                    onChange={() => setReason(option.value)}
                                    disabled={submitting || disabled}
                                />
                                <span>{option.label}</span>
                            </label>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={() => void submit()}
                        disabled={submitting || disabled}
                        className="mt-3 w-full rounded bg-p1/15 px-2 py-1 font-mono text-xs text-p1 transition hover:bg-p1/25 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        submit
                    </button>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        if (disabled) return;
                        setOpen((prev) => !prev);
                    }}
                    disabled={disabled}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white/50 backdrop-blur-sm transition hover:bg-black/80 hover:text-p1 disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label="Report location"
                    aria-expanded={open}
                >
                    <AlertCircleIcon className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
