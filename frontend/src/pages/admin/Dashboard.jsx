import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserMinus,
  AlertCircle,
  TrendingUp,
  CheckCircle,
  Coins,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Phone,
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useDashboard, useMonthlySummary } from '../../hooks/useReports';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Table, { TableRow, TableCell } from '../../components/ui/Table';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import { formatNPR } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: dashboard, isLoading, isError, error, refetch } = useDashboard();
  const { data: monthlyData, isLoading: isMonthlyLoading } = useMonthlySummary({ limit: 12 });

  if (isError) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-center">
        <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-semibold text-slate-100">Failed to load dashboard metrics</h3>
        <p className="mt-1 text-sm text-slate-400 max-w-md">
          {error?.response?.data?.message || error?.message || 'An unexpected error occurred while fetching reports.'}
        </p>
        <div className="mt-5">
          <Button variant="primary" icon={RefreshCw} onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Extract stat card values safely
  const activeStudents = dashboard?.totalActiveStudents ?? dashboard?.activeStudents ?? 0;
  const inactiveStudents = dashboard?.totalInactiveStudents ?? dashboard?.inactiveStudents ?? 0;
  const studentsWithDues = dashboard?.studentsWithDues ?? dashboard?.duesCount ?? 0;
  const totalOutstanding = dashboard?.totalOutstandingAll ?? dashboard?.totalOutstanding ?? dashboard?.outstandingTotal ?? 0;
  const thisMonthCharged = dashboard?.currentMonthCharged ?? dashboard?.thisMonthCharged ?? dashboard?.chargedThisMonth ?? 0;
  const thisMonthCollected = dashboard?.currentMonthCollected ?? dashboard?.thisMonthCollected ?? dashboard?.collectedThisMonth ?? 0;

  // Chart data
  const rawSummary = Array.isArray(monthlyData)
    ? monthlyData
    : monthlyData?.data || monthlyData?.summary || [];

  const chartData = rawSummary.map((item) => ({
    name: item.nepaliMonth || item.monthName || (item.year && item.month ? `${item.year}-${item.month}` : item.month),
    Charged: parseFloat(item.totalCharged || item.charged || 0),
    Collected: parseFloat(item.totalCollected || item.collected || 0),
  }));

  const pieData = [
    { name: 'Active Students', value: Number(activeStudents), color: '#00d4ff' },
    { name: 'Inactive Students', value: Number(inactiveStudents), color: '#64748b' },
  ];

  const recentTransactions = dashboard?.recentTransactions || [];

  // Deduplicate transactions by ID and accidental duplicate submissions
  const deduplicatedRecentTransactions = React.useMemo(() => {
    const unique = [];
    const seen = new Set();
    for (const tx of recentTransactions) {
      if (!tx || !tx.id || seen.has(tx.id)) continue;
      const timeKey = tx.createdAt ? Math.floor(new Date(tx.createdAt).getTime() / 120000) : 0;
      const debitVal = parseFloat(tx.debit || 0).toFixed(2);
      const creditVal = parseFloat(tx.credit || 0).toFixed(2);
      const contentKey = `${tx.studentId || tx.studentName}_${tx.entryType || tx.type}_${debitVal}_${creditVal}_${(tx.description || '').trim()}_${timeKey}`;
      if (seen.has(contentKey)) continue;
      seen.add(tx.id);
      seen.add(contentKey);
      unique.push(tx);
      if (unique.length >= 10) break;
    }
    return unique;
  }, [recentTransactions]);
  const topDuesStudents = dashboard?.topDuesStudents || dashboard?.topOutstandingStudents || dashboard?.topOutstanding || [];

  return (
    <div className="space-y-6">
      {/* Top Welcome & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Overview Dashboard</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time financial status and residency statistics for Koshi Hostel
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={() => refetch()}
            loading={isLoading}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/admin/billing')}
          >
            Generate Monthly Billing
          </Button>
        </div>
      </div>

      {/* Row 1: Stat Cards (6 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          icon={Users}
          label="Active Students"
          value={activeStudents}
          subtitle="Currently residing"
          color="cyan"
          loading={isLoading}
        />
        <StatCard
          icon={UserMinus}
          label="Inactive Students"
          value={inactiveStudents}
          subtitle="Alumni & departures"
          color="slate"
          loading={isLoading}
        />
        <StatCard
          icon={AlertCircle}
          label="Students with Dues"
          value={studentsWithDues}
          subtitle="Pending balances"
          color="amber"
          loading={isLoading}
        />
        <StatCard
          icon={Coins}
          label="Total Outstanding"
          value={formatNPR(totalOutstanding)}
          subtitle="All unpaid balances"
          color="red"
          loading={isLoading}
        />
        <StatCard
          icon={TrendingUp}
          label="This Month Charged"
          value={formatNPR(thisMonthCharged)}
          subtitle="Current cycle fees"
          color="blue"
          loading={isLoading}
        />
        <StatCard
          icon={CheckCircle}
          label="This Month Collected"
          value={formatNPR(thisMonthCollected)}
          subtitle="Cash & bank transfers"
          color="green"
          loading={isLoading}
        />
      </div>

      {/* Row 2: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Charges vs Collections Bar Chart */}
        <Card
          className="lg:col-span-2 p-5"
          title="Monthly Fee Charges vs. Collections"
          subtitle="Comparison of billing and payments over the last 12 months"
          action={
            <Button
              variant="ghost"
              size="xs"
              onClick={() => navigate('/admin/reports')}
            >
              Full Report <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          }
        >
          {isMonthlyLoading || isLoading ? (
            <div className="h-72 flex items-center justify-center">
              <Skeleton className="w-full h-64" variant="rect" />
            </div>
          ) : chartData.length > 0 ? (
            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#1e2d45' }}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#1e2d45' }}
                    tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f1629',
                      borderColor: '#1e2d45',
                      borderRadius: '8px',
                      color: '#f1f5f9',
                      fontSize: '12px',
                    }}
                    formatter={(value) => [formatNPR(value), '']}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                  />
                  <Bar dataKey="Charged" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              title="No billing history yet"
              description="Monthly billing charts will automatically populate once billing runs are completed."
            />
          )}
        </Card>

        {/* Student Status Doughnut */}
        <Card
          className="p-5"
          title="Student Occupancy Ratio"
          subtitle="Active residents vs. inactive records"
        >
          {isLoading ? (
            <div className="h-72 flex items-center justify-center">
              <Skeleton className="w-48 h-48 rounded-full" variant="circle" />
            </div>
          ) : (
            <div className="h-72 flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f1629',
                      borderColor: '#1e2d45',
                      borderRadius: '8px',
                      color: '#f1f5f9',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-6 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-cyan-400" />
                  <span>Active: <strong>{activeStudents}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-slate-500" />
                  <span>Inactive: <strong>{inactiveStudents}</strong></span>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Row 3: Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <Card
          title="Recent Transactions"
          subtitle="Latest fee debits, charges, and payment entries"
          action={
            <Button
              variant="ghost"
              size="xs"
              onClick={() => navigate('/admin/payments?type=ALL')}
            >
              View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          }
        >
          {isLoading ? (
            <Skeleton count={5} className="h-10 my-2" />
          ) : deduplicatedRecentTransactions.length > 0 ? (
            <Table
              headers={['Date', 'Student', 'Type', { label: 'Amount', align: 'right' }, { label: 'Action', align: 'center' }]}
            >
              {deduplicatedRecentTransactions.slice(0, 10).map((tx, idx) => {
                const entryType = tx.entryType || tx.type || 'PAYMENT';
                const isCredit = parseFloat(tx.credit || 0) > 0 || entryType === 'PAYMENT';
                const amount = isCredit
                  ? parseFloat(tx.credit || tx.amount || 0)
                  : parseFloat(tx.debit || tx.amount || 0);

                let badgeLabel = entryType;
                let badgeVariant = entryType;
                let detailText = tx.description || '';

                if (entryType === 'ADJUSTMENT' && tx.description) {
                  if (tx.description.includes(':')) {
                    const parts = tx.description.split(':');
                    badgeLabel = parts[0].trim();
                    detailText = parts.slice(1).join(':').trim();
                  } else {
                    badgeLabel = tx.description.trim();
                    detailText = '';
                  }
                  badgeVariant = 'ADJUSTMENT';
                } else if (entryType === 'MONTHLY_FEE') {
                  badgeLabel = 'Monthly Fee';
                  badgeVariant = 'MONTHLY_FEE';
                  detailText = tx.description || 'Hostel residency billing';
                } else if (entryType === 'PAYMENT') {
                  badgeLabel = 'Payment';
                  badgeVariant = 'PAYMENT';
                  detailText = tx.paymentMethod
                    ? `${tx.paymentMethod}${tx.receiptNumber ? ` • #${tx.receiptNumber}` : ''}`
                    : tx.receiptNumber
                    ? `Receipt #${tx.receiptNumber}`
                    : '';
                }

                const studentId = tx.student?.id || tx.studentId;
                const studentName = tx.student?.fullName || tx.studentName || 'Student';
                const roomNo = tx.student?.roomNumber || tx.roomNumber;
                const studentCode = tx.student?.studentId || tx.studentCode;

                return (
                  <TableRow key={tx.id || idx}>
                    <TableCell className="text-xs text-slate-400 whitespace-nowrap">
                      <div>{formatDate(tx.date || tx.createdAt)}</div>
                      {tx.recordedBy && (
                        <div className="text-[10px] text-slate-500 mt-0.5">by {tx.recordedBy}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => studentId && navigate(`/admin/students/${studentId}`)}
                        className="text-left font-medium text-slate-200 hover:text-cyan-400 transition-colors block truncate max-w-[140px] sm:max-w-[180px]"
                        title={studentName}
                      >
                        {studentName}
                      </button>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        {studentCode && <span>ID: {studentCode}</span>}
                        {roomNo && (
                          <>
                            <span>•</span>
                            <span>Room {roomNo}</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={badgeVariant} size="xs">
                        {badgeLabel}
                      </Badge>
                      {detailText && (
                        <p className="text-[11px] text-slate-400 truncate max-w-[130px] sm:max-w-[180px] mt-1" title={detailText}>
                          {detailText}
                        </p>
                      )}
                    </TableCell>
                    <TableCell align="right" className="font-semibold text-slate-100 whitespace-nowrap">
                      <span className={isCredit ? 'text-emerald-400' : 'text-amber-300'}>
                        {isCredit ? '+' : '-'} {formatNPR(amount)}
                      </span>
                      {tx.balanceAfter !== undefined && tx.balanceAfter !== null && (
                        <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                          Bal: {formatNPR(tx.balanceAfter)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <button
                        onClick={() => studentId && navigate(`/admin/students/${studentId}?tab=ledger`)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                        title="View Student Ledger"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </Table>
          ) : (
            <EmptyState
              title="No recent transactions"
              description="Financial transactions will show here once recorded."
            />
          )}
        </Card>

        {/* Highest Outstanding Balances */}
        <Card
          title="Highest Outstanding Balances"
          subtitle={`Top ${Math.min(topDuesStudents.length, 10)} students with highest unpaid balances (${studentsWithDues} total with dues)`}
          action={
            <Button
              variant="ghost"
              size="xs"
              onClick={() => navigate('/admin/students?hasDues=true')}
            >
              View All Dues <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          }
        >
          {isLoading ? (
            <Skeleton count={5} className="h-10 my-2" />
          ) : topDuesStudents.length > 0 ? (
            <Table
              headers={['#', 'Student', 'Room', 'Status', { label: 'Balance Due', align: 'right' }, { label: 'Action', align: 'center' }]}
            >
              {topDuesStudents.slice(0, 10).map((student, idx) => {
                const studentId = student.id || student.studentId;
                const outstanding = parseFloat(student.outstandingBalance || student.balance || student.outstanding || 0);

                return (
                  <TableRow key={student.id || idx}>
                    <TableCell className="w-7">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                          idx === 0
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : idx === 1
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : idx === 2
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {idx + 1}
                      </span>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => navigate(`/admin/students/${studentId}`)}
                        className="text-left font-medium text-slate-100 hover:text-cyan-400 transition-colors block truncate max-w-[130px] sm:max-w-[170px]"
                        title={student.fullName || student.name}
                      >
                        {student.fullName || student.name}
                      </button>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span>ID: {student.studentId || student.id}</span>
                        {student.phone && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-0.5 text-slate-400">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {student.phone}
                            </span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-300 whitespace-nowrap">
                      {student.roomNumber || student.room ? `Room ${student.roomNumber || student.room}` : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={student.status || 'ACTIVE'} size="xs">
                        {student.status || 'ACTIVE'}
                      </Badge>
                    </TableCell>
                    <TableCell align="right" className="font-bold text-rose-400 text-sm whitespace-nowrap">
                      {formatNPR(outstanding)}
                    </TableCell>
                    <TableCell align="center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() => navigate(`/admin/students/${studentId}?tab=payment`)}
                          className="px-2 py-1 text-xs"
                          title="Record Payment"
                        >
                          Collect
                        </Button>
                        <button
                          onClick={() => navigate(`/admin/students/${studentId}`)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                          title="View Student Profile"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </Table>
          ) : (
            <EmptyState
              title="No outstanding dues"
              description="Great job! All students are up to date on their fee payments."
            />
          )}
        </Card>
      </div>
    </div>
  );
}