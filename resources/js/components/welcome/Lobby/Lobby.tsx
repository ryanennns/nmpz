import { useEffect, useState } from 'react';
import SimpleModal from '@/components/ui/simple-modal';
import { QueueReady } from '@/components/welcome/Lobby/QueueReady';
import NamePrompt from '@/components/welcome/NamePrompt';
import type { Game, Player } from '@/components/welcome/types';
import { WaitingRoom } from '@/components/welcome/WaitingRoom';
import echo from '@/echo';
import { useUnauthedApiClient } from '@/hooks/useApiClient';
import { LobbyHeader } from './LobbyHeader';

const PHASE_TRANSITION_MS = 200;

export default function Lobby() {
    const api = useUnauthedApiClient();

    const [error, setError] = useState<string | undefined>(undefined);

    const [helpOpen, setHelpOpen] = useState(false);
    const [playerName, setPlayerName] = useState<string | undefined>(undefined);

    const [player, setPlayer] = useState<Player | undefined>(undefined);
    useEffect(() => {
        if (!player) {
            return;
        }

        const channel = echo.channel(`player.${player!.id}`);

        channel.listen('.GameReady', (data: { game: Game }) => {
            console.log('game found!', data);
            window.location.assign(
                `/game/${data.game.id}?player=${player!.id}`,
            );
        });

        return () => {
            echo.leaveChannel(`player.${player!.id}`);
        };
    }, [player, player?.id]);

    const submitGuestPlayerName = async (name: string) => {
        setPlayerName(name);

        const response = await api.createPlayer(name);

        if (response.status !== 201) {
            setError('oops');

            return;
        }

        setPlayer(response.data as Player);

        setPhase('queue_ready');
    };

    const editPlayerName = async (name: string) => {
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

    const [phase, setPhase] = useState<
        'guest_signin' | 'queue_ready' | 'queued'
    >('guest_signin');

    const [displayPhase, setDisplayPhase] = useState(phase);
    const [phaseVisible, setPhaseVisible] = useState(false);

    useEffect(() => {
        const fadeInFrame = window.requestAnimationFrame(() => {
            setPhaseVisible(true);
        });

        return () => {
            window.cancelAnimationFrame(fadeInFrame);
        };
    }, []);

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

    return (
        <div className="flex h-[100vh] items-center justify-center font-mono">
            <div className="flex w-72 max-w-sm flex-col items-center gap-4">
                <div
                    className={`flex w-full flex-col items-center gap-4 transition-opacity duration-200 ${
                        phaseVisible ? 'opacity-100' : 'opacity-0'
                    }`}
                >
                    {displayPhase !== 'queued' && (
                        <LobbyHeader onClick={() => setHelpOpen(true)} />
                    )}
                    {displayPhase === 'guest_signin' && (
                        <NamePrompt
                            onSubmit={submitGuestPlayerName}
                            error={!!error}
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
                                void editPlayerName(name);
                            }}
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
            </div>
        </div>
    );
}
