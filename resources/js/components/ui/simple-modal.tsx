import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

type SimpleModalProps = {
    open: boolean;
    onClose: () => void;
    children: ReactNode;
    className?: string;
    overlayClassName?: string;
};

export default function SimpleModal({
    open,
    onClose,
    children,
    className,
    overlayClassName,
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
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <button
                type="button"
                className={
                    overlayClassName ??
                    `absolute inset-0 bg-black/70 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`
                }
                onClick={onClose}
                aria-label="Close modal"
            />
            <div
                className={
                    className ??
                    `relative z-10 w-full max-w-2xl rounded border border-white/10 bg-black/80 p-5 text-sm text-white/80 shadow-lg backdrop-blur-sm font-mono transition-all duration-200 ${visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`
                }
            >
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close modal"
                    className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded border border-white/20 text-xs text-white/70 transition hover:border-white/40 hover:text-white"
                >
                    <X />
                </button>
                {children}
            </div>
        </div>
    );
}
