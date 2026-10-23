import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/api/client.ts';

export type HealthResponse = {
  status: 'ok';
};

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: ({ signal }) => apiRequest<HealthResponse>('/health', { signal }),
    refetchInterval: 60_000,
  });
}
