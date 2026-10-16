import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  User,
  TrendingUp,
  FileText,
  CreditCard,
  Edit,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  Printer,
  Calendar,
  Building,
  Phone,
  Mail,
  MapPin,
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';

import apiClient from '../../api/client';
import studentsApi from '../../api/students';
import paymentsApi from '../../api/payments';
import { STUDENT_KEYS } from '../../hooks/useStudents';
import { useFeeGroups } from '../../hooks/useFeeGroups';

import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Alert from '../../components/ui/Alert';
import StatCard from '../../components/ui/StatCard';
import Table, { TableRow, TableCell } from '../../components/ui/Table';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

import { formatNPR } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { printStatement } from '../../utils/printStatement';

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Active Tab: 'profile' | 'financial' | 'ledger' | 'payment'
  const [activeTab, setActiveTab] = useState('profile');

  // Ledger Filters
  const [ledgerStartDate, setLedgerStartDate] = useState('');
  const [ledgerEndDate, setLedgerEndDate] = useState('');
  const [ledgerEntryType, setLedgerEntryType] = useState('ALL');

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [isActivateOpen, setIsActivateOpen] = useState(false);
  const [isToggleLoginOpen, setIsToggleLoginOpen] = useState(false);

  // Edit Form State
  const [editForm, setEditForm] = useState({
    fullName: '',
    roomNumber: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    monthlyFee: '',
    feeGroupId: '',
  });

  // Password reset state
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Deactivate form state
  const [departureDate, setDepartureDate] = useState(new Date().toISOString().split('T')[0]);
  const [deactivateReason, setDeactivateReason] = useState('');

  // Payment Form State
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'CASH',
    referenceNumber: '',
    receiptNumber: '',
    notes: '',
  });
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  // Fee Groups for selection
  const { data: feeGroupsData } = useFeeGroups();
  const feeGroups = Array.isArray(feeGroupsData) ? feeGroupsData : feeGroupsData?.data || [];

  // Query: Student Details
  const {
    data: student,
    isLoading: isStudentLoading,
    isError: isStudentError,
    error: studentError,
    refetch: refetchStudent,
  } = useQuery({
    queryKey: STUDENT_KEYS.detail(id),
    queryFn: () => studentsApi.getStudentById(id),
    enabled: Boolean(id),
  });

  // Query: Student Statement / Financial Summary
  const {
    data: statementData,
    isLoading: isStatementLoading,
    refetch: refetchStatement,
  } = useQuery({
    queryKey: ['students', 'statement', id],
    queryFn: async () => {
      try {
        const res = await apiClient.get(`/students/${id}/statement`);
        return res.data?.data !== undefined ? res.data.data : res.data;
      } catch {
        return null;
      }
    },
    enabled: Boolean(id),
  });

  // Query: Student Ledger
  const {
    data: ledgerResponse,
    isLoading: isLedgerLoading,
    refetch: refetchLedger,
  } = useQuery({
    queryKey: ['students', 'ledger', id, ledgerStartDate, ledgerEndDate, ledgerEntryType],
    queryFn: async () => {
      const params = {};
      if (ledgerStartDate) params.startDate = ledgerStartDate;
      if (ledgerEndDate) params.endDate = ledgerEndDate;
      if (ledgerEntryType && ledgerEntryType !== 'ALL') params.entryType = ledgerEntryType;
      params.limit = 100;

      const res = await studentsApi.getStudentLedger(id, params);
      return res;
    },
    enabled: Boolean(id),
  });

  // Open Edit Modal with prefilled student data
  const handleOpenEdit = () => {
    if (!student) return;
    setEditForm({
      fullName: student.fullName || '',
      roomNumber: student.roomNumber || '',
      phone: student.phone || '',
      email: student.email || '',
      address: student.address || '',
      notes: student.notes || '',
      monthlyFee: student.monthlyFee ? String(student.monthlyFee) : '',
      feeGroupId: student.currentFeeGroupId || student.currentFeeGroup?.id || '',
    });
    setIsEditModalOpen(true);
  };

  // Submit Student Update
  const updateStudentMutation = useMutation({
    mutationFn: async (payload) => {
      const studentPayload = {
        fullName: payload.fullName,
        roomNumber: payload.roomNumber,
        phone: payload.phone || null,
        email: payload.email || null,
        address: payload.address || null,
        notes: payload.notes || null,
        monthlyFee: payload.monthlyFee ? parseFloat(payload.monthlyFee) : undefined,
      };

      await studentsApi.updateStudent(id, studentPayload);

      // If fee group changed, update it
      if (payload.feeGroupId && payload.feeGroupId !== student?.currentFeeGroupId) {
        try {
          await studentsApi.updateFeeGroup(id, payload.feeGroupId);
        } catch {
          // Fallback direct endpoint
          await apiClient.put(`/students/${id}/fee-group`, {
            feeGroupId: payload.feeGroupId,
            monthlyFee: payload.monthlyFee ? parseFloat(payload.monthlyFee) : undefined,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDENT_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: STUDENT_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: ['students', 'statement', id] });
      toast.success('Student information updated successfully');
      setIsEditModalOpen(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to update student');
    },
  });

  // Activate Mutation
  const activateMutation = useMutation({
    mutationFn: async () => {
      await studentsApi.activateStudent(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDENT_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: STUDENT_KEYS.lists() });
      toast.success('Student account reactivated successfully');
      setIsActivateOpen(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to activate student');
    },
  });

  // Deactivate Mutation
  const deactivateMutation = useMutation({
    mutationFn: async () => {
      try {
        await apiClient.post(`/students/${id}/deactivate`, {
          departureDate: departureDate || undefined,
          reason: deactivateReason || undefined,
        });
      } catch {
        await studentsApi.deactivateStudent(id, deactivateReason);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDENT_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: STUDENT_KEYS.lists() });
      toast.success('Student marked as inactive');
      setIsDeactivateOpen(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to deactivate student');
    },
  });

  // Password Reset Mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      const userId = student?.userId || student?.user?.id;
      try {
        if (userId) {
          await apiClient.post('/auth/admin/reset-student-password', {
            userId,
            newPassword,
          });
          return;
        }
      } catch (err) {
        // Fallback to studentsApi
      }
      await studentsApi.resetPassword(id, newPassword);
    },
    onSuccess: () => {
      toast.success('Student login password reset successfully');
      setIsResetPasswordOpen(false);
      setNewPassword('');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    },
  });

  // Toggle Login Access Mutation
  const toggleLoginMutation = useMutation({
    mutationFn: async () => {
      const currentLoginState = student?.user?.loginEnabled ?? true;
      const nextLoginState = !currentLoginState;
      await apiClient.post(`/students/${id}/toggle-login`, {
        loginEnabled: nextLoginState,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDENT_KEYS.detail(id) });
      const currentLoginState = student?.user?.loginEnabled ?? true;
      toast.success(`Web login access ${!currentLoginState ? 'enabled' : 'disabled'}`);
      setIsToggleLoginOpen(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to toggle login access');
    },
  });

  // Record Payment Submit Handler
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      toast.error('Please enter a valid payment amount greater than zero');
      return;
    }

    try {
      setPaymentSubmitting(true);
      await paymentsApi.recordPayment({
        studentId: student.id,
        amount: parseFloat(paymentForm.amount),
        date: paymentForm.date ? new Date(paymentForm.date).toISOString() : new Date().toISOString(),
        paymentMethod: paymentForm.paymentMethod,
        referenceNumber: paymentForm.referenceNumber.trim() || undefined,
        receiptNumber: paymentForm.receiptNumber.trim() || undefined,
        notes: paymentForm.notes.trim() || undefined,
      });

      toast.success('Payment recorded successfully!');
      setPaymentForm({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'CASH',
        referenceNumber: '',
        receiptNumber: '',
        notes: '',
      });

      // Refetch ledger and summary
      queryClient.invalidateQueries({ queryKey: STUDENT_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: ['students', 'statement', id] });
      queryClient.invalidateQueries({ queryKey: ['students', 'ledger', id] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });

      // Navigate to ledger tab
      setActiveTab('ledger');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to record payment');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  // Loading Skeleton
  if (isStudentLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="w-9 h-9 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="w-48 h-6" />
            <Skeleton className="w-32 h-4" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  // Error State
  if (isStudentError || !student) {
    return (
      <div className="py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 mx-auto flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-100">Student Profile Not Found</h3>
        <p className="mt-1 text-sm text-slate-400 max-w-md mx-auto">
          {studentError?.response?.data?.message || 'The requested student record could not be loaded.'}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/admin/students')}>
            Back to Students
          </Button>
          <Button variant="primary" icon={RefreshCw} onClick={() => refetchStudent()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Ledger entries from ledger query or statement fallback
  const rawLedgerEntries = ledgerResponse?.entries || ledgerResponse || statementData?.entries || [];
  const ledgerEntries = Array.isArray(rawLedgerEntries) ? rawLedgerEntries : [];

  // Summary figures
  const summary = statementData?.summary || {
    totalCharged: student.totalCharged || 0,
    totalPaid: student.totalPaid || 0,
    outstandingBalance: student.outstandingBalance || 0,
  };

  const outstandingNum = parseFloat(summary.outstandingBalance || student.outstandingBalance || 0);
  const isInactive = student.status === 'INACTIVE';
  const loginEnabled = student.user?.loginEnabled ?? true;

  // Filter charges for financial summary tab
  const monthlyCharges = ledgerEntries.filter(
    (e) => e.entryType === 'MONTHLY_FEE' || (e.debit && parseFloat(e.debit) > 0)
  );

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-navy-700/60">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => navigate('/admin/students')}
            className="p-2 rounded-xl bg-navy-800 hover:bg-navy-700 border border-navy-600 text-slate-300 hover:text-white transition-colors"
            title="Back to Students List"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight">{student.fullName}</h1>
              <Badge variant={student.status} dot>
                {student.status}
              </Badge>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-mono font-medium">
                {student.studentId}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
              <span>Room {student.roomNumber}</span>
              <span>•</span>
              <span>{student.currentFeeGroup?.name || 'No Fee Group'}</span>
              <span>•</span>
              <span>Admitted {formatDate(student.admissionDate)}</span>
              {student.departureDate && (
                <>
                  <span>•</span>
                  <span className="text-amber-400">Departed {formatDate(student.departureDate)}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" size="sm" icon={Edit} onClick={handleOpenEdit}>
            Edit Profile
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={KeyRound}
            onClick={() => {
              setNewPassword('');
              setPasswordError('');
              setIsResetPasswordOpen(true);
            }}
          >
            Reset Password
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={loginEnabled ? ShieldAlert : ShieldCheck}
            onClick={() => setIsToggleLoginOpen(true)}
            className={loginEnabled ? 'text-amber-400 hover:text-amber-300' : 'text-emerald-400 hover:text-emerald-300'}
          >
            {loginEnabled ? 'Disable Login' : 'Enable Login'}
          </Button>

          {isInactive ? (
            <Button
              variant="success"
              size="sm"
              icon={UserCheck}
              onClick={() => setIsActivateOpen(true)}
            >
              Reactivate
            </Button>
          ) : (
            <Button
              variant="danger"
              size="sm"
              icon={UserX}
              onClick={() => {
                setDepartureDate(new Date().toISOString().split('T')[0]);
                setDeactivateReason('');
                setIsDeactivateOpen(true);
              }}
            >
              Deactivate
            </Button>
          )}
        </div>
      </div>

      {/* Inactive notice if applicable */}
      {isInactive && (
        <Alert type="warning" title="Inactive Student Account">
          This student was marked inactive on {formatDate(student.departureDate || student.updatedAt)}.
          {outstandingNum > 0
            ? ` There is an outstanding balance of ${formatNPR(outstandingNum)} pending settlement.`
            : ' All previous financial dues have been fully settled.'}
        </Alert>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-navy-700/80 overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'profile'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-navy-800/40 rounded-t-lg'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Profile Info</span>
        </button>

        <button
          onClick={() => setActiveTab('financial')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'financial'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-navy-800/40 rounded-t-lg'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Financial Summary</span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'ledger'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-navy-800/40 rounded-t-lg'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Full Ledger</span>
        </button>

        <button
          onClick={() => setActiveTab('payment')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'payment'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-navy-800/40 rounded-t-lg'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Record Payment</span>
        </button>
      </div>

      {/* TAB 1: PROFILE */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Info Card */}
          <Card title="Personal Information" subtitle="Student contact and residency details">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <dt className="text-xs text-slate-400">Full Name</dt>
                <dd className="font-semibold text-slate-100 flex items-center gap-2">
                  <User className="w-4 h-4 text-cyan-400 shrink-0" />
                  {student.fullName}
                </dd>
              </div>

              <div className="space-y-1">
                <dt className="text-xs text-slate-400">Student Code</dt>
                <dd className="font-mono text-cyan-400 font-semibold">{student.studentId}</dd>
              </div>

              <div className="space-y-1">
                <dt className="text-xs text-slate-400">Room Number</dt>
                <dd className="font-semibold text-slate-200 flex items-center gap-2">
                  <Building className="w-4 h-4 text-slate-400 shrink-0" />
                  {student.roomNumber}
                </dd>
              </div>

              <div className="space-y-1">
                <dt className="text-xs text-slate-400">Phone Number</dt>
                <dd className="text-slate-200 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  {student.phone || 'Not provided'}
                </dd>
              </div>

              <div className="space-y-1">
                <dt className="text-xs text-slate-400">Email Address</dt>
                <dd className="text-slate-200 flex items-center gap-2 truncate">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  {student.email || 'Not provided'}
                </dd>
              </div>

              <div className="space-y-1">
                <dt className="text-xs text-slate-400">Permanent Address</dt>
                <dd className="text-slate-200 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  {student.address || 'Not provided'}
                </dd>
              </div>
            </dl>

            {student.notes && (
              <div className="mt-5 pt-4 border-t border-navy-700/60">
                <p className="text-xs text-slate-400 mb-1 font-medium">Internal Notes</p>
                <p className="text-sm text-slate-300 bg-navy-900/60 p-3 rounded-lg border border-navy-700/40">
                  {student.notes}
                </p>
              </div>
            )}
          </Card>

          {/* Enrollment & Account Info Card */}
          <Card title="Enrollment & Billing" subtitle="Hostel fee and account credentials">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <dt className="text-xs text-slate-400">Admission Date</dt>
                <dd className="font-semibold text-slate-200 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
                  {formatDate(student.admissionDate)}
                </dd>
              </div>

              <div className="space-y-1">
                <dt className="text-xs text-slate-400">Account Status</dt>
                <dd>
                  <Badge variant={student.status} dot>
                    {student.status}
                  </Badge>
                </dd>
              </div>

              <div className="space-y-1">
                <dt className="text-xs text-slate-400">Monthly Hostel Fee</dt>
                <dd className="text-base font-bold text-cyan-400">
                  {formatNPR(student.monthlyFee || student.currentFeeGroup?.monthlyAmount || 0)}
                </dd>
              </div>

              <div className="space-y-1">
                <dt className="text-xs text-slate-400">Assigned Fee Group</dt>
                <dd className="text-slate-200 font-medium">
                  {student.currentFeeGroup?.name || 'Standard / Unassigned'}
                </dd>
              </div>

              <div className="space-y-1">
                <dt className="text-xs text-slate-400">Web Portal Username</dt>
                <dd className="font-mono text-slate-300 font-semibold">
                  {student.user?.username || student.studentId}
                </dd>
              </div>

              <div className="space-y-1">
                <dt className="text-xs text-slate-400">Portal Access Status</dt>
                <dd>
                  <Badge variant={loginEnabled ? 'ACTIVE' : 'INACTIVE'} dot>
                    {loginEnabled ? 'Login Enabled' : 'Access Suspended'}
                  </Badge>
                </dd>
              </div>
            </dl>

            {/* Fee Histories if available */}
            {student.feeHistories && student.feeHistories.length > 0 && (
              <div className="mt-5 pt-4 border-t border-navy-700/60">
                <p className="text-xs text-slate-400 mb-2 font-medium">Fee History Records</p>
                <div className="space-y-2">
                  {student.feeHistories.map((hist, idx) => (
                    <div
                      key={hist.id || idx}
                      className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-navy-900/60 border border-navy-700/40"
                    >
                      <div>
                        <span className="font-semibold text-slate-200">
                          {hist.feeGroup?.name || 'Custom Package'}
                        </span>
                        <span className="text-slate-400 ml-2">from {formatDate(hist.effectiveFrom)}</span>
                      </div>
                      <span className="font-bold text-cyan-400">{formatNPR(hist.monthlyFee)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 2: FINANCIAL SUMMARY */}
      {activeTab === 'financial' && (
        <div className="space-y-6">
          {/* Summary StatCards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <StatCard
              icon={TrendingUp}
              label="Total Fees Charged"
              value={formatNPR(summary.totalCharged)}
              subtitle="All billed months and adjustments"
              color="amber"
            />
            <StatCard
              icon={CheckCircle}
              label="Total Payments Made"
              value={formatNPR(summary.totalPaid)}
              subtitle="Cash, online and bank transfers"
              color="green"
            />
            <StatCard
              icon={DollarSign}
              label="Current Outstanding Balance"
              value={formatNPR(summary.outstandingBalance)}
              subtitle={outstandingNum > 0 ? 'Payment due' : 'Account in good standing'}
              color={outstandingNum > 0 ? 'red' : 'green'}
            />
          </div>

          {/* Month-wise Charges Breakdown Table */}
          <Card
            title="Month-wise Fee Charges"
            subtitle="Itemized list of all generated monthly billing periods"
          >
            <Table
              headers={['Billing Period / Nepali Month', 'Date Charged', 'Description', 'Amount Charged']}
              empty={monthlyCharges.length === 0}
              emptyMessage="No billing charges have been recorded for this student yet."
            >
              {monthlyCharges.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <div className="font-medium text-slate-200">
                      {entry.billingPeriod
                        ? `${entry.billingPeriod.nepaliMonth || ''} ${entry.billingPeriod.year || ''}`
                        : entry.nepaliMonth || 'Monthly Fee'}
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(entry.date)}</TableCell>
                  <TableCell className="text-slate-300 max-w-xs truncate">
                    {entry.description || 'Monthly hostel accommodation & mess fee'}
                  </TableCell>
                  <TableCell align="right" className="font-semibold text-amber-400 font-mono">
                    {formatNPR(entry.debit)}
                  </TableCell>
                </TableRow>
              ))}
            </Table>
          </Card>
        </div>
      )}

      {/* TAB 3: LEDGER */}
      {activeTab === 'ledger' && (
        <Card
          title="Account Ledger Statement"
          subtitle="Full chronological transaction and running balance history"
          action={
            <Button
              variant="secondary"
              size="sm"
              icon={Printer}
              onClick={() => printStatement(`Koshi Hostel - Ledger - ${student.fullName}`)}
            >
              Print Statement
            </Button>
          }
        >
          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-5 p-3.5 bg-navy-900/60 rounded-xl border border-navy-700/60 no-print">
            <Input
              type="date"
              label="From Date"
              value={ledgerStartDate}
              onChange={(e) => setLedgerStartDate(e.target.value)}
            />
            <Input
              type="date"
              label="To Date"
              value={ledgerEndDate}
              onChange={(e) => setLedgerEndDate(e.target.value)}
            />
            <Select
              label="Entry Type"
              value={ledgerEntryType}
              onChange={(e) => setLedgerEntryType(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Transactions' },
                { value: 'MONTHLY_FEE', label: 'Monthly Charges' },
                { value: 'PAYMENT', label: 'Payments' },
                { value: 'ADJUSTMENT', label: 'Adjustments' },
                { value: 'CREDIT', label: 'Credit Notes' },
                { value: 'REFUND', label: 'Refunds' },
              ]}
            />
            <div className="flex items-end gap-2">
              <Button
                variant="secondary"
                size="md"
                className="w-full"
                onClick={() => {
                  setLedgerStartDate('');
                  setLedgerEndDate('');
                  setLedgerEntryType('ALL');
                }}
              >
                Reset
              </Button>
            </div>
          </div>

          {/* Printable Statement Header (Visible only when printing or inside printable container) */}
          <div className="hidden print:block mb-6 p-4 border-b border-slate-300">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-slate-900">KOSHI HOSTEL</h2>
                <p className="text-xs text-slate-600">Biratnagar-10, Morang, Nepal | Tel: +977-21-523456</p>
                <h3 className="text-base font-semibold text-slate-800 mt-2">STUDENT STATEMENT OF ACCOUNT</h3>
              </div>
              <div className="text-right text-xs text-slate-600">
                <p>Date: {formatDate(new Date())}</p>
                <p className="font-semibold text-slate-800">Student: {student.fullName} ({student.studentId})</p>
                <p>Room: {student.roomNumber}</p>
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <Table
            headers={[
              'Date',
              'Type',
              'Description & Reference',
              { label: 'Debit (NPR)', align: 'right' },
              { label: 'Credit (NPR)', align: 'right' },
              { label: 'Balance (NPR)', align: 'right' },
            ]}
            empty={ledgerEntries.length === 0}
            emptyMessage="No ledger entries found matching your criteria."
          >
            {ledgerEntries.map((row) => {
              const debitNum = parseFloat(row.debit || 0);
              const creditNum = parseFloat(row.credit || 0);
              const balanceNum = parseFloat(row.balanceAfter ?? row.runningBalance ?? 0);

              return (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs">{formatDate(row.date)}</TableCell>
                  <TableCell>
                    <Badge variant={row.entryType}>{row.entryType}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-slate-200 text-sm font-medium">{row.description}</div>
                    {(row.referenceNumber || row.receiptNumber || row.paymentMethod) && (
                      <div className="text-xs text-slate-400 mt-0.5 flex gap-2">
                        {row.paymentMethod && <span>Method: {row.paymentMethod}</span>}
                        {row.referenceNumber && <span>Ref: {row.referenceNumber}</span>}
                        {row.receiptNumber && <span>Receipt: {row.receiptNumber}</span>}
                      </div>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {debitNum > 0 ? (
                      <span className="text-red-400 font-semibold font-mono">
                        {formatNPR(debitNum)}
                      </span>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {creditNum > 0 ? (
                      <span className="text-emerald-400 font-semibold font-mono">
                        {formatNPR(creditNum)}
                      </span>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <span
                      className={`font-bold font-mono ${
                        balanceNum > 0
                          ? 'text-red-400'
                          : balanceNum < 0
                          ? 'text-cyan-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {formatNPR(balanceNum)}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </Table>

          {/* Bottom Running Balance Summary */}
          <div className="mt-5 p-4 rounded-xl bg-navy-900/60 border border-navy-700/60 flex items-center justify-between text-sm">
            <span className="text-slate-400 font-medium">Net Current Outstanding Balance:</span>
            <span
              className={`text-lg font-bold font-mono ${
                outstandingNum > 0 ? 'text-red-400' : 'text-emerald-400'
              }`}
            >
              {formatNPR(outstandingNum)}
            </span>
          </div>
        </Card>
      )}

      {/* TAB 4: RECORD PAYMENT */}
      {activeTab === 'payment' && (
        <div className="max-w-2xl mx-auto">
          <Card
            title="Record Student Payment"
            subtitle="Record a cash collection, bank transfer, or online payment"
          >
            {/* Quick Balance Banner */}
            <div className="mb-6 p-4 rounded-xl bg-navy-900/80 border border-navy-700/80 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium">Student Name & Code</p>
                <p className="text-base font-bold text-slate-100">
                  {student.fullName}{' '}
                  <span className="text-cyan-400 font-mono text-sm">({student.studentId})</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 font-medium">Current Balance Due</p>
                <p
                  className={`text-lg font-bold font-mono ${
                    outstandingNum > 0 ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {formatNPR(outstandingNum)}
                </p>
              </div>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Amount (NPR)"
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 12000"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                />

                <Input
                  label="Payment Date"
                  type="date"
                  required
                  value={paymentForm.date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Payment Method"
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  options={[
                    { value: 'CASH', label: 'Cash Payment' },
                    { value: 'BANK_TRANSFER', label: 'Bank Transfer / Deposit' },
                    { value: 'ONLINE', label: 'Online / eSewa / Khalti' },
                    { value: 'CHEQUE', label: 'Bank Cheque' },
                    { value: 'OTHER', label: 'Other Method' },
                  ]}
                />

                <Input
                  label="Reference / Transaction ID"
                  placeholder="e.g. TXN-98421 or Bank Slip No."
                  value={paymentForm.referenceNumber}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Receipt Number (Optional)"
                  placeholder="e.g. RCP-2024-001"
                  value={paymentForm.receiptNumber}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, receiptNumber: e.target.value })
                  }
                />

                <Input
                  label="Notes / Remarks"
                  placeholder="Optional remarks regarding this payment"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-navy-700/60">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    setPaymentForm({
                      amount: '',
                      date: new Date().toISOString().split('T')[0],
                      paymentMethod: 'CASH',
                      referenceNumber: '',
                      receiptNumber: '',
                      notes: '',
                    })
                  }
                >
                  Clear Form
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={paymentSubmitting}
                  icon={CheckCircle}
                >
                  Record Payment
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL: EDIT STUDENT */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Student Information"
        subtitle={`Update details for ${student.fullName}`}
        maxWidth="max-w-xl"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateStudentMutation.mutate(editForm);
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              required
              value={editForm.fullName}
              onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
            />
            <Input
              label="Room Number"
              required
              value={editForm.roomNumber}
              onChange={(e) => setEditForm({ ...editForm, roomNumber: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
            />
            <Input
              label="Email Address"
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            />
          </div>

          <Input
            label="Permanent Address"
            value={editForm.address}
            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Assigned Fee Group"
              value={editForm.feeGroupId}
              onChange={(e) => {
                const selected = feeGroups.find((g) => g.id === e.target.value);
                setEditForm({
                  ...editForm,
                  feeGroupId: e.target.value,
                  monthlyFee: selected ? String(selected.monthlyAmount) : editForm.monthlyFee,
                });
              }}
              options={feeGroups.map((g) => ({
                value: g.id,
                label: `${g.name} (${formatNPR(g.monthlyAmount)}/mo)`,
              }))}
            />

            <Input
              label="Monthly Fee (NPR)"
              type="number"
              step="0.01"
              value={editForm.monthlyFee}
              onChange={(e) => setEditForm({ ...editForm, monthlyFee: e.target.value })}
            />
          </div>

          <Input
            label="Notes"
            value={editForm.notes}
            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
          />

          <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-navy-700/60">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEditModalOpen(false)}
              disabled={updateStudentMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={updateStudentMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: RESET PASSWORD */}
      <Modal
        isOpen={isResetPasswordOpen}
        onClose={() => setIsResetPasswordOpen(false)}
        title="Reset Student Password"
        subtitle={`Set a new login password for ${student.fullName} (${student.studentId})`}
        maxWidth="max-w-md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newPassword.length < 6) {
              setPasswordError('Password must be at least 6 characters');
              return;
            }
            setPasswordError('');
            resetPasswordMutation.mutate();
          }}
          className="space-y-4"
        >
          <Input
            label="New Password"
            type="password"
            required
            placeholder="At least 6 characters"
            value={newPassword}
            error={passwordError}
            onChange={(e) => {
              setNewPassword(e.target.value);
              if (e.target.value.length >= 6) setPasswordError('');
            }}
          />

          <p className="text-xs text-slate-400">
            The student will use this password alongside their student code ({student.studentId}) to log into the student portal.
          </p>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-navy-700/60">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsResetPasswordOpen(false)}
              disabled={resetPasswordMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={resetPasswordMutation.isPending}>
              Reset Password
            </Button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM DIALOG: DEACTIVATE STUDENT */}
      <ConfirmDialog
        isOpen={isDeactivateOpen}
        onClose={() => setIsDeactivateOpen(false)}
        onConfirm={() => deactivateMutation.mutate()}
        title="Deactivate Student Account"
        message={`Are you sure you want to mark ${student.fullName} as inactive? This will stop future monthly billing generation for this student.`}
        confirmText="Confirm Deactivation"
        type="danger"
        loading={deactivateMutation.isPending}
      >
        <div className="mt-4 space-y-3">
          <Input
            type="date"
            label="Departure Date"
            value={departureDate}
            onChange={(e) => setDepartureDate(e.target.value)}
          />
          <Input
            label="Reason for Departure (Optional)"
            placeholder="e.g. Graduated, Relocated, Course completed"
            value={deactivateReason}
            onChange={(e) => setDeactivateReason(e.target.value)}
          />
        </div>
      </ConfirmDialog>

      {/* CONFIRM DIALOG: REACTIVATE STUDENT */}
      <ConfirmDialog
        isOpen={isActivateOpen}
        onClose={() => setIsActivateOpen(false)}
        onConfirm={() => activateMutation.mutate()}
        title="Reactivate Student Account"
        message={`Are you sure you want to reactivate ${student.fullName}? The student will resume normal active status and become eligible for monthly billing runs.`}
        confirmText="Reactivate Account"
        type="info"
        loading={activateMutation.isPending}
      />

      {/* CONFIRM DIALOG: TOGGLE LOGIN ACCESS */}
      <ConfirmDialog
        isOpen={isToggleLoginOpen}
        onClose={() => setIsToggleLoginOpen(false)}
        onConfirm={() => toggleLoginMutation.mutate()}
        title={loginEnabled ? 'Suspend Portal Login Access' : 'Enable Portal Login Access'}
        message={
          loginEnabled
            ? `Are you sure you want to disable student portal login for ${student.fullName}? They will not be able to log in to view their ledger.`
            : `Enable student portal login access for ${student.fullName}?`
        }
        confirmText={loginEnabled ? 'Disable Access' : 'Enable Access'}
        type={loginEnabled ? 'warning' : 'info'}
        loading={toggleLoginMutation.isPending}
      />
    </div>
  );
}
