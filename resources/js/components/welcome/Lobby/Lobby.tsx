import { usePage } from '@inertiajs/react';
import { clsx } from 'clsx';
import { Settings } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import SimpleModal from '@/components/ui/simple-modal';
import Toast from '@/components/ui/toast';
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
import SettingsModal from './SettingsModal';

const PHASE_TRANSITION_MS = 200;

export default function Lobby() {
    const api = useUnauthedApiClient();
    const localStorage = useLocalStorage();

    const { auth } = usePage<{ auth: { user: User | null } }>().props;
    const [user, setUser] = useState<User | null>(auth.user);

    const [helpOpen, setHelpOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [player, setPlayer] = useState<Player | undefined>(undefined);
    const [showGuestProgressToast, setShowGuestProgressToast] = useState(false);
    const [highestSingleplayerScore, setHighestSingleplayerScore] = useState<
        number | undefined
    >(undefined);

    const [phase, setPhase] = useState<
        'guest_signin' | 'queue_ready' | 'queued' | 'sign_in' | 'sign_up'
    >('guest_signin');

    const [displayPhase, setDisplayPhase] = useState(phase);
    const [phaseVisible, setPhaseVisible] = useState(false);

    const syncAuthenticatedPlayer = (data: { player: Player; user: User }) => {
        setHighestSingleplayerScore(undefined);
        setPlayer(data.player);
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

                    if (
                        new URLSearchParams(window.location.search).has(
                            'auto_queue',
                        )
                    ) {
                        setPhase('queued');
                        void api.joinQueue(res.data.player.id);
                    } else {
                        setPhase('queue_ready');
                    }
                } else {
                    console.error('Authenticated user has no player', res);
                }
            });
        } else {
            const key = localStorage.get(PLAYER_ID_KEY);
            if (key) {
                api.getPlayer(key)
                    .then((data) => {
                        setHighestSingleplayerScore(undefined);
                        setPlayer(data.data);
                        setShowGuestProgressToast(true);

                        const autoQueue = new URLSearchParams(
                            window.location.search,
                        ).has('auto_queue');
                        if (autoQueue) {
                            setPhase('queued');
                            void api.joinQueue(data.data.id);
                        } else {
                            setPhase('queue_ready');
                        }
                    })
                    .catch(() => localStorage.remove(PLAYER_ID_KEY));
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
        api.getPlayerStats(player.id)
            .then((res) => {
                const score = (
                    res.data as { highest_singleplayer_score?: number }
                ).highest_singleplayer_score;
                setHighestSingleplayerScore(
                    typeof score === 'number' ? score : 0,
                );
            })
            .catch(() => {
                setHighestSingleplayerScore(undefined);
            });

        const channel = echo.channel(`player.${player.id}`);

        channel.listen('.GameReady', (data: { game: Game }) => {
            console.log('game found!', data);
            window.location.assign(
                `/games/${data.game.id}?player_id=${player.id}`,
            );
        });

        return () => {
            echo.leaveChannel(`player.${player.id}`);
        };
    }, [player, player?.id]);

    const submitPlayerName = async (name: string) => {
        const response = await api.createPlayer(name);

        if (response.status !== 201) {
            return;
        }

        setHighestSingleplayerScore(undefined);
        setPlayer(response.data as Player);
        setPhase('queue_ready');
    };

    const updatePlayerName = async (name: string) => {
        if (!player) {
            return;
        }

        await api.updatePlayer(player.id, name);
        setPlayer((currentPlayer) =>
            currentPlayer ? { ...currentPlayer, name } : currentPlayer,
        );
    };

    const signOut = () => {
        setShowGuestProgressToast(false);
        setPhase('guest_signin');
        setTimeout(() => {
            setHighestSingleplayerScore(undefined);
            setPlayer(undefined);
            localStorage.remove(PLAYER_ID_KEY);
            setUser(null);
        }, 500);
    };

    const reviewLocations = () => {
        setPhaseVisible(false);
        window.setTimeout(() => {
            window.location.assign(
                player && !user
                    ? `/locations/reports?player_id=${player.id}`
                    : '/locations/reports',
            );
        }, PHASE_TRANSITION_MS);
    };

    const startSingleplayer = () => {
        if (!player) {
            return;
        }

        setPhaseVisible(false);

        void api
            .startSoloGame(player.id)
            .then((response) => {
                window.setTimeout(() => {
                    window.location.assign(
                        `/singleplayer/${response.data.game_id}?player_id=${player.id}`,
                    );
                }, PHASE_TRANSITION_MS);
            })
            .catch(() => {
                setPhaseVisible(true);
            });
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
                    className={clsx(
                        `flex w-full flex-col items-center gap-4 transition-opacity duration-200`,
                        phaseVisible ? 'opacity-100' : 'opacity-0',
                    )}
                >
                    {shouldDisplayHeader && (
                        <>
                            <div>
                                <LobbyHeader
                                    onClick={() => setHelpOpen(true)}
                                />
                                <p className={'max-w-60 text-xs'}>
                                    a simple, free geography game
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSettingsOpen(true)}
                                aria-label="Open settings"
                                className="group fixed bottom-4 left-4 flex h-8 w-8 items-center justify-center rounded-full bg-p1/10 text-p1/60 transition hover:bg-p1/20 hover:text-p1"
                            >
                                <Settings className="h-4 w-4 transition-transform duration-300 group-hover:rotate-180" />
                            </button>
                        </>
                    )}
                    {displayPhase === 'guest_signin' && (
                        <NamePrompt
                            onSubmit={submitPlayerName}
                            onSignIn={() => setPhase('sign_in')}
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
                            playerId={player!.id}
                            onBack={() => setPhase('queue_ready')}
                            onSuccess={(player, user) => {
                                setPlayer(player);
                                setUser(user);
                                setPhase('queue_ready');
                            }}
                        />
                    )}
                    {displayPhase === 'queue_ready' && (
                        <QueueReady
                            playerName={player?.name || ''}
                            playerId={player?.id}
                            onJoinQueue={() => {
                                setPhase('queued');
                                void api.joinQueue(player!.id);
                            }}
                            onSinglePlayer={startSingleplayer}
                            onEditName={(name) => {
                                void updatePlayerName(name);
                            }}
                            highestSingleplayerScore={highestSingleplayerScore}
                            isAuthenticated={!!user}
                            onSignUp={() => setPhase('sign_up')}
                            onReviewLocations={reviewLocations}
                            onSignOut={signOut}
                        />
                    )}
                    {displayPhase === 'queued' && (
                        <WaitingRoom
                            playerName={player?.name || ''}
                            onLeaveQueue={() => {
                                setPhase('queue_ready');
                                void api.leaveQueue(player!.id);
                            }}
                            active={displayPhase === 'queued'}
                        />
                    )}
                </div>
                {showGuestProgressToast && player && !user && (
                    <Toast
                        data-testid="guest-progress-toast"
                        dismissLabel="Dismiss progress toast"
                        onDismiss={() => setShowGuestProgressToast(false)}
                    >
                        <p className="leading-relaxed text-zinc-200">
                            want to save your progress? create an account to
                            keep this player.
                        </p>
                    </Toast>
                )}
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
                <SettingsModal
                    open={settingsOpen}
                    onClose={() => setSettingsOpen(false)}
                    player={player}
                    user={user}
                    onSignOut={signOut}
                />
            </div>
        </div>
    );
}
