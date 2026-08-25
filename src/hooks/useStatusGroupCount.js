// src/hooks/useStatusGroupCount.js
import { useQueries } from '@tanstack/react-query';
import { ticketService } from '../api/ticketService';

export function useStatusGroupCount(statuses) {
  const results = useQueries({
    queries: statuses.map((status) => ({
      queryKey: ['ticket-count', status],
      queryFn: () => ticketService.getTickets({ limit: 1, status }),
      select: (res) => res?.pagination?.totalCount ?? 0,
      staleTime: 30 * 1000,
      gcTime: 10 * 60 * 1000,
    })),
  });

  return {
    total: results.reduce((sum, r) => sum + (r.data ?? 0), 0),
    isLoading: results.some((r) => r.isLoading),
  };
}