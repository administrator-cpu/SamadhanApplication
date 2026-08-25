// src/hooks/useTicketStats.js
import { useAuthStore } from '../store/authStore';
import { useAgentStats } from './useAgentStats';
import { useAdminStats } from './useAdminStats';
import { pickStat } from '../utils/statSummary';

// pickStat matches by keyword against whatever keys /tickets/stats and
// /tickets/agent-stats actually return — verify these keyword lists against
// the real summary payload for your role (log `summary` once and check).
export function useTicketStats() {
  const role = useAuthStore((s) => s.user?.role);
  const isAgent = role === 'SUPPORT_AGENT';
  const isAdmin = role === 'ADMIN' || role === 'SALES';

  const { data: agentStats, isLoading: agentLoading } = useAgentStats({ enabled: isAgent });
  const { data: adminStats, isLoading: adminLoading } = useAdminStats({ enabled: isAdmin });

  const summary = isAgent ? agentStats?.summary ?? {} : isAdmin ? adminStats?.summary ?? {} : {};
  const isLoading = isAgent ? agentLoading : isAdmin ? adminLoading : false;

  return {
    needsWork: Number(pickStat(summary, ['active', 'open', 'progress', 'pending'])) || 0,
    done: Number(pickStat(summary, ['resolved', 'closed', 'completed'])) || 0,
    escalated: Number(pickStat(summary, ['escalated'])) || 0,
    isLoading,
  };
}