import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from 'sonner';

type GameState = any;

interface UseMultiplayerGameProps {
    gameId: string;
    roomId: string;
    initialState: GameState;
    onStateUpdate: (newState: GameState) => void;
    onPlayerJoin?: (payload: any) => void;
}

export const useMultiplayerGame = ({
    gameId,
    roomId,
    initialState,
    onStateUpdate,
    onPlayerJoin
}: UseMultiplayerGameProps) => {
    const [isConnected, setIsConnected] = useState(false);
    const [playerCount, setPlayerCount] = useState(0);
    const channelRef = useRef<RealtimeChannel | null>(null);
    const [myPlayerId, setMyPlayerId] = useState<string>('');

    // Stable ref for the callback to prevent effect/callback invalidation
    const onStateUpdateRef = useRef(onStateUpdate);
    const onPlayerJoinRef = useRef(onPlayerJoin);

    useEffect(() => {
        onStateUpdateRef.current = onStateUpdate;
        onPlayerJoinRef.current = onPlayerJoin;
    }, [onStateUpdate, onPlayerJoin]);

    useEffect(() => {
        if (!roomId) return;
        let cancelled = false;

        const setupChannel = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || cancelled) return;

            setMyPlayerId(user.id);

            const channel = supabase.channel(`game_${gameId}_${roomId}`, {
                config: {
                    presence: {
                        key: user.id,
                    },
                },
            });

            if (cancelled) {
                supabase.removeChannel(channel);
                return;
            }

            channel
                .on('broadcast', { event: 'game_state' }, ({ payload }) => {
                    if (onStateUpdateRef.current) onStateUpdateRef.current(payload);
                })
                .on('presence', { event: 'sync' }, () => {
                    const state = channel.presenceState();
                    const count = Object.keys(state).length;
                    setPlayerCount(count);

                    if (onPlayerJoinRef.current) {
                        onPlayerJoinRef.current(state);
                    }
                })
                .subscribe((status) => {
                    if (cancelled) return;
                    if (status === 'SUBSCRIBED') {
                        setIsConnected(true);
                        channel.track({ user_id: user.id, online_at: new Date().toISOString() });
                    } else {
                        setIsConnected(false);
                    }
                });

            channelRef.current = channel;
        };

        setupChannel();

        return () => {
            cancelled = true;
            // Cleanup channel
            if (channelRef.current) supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        };
    }, [roomId, gameId]);

    const sendMove = useCallback((newState: GameState) => {
        channelRef.current?.send({
            type: 'broadcast',
            event: 'game_state',
            payload: newState,
        });
        // Update local state immediately
        if (onStateUpdateRef.current) onStateUpdateRef.current(newState);
    }, []);

    return {
        isConnected,
        playerCount,
        sendMove,
        myPlayerId
    };
};
