// src/hooks/useAdminStats.js
import { useQuery } from '@tanstack/react-query';
import { ticketService } from '../api/ticketService';

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: ticketService.getAdminStats,
  });
}