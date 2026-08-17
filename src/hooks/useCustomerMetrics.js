// src/hooks/useCustomerMetrics.js
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';

/**
 * Fetches network performance metrics for a customer, scoped to either
 * every circuit ('ALL') or one specific circuit.
 *
 * @param {string} customerId
 * @param {object} options
 * @param {string} [options.circuitId='ALL'] - 'ALL' or a specific fabCircuitId
 * @param {number} [options.totalCircuits] - total circuit count for this customer,
 *   sent to the backend so it can distinguish "all circuits" queries from
 *   customers who only have one circuit anyway.
 */
export function useCustomerMetrics(customerId, { circuitId = 'ALL', totalCircuits } = {}) {
  return useQuery({
    queryKey: ['customerMetrics', customerId, circuitId, totalCircuits],
    queryFn: async () => {
      const { data } = await apiClient.get(`/users/customers/${customerId}/metrics`, {
        params: {
          circuitId,
          totalCircuits,
        },
      });
      return data.data;
    },
    enabled: !!customerId,
  });
}