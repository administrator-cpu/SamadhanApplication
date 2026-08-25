// src/hooks/useAgentStats.js
import { useQuery } from '@tanstack/react-query';
import { ticketService } from '../api/ticketService';

export function useAgentStats({ enabled = true } = {}) {
  return useQuery({
    queryKey: ['agent-stats'],
    queryFn: ticketService.getAgentStats,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled,
  });
}