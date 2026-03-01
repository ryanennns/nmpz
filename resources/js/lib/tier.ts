export function tierColor(tier: string | null | undefined): string {
    if (tier === 'gold') return 'text-yellow-400';
    if (tier === 'silver') return 'text-gray-300';
    if (tier === 'bronze') return 'text-amber-700';
    return 'text-white/40';
}

export function tierBg(tier: string | null | undefined): string {
    if (tier === 'gold') return 'bg-yellow-400/20 text-yellow-400';
    if (tier === 'silver') return 'bg-gray-300/20 text-gray-300';
    if (tier === 'bronze') return 'bg-amber-700/20 text-amber-700';
    return 'bg-white/10 text-white/40';
}
