// src/hooks/useTickets.js
import { useInfiniteQuery, useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
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
    placeholderData: keepPreviousData,
  });
}

export function useTicket(id) {
  return useQuery({
    queryKey: ['ticket', id],
    queryFn: () => ticketService.getTicketById(id),
    enabled: !!id,
  });
}

export function useAddTicketEvent(ticketId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => ticketService.addTicketEvent(ticketId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

export function useUpdateTicketStatus(ticketId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => ticketService.updateTicketStatus(ticketId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

export function useRateTicket(ticketId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => ticketService.rateTicket(ticketId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
    },
  });
}

export function useUpdateRCA(ticketId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData) => ticketService.updateRCA(ticketId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

export function useUpdateOutage(ticketId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => ticketService.updateOutage(ticketId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
    },
  });
}

export function useReassignTicket(ticketId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (employeeId) => ticketService.reassignTicket(ticketId, employeeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: ticketService.getAgents,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: ticketService.getCategories,
    staleTime: 24 * 60 * 60 * 1000, 
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData) => ticketService.createTicket(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

export function useResolvedTickets({ page = 1, limit = 10 } = {}) {
  return useQuery({
    queryKey: ['resolved-tickets', { page, limit }],
    queryFn: () => ticketService.getResolvedTickets({ page, limit }),
    placeholderData: (prev) => prev,
  });
}

export function useEarliestYear() {
  return useQuery({
    queryKey: ['earliest-year'],
    queryFn: ticketService.getEarliestYear,
    staleTime: 60 * 60 * 1000,
  });
}

export function useSalesTickets({ limit = 5 } = {}) {
  return useQuery({
    queryKey: ['sales-recent-tickets', limit],
    queryFn: () => ticketService.getTickets({ page: 1, limit, statusGroup: 'ACTIVE' }),
  });
}