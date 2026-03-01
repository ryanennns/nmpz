import { usePage } from '@inertiajs/react';
import { Settings } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import SimpleModal from '@/components/ui/simple-modal';
import NamePrompt from '@/components/welcome/Lobby/NamePrompt';
import { QueueReady } from '@/components/welcome/Lobby/QueueReady';
import SignInForm from '@/components/welcome/Lobby/SignInForm';
import SignUpForm from '@/components/welcome/Lobby/SignUpForm';
import { WaitingRoom } from '@/components/welcome/Lobby/WaitingRoom';
import type { Game, Player } from '@/components/welcome/types';
import echo from '@/echo';
import { useUnauthedApiClient } from '@/hooks/useApiClient';
import { PLAYER_ID_KEY, useLocalStorage } from '@/hooks/useLocalStorage';
import type { User } from '@/types/auth';
import { LobbyHeader } from './LobbyHeader';

const PHASE_TRANSITION_MS = 200;

export default function Lobby() {
    const api = useUnauthedApiClient();
    const localStorage = useLocalStorage();

    const { auth } = usePage<{ auth: { user: User | null } }>().props;
    const [user, setUser] = useState<User | null>(auth.user);

    const [helpOpen, setHelpOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [playerName, setPlayerName] = useState<string | undefined>(undefined);
    const [player, setPlayer] = useState<Player | undefined>(undefined);

    const [error, setError] = useState<string | undefined>(undefined);
    const [phase, setPhase] = useState<
        'guest_signin' | 'queue_ready' | 'queued' | 'sign_in' | 'sign_up'
    >('guest_signin');

    const [displayPhase, setDisplayPhase] = useState(phase);
    const [phaseVisible, setPhaseVisible] = useState(false);

    const syncAuthenticatedPlayer = (data: { player: Player; user: User }) => {
        setPlayer(data.player);
        setPlayerName(data.player.name);
        setUser(data.user);
        setPhase('queue_ready');
    };

    // on mount
    useEffect(() => {
        if (auth.user) {
            api.getAuthPlayer().then((res) => {
                if (res.status === 200) {
                    syncAuthenticatedPlayer(
                        res.data as {
                            player: Player;
                            user: User;
                        },
                    );
                } else {
                    console.error('Authenticated user has no player', res);
                }
            });
        } else {
            const key = localStorage.get(PLAYER_ID_KEY);
            if (key) {
                api.getPlayer(key).then((data) => {
                    if (data.status !== 200) {
                        setError('get fucked');

                        return;
                    }

                    setPlayer(data.data);
                    setPlayerName(data.data.name);

                    const autoQueue = new URLSearchParams(
                        window.location.search,
                    ).has('auto_queue');
                    if (autoQueue) {
                        setPhase('queued');
                        void api.joinQueue(data.data.id);
                    } else {
                        setPhase('queue_ready');
                    }
                });
            }
        }

        const fadeInFrame = window.requestAnimationFrame(() => {
            setPhaseVisible(true);
        });

        return () => {
            window.cancelAnimationFrame(fadeInFrame);
        };
    }, []);

    // set local storage player id, listen to game-ready event
    useEffect(() => {
        if (!player) {
            return;
        }

        localStorage.set(PLAYER_ID_KEY, player.id);

        const channel = echo.channel(`player.${player.id}`);

        channel.listen('.GameReady', (data: { game: Game }) => {
            console.log('game found!', data);
            window.location.assign(
                `/games/${data.game.id}?player=${player.id}`,
            );
        });

        return () => {
            echo.leaveChannel(`player.${player.id}`);
        };
    }, [localStorage, player, player?.id]);

    const submitPlayerName = async (name: string) => {
        setPlayerName(name);

        const response = await api.createPlayer(name);

        if (response.status !== 201) {
            setError('oops');

            return;
        }

        setPlayer(response.data as Player);
        setPhase('queue_ready');
    };

    const updatePlayerName = async (name: string) => {
        if (!player) {
            setPlayerName(name);
            return;
        }

        try {
            await api.updatePlayer(player.id, name);
            setPlayerName(name);
            setPlayer((currentPlayer) =>
                currentPlayer ? { ...currentPlayer, name } : currentPlayer,
            );
        } catch {
            setError('oops');
        }
    };

    const signOut = () => {
        setPhase('guest_signin');
        setTimeout(() => {
            setPlayer(undefined);
            setPlayerName(undefined);
            localStorage.remove(PLAYER_ID_KEY);
            setUser(null);
        }, 500);
    };

    // fade in transition
    useEffect(() => {
        if (phase === displayPhase) {
            return;
        }

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPhaseVisible(false);

        const swapTimeout = window.setTimeout(() => {
            setDisplayPhase(phase);

            window.requestAnimationFrame(() => {
                setPhaseVisible(true);
            });
        }, PHASE_TRANSITION_MS);

        return () => {
            window.clearTimeout(swapTimeout);
        };
    }, [displayPhase, phase]);

    const shouldDisplayHeader = useMemo(() => {
        return (
            displayPhase !== 'queued' &&
            displayPhase !== 'sign_in' &&
            displayPhase !== 'sign_up'
        );
    }, [displayPhase]);

    return (
        <div className="flex h-[100vh] items-center justify-center font-mono">
            <div className="flex w-72 max-w-sm flex-col items-center gap-4">
                <div
                    className={`flex w-full flex-col items-center gap-4 transition-opacity duration-200 ${
                        phaseVisible ? 'opacity-100' : 'opacity-0'
                    }`}
                >
                    {shouldDisplayHeader && (
                        <>
                            <LobbyHeader onClick={() => setHelpOpen(true)} />
                            <button
                                type="button"
                                onClick={() => setSettingsOpen(true)}
                                aria-label="Open settings"
                                className="group fixed bottom-4 left-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white"
                            >
                                <Settings className="h-4 w-4 transition-transform duration-300 group-hover:rotate-180" />
                            </button>
                        </>
                    )}
                    {displayPhase === 'guest_signin' && (
                        <NamePrompt
                            onSubmit={submitPlayerName}
                            onSignIn={() => setPhase('sign_in')}
                            error={!!error}
                        />
                    )}
                    {displayPhase === 'sign_in' && (
                        <SignInForm
                            api={api}
                            onBack={() => setPhase('guest_signin')}
                            onSuccess={() => {
                                api.getAuthPlayer().then((res) => {
                                    syncAuthenticatedPlayer(
                                        res.data as {
                                            player: Player;
                                            user: User;
                                        },
                                    );
                                });
                            }}
                        />
                    )}
                    {displayPhase === 'sign_up' && (
                        <SignUpForm
                            api={api}
                            playerId={player!.id}
                            onBack={() => setPhase('queue_ready')}
                            onSuccess={(player, user) => {
                                setPlayer(player);
                                setPlayerName(player.name);
                                setUser(user);
                                setPhase('queue_ready');
                            }}
                        />
                    )}
                    {displayPhase === 'queue_ready' && (
                        <QueueReady
                            playerName={playerName || ''}
                            onJoinQueue={() => {
                                setPhase('queued');
                                void api.joinQueue(player!.id);
                            }}
                            onEditName={(name) => {
                                void updatePlayerName(name);
                            }}
                            isAuthenticated={!!user}
                            onSignUp={() => setPhase('sign_up')}
                            onSignOut={signOut}
                        />
                    )}
                    {displayPhase === 'queued' && (
                        <WaitingRoom
                            playerName={playerName || ''}
                            onLeaveQueue={() => {
                                setPhase('queue_ready');
                                void api.leaveQueue(player!.id);
                            }}
                            active={displayPhase === 'queued'}
                        />
                    )}
                </div>
                <SimpleModal open={helpOpen} onClose={() => setHelpOpen(false)}>
                    <div className="mb-2 text-2xl text-white/50">
                        what is <span className="text-white/80">nmpz</span>
                        <span className="text-white/40">.dev</span>?
                    </div>
                    <p className="mb-2 leading-relaxed">
                        nmpz.dev is my quick and dirty attempt creating the
                        GeoGuessr competitive experience in a simple,
                        KISS-adherent format that is free and usable for anyone
                        to enjoy.
                    </p>
                    <p className="leading-relaxed">
                        please understand that this app is <b>not secure</b>,
                        not feature complete, and <b>likely very buggy</b>.
                        while i have done my best to architecturally guide it,
                        the overwhelming majority of the code has been written
                        by various a.i. agents that, while capable, i certainly
                        wouldn't trust with my life.
                    </p>
                    <p className="mt-4 font-bold">- ryan :)</p>
                </SimpleModal>
                <SimpleModal
                    open={settingsOpen}
                    onClose={() => setSettingsOpen(false)}
                >
                    <div className="mb-2 text-2xl text-white/80">settings</div>
                    <p className="mb-2 leading-relaxed text-white/70">
                        this is a placeholder settings panel for the lobby.
                    </p>
                    <p className="leading-relaxed text-white/50">
                        add preferences here when the settings flow is ready.
                    </p>
                </SimpleModal>
            </div>
        </div>
    );
}
