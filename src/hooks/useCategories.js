// src/hooks/useCategories.js
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

// GET /api/categories — public endpoint, matches API_DOCUMENTATION.md.
// Cached for 24h per your PRD's stated caching rule for categories.
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await apiClient.get('/categories');
      return response.data.data; // API wrapper: { success, data: [...] }
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    gcTime: 1000 * 60 * 60 * 24 * 7, // keep a week
  });
}