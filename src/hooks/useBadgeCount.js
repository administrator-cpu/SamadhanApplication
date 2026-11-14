// src/hooks/useBadgeCount.js
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useAgentStats } from './useAgentStats';
import { useAdminStats } from './useAdminStats';
import { pickStat } from '../utils/statSummary';
import notificationsSafe from '../utils/notificationsSafe';
import { notificationService, isNotificationServiceConfigured } from '../api/notificationService';

export function useBadgeCount() {
  const role = useAuthStore((s) => s.user?.role);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const queryClient = useQueryClient();
  const lastCountRef = useRef(null);

  const { data: agentStats } = useAgentStats({ enabled: role === 'SUPPORT_AGENT' });
  const { data: adminStats } = useAdminStats({ enabled: role === 'ADMIN' || role === 'SALES' });

  // Unread count from the Notification Service is the source of truth for the badge.
  const { data: unread } = useQuery({
    queryKey: ['unread-count'],
    queryFn: notificationService.getUnreadCount,
    enabled: isNotificationServiceConfigured && isAuthenticated,
    staleTime: 15 * 1000,
    retry: 0,
  });

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    });
    return () => sub.remove();
  }, [queryClient]);

  useEffect(() => {
    let count = 0;

    if (typeof unread === 'number') {
      count = unread;
    } else if (role === 'SUPPORT_AGENT') {
      count = Number(pickStat(agentStats?.summary || {}, ['active', 'open', 'assigned'])) || 0;
    } else if (role === 'ADMIN' || role === 'SALES') {
      count = Number(adminStats?.summary?.active_tickets) || 0;
    }

    if (count === lastCountRef.current) return;
    lastCountRef.current = count;
    notificationsSafe.setBadgeCountAsync(count).catch(() => {});
  }, [role, unread, agentStats, adminStats]);
}
