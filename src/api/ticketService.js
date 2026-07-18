// src/api/ticketService.js
import apiClient from './client';

export const ticketService = {
  getAdminStats: async () => {
    const { data } = await apiClient.get('/tickets/stats');
    return data.data.stats;
  },

  getAgentStats: async () => {
    const { data } = await apiClient.get('/tickets/agent-stats');
    return data.data.stats;
  },

  getTickets: async (params = {}) => {
    const { data } = await apiClient.get('/tickets', { params });
    return data.data;
  },

  getTicketById: async (id) => {
    const { data } = await apiClient.get(`/tickets/${id}`);
    return data.data;
  },
};