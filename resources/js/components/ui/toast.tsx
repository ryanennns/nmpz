import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

const TOAST_ANIMATION_MS = 200;
const TOAST_DURATION_MS = 5000;

type ToastProps = ComponentProps<'div'> & {
    children: ReactNode;
    onDismiss?: () => void;
    dismissLabel?: string;
};

export default function Toast({
    children,
    className,
    onDismiss,
    dismissLabel = 'Dismiss toast',
    ...props
}: ToastProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isRendered, setIsRendered] = useState(true);
    const isDismissingRef = useRef(false);
    const enterFrameRef = useRef<number | null>(null);
    const dismissTimeoutRef = useRef<number | null>(null);
    const autoDismissTimeoutRef = useRef<number | null>(null);
    const startDismissRef = useRef<() => void>(() => {});

    startDismissRef.current = () => {
        if (isDismissingRef.current) {
            return;
        }

        isDismissingRef.current = true;
        setIsVisible(false);

        if (autoDismissTimeoutRef.current !== null) {
            window.clearTimeout(autoDismissTimeoutRef.current);
        }

        dismissTimeoutRef.current = window.setTimeout(() => {
            if (onDismiss) {
                onDismiss();
                return;
            }

            setIsRendered(false);
        }, TOAST_ANIMATION_MS);
    };

    useEffect(() => {
        enterFrameRef.current = window.requestAnimationFrame(() => {
            setIsVisible(true);
        });

        autoDismissTimeoutRef.current = window.setTimeout(() => {
            startDismissRef.current();
        }, TOAST_DURATION_MS);

        return () => {
            if (enterFrameRef.current !== null) {
                window.cancelAnimationFrame(enterFrameRef.current);
            }

            if (autoDismissTimeoutRef.current !== null) {
                window.clearTimeout(autoDismissTimeoutRef.current);
            }

            if (dismissTimeoutRef.current !== null) {
                window.clearTimeout(dismissTimeoutRef.current);
            }
        };
    }, []);

    if (!isRendered) {
        return null;
    }

    return (
        <div
            role="status"
            className={cn(
                'fixed right-4 bottom-4 z-10 max-w-xs rounded border border-p1/20 bg-black/85 px-4 py-3 text-xs text-white shadow-lg backdrop-blur-sm transition-all duration-200 ease-out',
                isVisible
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-2 opacity-0',
                className,
            )}
            {...props}
        >
            <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">{children}</div>
                {onDismiss && (
                    <button
                        type="button"
                        aria-label={dismissLabel}
                        onClick={() => startDismissRef.current()}
                        className="shrink-0 rounded px-1 text-white/30 transition hover:bg-p1/10 hover:text-p1"
                    >
                        <X className="h-3 w-3" />
                    </button>
                )}
            </div>
        </div>
    );
}
