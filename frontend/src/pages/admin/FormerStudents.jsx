import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserMinus,
  Search,
  Filter,
  Eye,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Building,
  Calendar,
  DollarSign,
  ArrowUpDown,
  Coins,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

import apiClient from '../../api/client';
import paymentsApi from '../../api/payments';
import studentsApi from '../../api/students';

import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import StatCard from '../../components/ui/StatCard';
import Table, { TableRow, TableCell } from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import Alert from '../../components/ui/Alert';

import { formatNPR } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

export default function FormerStudents() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Filters State
  const [search, setSearch] = useState('');
  const [filterDuesOnly, setFilterDuesOnly] = useState(true);
  const [sortBy, setSortBy] = useState('balance_desc'); // 'balance_desc' | 'balance_asc' | 'name_asc' | 'date_desc'

  // Payment Modal State
  const [paymentModalStudent, setPaymentModalStudent] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'CASH',
    referenceNumber: '',
    receiptNumber: '',
    notes: '',
  });

  // Query: Former Students with dues or all inactive
  const {
    data: formerStudentsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['reports', 'former-students', filterDuesOnly],
    queryFn: async () => {
      if (filterDuesOnly) {
        try {
          const res = await apiClient.get('/reports/former-students');
          return res.data?.data !== undefined ? res.data.data : res.data;
        } catch {
          const fallback = await apiClient.get('/students', {
            params: { status: 'INACTIVE', limit: 100 },
          });
          const raw = fallback.data?.data || fallback.data;
          const list = raw?.students || (Array.isArray(raw) ? raw : []);
          return {
            students: list.filter((s) => parseFloat(s.outstandingBalance || 0) > 0),
            totalOutstanding: list.reduce(
              (acc, s) => acc + Math.max(0, parseFloat(s.outstandingBalance || 0)),
              0
            ),
          };
        }
      } else {
        const res = await apiClient.get('/students', {
          params: { status: 'INACTIVE', limit: 150 },
        });
        const raw = res.data?.data || res.data;
        const list = raw?.students || (Array.isArray(raw) ? raw : []);
        return {
          students: list,
          totalOutstanding: list.reduce(
            (acc, s) => acc + Math.max(0, parseFloat(s.outstandingBalance || 0)),
            0
          ),
        };
      }
    },
  });

  const rawList = formerStudentsData?.students || [];

  // Normalize student objects
  const normalizedStudents = useMemo(() => {
    return rawList.map((s) => ({
      id: s.id,
      studentCode: s.studentCode || s.studentId,
      fullName: s.fullName,
      roomNumber: s.roomNumber,
      phone: s.phone,
      email: s.email,
      departureDate: s.departureDate,
      admissionDate: s.admissionDate,
      outstandingBalance: parseFloat(s.outstandingBalance || 0),
      feeGroup: typeof s.feeGroup === 'object' ? s.feeGroup?.name : s.feeGroup || s.currentFeeGroup?.name || 'N/A',
      lastPaymentDate: s.lastPaymentDate || s.ledgerEntries?.[0]?.date || null,
    }));
  }, [rawList]);

  // Filter and Sort
  const filteredStudents = useMemo(() => {
    let result = [...normalizedStudents];

    // Filter dues if toggled
    if (filterDuesOnly) {
      result = result.filter((s) => s.outstandingBalance > 0);
    }

    // Search filter
    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.fullName?.toLowerCase().includes(term) ||
          s.studentCode?.toLowerCase().includes(term) ||
          s.roomNumber?.toLowerCase().includes(term) ||
          s.phone?.toLowerCase().includes(term)
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'balance_desc') return b.outstandingBalance - a.outstandingBalance;
      if (sortBy === 'balance_asc') return a.outstandingBalance - b.outstandingBalance;
      if (sortBy === 'name_asc') return (a.fullName || '').localeCompare(b.fullName || '');
      if (sortBy === 'date_desc') {
        return new Date(b.departureDate || 0) - new Date(a.departureDate || 0);
      }
      return 0;
    });

    return result;
  }, [normalizedStudents, filterDuesOnly, search, sortBy]);

  // Aggregate stats
  const totalOutstanding = useMemo(() => {
    return normalizedStudents.reduce((sum, s) => sum + Math.max(0, s.outstandingBalance), 0);
  }, [normalizedStudents]);

  const studentsWithDuesCount = useMemo(() => {
    return normalizedStudents.filter((s) => s.outstandingBalance > 0).length;
  }, [normalizedStudents]);

  const settledCount = useMemo(() => {
    return normalizedStudents.filter((s) => s.outstandingBalance <= 0).length;
  }, [normalizedStudents]);

  // Record Payment Mutation
  const recordPaymentMutation = useMutation({
    mutationFn: async (payload) => {
      await paymentsApi.recordPayment(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'former-students'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Dues payment recorded successfully!');
      handleClosePaymentModal();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to record payment');
    },
  });

  const handleOpenPaymentModal = (student) => {
    setPaymentModalStudent(student);
    setPaymentForm({
      amount: student.outstandingBalance > 0 ? String(student.outstandingBalance) : '',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'CASH',
      referenceNumber: '',
      receiptNumber: '',
      notes: `Final settlement payment for ${student.fullName}`,
    });
  };

  const handleClosePaymentModal = () => {
    setPaymentModalStudent(null);
  };

  const handleSubmitPayment = (e) => {
    e.preventDefault();
    if (!paymentModalStudent) return;
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    recordPaymentMutation.mutate({
      studentId: paymentModalStudent.id,
      amount: parseFloat(paymentForm.amount),
      date: paymentForm.date ? new Date(paymentForm.date).toISOString() : new Date().toISOString(),
      paymentMethod: paymentForm.paymentMethod,
      referenceNumber: paymentForm.referenceNumber.trim() || undefined,
      receiptNumber: paymentForm.receiptNumber.trim() || undefined,
      notes: paymentForm.notes.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-navy-700/60">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
            Former Students & Unsettled Dues
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track and recover outstanding fee balances from students who have departed or graduated.
          </p>
        </div>

        <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => refetch()}>
          Refresh Data
        </Button>
      </div>

      {/* Summary StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          icon={AlertTriangle}
          label="Total Unsettled Dues"
          value={formatNPR(totalOutstanding)}
          subtitle="Receivable from departed residents"
          color="red"
        />
        <StatCard
          icon={UserMinus}
          label="Former Students With Dues"
          value={studentsWithDuesCount}
          subtitle="Accounts requiring settlement"
          color="amber"
        />
        <StatCard
          icon={CheckCircle}
          label="Fully Settled Accounts"
          value={settledCount}
          subtitle="Clear zero-balance records"
          color="green"
        />
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <Input
            label="Search Former Students"
            icon={Search}
            placeholder="Search by name, student code, room..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <Select
            label="Account Status Filter"
            value={filterDuesOnly ? 'dues' : 'all'}
            onChange={(e) => setFilterDuesOnly(e.target.value === 'dues')}
            options={[
              { value: 'dues', label: 'Only with Outstanding Dues' },
              { value: 'all', label: 'Show All Inactive Students' },
            ]}
          />

          <Select
            label="Sort By"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            options={[
              { value: 'balance_desc', label: 'Outstanding: High to Low' },
              { value: 'balance_asc', label: 'Outstanding: Low to High' },
              { value: 'name_asc', label: 'Student Name: A to Z' },
              { value: 'date_desc', label: 'Departure: Most Recent' },
            ]}
          />
        </div>
      </Card>

      {/* Former Students Table */}
      <Card
        title="Former Students Directory"
        subtitle={`Showing ${filteredStudents.length} records`}
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
            <h4 className="text-sm font-semibold text-slate-100">Failed to load former students</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {error?.response?.data?.message || 'Error occurred while loading former student records.'}
            </p>
            <Button variant="primary" size="xs" className="mt-3" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <Table
            headers={[
              'Student Name & ID',
              'Room',
              'Departure Date',
              { label: 'Outstanding Balance', align: 'right' },
              'Status',
              'Last Payment',
              { label: 'Actions', align: 'right' },
            ]}
            empty={filteredStudents.length === 0}
            emptyMessage="No former students found matching the selected criteria."
          >
            {filteredStudents.map((s) => {
              const hasDues = s.outstandingBalance > 0;

              return (
                <TableRow key={s.id}>
                  <TableCell>
                    <div>
                      <Link
                        to={`/admin/students/${s.id}`}
                        className="font-semibold text-slate-100 hover:text-cyan-400 transition-colors"
                      >
                        {s.fullName}
                      </Link>
                      <span className="block text-xs font-mono text-cyan-400">
                        {s.studentCode}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="text-slate-300">
                    {s.roomNumber ? `Room ${s.roomNumber}` : '-'}
                  </TableCell>

                  <TableCell className="text-xs text-slate-300">
                    {s.departureDate ? formatDate(s.departureDate) : 'Not recorded'}
                  </TableCell>

                  <TableCell align="right">
                    <span
                      className={`font-bold font-mono text-sm ${
                        hasDues ? 'text-red-400' : 'text-emerald-400'
                      }`}
                    >
                      {formatNPR(s.outstandingBalance)}
                    </span>
                  </TableCell>

                  <TableCell>
                    {hasDues ? (
                      <Badge variant="DANGER" dot>
                        Dues Pending
                      </Badge>
                    ) : (
                      <Badge variant="SETTLED" dot>
                        Fully Settled
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell className="text-xs text-slate-400">
                    {s.lastPaymentDate ? formatDate(s.lastPaymentDate) : 'No payments'}
                  </TableCell>

                  <TableCell align="right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="secondary"
                        size="xs"
                        icon={Eye}
                        onClick={() => navigate(`/admin/students/${s.id}`)}
                      >
                        View Account
                      </Button>

                      {hasDues && (
                        <Button
                          variant="primary"
                          size="xs"
                          icon={CreditCard}
                          onClick={() => handleOpenPaymentModal(s)}
                        >
                          Record Payment
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </Table>
        )}
      </Card>

      {/* MODAL: RECORD PAYMENT FOR FORMER STUDENT */}
      <Modal
        isOpen={Boolean(paymentModalStudent)}
        onClose={handleClosePaymentModal}
        title="Record Final Settlement Payment"
        subtitle={
          paymentModalStudent
            ? `Post payment towards outstanding balance for ${paymentModalStudent.fullName}`
            : ''
        }
        maxWidth="max-w-md"
      >
        {paymentModalStudent && (
          <form onSubmit={handleSubmitPayment} className="space-y-4">
            <div className="p-3 rounded-xl bg-navy-900 border border-navy-700/80 flex items-center justify-between text-xs">
              <div>
                <p className="text-slate-400">Student Code:</p>
                <p className="font-mono font-bold text-cyan-400">{paymentModalStudent.studentCode}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-400">Outstanding Balance:</p>
                <p className="font-mono font-bold text-red-400 text-sm">
                  {formatNPR(paymentModalStudent.outstandingBalance)}
                </p>
              </div>
            </div>

            <Input
              label="Payment Amount (NPR)"
              type="number"
              step="0.01"
              required
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

            <Select
              label="Payment Method"
              value={paymentForm.paymentMethod}
              onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
              options={[
                { value: 'CASH', label: 'Cash Payment' },
                { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                { value: 'ONLINE', label: 'Online / eSewa' },
                { value: 'CHEQUE', label: 'Cheque' },
                { value: 'OTHER', label: 'Other' },
              ]}
            />

            <Input
              label="Reference / Receipt Number (Optional)"
              placeholder="e.g. TXN-9912 or RCP-552"
              value={paymentForm.referenceNumber}
              onChange={(e) =>
                setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })
              }
            />

            <Input
              label="Notes"
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
            />

            <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-navy-700/60">
              <Button
                type="button"
                variant="secondary"
                onClick={handleClosePaymentModal}
                disabled={recordPaymentMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={recordPaymentMutation.isPending}
              >
                Post Settlement Payment
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
