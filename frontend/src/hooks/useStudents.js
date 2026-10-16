import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import studentsApi from '../api/students';

export const STUDENT_KEYS = {
  all: ['students'],
  lists: () => [...STUDENT_KEYS.all, 'list'],
  list: (params) => [...STUDENT_KEYS.lists(), params],
  details: () => [...STUDENT_KEYS.all, 'detail'],
  detail: (id) => [...STUDENT_KEYS.details(), id],
  ledgers: () => [...STUDENT_KEYS.all, 'ledger'],
  ledger: (id, params) => [...STUDENT_KEYS.ledgers(), id, params],
  former: (params) => [...STUDENT_KEYS.all, 'former', params],
  myProfile: ['me', 'profile'],
  myLedger: (params) => ['me', 'ledger', params],
};

export function useStudents(params = {}) {
  return useQuery({
    queryKey: STUDENT_KEYS.list(params),
    queryFn: () => studentsApi.getStudents(params),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useStudent(id) {
  return useQuery({
    queryKey: STUDENT_KEYS.detail(id),
    queryFn: () => studentsApi.getStudentById(id),
    enabled: Boolean(id),
  });
}

export function useStudentLedger(id, params = {}) {
  return useQuery({
    queryKey: STUDENT_KEYS.ledger(id, params),
    queryFn: () => studentsApi.getStudentLedger(id, params),
    enabled: Boolean(id),
  });
}

export function useFormerStudents(params = {}) {
  return useQuery({
    queryKey: STUDENT_KEYS.former(params),
    queryFn: () => studentsApi.getFormerStudents(params),
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => studentsApi.createStudent(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDENT_KEYS.lists() });
      toast.success('Student registered successfully!');
    },
    onError: (err) => {
      const msg = err.response?.data?.message || err.message || 'Failed to create student';
      toast.error(msg);
    },
  });
}

export function useUpdateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => studentsApi.updateStudent(id, payload),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: STUDENT_KEYS.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: STUDENT_KEYS.lists() });
      toast.success('Student details updated successfully!');
    },
    onError: (err) => {
      const msg = err.response?.data?.message || err.message || 'Failed to update student';
      toast.error(msg);
    },
  });
}

export function useActivateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => studentsApi.activateStudent(id),
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: STUDENT_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: STUDENT_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Student activated successfully!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to activate student');
    },
  });
}

export function useDeactivateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }) => studentsApi.deactivateStudent(id, reason),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: STUDENT_KEYS.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: STUDENT_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: STUDENT_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Student marked as inactive.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to deactivate student');
    },
  });
}

export function useUpdateStudentFeeGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, feeGroupId }) => studentsApi.updateFeeGroup(id, feeGroupId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: STUDENT_KEYS.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: STUDENT_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: ['feeGroups'] });
      toast.success('Fee group updated successfully!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update fee group');
    },
  });
}

export function useResetStudentPassword() {
  return useMutation({
    mutationFn: ({ id, password }) => studentsApi.resetPassword(id, password),
    onSuccess: () => {
      toast.success('Password reset successfully!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    },
  });
}

export function useToggleLoginAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }) => studentsApi.toggleLoginAccess(id, enabled),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: STUDENT_KEYS.detail(variables.id) });
      toast.success(variables.enabled ? 'Student login enabled' : 'Student login disabled');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to toggle login access');
    },
  });
}

// Student Portal Hooks
export function useMyProfile() {
  return useQuery({
    queryKey: STUDENT_KEYS.myProfile,
    queryFn: () => studentsApi.getMyProfile(),
  });
}

export function useMyLedger(params = {}) {
  return useQuery({
    queryKey: STUDENT_KEYS.myLedger(params),
    queryFn: () => studentsApi.getMyLedger(params),
  });
}
