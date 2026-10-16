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
  const totalOutstanding = dashboard?.totalOutstanding ?? dashboard?.outstandingTotal ?? 0;
  const thisMonthCharged = dashboard?.thisMonthCharged ?? dashboard?.chargedThisMonth ?? 0;
  const thisMonthCollected = dashboard?.thisMonthCollected ?? dashboard?.collectedThisMonth ?? 0;

  // Chart data
  const chartData = (Array.isArray(monthlyData) ? monthlyData : monthlyData?.summary || []).map((item) => ({
    name: item.monthName || item.month || `${item.year}-${item.month}`,
    Charged: item.charged || 0,
    Collected: item.collected || 0,
  }));

  const pieData = [
    { name: 'Active Students', value: Number(activeStudents), color: '#00d4ff' },
    { name: 'Inactive Students', value: Number(inactiveStudents), color: '#64748b' },
  ];

  const recentTransactions = dashboard?.recentTransactions || [];
  const topDuesStudents = dashboard?.topDuesStudents || dashboard?.topOutstanding || [];

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
          subtitle="Last 10 payments and fee debits"
          action={
            <Button
              variant="ghost"
              size="xs"
              onClick={() => navigate('/admin/payments')}
            >
              View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          }
        >
          {isLoading ? (
            <Skeleton count={5} className="h-10 my-2" />
          ) : recentTransactions.length > 0 ? (
            <Table
              headers={['Date', 'Student', 'Type', { label: 'Amount', align: 'right' }]}
            >
              {recentTransactions.slice(0, 10).map((tx, idx) => (
                <TableRow key={tx.id || idx}>
                  <TableCell className="text-xs text-slate-400">
                    {formatDate(tx.date || tx.createdAt)}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-slate-200">
                      {tx.studentName || tx.student?.fullName || 'Student'}
                    </p>
                    {tx.roomNumber && (
                      <span className="text-[11px] text-slate-400">Room {tx.roomNumber}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={tx.type || 'PAYMENT'} size="xs">
                      {tx.type || 'Payment'}
                    </Badge>
                  </TableCell>
                  <TableCell align="right" className="font-semibold text-slate-100">
                    <span className={tx.type === 'PAYMENT' || tx.credit ? 'text-emerald-400' : 'text-slate-200'}>
                      {tx.type === 'PAYMENT' || tx.credit ? '+' : ''}
                      {formatNPR(tx.amount || tx.credit || tx.debit)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </Table>
          ) : (
            <EmptyState
              title="No recent transactions"
              description="Financial transactions will show here once recorded."
            />
          )}
        </Card>

        {/* Outstanding Dues Top 5 */}
        <Card
          title="Highest Outstanding Balances"
          subtitle="Top students requiring fee collection follow-up"
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
              headers={['Student', 'Room', { label: 'Balance Due', align: 'right' }, { label: 'Action', align: 'center' }]}
            >
              {topDuesStudents.slice(0, 5).map((student, idx) => (
                <TableRow key={student.id || idx}>
                  <TableCell>
                    <p className="font-medium text-slate-100">
                      {student.fullName || student.name}
                    </p>
                    <span className="text-xs text-slate-400">ID: {student.studentId || student.id}</span>
                  </TableCell>
                  <TableCell className="text-xs text-slate-300">
                    {student.roomNumber || student.room || '-'}
                  </TableCell>
                  <TableCell align="right" className="font-bold text-red-400">
                    {formatNPR(student.outstandingBalance || student.balance || student.outstanding)}
                  </TableCell>
                  <TableCell align="center">
                    <button
                      onClick={() => navigate(`/admin/students/${student.id || student.studentId}`)}
                      className="p-1.5 rounded-lg text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                      title="View Student Ledger"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
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
