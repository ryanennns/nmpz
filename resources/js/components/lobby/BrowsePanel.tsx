import React, { useEffect, useRef, useState } from 'react';
import AchievementsPanel from '@/components/welcome/AchievementsPanel';
import FriendsPanel from '@/components/welcome/FriendsPanel';
import GameHistoryPanel from '@/components/welcome/GameHistoryPanel';
import Leaderboard from '@/components/welcome/Leaderboard';
import LiveGamesList from '@/components/welcome/LiveGamesList';
import PlayerStatsPanel from '@/components/welcome/PlayerStatsPanel';
import SeasonPanel from '@/components/welcome/SeasonPanel';
import SoloLeaderboardPanel from '@/components/welcome/SoloLeaderboardPanel';
import { Eye, User, Users } from 'lucide-react';

type ActiveGroup = 'none' | 'profile' | 'community' | 'watch';
type ProfileTab = 'stats' | 'history' | 'achievements' | 'season' | 'solo';
type CommunityTab = 'leaderboard' | 'friends';

function Divider({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 border-t border-white/10" />
            <span className="shrink-0 text-[10px] uppercase tracking-widest text-white/25">{label}</span>
            <div className="flex-1 border-t border-white/10" />
        </div>
    );
}

const GROUP_BUTTONS: { key: ActiveGroup; label: string; icon: React.ReactNode }[] = [
    { key: 'profile', label: 'Profile', icon: <User size={14} /> },
    { key: 'community', label: 'Community', icon: <Users size={14} /> },
    { key: 'watch', label: 'Watch', icon: <Eye size={14} /> },
];

const PROFILE_TABS: { key: ProfileTab; label: string }[] = [
    { key: 'stats', label: 'stats' },
    { key: 'history', label: 'history' },
    { key: 'achievements', label: 'achievements' },
    { key: 'season', label: 'season' },
    { key: 'solo', label: 'solo' },
];

const COMMUNITY_TABS: { key: CommunityTab; label: string }[] = [
    { key: 'leaderboard', label: 'leaderboard' },
    { key: 'friends', label: 'friends' },
];

export default function BrowsePanel({
    playerId,
    onViewDetail,
    onViewReplay,
    onViewProfile,
}: {
    playerId: string;
    onViewDetail: (id: string) => void;
    onViewReplay: (id: string) => void;
    onViewProfile: (id: string) => void;
}) {
    const [activeGroup, setActiveGroup] = useState<ActiveGroup>('none');
    const [profileTab, setProfileTab] = useState<ProfileTab>('stats');
    const [communityTab, setCommunityTab] = useState<CommunityTab>('leaderboard');
    const [mountedPanels, setMountedPanels] = useState<Set<string>>(new Set());
    const [visibleKey, setVisibleKey] = useState<string | null>(null);
    const panelWrapperRef = useRef<HTMLDivElement>(null);
    const fadeRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    function activePanelKey(): string | null {
        if (activeGroup === 'profile') return `profile-${profileTab}`;
        if (activeGroup === 'community') return `community-${communityTab}`;
        if (activeGroup === 'watch') return 'watch';
        return null;
    }

    const targetKey = activePanelKey();

    useEffect(() => {
        if (targetKey && !mountedPanels.has(targetKey)) {
            setMountedPanels((prev) => new Set(prev).add(targetKey));
        }
    }, [targetKey]);

    useEffect(() => {
        if (targetKey === visibleKey) return;
        clearTimeout(fadeRef.current);

        const wrapper = panelWrapperRef.current;

        if (!visibleKey || !wrapper) {
            setVisibleKey(targetKey);
            if (wrapper) {
                wrapper.style.opacity = '0';
                requestAnimationFrame(() => {
                    wrapper.style.transition = 'opacity 250ms ease';
                    wrapper.style.opacity = '1';
                });
            }
            return;
        }

        wrapper.style.transition = 'opacity 200ms ease';
        wrapper.style.opacity = '0';

        fadeRef.current = setTimeout(() => {
            setVisibleKey(targetKey);
            requestAnimationFrame(() => {
                wrapper.style.opacity = '1';
            });
        }, 200);

        return () => clearTimeout(fadeRef.current);
    }, [targetKey]);

    const panelComponents: Record<string, React.ReactNode> = {
        'profile-stats': <PlayerStatsPanel playerId={playerId} />,
        'profile-history': (
            <GameHistoryPanel
                playerId={playerId}
                onViewDetail={onViewDetail}
                onViewReplay={onViewReplay}
            />
        ),
        'profile-achievements': <AchievementsPanel playerId={playerId} />,
        'profile-season': <SeasonPanel playerId={playerId} />,
        'profile-solo': <SoloLeaderboardPanel playerId={playerId} />,
        'community-leaderboard': <Leaderboard playerId={playerId} />,
        'community-friends': (
            <FriendsPanel
                playerId={playerId}
                onViewProfile={onViewProfile}
            />
        ),
        'watch': <LiveGamesList playerId={playerId} />,
    };

    return (
        <>
            <div className="px-4">
                <Divider label="browse" />
            </div>
            <div className="px-4 py-3">
                <div className="flex justify-center gap-1">
                    {GROUP_BUTTONS.map(({ key, label, icon }) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setActiveGroup(activeGroup === key ? 'none' : key)}
                            className={`flex items-center gap-1.5 border px-3 py-1.5 text-xs transition ${
                                activeGroup === key
                                    ? 'border-white/25 bg-white/10 text-white'
                                    : 'border-white/10 text-white/35 hover:bg-white/5 hover:text-white/50'
                            }`}
                        >
                            {icon}
                            {label}
                        </button>
                    ))}
                </div>

                {activeGroup === 'profile' && (
                    <div className="mt-2 flex justify-center gap-0 border-b border-white/10">
                        {PROFILE_TABS.map(({ key, label }) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setProfileTab(key)}
                                className={`px-3 py-1 text-[10px] transition ${
                                    profileTab === key
                                        ? 'border-b border-white/40 text-white'
                                        : 'text-white/30 hover:text-white/50'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                )}
                {activeGroup === 'community' && (
                    <div className="mt-2 flex justify-center gap-0 border-b border-white/10">
                        {COMMUNITY_TABS.map(({ key, label }) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setCommunityTab(key)}
                                className={`px-3 py-1 text-[10px] transition ${
                                    communityTab === key
                                        ? 'border-b border-white/40 text-white'
                                        : 'text-white/30 hover:text-white/50'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                )}

                {activeGroup !== 'none' && (
                    <div ref={panelWrapperRef} className="mt-3">
                        {Array.from(mountedPanels).map((key) => (
                            <div
                                key={key}
                                style={{ display: key === visibleKey ? 'block' : 'none' }}
                            >
                                {panelComponents[key]}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
