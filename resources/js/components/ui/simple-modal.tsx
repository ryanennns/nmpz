import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ModalWidth = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

type SimpleModalProps = {
    open: boolean;
    onClose: () => void;
    children: ReactNode;
    className?: string;
    overlayClassName?: string;
    width?: ModalWidth;
};

const WIDTH_CLASS_MAP: Record<ModalWidth, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
};

export default function SimpleModal({
    open,
    onClose,
    children,
    className,
    overlayClassName,
    width,
}: SimpleModalProps) {
    const [mounted, setMounted] = useState(open);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (open) {
            setMounted(true);
            setVisible(false);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => setVisible(true));
            });
            return;
        }

        setVisible(false);
        const t = window.setTimeout(() => setMounted(false), 200);
        return () => window.clearTimeout(t);
    }, [open]);

    useEffect(() => {
        if (!mounted) return;
        function onKeyDown(e: KeyboardEvent) {
            if (e.code !== 'Escape') return;
            onClose();
        }
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [mounted, onClose]);

    if (!mounted) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            data-testid="modal"
        >
            <button
                type="button"
                className={
                    overlayClassName ??
                    `absolute inset-0 bg-black/70 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`
                }
                onClick={onClose}
                aria-label="Close modal"
                data-testid="close-modal"
            />
            <div
                className={
                    className ??
                    cn(
                        'relative z-10 w-full rounded border border-p1/20 bg-black/80 p-5 font-mono text-sm text-white/80 shadow-lg backdrop-blur-sm transition-all duration-200',
                        WIDTH_CLASS_MAP[width ?? '2xl'],
                        visible
                            ? 'scale-100 opacity-100'
                            : 'scale-95 opacity-0',
                    )
                }
            >
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded border border-p1/20 text-xs text-white/40 transition hover:border-p1/50 hover:text-p1"
                >
                    <X />
                </button>
                {children}
            </div>
        </div>
    );
}
