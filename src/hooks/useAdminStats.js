// src/hooks/useAdminStats.js
import { useQuery } from '@tanstack/react-query';
import { ticketService } from '../api/ticketService';

export function useAdminStats({ enabled = true } = {}) {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: ticketService.getAdminStats,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled,
  });
}