import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';

export function useMyMetrics({ circuitId = 'ALL', totalCircuits } = {}) {
  return useQuery({
    queryKey: ['my-metrics', circuitId, totalCircuits],
    queryFn: async () => {
      const res = await apiClient.get('/tickets/customer-metrics', {
        params: { circuitId, totalCircuits },
      });
      return res.data.data;
    },
  });
}