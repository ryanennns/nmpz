import axios from 'axios';
import { useEffect, useState } from 'react';
import { useApiClient } from '@/hooks/useApiClient';

type Friend = {
    friendship_id: string;
    player_id: string;
    name: string;
    elo_rating: number;
    rank: string;
};

type PendingRequest = {
    friendship_id: string;
    player_id: string;
    name: string;
    elo_rating: number;
};

export default function FriendsPanel({
    playerId,
    onViewProfile,
}: {
    playerId: string;
    onViewProfile?: (playerId: string) => void;
}) {
    const api = useApiClient(playerId);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [pending, setPending] = useState<PendingRequest[]>([]);
    const [tab, setTab] = useState<'list' | 'pending' | 'add'>('list');
    const [loading, setLoading] = useState(true);
    const [addId, setAddId] = useState('');
    const [addError, setAddError] = useState<string | null>(null);
    const [addSuccess, setAddSuccess] = useState<string | null>(null);

    function loadFriends() {
        api.fetchFriends()
            .then((res) => setFriends(res.data as Friend[]))
            .catch(() => {});
    }

    function loadPending() {
        api.fetchPendingFriends()
            .then((res) => setPending(res.data as PendingRequest[]))
            .catch(() => {});
    }

    useEffect(() => {
        Promise.all([api.fetchFriends(), api.fetchPendingFriends()])
            .then(([friendsRes, pendingRes]) => {
                setFriends(friendsRes.data as Friend[]);
                setPending(pendingRes.data as PendingRequest[]);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    async function sendRequest() {
        if (!addId.trim()) return;
        setAddError(null);
        setAddSuccess(null);
        try {
            const res = await api.sendFriendRequest(addId.trim());
            const data = res.data as { status: string };
            setAddSuccess(data.status === 'accepted' ? 'Friend added!' : 'Request sent!');
            setAddId('');
            loadFriends();
            loadPending();
        } catch (e) {
            if (axios.isAxiosError(e)) {
                setAddError((e.response?.data as { error?: string })?.error ?? 'Failed to send');
            }
        }
    }

    async function acceptRequest(friendshipId: string) {
        await api.acceptFriendRequest(friendshipId);
        loadFriends();
        loadPending();
    }

    async function declineRequest(friendshipId: string) {
        await api.declineFriendRequest(friendshipId);
        loadPending();
    }

    async function removeFriend(friendshipId: string) {
        await api.removeFriend(friendshipId);
        loadFriends();
    }

    if (loading) {
        return (
            <div className="w-full rounded border border-white/10 bg-black/60 p-4 text-center text-xs text-white/40 backdrop-blur-sm">
                Loading friends...
            </div>
        );
    }

    return (
        <div className="w-full rounded border border-white/10 bg-black/60 p-3 backdrop-blur-sm">
            <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-white/60">Friends</span>
                {pending.length > 0 && (
                    <span className="rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[10px] text-blue-400">
                        {pending.length} pending
                    </span>
                )}
            </div>

            <div className="mb-2 flex gap-1">
                <button
                    type="button"
                    onClick={() => setTab('list')}
                    className={`rounded px-2 py-0.5 text-[10px] transition ${tab === 'list' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                >
                    Friends ({friends.length})
                </button>
                <button
                    type="button"
                    onClick={() => setTab('pending')}
                    className={`rounded px-2 py-0.5 text-[10px] transition ${tab === 'pending' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                >
                    Pending ({pending.length})
                </button>
                <button
                    type="button"
                    onClick={() => setTab('add')}
                    className={`rounded px-2 py-0.5 text-[10px] transition ${tab === 'add' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                >
                    Add
                </button>
            </div>

            {tab === 'list' && (
                <div className="max-h-48 space-y-1 overflow-y-auto">
                    {friends.length === 0 ? (
                        <div className="text-center text-[10px] text-white/30">No friends yet</div>
                    ) : (
                        friends.map((f) => (
                            <div
                                key={f.friendship_id}
                                className="flex items-center justify-between rounded bg-white/5 px-2 py-1.5 text-[10px]"
                            >
                                <button
                                    type="button"
                                    onClick={() => onViewProfile?.(f.player_id)}
                                    className="flex items-center gap-2 text-left hover:text-white/90"
                                >
                                    <span className="text-white/80">{f.name}</span>
                                    <span className="text-white/30">{f.rank}</span>
                                    <span className="text-white/20">{f.elo_rating}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void removeFriend(f.friendship_id)}
                                    className="text-red-400/40 transition hover:text-red-400"
                                >
                                    x
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}

            {tab === 'pending' && (
                <div className="max-h-48 space-y-1 overflow-y-auto">
                    {pending.length === 0 ? (
                        <div className="text-center text-[10px] text-white/30">No pending requests</div>
                    ) : (
                        pending.map((p) => (
                            <div
                                key={p.friendship_id}
                                className="flex items-center justify-between rounded bg-white/5 px-2 py-1.5 text-[10px]"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-white/80">{p.name}</span>
                                    <span className="text-white/20">{p.elo_rating}</span>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        type="button"
                                        onClick={() => void acceptRequest(p.friendship_id)}
                                        className="rounded bg-green-500/20 px-1.5 py-0.5 text-green-400 transition hover:bg-green-500/30"
                                    >
                                        Accept
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void declineRequest(p.friendship_id)}
                                        className="rounded bg-red-500/20 px-1.5 py-0.5 text-red-400 transition hover:bg-red-500/30"
                                    >
                                        Decline
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {tab === 'add' && (
                <div className="space-y-2">
                    <div className="text-[10px] text-white/30">
                        Enter a player ID to send a friend request
                    </div>
                    <div className="flex gap-1">
                        <input
                            value={addId}
                            onChange={(e) => setAddId(e.target.value)}
                            placeholder="Player ID"
                            className="flex-1 rounded bg-white/10 px-2 py-1 text-[10px] text-white placeholder:text-white/30"
                        />
                        <button
                            onClick={() => void sendRequest()}
                            disabled={!addId.trim()}
                            className="rounded bg-white/10 px-2 py-1 text-[10px] text-white hover:bg-white/20 disabled:opacity-30"
                        >
                            Send
                        </button>
                    </div>
                    {addError && <div className="text-[10px] text-red-400">{addError}</div>}
                    {addSuccess && <div className="text-[10px] text-green-400">{addSuccess}</div>}
                </div>
            )}
        </div>
    );
}
