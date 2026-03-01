import { lazy, Suspense } from 'react';
import MapSelector from '@/components/welcome/MapSelector';
import PrivateLobbyPanel from '@/components/welcome/PrivateLobbyPanel';

const SoloPlayPanel = lazy(() => import('@/components/welcome/SoloPlayPanel'));
const DailyChallengePanel = lazy(() => import('@/components/welcome/DailyChallengePanel'));

function Divider({ label }: { label?: string }) {
    if (!label) {
        return <div className="border-t border-white/10" />;
    }
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 border-t border-white/10" />
            <span className="shrink-0 text-[10px] uppercase tracking-widest text-white/25">{label}</span>
            <div className="flex-1 border-t border-white/10" />
        </div>
    );
}

export default function PlayModeSelector({
    playerId,
    playMode,
    setPlayMode,
    selectedMapId,
    setSelectedMapId,
    selectedFormat,
    setSelectedFormat,
    queueCount,
    privateLobbyOpen,
    setPrivateLobbyOpen,
    onJoinQueue,
}: {
    playerId: string;
    playMode: 'none' | 'multiplayer' | 'solo';
    setPlayMode: (m: 'none' | 'multiplayer' | 'solo') => void;
    selectedMapId: string | null;
    setSelectedMapId: (id: string | null) => void;
    selectedFormat: string;
    setSelectedFormat: (f: string) => void;
    queueCount: number;
    privateLobbyOpen: boolean;
    setPrivateLobbyOpen: (o: boolean) => void;
    onJoinQueue: () => void;
}) {
    return (
        <>
            <div className="px-4">
                <Divider label="play" />
            </div>
            <div className="px-4 py-3">
                <div className="flex justify-center gap-1">
                    <button
                        type="button"
                        onClick={() => setPlayMode(playMode === 'multiplayer' ? 'none' : 'multiplayer')}
                        className={`flex-1 border px-3 py-1.5 text-xs transition ${
                            playMode === 'multiplayer'
                                ? 'border-white/25 bg-white/10 text-white'
                                : 'border-white/10 text-white/35 hover:bg-white/5 hover:text-white/50'
                        }`}
                    >
                        Multiplayer
                    </button>
                    <button
                        type="button"
                        onClick={() => setPlayMode(playMode === 'solo' ? 'none' : 'solo')}
                        className={`flex-1 border px-3 py-1.5 text-xs transition ${
                            playMode === 'solo'
                                ? 'border-white/25 bg-white/10 text-white'
                                : 'border-white/10 text-white/35 hover:bg-white/5 hover:text-white/50'
                        }`}
                    >
                        Solo
                    </button>
                </div>

                {playMode === 'multiplayer' && (
                    <div className="mt-3 space-y-2 text-center">
                        <MapSelector
                            playerId={playerId}
                            selectedMapId={selectedMapId}
                            onSelect={setSelectedMapId}
                        />
                        <select
                            value={selectedFormat}
                            onChange={(e) => setSelectedFormat(e.target.value)}
                            className="w-full bg-white/5 px-2 py-1.5 text-center text-xs text-white focus:outline-none focus:ring-1 focus:ring-white/20"
                        >
                            <option value="classic">Classic (Health)</option>
                            <option value="bo3">Best of 3</option>
                            <option value="bo5">Best of 5</option>
                            <option value="bo7">Best of 7</option>
                        </select>
                        <button
                            onClick={onJoinQueue}
                            className="w-full border border-white/20 py-2 text-sm text-white transition hover:bg-white/5"
                        >
                            [ join queue ]
                        </button>
                        <button
                            onClick={() => setPrivateLobbyOpen(!privateLobbyOpen)}
                            className="w-full border border-white/10 py-1.5 text-xs text-white/50 transition hover:bg-white/5"
                        >
                            [ private match ]
                        </button>
                        {privateLobbyOpen && (
                            <PrivateLobbyPanel
                                playerId={playerId}
                                onClose={() => setPrivateLobbyOpen(false)}
                            />
                        )}
                        <div className="text-[10px] text-white/25">
                            {queueCount} player{queueCount === 1 ? '' : 's'} queued
                        </div>
                    </div>
                )}

                {playMode === 'solo' && (
                    <Suspense fallback={<div className="py-4 text-center text-xs text-white/30">Loading...</div>}>
                        <div className="mt-3 space-y-3">
                            <SoloPlayPanel playerId={playerId} />
                            <Divider label="daily" />
                            <DailyChallengePanel playerId={playerId} />
                        </div>
                    </Suspense>
                )}
            </div>
        </>
    );
}
