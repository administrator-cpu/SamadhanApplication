// src/hooks/useTicketSocket.js
import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { connectSocket, disconnectSocket, getSocket } from '../sockets/socketManager';

export function useTicketSocket(ticketId) {
  const queryClient = useQueryClient();
  const lastSeenEventId = useRef(null);

  const setupSocket = useCallback(async () => {
    if (!ticketId) return;

    const socket = await connectSocket();
    if (!socket) return;

    socket.on('connect', () => {
      socket.emit('join_ticket', ticketId);
    });

    socket.on('joined_room', () => {
      // If we reconnected after being away, ask for anything we missed
      if (lastSeenEventId.current) {
        socket.emit('sync_missed_events', {
          ticketId,
          lastSeenEventId: lastSeenEventId.current,
        });
      }
    });

    socket.on('ticket_update', (payload) => {
      if (payload?.event?.id) {
        lastSeenEventId.current = payload.event.id;
      }
      // Simplest correct approach: just refetch this ticket.
      // (An optimistic in-place merge is possible later as an optimization,
      // but refetching guarantees correctness with zero risk of duplicate/stale events.)
      queryClient.invalidateQueries({ queryKey: ['ticket', String(ticketId)] });
    });

    socket.on('missed_events', (payload) => {
      if (payload?.ticketId === ticketId) {
        queryClient.invalidateQueries({ queryKey: ['ticket', String(ticketId)] });
      }
    });

    socket.on('error', (err) => {
    });

    // If already connected (e.g. socket reused across screens), join immediately
    if (socket.connected) {
      socket.emit('join_ticket', ticketId);
    }
  }, [ticketId, queryClient]);

  const teardownSocket = useCallback(() => {
    const socket = getSocket();
    if (socket && ticketId) {
      socket.emit('leave_ticket', ticketId);
      socket.off('connect');
      socket.off('joined_room');
      socket.off('ticket_update');
      socket.off('missed_events');
      socket.off('error');
    }
  }, [ticketId]);

  // Join when screen is focused, leave when it's not (tab-switch, navigate away)
  useFocusEffect(
    useCallback(() => {
      setupSocket();
      return () => teardownSocket();
    }, [setupSocket, teardownSocket])
  );

  // Disconnect entirely when the app backgrounds, reconnect on foreground —
  // avoids holding a live socket open while the OS may suspend the app anyway.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        disconnectSocket();
      } else if (nextState === 'active') {
        setupSocket();
      }
    });

    return () => subscription.remove();
  }, [setupSocket]);
}
