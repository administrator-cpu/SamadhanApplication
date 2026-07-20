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

  addTicketEvent: async (id, payload) => {
    const { data } = await apiClient.post(`/tickets/${id}/events`, payload);
    return data.data;
  },

  updateTicketStatus: async (id, payload) => {
    const { data } = await apiClient.patch(`/tickets/${id}/status`, payload);
    return data.data;
  },

  rateTicket: async (id, payload) => {
    const { data } = await apiClient.post(`/tickets/${id}/rate`, payload);
    return data.data;
  },

  updateRCA: async (id, formData) => {
    const { data } = await apiClient.patch(`/tickets/${id}/rca`, formData, {
    });
    return data.data;
  },

  updateOutage: async (id, payload) => {
    const { data } = await apiClient.patch(`/tickets/${id}/outage`, payload);
    return data.data;
  },

  reassignTicket: async (id, employeeId) => {
    const { data } = await apiClient.post(`/tickets/${id}/reassign`, { employeeId });
    return data.data;
  },

  getAgents: async () => {
    const { data } = await apiClient.get('/users/agents');
    return data.data;
  },

  getCategories: async () => {
    const { data } = await apiClient.get('/categories');
    return data.data;
  },

  createTicket: async (formData) => {
    const { data } = await apiClient.post('/tickets', formData);
    return data.data;
  },
  getResolvedTickets: async (params = {}) => {
    const { data } = await apiClient.get('/tickets/resolved', { params });
    return data.data;
  },

  getEarliestYear: async () => {
    const { data } = await apiClient.get('/tickets/earliest-year');
    return data.data;
  },
  getResolvedTicketsForExport: async (year, month) => {
  const { data } = await apiClient.get('/tickets/resolved', {
    params: { exportAll: true, year, month },
  });
  return data.data.tickets; 
},
};