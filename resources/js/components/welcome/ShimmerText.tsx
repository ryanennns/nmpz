import type { ReactNode } from 'react';

export default function ShimmerText({ children }: { children: ReactNode }) {
    return <span className="text-shimmer">{children}</span>;
}
