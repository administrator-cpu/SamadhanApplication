// src/hooks/useTickets.js
import { useInfiniteQuery } from '@tanstack/react-query';
import { ticketService } from '../api/ticketService';

export function useTickets({ status, searchQuery, statusGroup, ownership } = {}) {
  return useInfiniteQuery({
    queryKey: ['tickets', { status, searchQuery, statusGroup, ownership }],
    queryFn: ({ pageParam }) =>
      ticketService.getTickets({
        cursor: pageParam,
        limit: 15,
        status: status || undefined,
        searchQuery: searchQuery || undefined,
        statusGroup: statusGroup || undefined,
        ownership: ownership || undefined,
      }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage.pagination?.hasNext ? lastPage.pagination.nextCursor : undefined,
  });
}