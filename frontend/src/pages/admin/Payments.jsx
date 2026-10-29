import React, { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  Calendar,
  DollarSign,
  TrendingUp,
  User,
  Clock,
  CheckCircle,
  FileText,
  Building,
  RefreshCw,
  X,
  AlertCircle,
  ArrowUpDown,
  Coins,
} from 'lucide-react';
import toast from 'react-hot-toast';

import apiClient from '../../api/client';
import paymentsApi from '../../api/payments';
import { useStudents } from '../../hooks/useStudents';

import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import StatCard from '../../components/ui/StatCard';
import Table, { TableRow, TableCell } from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import Modal from '../../components/ui/Modal';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import Alert from '../../components/ui/Alert';

import { formatNPR } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

export default function Payments() {
  const queryClient = useQueryClient();

  // Filters & Pagination State
  const [searchParams, setSearchParams] = useSearchParams();
  const initialType = searchParams.get('type') || searchParams.get('entryType') || 'ALL';
  const [selectedType, setSelectedType] = useState(initialType);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);

  React.useEffect(() => {
    const typeParam = searchParams.get('type') || searchParams.get('entryType');
    if (typeParam) {
      setSelectedType(typeParam);
    }
  }, [searchParams]);

  // Modal State
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [studentSearchInput, setStudentSearchInput] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);

  // Form State
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'CASH',
    referenceNumber: '',
    receiptNumber: '',
    notes: '',
  });

  // Query: Payments List
  const {
    data: paymentsResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['payments', 'list', { search, startDate, endDate, paymentMethod, selectedType, page, pageSize }],
    queryFn: async () => {
      const params = {
        page,
        limit: pageSize,
        entryType: selectedType,
      };
      if (search.trim()) params.search = search.trim();
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (paymentMethod && paymentMethod !== 'ALL') params.paymentMethod = paymentMethod;

      const res = await apiClient.get('/payments', { params });
      return res.data?.data !== undefined ? res.data.data : res.data;
    },
  });

  const payments = paymentsResponse?.payments || (Array.isArray(paymentsResponse) ? paymentsResponse : []);
  const pagination = paymentsResponse?.pagination || { total: payments.length, page: 1, totalPages: 1 };

  // Query: Students for Autocomplete / Selection (both Active & Inactive with dues)
  const { data: studentsResponse, isLoading: isLoadingStudents } = useStudents({
    limit: 100,
  });
  const allStudents = studentsResponse?.students || (Array.isArray(studentsResponse) ? studentsResponse : []);

  // Filter students for autocomplete (shows all students by default!)
  const matchingStudents = useMemo(() => {
    if (!studentSearchInput.trim()) {
      return allStudents;
    }
    const term = studentSearchInput.toLowerCase();
    return allStudents.filter(
      (s) =>
        s.fullName?.toLowerCase().includes(term) ||
        s.studentId?.toLowerCase().includes(term) ||
        s.roomNumber?.toLowerCase().includes(term)
    );
  }, [allStudents, studentSearchInput]);

  // Query: Collections Metric for Today, This Week, This Month
  const { data: metricsData } = useQuery({
    queryKey: ['reports', 'collection-metrics'],
    queryFn: async () => {
      try {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

        // Start of this week (Monday)
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const startOfWeek = new Date(now);
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);

        // Start of current month
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        const [todayRes, weekRes, monthRes] = await Promise.all([
          apiClient.get('/reports/collection', { params: { startDate: startOfToday } }),
          apiClient.get('/reports/collection', { params: { startDate: startOfWeek.toISOString() } }),
          apiClient.get('/reports/collection', { params: { startDate: startOfMonth } }),
        ]);

        return {
          today: todayRes.data?.data?.grandTotalCollected || 0,
          week: weekRes.data?.data?.grandTotalCollected || 0,
          month: monthRes.data?.data?.grandTotalCollected || 0,
        };
      } catch {
        // Fallback calculation from payments list if reports endpoint is unreachable
        let todaySum = 0;
        let weekSum = 0;
        let monthSum = 0;
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        payments.forEach((p) => {
          const pAmount = parseFloat(p.credit || 0);
          const pDate = new Date(p.date);
          const pDateStr = pDate.toISOString().split('T')[0];

          if (pDateStr === todayStr) todaySum += pAmount;
          if (pDate.getMonth() === now.getMonth() && pDate.getFullYear() === now.getFullYear()) {
            monthSum += pAmount;
          }
        });

        return { today: todaySum, week: weekSum || todaySum, month: monthSum };
      }
    },
  });

  // Record Payment Mutation
  const recordPaymentMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await paymentsApi.recordPayment(payload);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Payment recorded successfully!');
      handleCloseRecordModal();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to record payment');
    },
  });

  const handleOpenRecordModal = () => {
    setSelectedStudent(null);
    setStudentSearchInput('');
    setPaymentForm({
      amount: '',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'CASH',
      referenceNumber: '',
      receiptNumber: '',
      notes: '',
    });
    setIsRecordModalOpen(true);
  };

  const handleCloseRecordModal = () => {
    setIsRecordModalOpen(false);
    setSelectedStudent(null);
    setStudentSearchInput('');
    setShowStudentDropdown(false);
  };

  const handleSubmitPayment = (e) => {
    e.preventDefault();
    if (!selectedStudent) {
      toast.error('Please select a student from the list');
      return;
    }
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      toast.error('Please enter a valid payment amount greater than zero');
      return;
    }

    const payload = {
      studentId: selectedStudent.id,
      amount: parseFloat(paymentForm.amount),
      date: paymentForm.date ? new Date(paymentForm.date).toISOString() : new Date().toISOString(),
      paymentMethod: paymentForm.paymentMethod,
      referenceNumber: paymentForm.referenceNumber.trim() || undefined,
      receiptNumber: paymentForm.receiptNumber.trim() || undefined,
      notes: paymentForm.notes.trim() || undefined,
    };

    recordPaymentMutation.mutate(payload);
  };

  const handleResetFilters = () => {
    setSearch('');
    setStartDate('');
    setEndDate('');
    setPaymentMethod('');
    setSelectedType('ALL');
    setSearchParams({});
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-navy-700/60">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Transactions & Payments</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track student fee debits, monthly billing, custom charges, and payments.
          </p>
        </div>

        <Button variant="primary" icon={Plus} onClick={handleOpenRecordModal}>
          Record Payment
        </Button>
      </div>

      {/* Summary StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          icon={Coins}
          label="Collected Today"
          value={formatNPR(metricsData?.today || 0)}
          subtitle="Cash & digital deposits today"
          color="cyan"
        />
        <StatCard
          icon={TrendingUp}
          label="Collected This Week"
          value={formatNPR(metricsData?.week || 0)}
          subtitle="Current calendar week total"
          color="blue"
        />
        <StatCard
          icon={CheckCircle}
          label="Collected This Month"
          value={formatNPR(metricsData?.month || 0)}
          subtitle="Month-to-date collections"
          color="green"
        />
      </div>

      {/* Filter & Search Toolbar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <div className="lg:col-span-2">
            <Input
              label="Search Transactions"
              icon={Search}
              placeholder="Student name, ID, desc, receipt..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div>
            <Select
              label="Transaction Type"
              value={selectedType}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedType(val);
                setSearchParams((prev) => {
                  const np = new URLSearchParams(prev);
                  if (val === 'ALL') np.delete('type');
                  else np.set('type', val);
                  return np;
                });
                setPage(1);
              }}
              options={[
                { value: 'ALL', label: 'All Transactions' },
                { value: 'PAYMENT', label: 'Payments' },
                { value: 'MONTHLY_FEE', label: 'Monthly Fees' },
                { value: 'ADJUSTMENT', label: 'Custom Charges' },
                { value: 'CREDIT', label: 'Concessions / Credits' },
                { value: 'REFUND', label: 'Refunds' },
              ]}
            />
          </div>

          <div>
            <Input
              type="date"
              label="From Date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div>
            <Input
              type="date"
              label="To Date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div>
            <Select
              label="Payment Method"
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value);
                setPage(1);
              }}
              options={[
                { value: 'ALL', label: 'All Methods' },
                { value: 'CASH', label: 'Cash' },
                { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                { value: 'ONLINE', label: 'Online / eSewa' },
                { value: 'CHEQUE', label: 'Cheque' },
                { value: 'OTHER', label: 'Other' },
              ]}
            />
          </div>
        </div>

        {(search || startDate || endDate || paymentMethod || selectedType !== 'ALL') && (
          <div className="mt-3 pt-3 border-t border-navy-700/60 flex items-center justify-between text-xs text-slate-400">
            <span>Filtering active</span>
            <button
              onClick={handleResetFilters}
              className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Reset All Filters
            </button>
          </div>
        )}
      </Card>

      {/* Payments Table */}
      <Card
        title="Transaction Ledger"
        subtitle={`Showing page ${pagination.page} of ${pagination.totalPages} (${pagination.total} total payments)`}
        action={
          <Button variant="secondary" size="xs" icon={RefreshCw} onClick={() => refetch()}>
            Refresh
          </Button>
        }
      >
        {isLoading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="w-full h-12 rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <div className="py-12 text-center">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-100">Failed to load payments</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {error?.response?.data?.message || 'Error occurred while loading payment transactions.'}
            </p>
            <Button variant="primary" size="xs" className="mt-3" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <>
            <Table
              headers={[
                'Date',
                'Student Name',
                'Room',
                'Type',
                { label: 'Amount (NPR)', align: 'right' },
                'Details / Description',
                'Recorded By',
              ]}
              empty={payments.length === 0}
              emptyMessage="No transactions match the selected filters."
            >
              {payments.map((p) => {
                const entryType = p.entryType || 'PAYMENT';
                const isCredit = parseFloat(p.credit || 0) > 0 || entryType === 'PAYMENT';
                const amount = isCredit
                  ? parseFloat(p.credit || p.amount || 0)
                  : parseFloat(p.debit || p.amount || 0);

                let badgeLabel = entryType;
                let badgeVariant = entryType;
                let detailText = p.description || '';

                if (entryType === 'ADJUSTMENT' && p.description) {
                  if (p.description.includes(':')) {
                    const parts = p.description.split(':');
                    badgeLabel = parts[0].trim();
                    detailText = parts.slice(1).join(':').trim();
                  } else {
                    badgeLabel = p.description.trim();
                  }
                  badgeVariant = 'ADJUSTMENT';
                } else if (entryType === 'MONTHLY_FEE') {
                  badgeLabel = 'Monthly Fee';
                  badgeVariant = 'MONTHLY_FEE';
                } else if (entryType === 'PAYMENT') {
                  badgeLabel = p.paymentMethod || 'Payment';
                  badgeVariant = 'PAYMENT';
                }

                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs text-slate-300 whitespace-nowrap">
                      {formatDate(p.date)}
                    </TableCell>

                    <TableCell>
                      {p.student ? (
                        <div>
                          <Link
                            to={`/admin/students/${p.student.id}`}
                            className="font-semibold text-slate-100 hover:text-cyan-400 transition-colors"
                          >
                            {p.student.fullName}
                          </Link>
                          <span className="block text-xs font-mono text-cyan-400">
                            {p.student.studentId}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Unknown Student</span>
                      )}
                    </TableCell>

                    <TableCell className="text-slate-300 text-xs">
                      {p.student?.roomNumber ? `Room ${p.student.roomNumber}` : '-'}
                    </TableCell>

                    <TableCell>
                      <Badge variant={badgeVariant} size="xs">
                        {badgeLabel}
                      </Badge>
                    </TableCell>

                    <TableCell align="right" className="whitespace-nowrap">
                      <span className={`font-bold font-mono text-sm ${isCredit ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {isCredit ? '+' : '-'} {formatNPR(amount)}
                      </span>
                    </TableCell>

                    <TableCell className="text-xs text-slate-300">
                      <div className="max-w-[220px] truncate" title={detailText || p.notes || ''}>
                        {detailText || p.notes || '-'}
                      </div>
                      {(p.receiptNumber || p.referenceNumber) && (
                        <div className="text-[11px] text-slate-400 mt-0.5 flex gap-2">
                          {p.receiptNumber && <span>RCP: {p.receiptNumber}</span>}
                          {p.referenceNumber && <span>Ref: {p.referenceNumber}</span>}
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-slate-400">
                      {p.recorder?.username || 'admin'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </Table>

            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              pageSize={pageSize}
              onPageChange={(p) => setPage(p)}
            />
          </>
        )}
      </Card>

      {/* MODAL: RECORD PAYMENT */}
      <Modal
        isOpen={isRecordModalOpen}
        onClose={handleCloseRecordModal}
        title="Record New Student Payment"
        subtitle="Post a cash, bank deposit, or online payment directly into the student ledger"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmitPayment} className="space-y-4">
          {/* Autocomplete Student Search */}
          <div className="relative">
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Select Student <span className="text-red-400">*</span>
            </label>

            {selectedStudent ? (
              <div className="p-3 rounded-lg bg-navy-900 border border-cyan-500/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-sm font-semibold text-slate-100">
                      {selectedStudent.fullName}
                    </h5>
                    <p className="text-xs text-slate-400 font-mono">
                      {selectedStudent.studentId} • Room {selectedStudent.roomNumber}
                    </p>
                  </div>
                </div>

                <div className="text-right flex items-center gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Balance Due:</span>
                    <span
                      className={`text-xs font-bold font-mono ${
                        parseFloat(selectedStudent.outstandingBalance || 0) > 0
                          ? 'text-red-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {formatNPR(selectedStudent.outstandingBalance || 0)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStudent(null);
                      setStudentSearchInput('');
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-navy-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Click to select student (or type to search)..."
                    value={studentSearchInput}
                    onChange={(e) => {
                      setStudentSearchInput(e.target.value);
                      setShowStudentDropdown(true);
                    }}
                    onFocus={() => setShowStudentDropdown(true)}
                    className="w-full pl-9 pr-16 py-2 rounded-lg bg-navy-900 border border-navy-600 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500 cursor-pointer"
                  />
                  {showStudentDropdown && (
                    <button
                      type="button"
                      onClick={() => setShowStudentDropdown(false)}
                      className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-200 bg-navy-800 px-2 py-0.5 rounded"
                    >
                      Close ✕
                    </button>
                  )}
                </div>

                {/* Dropdown Options */}
                {showStudentDropdown && (
                  <div className="absolute z-30 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-lg bg-navy-900 border border-navy-600 shadow-2xl divide-y divide-navy-700/60">
                    {matchingStudents.length > 0 ? (
                      matchingStudents.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => {
                            setSelectedStudent(s);
                            setShowStudentDropdown(false);
                            // Auto set amount to outstanding if balance > 0
                            const bal = parseFloat(s.outstandingBalance || 0);
                            if (bal > 0 && !paymentForm.amount) {
                              setPaymentForm((prev) => ({ ...prev, amount: String(bal) }));
                            }
                          }}
                          className="p-2.5 hover:bg-navy-800 cursor-pointer flex items-center justify-between text-xs transition-colors"
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-slate-100">{s.fullName}</p>
                              {s.status === 'INACTIVE' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-700 text-slate-300 font-mono">
                                  Former
                                </span>
                              )}
                            </div>
                            <p className="text-slate-400 font-mono text-[11px]">
                              {s.studentId} • Room {s.roomNumber || 'N/A'}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">Due:</span>
                            <span
                              className={`font-bold font-mono ${
                                parseFloat(s.outstandingBalance || 0) > 0 ? 'text-red-400' : 'text-emerald-400'
                              }`}
                            >
                              {formatNPR(s.outstandingBalance || 0)}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-center text-xs text-slate-400">
                        {allStudents.length === 0
                          ? 'No students found. Add a student in the Students section first.'
                          : 'No students match your search.'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Payment Amount (NPR)"
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
                { value: 'CHEQUE', label: 'Cheque' },
                { value: 'OTHER', label: 'Other' },
              ]}
            />

            <Input
              label="Reference / TXN ID (Optional)"
              placeholder="e.g. TXN-10293 or Bank Slip"
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
              placeholder="Optional remarks"
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-navy-700/60">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCloseRecordModal}
              disabled={recordPaymentMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              icon={CheckCircle}
              loading={recordPaymentMutation.isPending}
            >
              Record Payment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
