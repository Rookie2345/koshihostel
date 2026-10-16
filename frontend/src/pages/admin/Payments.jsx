import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);

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
    queryKey: ['payments', 'list', { search, startDate, endDate, paymentMethod, page, pageSize }],
    queryFn: async () => {
      const params = {
        page,
        limit: pageSize,
        entryType: 'PAYMENT',
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

  // Query: Active Students for Autocomplete
  const { data: studentsResponse } = useStudents({
    limit: 200,
    status: 'ACTIVE',
  });
  const allStudents = studentsResponse?.students || (Array.isArray(studentsResponse) ? studentsResponse : []);

  // Filter students for autocomplete
  const matchingStudents = useMemo(() => {
    if (!studentSearchInput.trim()) return [];
    const term = studentSearchInput.toLowerCase();
    return allStudents
      .filter(
        (s) =>
          s.fullName?.toLowerCase().includes(term) ||
          s.studentId?.toLowerCase().includes(term) ||
          s.roomNumber?.toLowerCase().includes(term)
      )
      .slice(0, 8);
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
        const startOfWeek = new Date(now.setDate(diff));
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
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-navy-700/60">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Payments & Collections</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track student fee payments, receipt numbers, payment methods, and cash reconciliations.
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div className="lg:col-span-2">
            <Input
              label="Search Payments"
              icon={Search}
              placeholder="Student name, student ID, ref #, or receipt..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
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

        {(search || startDate || endDate || paymentMethod) && (
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
                'Date & Time',
                'Student Name',
                'Room',
                { label: 'Amount (NPR)', align: 'right' },
                'Method',
                'Reference / Receipt',
                'Notes',
                'Recorded By',
              ]}
              empty={payments.length === 0}
              emptyMessage="No payment transactions match the selected filters."
            >
              {payments.map((p) => {
                const amount = parseFloat(p.credit || p.amount || 0);

                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs text-slate-300">
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

                    <TableCell className="text-slate-300">
                      {p.student?.roomNumber ? `Room ${p.student.roomNumber}` : '-'}
                    </TableCell>

                    <TableCell align="right">
                      <span className="font-bold text-emerald-400 font-mono text-sm">
                        {formatNPR(amount)}
                      </span>
                    </TableCell>

                    <TableCell>
                      <Badge variant={p.paymentMethod || 'PAYMENT'}>
                        {p.paymentMethod || 'CASH'}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-xs text-slate-300 font-mono">
                      {p.receiptNumber && (
                        <div className="font-medium text-slate-200">RCP: {p.receiptNumber}</div>
                      )}
                      {p.referenceNumber && (
                        <div className="text-slate-400 text-[11px]">Ref: {p.referenceNumber}</div>
                      )}
                      {!p.receiptNumber && !p.referenceNumber && '-'}
                    </TableCell>

                    <TableCell className="text-xs text-slate-400 max-w-xs truncate">
                      {p.notes || p.description || '-'}
                    </TableCell>

                    <TableCell className="text-xs text-slate-300">
                      {p.recorder?.username || 'Admin'}
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
                    required
                    placeholder="Type student name, student ID, or room..."
                    value={studentSearchInput}
                    onChange={(e) => {
                      setStudentSearchInput(e.target.value);
                      setShowStudentDropdown(true);
                    }}
                    onFocus={() => setShowStudentDropdown(true)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-navy-900 border border-navy-600 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Dropdown Options */}
                {showStudentDropdown && matchingStudents.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg bg-navy-900 border border-navy-600 shadow-xl divide-y divide-navy-700/60">
                    {matchingStudents.map((s) => (
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
                          <p className="font-semibold text-slate-100">{s.fullName}</p>
                          <p className="text-slate-400 font-mono text-[11px]">
                            {s.studentId} • Room {s.roomNumber}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">Due:</span>
                          <span className="font-bold text-red-400 font-mono">
                            {formatNPR(s.outstandingBalance || 0)}
                          </span>
                        </div>
                      </div>
                    ))}
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
