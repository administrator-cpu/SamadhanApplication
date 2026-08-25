// src/hooks/useTickets.js
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketService } from '../api/ticketService';

export function useTickets({ status, searchQuery, statusGroup, ownership, limit = 15 } = {}) {
  return useInfiniteQuery({
    queryKey: ['tickets', { status, searchQuery, statusGroup, ownership, limit }],

    queryFn: ({ pageParam = 1 }) =>
      ticketService.getTickets({
        page: pageParam,
        limit,
        status: status || undefined,
        searchQuery: searchQuery || undefined,
        statusGroup: statusGroup || undefined,
        ownership: ownership || undefined,
        sortField: 'updated_at',
        sortOrder: 'desc',
      }),

    initialPageParam: 1,

    getNextPageParam: (lastPage) => {
      const { currentPage, totalPages } = lastPage?.pagination ?? {};
      if (!currentPage || !totalPages) return undefined;
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },

    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useUpdateReplyStatus(ticketId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (allowCustomerReply) => ticketService.updateReplyStatus(ticketId, allowCustomerReply),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

export function useEscalatedTickets({ limit = 5 } = {}) {
  return useQuery({
    queryKey: ['tickets-escalated', limit],
    queryFn: () =>
      ticketService.getTickets({
        limit,
        status: 'ESCALATED',
        sortField: 'updated_at',
        sortOrder: 'desc',
      }),
    staleTime: 30 * 1000,
  });
}

export function useTicket(id) {
  return useQuery({
    queryKey: ['ticket', id],
    queryFn: () => ticketService.getTicketById(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useAddTicketEvent(ticketId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['ticket-event', ticketId],
    mutationFn: (payload) => ticketService.addTicketEvent(ticketId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket-count'] });
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
      queryClient.invalidateQueries({ queryKey: ['ticket-count'] });
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
      queryClient.invalidateQueries({ queryKey: ['ticket-count'] });
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
      queryClient.invalidateQueries({ queryKey: ['ticket-count'] });
    },
  });
}

export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: ticketService.getAgents,
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
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
      queryClient.invalidateQueries({ queryKey: ['ticket-count'] });
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