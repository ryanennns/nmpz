import { useState } from 'react';
import SimpleModal from '@/components/ui/simple-modal';
import { QueueReady } from '@/components/welcome/Lobby/QueueReady';
import NamePrompt from '@/components/welcome/NamePrompt';
import { WaitingRoom } from '@/components/welcome/WaitingRoom';
import { useUnauthedApiClient } from '@/hooks/useApiClient';
import { LobbyHeader } from './LobbyHeader';

export default function Lobby() {
    const api = useUnauthedApiClient();

    const [error, setError] = useState<string | undefined>(undefined);

    const [helpOpen, setHelpOpen] = useState(false);
    const [playerName, setPlayerName] = useState<string | undefined>(undefined);
    const submitGuestPlayerName = async (name: string) => {
        setPlayerName(name);

        const response = await api.createPlayer(name);

        if (response.status !== 201) {
            setError('oops');
        }

        setPhase('queue_ready');
    };
    const [phase, setPhase] = useState<
        'guest_signin' | 'queue_ready' | 'queued'
    >('guest_signin');

    return (
        <div className="flex h-[100vh] items-center justify-center font-mono">
            <div className="flex w-72 max-w-sm flex-col items-center gap-4">
                {phase !== 'queued' && (
                    <LobbyHeader onClick={() => setHelpOpen(true)} />
                )}
                {phase === 'guest_signin' && (
                    <NamePrompt
                        onSubmit={submitGuestPlayerName}
                        error={!!error}
                    />
                )}
                {phase === 'queue_ready' && (
                    <QueueReady
                        playerName={playerName || ''}
                        onJoinQueue={() => setPhase('queued')}
                        onEditName={() => 0}
                    />
                )}
                {phase === 'queued' && (
                    <WaitingRoom
                        playerName={playerName || ''}
                        onLeaveQueue={() => setPhase('queue_ready')}
                        active={phase === 'queued'}
                    />
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
            </div>
        </div>
    );
}
