import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useApi = () => {
  const queryClient = useQueryClient();

  const getQueryFn = (url, options = {}) => async () => {
    const { data } = await api.get(url, options);
    return data;
  };

  const mutations = {
    post: (url, options = {}) => 
      useMutation({
        mutationFn: (body) => api.post(url, body, options),
        onSuccess: () => {
          queryClient.invalidateQueries();
        },
      }),

    put: (url, options = {}) =>
      useMutation({
        mutationFn: (body) => api.put(url, body, options),
        onSuccess: () => {
          queryClient.invalidateQueries();
        },
      }),

    delete: (url, options = {}) =>
      useMutation({
        mutationFn: (params) => api.delete(url, { ...options, params }),
        onSuccess: () => {
          queryClient.invalidateQueries();
        },
      }),
  };

  return { getQueryFn, mutations, queryClient };
};

export const useDashboard = (options = {}) => {
  const { getQueryFn } = useApi();
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: getQueryFn('/dashboard'),
    ...options,
  });
};

export const useTransactions = (params = {}, options = {}) => {
  const { getQueryFn } = useApi();
  return useQuery({
    queryKey: ['transactions', params],
    queryFn: () => api.get('/transactions', { params }),
    ...options,
  });
};

export const useGoals = (params = {}, options = {}) => {
  const { getQueryFn } = useApi();
  return useQuery({
    queryKey: ['goals', params],
    queryFn: () => api.get('/goals', { params }),
    ...options,
  });
};

export const useWishes = (params = {}, options = {}) => {
  const { getQueryFn } = useApi();
  return useQuery({
    queryKey: ['wishes', params],
    queryFn: () => api.get('/wishes', { params }),
    ...options,
  });
};

export const useBudgets = (params = {}, options = {}) => {
  const { getQueryFn } = useApi();
  return useQuery({
    queryKey: ['budgets', params],
    queryFn: () => api.get('/budgets', { params }),
    ...options,
  });
};

export const useSafetyPillow = (options = {}) => {
  const { getQueryFn } = useApi();
  return useQuery({
    queryKey: ['safety-pillow'],
    queryFn: getQueryFn('/safety-pillow/current'),
    ...options,
  });
};

export const useAnalytics = (params = {}, options = {}) => {
  const { getQueryFn } = useApi();
  return useQuery({
    queryKey: ['analytics', params],
    queryFn: () => api.get('/reports/dynamics', { params }),
    ...options,
  });
};

export const useRecurring = (options = {}) => {
  const { getQueryFn } = useApi();
  return useQuery({
    queryKey: ['recurring'],
    queryFn: getQueryFn('/recurring'),
    ...options,
  });
};

export const useCategories = (options = {}) => {
  const { getQueryFn } = useApi();
  return useQuery({
    queryKey: ['categories'],
    queryFn: getQueryFn('/categories'),
    ...options,
  });
};

export const useNotifications = (options = {}) => {
  const { getQueryFn } = useApi();
  return useQuery({
    queryKey: ['notifications'],
    queryFn: getQueryFn('/notifications'),
    ...options,
  });
};