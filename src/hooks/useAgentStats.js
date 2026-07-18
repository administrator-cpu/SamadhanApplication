// src/hooks/useAgentStats.js
import { useQuery } from '@tanstack/react-query';
import { ticketService } from '../api/ticketService';

export function useAgentStats() {
  return useQuery({
    queryKey: ['agent-stats'],
    queryFn: ticketService.getAgentStats,
  });
}