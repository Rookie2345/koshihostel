import { useQuery } from '@tanstack/react-query';
import reportsApi from '../api/reports';

export const REPORT_KEYS = {
  all: ['reports'],
  dashboard: () => [...REPORT_KEYS.all, 'dashboard'],
  monthlySummary: (params) => [...REPORT_KEYS.all, 'monthly-summary', params],
  outstanding: (params) => [...REPORT_KEYS.all, 'outstanding', params],
  feeGroupSummary: () => [...REPORT_KEYS.all, 'fee-group-summary'],
  collections: (params) => [...REPORT_KEYS.all, 'collections', params],
  statement: (studentId, params) => [...REPORT_KEYS.all, 'statement', studentId, params],
};

export function useDashboard() {
  return useQuery({
    queryKey: REPORT_KEYS.dashboard(),
    queryFn: () => reportsApi.getDashboard(),
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useMonthlySummary(params = {}) {
  return useQuery({
    queryKey: REPORT_KEYS.monthlySummary(params),
    queryFn: () => reportsApi.getMonthlySummary(params),
  });
}

export function useOutstandingDues(params = {}) {
  return useQuery({
    queryKey: REPORT_KEYS.outstanding(params),
    queryFn: () => reportsApi.getOutstandingDues(params),
  });
}

export function useFeeGroupSummary() {
  return useQuery({
    queryKey: REPORT_KEYS.feeGroupSummary(),
    queryFn: () => reportsApi.getFeeGroupSummary(),
  });
}

export function useCollectionReport(params = {}) {
  return useQuery({
    queryKey: REPORT_KEYS.collections(params),
    queryFn: () => reportsApi.getCollectionReport(params),
  });
}

export function useStudentStatement(studentId, params = {}) {
  return useQuery({
    queryKey: REPORT_KEYS.statement(studentId, params),
    queryFn: () => reportsApi.getStudentStatement(studentId, params),
    enabled: Boolean(studentId),
  });
}
