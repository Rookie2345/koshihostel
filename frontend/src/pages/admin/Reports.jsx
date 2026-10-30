import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Tags,
  CreditCard,
  FileText,
  Download,
  Printer,
  Calendar,
  Filter,
  Search,
  CheckCircle,
  Building,
  User,
  ArrowUpDown,
  RefreshCw,
  Coins,
  AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import toast from 'react-hot-toast';

import apiClient from '../../api/client';
import { useStudents } from '../../hooks/useStudents';

import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import StatCard from '../../components/ui/StatCard';
import Table, { TableRow, TableCell } from '../../components/ui/Table';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

import { formatNPR } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { printStatement } from '../../utils/printStatement';

export default function Reports() {
  // Active Tab: 'monthly' | 'outstanding' | 'feegroups' | 'collections' | 'statement'
  const [activeTab, setActiveTab] = useState('monthly');

  // Tab 2: Outstanding Filters
  const [outstandingStatus, setOutstandingStatus] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'

  // Tab 4: Collection Filters
  const [collectionStartDate, setCollectionStartDate] = useState('');
  const [collectionEndDate, setCollectionEndDate] = useState('');
  const [collectionMethod, setCollectionMethod] = useState('');

  // Tab 5: Student Statement Selection
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');

  // Query: All Students for Statement Select
  const { data: studentsData } = useStudents({ limit: 200 });
  const allStudents = studentsData?.students || (Array.isArray(studentsData) ? studentsData : []);

  // Filter students for statement dropdown
  const filteredStatementStudents = useMemo(() => {
    if (!studentSearchTerm.trim()) return allStudents;
    const term = studentSearchTerm.toLowerCase();
    return allStudents.filter(
      (s) =>
        s.fullName?.toLowerCase().includes(term) ||
        s.studentId?.toLowerCase().includes(term) ||
        s.roomNumber?.toLowerCase().includes(term)
    );
  }, [allStudents, studentSearchTerm]);

  // Tab 1 Query: Monthly Summary
  const {
    data: monthlySummaryData,
    isLoading: isMonthlyLoading,
    refetch: refetchMonthly,
  } = useQuery({
    queryKey: ['reports', 'monthly-summary'],
    queryFn: async () => {
      const res = await apiClient.get('/reports/monthly-summary');
      return res.data?.data !== undefined ? res.data.data : res.data;
    },
    enabled: activeTab === 'monthly',
  });

  const monthlyList = Array.isArray(monthlySummaryData) ? monthlySummaryData : [];

  // Tab 2 Query: Outstanding Dues Report
  const {
    data: outstandingData,
    isLoading: isOutstandingLoading,
    refetch: refetchOutstanding,
  } = useQuery({
    queryKey: ['reports', 'outstanding', outstandingStatus],
    queryFn: async () => {
      const res = await apiClient.get('/reports/outstanding', {
        params: { status: outstandingStatus },
      });
      return res.data?.data !== undefined ? res.data.data : res.data;
    },
    enabled: activeTab === 'outstanding',
  });

  const outstandingStudents = outstandingData?.students || [];

  // Tab 3 Query: Fee Group Summary
  const {
    data: feeGroupSummaryData,
    isLoading: isFeeGroupLoading,
    refetch: refetchFeeGroups,
  } = useQuery({
    queryKey: ['reports', 'fee-group-summary'],
    queryFn: async () => {
      const res = await apiClient.get('/reports/fee-group-summary');
      return res.data?.data !== undefined ? res.data.data : res.data;
    },
    enabled: activeTab === 'feegroups',
  });

  const feeGroupsList = Array.isArray(feeGroupSummaryData) ? feeGroupSummaryData : [];

  // Tab 4 Query: Collection Report
  const {
    data: collectionData,
    isLoading: isCollectionLoading,
    refetch: refetchCollection,
  } = useQuery({
    queryKey: ['reports', 'collection', collectionStartDate, collectionEndDate, collectionMethod],
    queryFn: async () => {
      const params = {};
      if (collectionStartDate) params.startDate = collectionStartDate;
      if (collectionEndDate) params.endDate = collectionEndDate;
      if (collectionMethod && collectionMethod !== 'ALL') params.paymentMethod = collectionMethod;

      try {
        const res = await apiClient.get('/reports/collection', { params });
        return res.data?.data !== undefined ? res.data.data : res.data;
      } catch {
        const fallback = await apiClient.get('/reports/collections', { params });
        return fallback.data?.data !== undefined ? fallback.data.data : fallback.data;
      }
    },
    enabled: activeTab === 'collections',
  });

  const collectionTransactions = collectionData?.transactions || [];

  // Tab 5 Query: Student Statement
  const {
    data: statementData,
    isLoading: isStatementLoading,
    refetch: refetchStatement,
  } = useQuery({
    queryKey: ['reports', 'student-statement', selectedStudentId],
    queryFn: async () => {
      if (!selectedStudentId) return null;
      try {
        const res = await apiClient.get(`/reports/statement/${selectedStudentId}`);
        return res.data?.data !== undefined ? res.data.data : res.data;
      } catch {
        const fallback = await apiClient.get(`/students/${selectedStudentId}/statement`);
        return fallback.data?.data !== undefined ? fallback.data.data : fallback.data;
      }
    },
    enabled: Boolean(selectedStudentId) && activeTab === 'statement',
  });

  // Export CSV Helper
  const handleExportCSV = async (endpoint, filename) => {
    try {
      toast.loading('Generating CSV export...', { id: 'csv-export' });
      const res = await apiClient.get(endpoint, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Report exported to CSV successfully!', { id: 'csv-export' });
    } catch (err) {
      toast.error('Failed to export CSV report', { id: 'csv-export' });
    }
  };

  // Recharts custom tooltip
  const CustomChartTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-navy-900 border border-navy-700 p-3 rounded-xl shadow-xl text-xs space-y-1">
          <p className="font-bold text-slate-100">{label}</p>
          <p className="text-amber-400 font-medium">
            Charged: {formatNPR(payload[0]?.value)}
          </p>
          <p className="text-emerald-400 font-medium">
            Collected: {formatNPR(payload[1]?.value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-navy-700/60 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
            Financial Reports & Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Reconciliation, monthly performance summaries, revenue streams, and printable statements.
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-navy-700/80 overflow-x-auto no-print">
        {[
          { id: 'monthly', label: 'Monthly Summary', icon: BarChart3 },
          { id: 'outstanding', label: 'Outstanding Dues', icon: AlertTriangle },
          { id: 'feegroups', label: 'Fee Group Summary', icon: Tags },
          { id: 'collections', label: 'Collection Report', icon: CreditCard },
          { id: 'statement', label: 'Student Statement', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-cyan-400 text-cyan-400 bg-cyan-500/10 rounded-t-lg'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-navy-800/40 rounded-t-lg'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MONTHLY SUMMARY */}
      {/* ========================================================================= */}
      {activeTab === 'monthly' && (
        <div className="space-y-6">
          {/* Bar Chart comparing Charged vs Collected */}
          <Card
            title="Revenue Comparison (Last 12 Months)"
            subtitle="Comparing monthly billed charges vs actual collected amounts"
          >
            {isMonthlyLoading ? (
              <Skeleton className="w-full h-72 rounded-xl" />
            ) : monthlyList.length === 0 ? (
              <EmptyState title="No monthly data recorded yet" description="Generate billings to view trends." />
            ) : (
              <div className="h-72 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyList.map((m) => ({
                      name: m.nepaliMonth || `${m.year}-${m.month}`,
                      Charged: parseFloat(m.totalCharged || 0),
                      Collected: parseFloat(m.totalCollected || 0),
                    }))}
                    margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
                    <XAxis
                      dataKey="name"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      angle={-25}
                      textAnchor="end"
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(val) => `${val / 1000}k`}
                    />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
                    />
                    <Bar dataKey="Charged" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Total Charged" />
                    <Bar dataKey="Collected" fill="#10b981" radius={[4, 4, 0, 0]} name="Total Collected" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {/* Monthly Performance Table */}
          <Card
            title="Monthly Financial Breakdown"
            subtitle="Monthly charges, collections, collection rates and net variance"
          >
            <Table
              headers={[
                'Billing Period / Month',
                { label: 'Total Charged', align: 'right' },
                { label: 'Total Collected', align: 'right' },
                { label: 'Net Difference', align: 'right' },
                { label: 'Collection Rate', align: 'center' },
              ]}
              empty={monthlyList.length === 0}
              emptyMessage="No billing data available for monthly summary."
            >
              {monthlyList.map((item, idx) => {
                const charged = parseFloat(item.totalCharged || 0);
                const collected = parseFloat(item.totalCollected || 0);
                const diff = charged - collected;
                const rate = charged > 0 ? Math.min(100, (collected / charged) * 100) : 100;

                return (
                  <TableRow key={idx}>
                    <TableCell className="font-semibold text-slate-100">
                      <div>
                        {item.nepaliMonth || `Month ${item.month}`}
                        <span className="block text-[11px] text-slate-400 font-mono">
                          {item.year}-{String(item.month).padStart(2, '0')}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell align="right" className="font-mono text-amber-400 font-semibold">
                      {formatNPR(charged)}
                    </TableCell>

                    <TableCell align="right" className="font-mono text-emerald-400 font-semibold">
                      {formatNPR(collected)}
                    </TableCell>

                    <TableCell
                      align="right"
                      className={`font-mono font-semibold ${diff > 0 ? 'text-red-400' : 'text-slate-300'}`}
                    >
                      {formatNPR(diff)}
                    </TableCell>

                    <TableCell align="center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-2 rounded-full bg-navy-900 border border-navy-700 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              rate >= 90 ? 'bg-emerald-400' : rate >= 70 ? 'bg-amber-400' : 'bg-red-400'
                            }`}
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-200">
                          {rate.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </Table>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: OUTSTANDING DUES */}
      {/* ========================================================================= */}
      {activeTab === 'outstanding' && (
        <div className="space-y-6">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-navy-800 border border-navy-700/60">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status:</span>
              <div className="flex items-center gap-1.5">
                {['ALL', 'ACTIVE', 'INACTIVE'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setOutstandingStatus(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      outstandingStatus === st
                        ? 'bg-cyan-500 text-navy-950 font-bold'
                        : 'bg-navy-900 text-slate-300 hover:bg-navy-700'
                    }`}
                  >
                    {st} Students
                  </button>
                ))}
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              icon={Download}
              onClick={() =>
                handleExportCSV(
                  `/reports/export/outstanding?status=${outstandingStatus}`,
                  `outstanding-dues-${outstandingStatus.toLowerCase()}.csv`
                )
              }
            >
              Export CSV
            </Button>
          </div>

          {/* Outstanding Table */}
          <Card
            title="Outstanding Dues Ledger"
            subtitle={`Total Outstanding: ${formatNPR(outstandingData?.grandTotalOutstanding || 0)}`}
          >
            {isOutstandingLoading ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="w-full h-10 rounded-lg" />
                ))}
              </div>
            ) : (
              <Table
                headers={[
                  'Student Name & ID',
                  'Room',
                  'Status',
                  'Fee Group',
                  'Monthly Rate',
                  { label: 'Outstanding Balance', align: 'right' },
                  'Last Payment',
                ]}
                empty={outstandingStudents.length === 0}
                emptyMessage="No students currently have outstanding dues for this filter."
              >
                {outstandingStudents.map((s) => (
                  <TableRow key={s.studentId}>
                    <TableCell>
                      <div className="font-semibold text-slate-100">{s.fullName}</div>
                      <div className="text-xs font-mono text-cyan-400">{s.studentCode}</div>
                    </TableCell>

                    <TableCell className="text-slate-300">Room {s.roomNumber}</TableCell>

                    <TableCell>
                      <Badge variant={s.status} dot>
                        {s.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-slate-300">{s.feeGroup}</TableCell>

                    <TableCell className="font-mono text-slate-300">
                      {formatNPR(s.monthlyFee || 0)}
                    </TableCell>

                    <TableCell align="right" className="font-bold text-red-400 font-mono text-sm">
                      {formatNPR(s.outstandingBalance)}
                    </TableCell>

                    <TableCell className="text-xs text-slate-400">
                      {s.lastPaymentDate ? formatDate(s.lastPaymentDate) : 'None'}
                    </TableCell>
                  </TableRow>
                ))}

                {/* Total Row */}
                {outstandingStudents.length > 0 && (
                  <tr className="bg-navy-900/90 font-bold border-t-2 border-navy-600">
                    <td colSpan={5} className="px-4 py-3.5 text-right text-slate-200">
                      Grand Total Outstanding:
                    </td>
                    <td className="px-4 py-3.5 text-right text-red-400 font-mono text-base">
                      {formatNPR(outstandingData?.grandTotalOutstanding || 0)}
                    </td>
                    <td className="px-4 py-3.5" />
                  </tr>
                )}
              </Table>
            )}
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: FEE GROUP SUMMARY */}
      {/* ========================================================================= */}
      {activeTab === 'feegroups' && (
        <Card
          title="Fee Group Revenue Breakdown"
          subtitle="Monthly expected and total outstanding dues by tier"
          action={
            <Button
              variant="secondary"
              size="xs"
              icon={RefreshCw}
              onClick={() => refetchFeeGroups()}
            >
              Refresh
            </Button>
          }
        >
          {isFeeGroupLoading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="w-full h-12 rounded-lg" />
              ))}
            </div>
          ) : (
            <Table
              headers={[
                'Fee Group Name',
                { label: 'Monthly Rate', align: 'right' },
                { label: 'Active Students', align: 'center' },
                { label: 'Monthly Expected', align: 'right' },
                { label: 'Total Outstanding Dues', align: 'right' },
              ]}
              empty={feeGroupsList.length === 0}
              emptyMessage="No fee groups configured."
            >
              {feeGroupsList.map((g) => (
                <TableRow key={g.feeGroupId}>
                  <TableCell className="font-semibold text-slate-100">{g.name}</TableCell>
                  <TableCell align="right" className="font-mono text-cyan-400 font-medium">
                    {formatNPR(g.monthlyAmount)}
                  </TableCell>
                  <TableCell align="center" className="font-mono font-semibold text-slate-200">
                    {g.studentCount}
                  </TableCell>
                  <TableCell align="right" className="font-mono font-bold text-emerald-400">
                    {formatNPR(g.monthlyExpected)}
                  </TableCell>
                  <TableCell align="right" className="font-mono font-bold text-red-400">
                    {formatNPR(g.totalOutstanding)}
                  </TableCell>
                </TableRow>
              ))}

              {/* Total Row */}
              {feeGroupsList.length > 0 && (
                <tr className="bg-navy-900/90 font-bold border-t-2 border-navy-600">
                  <td className="px-4 py-3.5 text-slate-200">Total Across All Groups</td>
                  <td className="px-4 py-3.5" />
                  <td className="px-4 py-3.5 text-center font-mono text-cyan-400">
                    {feeGroupsList.reduce((acc, g) => acc + (g.studentCount || 0), 0)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-emerald-400 text-sm">
                    {formatNPR(
                      feeGroupsList.reduce((acc, g) => acc + parseFloat(g.monthlyExpected || 0), 0)
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-red-400 text-sm">
                    {formatNPR(
                      feeGroupsList.reduce((acc, g) => acc + parseFloat(g.totalOutstanding || 0), 0)
                    )}
                  </td>
                </tr>
              )}
            </Table>
          )}
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: COLLECTION REPORT */}
      {/* ========================================================================= */}
      {activeTab === 'collections' && (
        <div className="space-y-6">
          {/* Date Range & Method Toolbar */}
          <Card className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <Input
                type="date"
                label="From Date"
                value={collectionStartDate}
                onChange={(e) => setCollectionStartDate(e.target.value)}
              />

              <Input
                type="date"
                label="To Date"
                value={collectionEndDate}
                onChange={(e) => setCollectionEndDate(e.target.value)}
              />

              <Select
                label="Payment Method"
                value={collectionMethod}
                onChange={(e) => setCollectionMethod(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Methods' },
                  { value: 'CASH', label: 'Cash' },
                  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                  { value: 'ONLINE', label: 'Online / eSewa' },
                  { value: 'CHEQUE', label: 'Cheque' },
                  { value: 'OTHER', label: 'Other' },
                ]}
              />

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="md"
                  className="w-full"
                  onClick={() => {
                    setCollectionStartDate('');
                    setCollectionEndDate('');
                    setCollectionMethod('');
                  }}
                >
                  Reset
                </Button>

                <Button
                  variant="primary"
                  size="md"
                  icon={Download}
                  onClick={() => {
                    const q = new URLSearchParams();
                    if (collectionStartDate) q.append('startDate', collectionStartDate);
                    if (collectionEndDate) q.append('endDate', collectionEndDate);
                    handleExportCSV(`/reports/export/collection?${q.toString()}`, 'collection-report.csv');
                  }}
                >
                  Export
                </Button>
              </div>
            </div>
          </Card>

          {/* Collection Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <StatCard
              icon={Coins}
              label="Total Collected in Range"
              value={formatNPR(collectionData?.grandTotalCollected || 0)}
              subtitle={`${collectionTransactions.length} processed transactions`}
              color="green"
            />
          </div>

          {/* Collections Table */}
          <Card
            title="Collected Payments in Selected Period"
            subtitle={`Total: ${formatNPR(collectionData?.grandTotalCollected || 0)}`}
          >
            {isCollectionLoading ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="w-full h-10 rounded-lg" />
                ))}
              </div>
            ) : (
              <Table
                headers={[
                  'Payment Date',
                  'Student Name & Code',
                  'Room',
                  { label: 'Amount Collected', align: 'right' },
                  'Method',
                  'Reference / Receipt',
                ]}
                empty={collectionTransactions.length === 0}
                emptyMessage="No collections recorded in the selected date range."
              >
                {collectionTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-mono text-xs">{formatDate(tx.date)}</TableCell>

                    <TableCell>
                      <div className="font-semibold text-slate-100">{tx.student?.fullName || '-'}</div>
                      <div className="text-xs font-mono text-cyan-400">
                        {tx.student?.studentId || '-'}
                      </div>
                    </TableCell>

                    <TableCell className="text-slate-300">
                      {tx.student?.roomNumber ? `Room ${tx.student.roomNumber}` : '-'}
                    </TableCell>

                    <TableCell align="right" className="font-bold text-emerald-400 font-mono text-sm">
                      {formatNPR(tx.credit || tx.amount || 0)}
                    </TableCell>

                    <TableCell>
                      <Badge variant={tx.paymentMethod || 'PAYMENT'}>
                        {tx.paymentMethod || 'CASH'}
                      </Badge>
                    </TableCell>

                    <TableCell className="font-mono text-xs text-slate-300">
                      {tx.receiptNumber || tx.referenceNumber || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </Table>
            )}
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: STUDENT STATEMENT */}
      {/* ========================================================================= */}
      {activeTab === 'statement' && (
        <div className="space-y-6">
          {/* Student Selector Card (Hidden when printing) */}
          <Card title="Select Student Account" className="no-print">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <Input
                label="Filter Student List"
                icon={Search}
                placeholder="Type name, ID, or room..."
                value={studentSearchTerm}
                onChange={(e) => setStudentSearchTerm(e.target.value)}
              />

              <Select
                label="Select Student"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                options={filteredStatementStudents.map((s) => ({
                  value: s.id,
                  label: `${s.fullName} (${s.studentId}) - Room ${s.roomNumber}`,
                }))}
                placeholder="-- Choose a resident to generate statement --"
              />
            </div>
          </Card>

          {/* Statement View */}
          {isStatementLoading ? (
            <div className="space-y-4">
              <Skeleton className="w-full h-32 rounded-xl" />
              <Skeleton className="w-full h-64 rounded-xl" />
            </div>
          ) : !selectedStudentId ? (
            <Card className="p-10 text-center">
              <EmptyState
                icon={FileText}
                title="Select a student to generate statement"
                description="Choose any active or former resident above to view itemized ledgers and print official receipts."
              />
            </Card>
          ) : statementData ? (
            <div className="space-y-6">
              {/* Printable Statement Container */}
              <div className="p-6 sm:p-8 rounded-2xl bg-navy-800 border border-navy-700/80 shadow-xl print-card">
                {/* Official Statement Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start pb-6 border-b border-navy-700/80 print:border-slate-300 gap-4">
                  <div className="flex items-center gap-4">
                    <img
                      src="/logo.png"
                      alt="Koshi Hostel Logo"
                      className="w-16 h-16 object-contain rounded-xl bg-white/5 border border-cyan-500/20 p-1"
                    />
                    <div>
                      <h2 className="text-2xl font-black tracking-tight text-white print-text-dark">
                        KOSHI HOSTEL
                      </h2>
                      <p className="text-xs text-cyan-400 font-semibold print-text-dark">
                        ESTD 2079 • Biratnagar-10, Morang, Nepal
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 print-text-muted">
                        Tel: +977-21-523456 | Email: info@koshihostel.edu.np
                      </p>
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <div className="inline-block px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-2 print:border-slate-400 print:text-slate-800">
                      Statement of Account
                    </div>
                    <p className="text-xs text-slate-300 print-text-dark">
                      Date: <strong className="text-white print-text-dark">{formatDate(new Date())}</strong>
                    </p>
                    <p className="text-xs text-slate-400 print-text-muted">
                      Status:{' '}
                      <strong className="text-slate-200 print-text-dark">
                        {statementData.student?.status || 'ACTIVE'}
                      </strong>
                    </p>
                  </div>
                </div>

                {/* Student Info Details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-5 border-b border-navy-700/80 print:border-slate-300 text-xs">
                  <div>
                    <span className="text-slate-400 print-text-muted block">Student Name:</span>
                    <strong className="text-sm text-slate-100 print-text-dark block mt-0.5">
                      {statementData.student?.fullName}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 print-text-muted block">Student ID:</span>
                    <strong className="font-mono text-cyan-400 print-text-dark block mt-0.5">
                      {statementData.student?.studentId}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 print-text-muted block">Room Number:</span>
                    <strong className="text-slate-200 print-text-dark block mt-0.5">
                      Room {statementData.student?.roomNumber}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 print-text-muted block">Monthly Fee:</span>
                    <strong className="text-slate-200 font-mono print-text-dark block mt-0.5">
                      {formatNPR(statementData.student?.monthlyFee || 0)}
                    </strong>
                  </div>
                </div>

                {/* Financial Summary StatCards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
                  <div className="p-4 rounded-xl bg-navy-900/80 border border-navy-700/60 print:border-slate-300">
                    <span className="text-xs text-slate-400 print-text-muted block">Total Charged</span>
                    <span className="text-xl font-bold font-mono text-amber-400 print-text-dark">
                      {formatNPR(statementData.summary?.totalCharged || 0)}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-navy-900/80 border border-navy-700/60 print:border-slate-300">
                    <span className="text-xs text-slate-400 print-text-muted block">Total Paid</span>
                    <span className="text-xl font-bold font-mono text-emerald-400 print-text-dark">
                      {formatNPR(statementData.summary?.totalPaid || 0)}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-navy-900/80 border border-navy-700/60 print:border-slate-300">
                    <span className="text-xs text-slate-400 print-text-muted block">Outstanding Balance</span>
                    <span
                      className={`text-xl font-bold font-mono ${
                        parseFloat(statementData.summary?.outstandingBalance || 0) > 0
                          ? 'text-red-400'
                          : 'text-emerald-400'
                      } print-text-dark`}
                    >
                      {formatNPR(statementData.summary?.outstandingBalance || 0)}
                    </span>
                  </div>
                </div>

                {/* Itemized Transactions Table */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-200 print-text-dark">
                    Itemized Transaction History
                  </h4>
                  <Table
                    headers={[
                      'Date',
                      'Type',
                      'Description & Ref',
                      { label: 'Debit (NPR)', align: 'right' },
                      { label: 'Credit (NPR)', align: 'right' },
                      { label: 'Balance (NPR)', align: 'right' },
                    ]}
                    empty={(statementData.entries || []).length === 0}
                    emptyMessage="No ledger transactions recorded."
                  >
                    {(statementData.entries || []).map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-mono text-xs text-slate-300 print-text-dark">
                          {formatDate(entry.date)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={entry.entryType}>{entry.entryType}</Badge>
                        </TableCell>
                        <TableCell className="text-slate-200 print-text-dark">
                          <div>{entry.description}</div>
                          {entry.referenceNumber && (
                            <div className="text-[11px] text-slate-400 font-mono print-text-muted">
                              Ref: {entry.referenceNumber}
                            </div>
                          )}
                        </TableCell>
                        <TableCell align="right" className="font-mono font-semibold text-red-400 print-text-dark">
                          {parseFloat(entry.debit || 0) > 0 ? formatNPR(entry.debit) : '-'}
                        </TableCell>
                        <TableCell align="right" className="font-mono font-semibold text-emerald-400 print-text-dark">
                          {parseFloat(entry.credit || 0) > 0 ? formatNPR(entry.credit) : '-'}
                        </TableCell>
                        <TableCell align="right" className="font-mono font-bold text-cyan-400 print-text-dark">
                          {formatNPR(entry.balanceAfter ?? 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </Table>
                </div>

                {/* Print Statement Button */}
                <div className="mt-8 flex justify-end no-print">
                  <Button
                    variant="primary"
                    icon={Printer}
                    onClick={() =>
                      printStatement(`Statement - ${statementData.student?.fullName}`)
                    }
                  >
                    Print Statement
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
