import { useState } from 'react';
import MapSelector from '@/components/welcome/MapSelector';
import type { PrivateLobby } from '@/components/welcome/types';
import { useApiClient } from '@/hooks/useApiClient';

export default function PrivateLobbyPanel({
    playerId,
    onClose,
}: {
    playerId: string;
    onClose: () => void;
}) {
    const api = useApiClient(playerId);
    const [tab, setTab] = useState<'create' | 'join'>('create');
    const [lobby, setLobby] = useState<PrivateLobby | null>(null);
    const [joinCode, setJoinCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [joining, setJoining] = useState(false);
    const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
    const [matchFormat, setMatchFormat] = useState('classic');

    async function createLobby() {
        setCreating(true);
        setError(null);
        try {
            const res = await api.createPrivateLobby(
                selectedMapId ?? undefined,
                matchFormat !== 'classic' ? matchFormat : undefined,
            );
            setLobby(res.data as PrivateLobby);
        } catch {
            setError('Failed to create lobby');
        }
        setCreating(false);
    }

    async function cancelLobby() {
        if (!lobby) return;
        try {
            await api.cancelPrivateLobby(lobby.lobby_id);
        } catch { /* ignore */ }
        setLobby(null);
    }

    async function joinLobby() {
        const code = joinCode.trim().toUpperCase();
        if (code.length !== 6) {
            setError('Code must be 6 characters');
            return;
        }
        setJoining(true);
        setError(null);
        try {
            await api.joinPrivateLobby(code);
            // Game will be received via GameReady event through useMatchmakingChannel
        } catch {
            setError('Lobby not found or expired');
        }
        setJoining(false);
    }

    const tabClass = (t: string) =>
        `flex-1 rounded-t px-3 py-1 text-xs transition ${tab === t ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`;

    return (
        <div className="w-full max-w-sm rounded border border-white/10 bg-black/60 p-3 backdrop-blur-sm">
            <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-white/60">Private Match</span>
                <button onClick={onClose} className="text-xs text-white/30 hover:text-white/60">
                    Close
                </button>
            </div>
            <div className="mb-2 flex gap-1">
                <button onClick={() => setTab('create')} className={tabClass('create')}>
                    Create
                </button>
                <button onClick={() => setTab('join')} className={tabClass('join')}>
                    Join
                </button>
            </div>

            {tab === 'create' && (
                <div className="space-y-2">
                    {lobby ? (
                        <div className="text-center">
                            <div className="text-xs text-white/50">Share this code:</div>
                            <div className="my-2 font-mono text-2xl font-bold tracking-widest text-white">
                                {lobby.invite_code}
                            </div>
                            <div className="text-xs text-white/30">Waiting for opponent...</div>
                            <button
                                onClick={() => void cancelLobby()}
                                className="mt-2 rounded bg-white/10 px-3 py-1 text-xs text-white/60 hover:bg-white/20"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <>
                            <MapSelector playerId={playerId} selectedMapId={selectedMapId} onSelect={setSelectedMapId} />
                            <select
                                value={matchFormat}
                                onChange={(e) => setMatchFormat(e.target.value)}
                                className="w-full rounded bg-white/10 px-2 py-1 text-xs text-white"
                            >
                                <option value="classic">Classic (Health)</option>
                                <option value="bo3">Best of 3</option>
                                <option value="bo5">Best of 5</option>
                                <option value="bo7">Best of 7</option>
                            </select>
                            <button
                                onClick={() => void createLobby()}
                                disabled={creating}
                                className="w-full rounded bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20 disabled:opacity-30"
                            >
                                {creating ? 'Creating...' : 'Create Lobby'}
                            </button>
                        </>
                    )}
                </div>
            )}

            {tab === 'join' && (
                <div className="space-y-2">
                    <input
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                        placeholder="Enter 6-char code"
                        maxLength={6}
                        className="w-full rounded bg-white/10 px-2 py-1 text-center font-mono text-sm tracking-widest text-white uppercase placeholder:text-white/30"
                    />
                    <button
                        onClick={() => void joinLobby()}
                        disabled={joining || joinCode.length !== 6}
                        className="w-full rounded bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20 disabled:opacity-30"
                    >
                        {joining ? 'Joining...' : 'Join Lobby'}
                    </button>
                </div>
            )}

            {error && <div className="mt-2 text-xs text-red-300">{error}</div>}
        </div>
    );
}
