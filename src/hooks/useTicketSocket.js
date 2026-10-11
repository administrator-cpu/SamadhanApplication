// src/hooks/useTicketSocket.js
import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { connectSocket, getSocket } from '../sockets/socketManager';

export function useTicketSocket(ticketId) {
  const queryClient = useQueryClient();
  const lastSeenEventId = useRef(null);
  const boundRef = useRef(null);

  const unbind = useCallback(() => {
    const b = boundRef.current;
    if (!b) return;
    const { socket, handlers } = b;
    if (socket.connected) socket.emit('leave_ticket', ticketId);
    Object.entries(handlers).forEach(([event, fn]) => socket.off(event, fn));
    boundRef.current = null;
  }, [ticketId]);

  const bind = useCallback(async () => {
    if (!ticketId) return;
    const socket = await connectSocket();
    if (!socket) return;
    if (boundRef.current?.socket === socket) return;
    unbind();

    const handlers = {
      connect: () => socket.emit('join_ticket', ticketId),
      joined_room: () => {
        if (lastSeenEventId.current) {
          socket.emit('sync_missed_events', {
            ticketId,
            lastSeenEventId: lastSeenEventId.current,
          });
        }
      },
      ticket_update: (payload) => {
        if (payload?.event?.id) lastSeenEventId.current = payload.event.id;
        queryClient.invalidateQueries({ queryKey: ['ticket', String(ticketId)] });
      },
      missed_events: (payload) => {
        if (payload?.ticketId === ticketId) {
          queryClient.invalidateQueries({ queryKey: ['ticket', String(ticketId)] });
        }
      },
    };

    Object.entries(handlers).forEach(([event, fn]) => socket.on(event, fn));
    boundRef.current = { socket, handlers };

    if (socket.connected) socket.emit('join_ticket', ticketId);
  }, [ticketId, queryClient, unbind]);

  useFocusEffect(
    useCallback(() => {
      bind();
      return () => unbind();
    }, [bind, unbind])
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      const socket = getSocket();
      if (!socket || !socket.connected) connectSocket();
      if (boundRef.current?.socket !== getSocket()) bind();
    });
    return () => sub.remove();
  }, [bind]);
}