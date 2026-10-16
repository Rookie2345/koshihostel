import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import feeGroupsApi from '../api/feeGroups';

export const FEE_GROUP_KEYS = {
  all: ['feeGroups'],
  lists: () => [...FEE_GROUP_KEYS.all, 'list'],
  detail: (id) => [...FEE_GROUP_KEYS.all, 'detail', id],
};

export function useFeeGroups() {
  return useQuery({
    queryKey: FEE_GROUP_KEYS.lists(),
    queryFn: () => feeGroupsApi.getFeeGroups(),
  });
}

export function useFeeGroup(id) {
  return useQuery({
    queryKey: FEE_GROUP_KEYS.detail(id),
    queryFn: () => feeGroupsApi.getFeeGroupById(id),
    enabled: Boolean(id),
  });
}

export function useCreateFeeGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => feeGroupsApi.createFeeGroup(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FEE_GROUP_KEYS.lists() });
      toast.success('Fee group created successfully!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create fee group');
    },
  });
}

export function useUpdateFeeGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => feeGroupsApi.updateFeeGroup(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FEE_GROUP_KEYS.lists() });
      toast.success('Fee group updated successfully!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update fee group');
    },
  });
}

export function useDeleteFeeGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => feeGroupsApi.deleteFeeGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FEE_GROUP_KEYS.lists() });
      toast.success('Fee group deleted successfully!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete fee group');
    },
  });
}
