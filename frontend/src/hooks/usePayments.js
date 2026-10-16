import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import paymentsApi from '../api/payments';
import { STUDENT_KEYS } from './useStudents';
import { REPORT_KEYS } from './useReports';

export const PAYMENT_KEYS = {
  all: ['payments'],
  lists: () => [...PAYMENT_KEYS.all, 'list'],
  list: (params) => [...PAYMENT_KEYS.lists(), params],
  detail: (id) => [...PAYMENT_KEYS.all, 'detail', id],
  unpaid: (studentId) => [...PAYMENT_KEYS.all, 'unpaid', studentId],
};

export function usePayments(params = {}) {
  return useQuery({
    queryKey: PAYMENT_KEYS.list(params),
    queryFn: () => paymentsApi.getPayments(params),
  });
}

export function usePayment(id) {
  return useQuery({
    queryKey: PAYMENT_KEYS.detail(id),
    queryFn: () => paymentsApi.getPaymentById(id),
    enabled: Boolean(id),
  });
}

export function useUnpaidPeriods(studentId) {
  return useQuery({
    queryKey: PAYMENT_KEYS.unpaid(studentId),
    queryFn: () => paymentsApi.getUnpaidPeriods(studentId),
    enabled: Boolean(studentId),
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => paymentsApi.recordPayment(payload),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_KEYS.all });
      queryClient.invalidateQueries({ queryKey: STUDENT_KEYS.detail(variables.studentId) });
      queryClient.invalidateQueries({ queryKey: STUDENT_KEYS.ledgers() });
      queryClient.invalidateQueries({ queryKey: STUDENT_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: REPORT_KEYS.all });
      toast.success('Payment recorded successfully!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    },
  });
}
