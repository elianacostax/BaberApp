import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface OptimizedQueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryFn'> {
  endpoint: string;
  timeout?: number;
  staleTime?: number;
  gcTime?: number;
}

export function useOptimizedQuery<T = unknown>({
  endpoint,
  timeout = 8000,
  staleTime = 5 * 60 * 1000, // 5 minutos por defecto
  gcTime = 10 * 60 * 1000, // 10 minutos por defecto
  ...options
}: OptimizedQueryOptions<T>) {
  return useQuery({
    queryFn: async () => {
      const response = await api.get(endpoint, { timeout });
      return response.data as T;
    },
    staleTime,
    gcTime,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    ...options,
  });
}

// Hook específico para datos que cambian frecuentemente
export function useFrequentData<T = unknown>(
  queryKey: (string | number)[],
  endpoint: string,
  options?: Partial<OptimizedQueryOptions<T>>
) {
  return useOptimizedQuery({
    queryKey,
    endpoint,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
    ...options,
  });
}

// Hook específico para datos estáticos
export function useStaticData<T = unknown>(
  queryKey: (string | number)[],
  endpoint: string,
  options?: Partial<OptimizedQueryOptions<T>>
) {
  return useOptimizedQuery({
    queryKey,
    endpoint,
    staleTime: 15 * 60 * 1000, // 15 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
    ...options,
  });
}
