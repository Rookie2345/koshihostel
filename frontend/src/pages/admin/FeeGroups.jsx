import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Coins,
  TrendingUp,
  Tag,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';

import apiClient from '../../api/client';
import feeGroupsApi from '../../api/feeGroups';
import { FEE_GROUP_KEYS } from '../../hooks/useFeeGroups';

import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import StatCard from '../../components/ui/StatCard';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

import { formatNPR } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

export default function FeeGroups() {
  const queryClient = useQueryClient();

  // Filters & State
  const [includeInactive, setIncludeInactive] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [deletingGroup, setDeletingGroup] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    monthlyAmount: '',
    description: '',
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState({});

  // Query: Fee Groups
  const {
    data: feeGroupsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['feeGroups', 'list', includeInactive],
    queryFn: async () => {
      const res = await apiClient.get('/fee-groups', {
        params: { includeInactive },
      });
      return res.data?.data !== undefined ? res.data.data : res.data;
    },
  });

  const feeGroups = Array.isArray(feeGroupsData) ? feeGroupsData : feeGroupsData?.data || [];

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (payload) => feeGroupsApi.createFeeGroup(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeGroups'] });
      toast.success('Fee group created successfully!');
      setIsAddModalOpen(false);
      resetForm();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create fee group');
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => feeGroupsApi.updateFeeGroup(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeGroups'] });
      toast.success('Fee group updated successfully!');
      setEditingGroup(null);
      resetForm();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update fee group');
    },
  });

  // Delete / Deactivate Mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => feeGroupsApi.deleteFeeGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeGroups'] });
      toast.success('Fee group deactivated successfully!');
      setDeletingGroup(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete fee group');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      monthlyAmount: '',
      description: '',
      isActive: true,
    });
    setFormErrors({});
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (group) => {
    setEditingGroup(group);
    setFormData({
      name: group.name || '',
      monthlyAmount: group.monthlyAmount ? String(group.monthlyAmount) : '',
      description: group.description || '',
      isActive: group.isActive !== false,
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'Fee group name is required';
    }
    if (!formData.monthlyAmount || parseFloat(formData.monthlyAmount) <= 0) {
      errors.monthlyAmount = 'Monthly amount must be greater than zero';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      name: formData.name.trim(),
      monthlyAmount: parseFloat(formData.monthlyAmount),
      description: formData.description.trim() || undefined,
      isActive: formData.isActive,
    };

    if (editingGroup) {
      updateMutation.mutate({ id: editingGroup.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // Financial summary calculations
  const activeGroups = feeGroups.filter((g) => g.isActive !== false);
  const totalEnrolled = activeGroups.reduce(
    (sum, g) => sum + (g.activeStudentCount || g._count?.students || 0),
    0
  );
  const expectedMonthlyIncome = activeGroups.reduce((sum, g) => {
    const count = g.activeStudentCount || g._count?.students || 0;
    const amount = parseFloat(g.monthlyAmount || 0);
    return sum + count * amount;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-navy-700/60">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Fee Groups & Pricing</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Configure accommodation tiers, monthly rental packages, and student pricing schemes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              className="rounded bg-navy-900 border-navy-600 text-cyan-500 focus:ring-cyan-500/20"
            />
            Show Inactive Groups
          </label>

          <Button variant="primary" icon={Plus} onClick={handleOpenAdd}>
            Add Fee Group
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          icon={Tag}
          label="Active Fee Tiers"
          value={activeGroups.length}
          subtitle={`Out of ${feeGroups.length} configured groups`}
          color="cyan"
        />
        <StatCard
          icon={Users}
          label="Students Enrolled"
          value={totalEnrolled}
          subtitle="Currently active residents"
          color="blue"
        />
        <StatCard
          icon={TrendingUp}
          label="Expected Monthly Income"
          value={formatNPR(expectedMonthlyIncome)}
          subtitle="Based on active enrollment"
          color="green"
        />
      </div>

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-5 rounded-xl bg-navy-800 border border-navy-700 space-y-4">
              <Skeleton className="w-3/4 h-5" />
              <Skeleton className="w-1/2 h-8" />
              <Skeleton className="w-full h-12" />
              <div className="flex justify-between pt-2">
                <Skeleton className="w-20 h-4" />
                <Skeleton className="w-16 h-8" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="py-12 text-center">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 mx-auto flex items-center justify-center mb-3">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-slate-100">Failed to load fee groups</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {error?.response?.data?.message || 'An error occurred while fetching pricing packages.'}
          </p>
          <div className="mt-4">
            <Button variant="primary" size="sm" icon={RefreshCw} onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && feeGroups.length === 0 && (
        <Card className="p-10 text-center">
          <EmptyState
            icon={Tag}
            title="No fee groups configured"
            description="Create your first fee group to organize room types and monthly rates for your students."
            actionLabel="Add Fee Group"
            onAction={handleOpenAdd}
          />
        </Card>
      )}

      {/* Fee Groups Grid */}
      {!isLoading && !isError && feeGroups.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {feeGroups.map((group) => {
            const studentCount = group.activeStudentCount || group._count?.students || 0;
            const isGroupActive = group.isActive !== false;
            const monthlyExpected = studentCount * parseFloat(group.monthlyAmount || 0);

            return (
              <div
                key={group.id}
                className={`flex flex-col justify-between rounded-xl bg-navy-800 border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
                  isGroupActive
                    ? 'border-navy-600/70 hover:border-cyan-500/40 hover:shadow-cyan-500/5'
                    : 'border-navy-700/50 opacity-70'
                }`}
              >
                {/* Header */}
                <div className="p-5 pb-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-lg font-bold text-slate-100 tracking-tight">{group.name}</h3>
                    <Badge variant={isGroupActive ? 'ACTIVE' : 'INACTIVE'} dot>
                      {isGroupActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold text-cyan-400 tracking-tight font-mono">
                      {formatNPR(group.monthlyAmount)}
                    </span>
                    <span className="text-xs text-slate-400">/ month</span>
                  </div>

                  {group.description && (
                    <p className="mt-3 text-xs text-slate-300 leading-relaxed line-clamp-2">
                      {group.description}
                    </p>
                  )}
                </div>

                {/* Body Info */}
                <div className="px-5 py-3 bg-navy-900/50 border-y border-navy-700/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Users className="w-4 h-4 text-cyan-400" />
                    <span>
                      <strong className="text-slate-100 font-semibold">{studentCount}</strong> active student{studentCount === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-slate-400 text-[11px]">Monthly revenue: </span>
                    <span className="font-semibold text-emerald-400 font-mono">
                      {formatNPR(monthlyExpected)}
                    </span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-4 flex items-center justify-end gap-2 bg-navy-800/80 rounded-b-xl">
                  <Button
                    variant="secondary"
                    size="xs"
                    icon={Edit}
                    onClick={() => handleOpenEdit(group)}
                  >
                    Edit
                  </Button>

                  <Button
                    variant="danger"
                    size="xs"
                    icon={Trash2}
                    disabled={studentCount > 0}
                    title={
                      studentCount > 0
                        ? `Cannot deactivate: ${studentCount} active students currently assigned.`
                        : 'Deactivate fee group'
                    }
                    onClick={() => setDeletingGroup(group)}
                  >
                    Deactivate
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: ADD / EDIT FEE GROUP */}
      <Modal
        isOpen={isAddModalOpen || Boolean(editingGroup)}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingGroup(null);
          resetForm();
        }}
        title={editingGroup ? 'Edit Fee Group' : 'Add New Fee Group'}
        subtitle={
          editingGroup
            ? `Update settings for ${editingGroup.name}`
            : 'Define a monthly accommodation & meal rate package'
        }
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Fee Group Name"
            required
            placeholder="e.g. Standard 3-Bed AC, Single Deluxe"
            value={formData.name}
            error={formErrors.name}
            onChange={(e) => {
              setFormData({ ...formData, name: e.target.value });
              if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
            }}
          />

          <Input
            label="Monthly Rate (NPR)"
            type="number"
            step="0.01"
            required
            placeholder="e.g. 12000"
            value={formData.monthlyAmount}
            error={formErrors.monthlyAmount}
            onChange={(e) => {
              setFormData({ ...formData, monthlyAmount: e.target.value });
              if (formErrors.monthlyAmount) setFormErrors({ ...formErrors, monthlyAmount: '' });
            }}
          />

          <div className="w-full">
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Description / Included Amenities (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Attached bathroom, 3-times daily hygienic meal, high-speed Wi-Fi"
              className="block w-full rounded-lg bg-navy-900 border border-navy-600 text-slate-100 text-sm p-3 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {editingGroup && (
            <div className="pt-1">
              <label className="flex items-center gap-2.5 text-sm text-slate-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded bg-navy-900 border-navy-600 text-cyan-500 focus:ring-cyan-500/20"
                />
                Active (available for assigning to new students)
              </label>
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-navy-700/60">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingGroup(null);
                resetForm();
              }}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editingGroup ? 'Save Changes' : 'Create Fee Group'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM DIALOG: DELETE / DEACTIVATE */}
      <ConfirmDialog
        isOpen={Boolean(deletingGroup)}
        onClose={() => setDeletingGroup(null)}
        onConfirm={() => deletingGroup && deleteMutation.mutate(deletingGroup.id)}
        title="Deactivate Fee Group"
        message={`Are you sure you want to deactivate "${deletingGroup?.name}"? It will no longer be available when registering new students.`}
        confirmText="Deactivate"
        type="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
