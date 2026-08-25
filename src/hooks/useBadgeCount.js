// src/hooks/useBadgeCount.js
import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useAgentStats } from './useAgentStats';
import { useAdminStats } from './useAdminStats';
import { pickStat } from '../utils/statSummary';
import { useRef } from 'react';
import notificationsSafe from '../utils/notificationsSafe';

export function useBadgeCount() {
  const role = useAuthStore((s) => s.user?.role);

   const lastCountRef = useRef(null);
  const { data: agentStats } = useAgentStats({ enabled: role === 'SUPPORT_AGENT' });
  const { data: adminStats } = useAdminStats({ enabled: role === 'ADMIN' || role === 'SALES' });

  useEffect(() => {
    let count = 0;

    if (role === 'SUPPORT_AGENT') {
      count = Number(pickStat(agentStats?.summary || {}, ['active', 'open', 'assigned'])) || 0;
    } else if (role === 'ADMIN' || role === 'SALES') {
      count = Number(adminStats?.summary?.active_tickets) || 0;
    }
    if (count === lastCountRef.current) return;
    lastCountRef.current = count;
    notificationsSafe.setBadgeCountAsync(count)
  }, [role, agentStats, adminStats]);
}