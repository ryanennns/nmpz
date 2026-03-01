import { useMemo } from 'react';
import { useGameContext } from '@/components/welcome/GameContext';
import { createClient } from '@/hooks/api/client';
import { multiplayerApi } from '@/hooks/api/multiplayer';
import { soloApi } from '@/hooks/api/solo';
import { dailyApi } from '@/hooks/api/daily';
import { socialApi } from '@/hooks/api/social';
import { metaApi } from '@/hooks/api/meta';

export function useApiClient(playerId: string) {
    const client = useMemo(() => createClient(), []);
    const { game } = useGameContext();

    return {
        ...multiplayerApi(client, playerId, game),
        ...soloApi(client, playerId),
        ...dailyApi(client, playerId),
        ...socialApi(client, playerId),
        ...metaApi(client, playerId),
        client,
    };
}
