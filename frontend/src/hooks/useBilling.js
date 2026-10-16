import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import billingApi from '../api/billing';
import { STUDENT_KEYS } from './useStudents';
import { REPORT_KEYS } from './useReports';

export const BILLING_KEYS = {
  all: ['billing'],
  history: (params) => [...BILLING_KEYS.all, 'history', params],
  preview: (params) => [...BILLING_KEYS.all, 'preview', params],
  period: (id) => [...BILLING_KEYS.all, 'period', id],
};

export function useBillingPreview(params, options = {}) {
  return useQuery({
    queryKey: BILLING_KEYS.preview(params),
    queryFn: () => billingApi.getPreview(params),
    enabled: Boolean(options.enabled && params?.month && params?.year),
  });
}

export function useBillingHistory(params = {}) {
  return useQuery({
    queryKey: BILLING_KEYS.history(params),
    queryFn: () => billingApi.getBillingHistory(params),
  });
}

export function useGenerateBilling() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => billingApi.generateBilling(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BILLING_KEYS.all });
      queryClient.invalidateQueries({ queryKey: STUDENT_KEYS.all });
      queryClient.invalidateQueries({ queryKey: REPORT_KEYS.all });
      toast.success('Billing run completed successfully!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to generate billing');
    },
  });
}
