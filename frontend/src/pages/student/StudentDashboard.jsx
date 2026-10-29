import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  User, Home, Calendar, CreditCard, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle, Printer, Download, ArrowUpRight, ArrowDownLeft,
} from 'lucide-react';
import studentsApi from '../../api/students';
import { formatNPR } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import StatCard from '../../components/ui/StatCard';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Alert from '../../components/ui/Alert';

const ENTRY_TYPE_LABELS = {
  MONTHLY_FEE: 'Monthly Fee',
  PAYMENT: 'Payment',
  CREDIT: 'Credit',
  REFUND: 'Refund',
  ADJUSTMENT: 'Adjustment',
  REVERSAL: 'Reversal',
};

const ENTRY_TYPE_COLORS = {
  MONTHLY_FEE: 'bg-red-900/30 text-red-400 border border-red-800/50',
  PAYMENT: 'bg-green-900/30 text-green-400 border border-green-800/50',
  CREDIT: 'bg-cyan-900/30 text-cyan-400 border border-cyan-800/50',
  REFUND: 'bg-blue-900/30 text-blue-400 border border-blue-800/50',
  ADJUSTMENT: 'bg-yellow-900/30 text-yellow-400 border border-yellow-800/50',
  REVERSAL: 'bg-purple-900/30 text-purple-400 border border-purple-800/50',
};

export default function StudentDashboard() {
  const [showAll, setShowAll] = useState(false);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['myProfile'],
    queryFn: () => studentsApi.getMyProfile(),
  });

  const { data: statement, isLoading: statementLoading } = useQuery({
    queryKey: ['myStatement'],
    queryFn: () => studentsApi.getMyStatement(),
  });

  const { data: ledgerData, isLoading: ledgerLoading } = useQuery({
    queryKey: ['myLedger', showAll],
    queryFn: () => studentsApi.getMyLedger({ limit: showAll ? 1000 : 20 }),
  });

  const isLoading = profileLoading || statementLoading || ledgerLoading;

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" color="text-cyan-400" />
          <p className="text-slate-400 text-sm">Loading your account...</p>
        </div>
      </div>
    );
  }

  const student = profile?.student || profile?.data?.student;
  const summary = statement?.summary || statement?.data?.summary || statement;
  const rawEntries = ledgerData?.entries || ledgerData?.data?.entries || statement?.entries || [];
  const entries = Array.isArray(rawEntries) ? rawEntries : [];
  const isInactive = student?.status === 'INACTIVE';
  const outstandingNum = parseFloat(summary?.outstandingBalance || student?.outstandingBalance || 0);
  const hasOutstanding = outstandingNum > 0;

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-slate-100 print:bg-white print:text-black">
      {/* Print Header */}
      <div className="hidden print:block mb-6 border-b-2 border-gray-300 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Koshi Hostel</h1>
        <p className="text-gray-600">Biratnagar-10, Morang, Nepal</p>
        <p className="text-gray-500 text-sm">Account Statement — Generated: {formatDate(new Date())}</p>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-white">My Account</h1>
            <p className="text-slate-400 text-sm mt-1">View your financial history and balance</p>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-[#1e2d45] hover:bg-[#2a3d5c] border border-[#2a3d5c] rounded-lg text-slate-300 text-sm transition-colors"
          >
            <Printer size={16} />
            Print Statement
          </button>
        </div>

        {/* Inactive + Outstanding Warning */}
        {isInactive && hasOutstanding && (
          <div className="bg-amber-900/20 border border-amber-700/50 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-amber-300 font-semibold">Account Inactive — Outstanding Balance</p>
              <p className="text-amber-400/80 text-sm mt-0.5">
                Your account is marked as <strong>inactive</strong>. You still have an outstanding balance of{' '}
                <strong className="text-amber-300">{formatNPR(outstandingNum)}</strong>.
                Please contact Koshi Hostel administration to settle your dues.
              </p>
            </div>
          </div>
        )}

        {/* Profile Card */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0">
                <User size={24} className="text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-white">{student?.fullName}</h2>
                  <Badge variant={student?.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'} dot>
                    {student?.status || 'ACTIVE'}
                  </Badge>
                </div>
                <p className="text-slate-400 text-sm mt-0.5">Student ID: <span className="text-cyan-400 font-mono font-medium">{student?.studentId}</span></p>
              </div>
            </div>
            <div className="text-sm text-slate-400 space-y-1 sm:text-right">
              {student?.roomNumber && (
                <div className="flex items-center gap-1.5 sm:justify-end">
                  <Home size={13} />
                  <span>Room {student.roomNumber}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 sm:justify-end">
                <Calendar size={13} />
                <span>Admitted: {formatDate(student?.admissionDate)}</span>
              </div>
              {student?.departureDate && (
                <div className="flex items-center gap-1.5 sm:justify-end text-amber-400">
                  <Calendar size={13} />
                  <span>Departed: {formatDate(student.departureDate)}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 sm:justify-end">
                <CreditCard size={13} />
                <span>Monthly Fee: <strong className="text-cyan-400">{formatNPR(student?.monthlyFee || student?.currentFeeGroup?.monthlyAmount)}</strong></span>
              </div>
            </div>
          </div>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Charged"
            value={formatNPR(summary?.totalCharged)}
            icon={TrendingUp}
            color="amber"
          />
          <StatCard
            label="Total Paid"
            value={formatNPR(summary?.totalPaid)}
            icon={CheckCircle}
            color="green"
          />
          <StatCard
            label="Outstanding Balance"
            value={formatNPR(outstandingNum)}
            icon={AlertTriangle}
            color={hasOutstanding ? 'red' : 'green'}
            subtitle={hasOutstanding ? 'Payment pending' : 'All clear'}
          />
          <StatCard
            label="Last Payment"
            value={summary?.lastPaymentDate ? formatDate(summary.lastPaymentDate) : 'None'}
            subtitle={summary?.lastPaymentAmount ? formatNPR(summary.lastPaymentAmount) : undefined}
            icon={CreditCard}
            color="cyan"
          />
        </div>

        {/* Ledger Table */}
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-[#1e2d45] flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Transaction History</h3>
            <span className="text-xs text-slate-500">{entries.length} records</span>
          </div>

          {entries.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <CreditCard size={40} className="mx-auto mb-3 opacity-30" />
              <p>No transactions yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full print:text-xs">
                <thead>
                  <tr className="bg-[#080d1a]/60 text-xs text-slate-400 uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">Nepali Month</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left hidden lg:table-cell">Description</th>
                    <th className="px-4 py-3 text-right">Debit</th>
                    <th className="px-4 py-3 text-right">Credit</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2d45]">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-[#141f38]/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-300 whitespace-nowrap">
                        {formatDate(entry.date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400 hidden md:table-cell whitespace-nowrap">
                        {entry.billingPeriod?.nepaliMonth || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ENTRY_TYPE_COLORS[entry.entryType] || 'bg-slate-800 text-slate-400'}`}>
                          {ENTRY_TYPE_LABELS[entry.entryType] || entry.entryType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400 hidden lg:table-cell max-w-xs truncate">
                        {entry.description}
                      </td>
                      <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                        {parseFloat(entry.debit) > 0 ? (
                          <span className="text-red-400 font-medium flex items-center justify-end gap-1">
                            <ArrowUpRight size={13} />
                            {formatNPR(entry.debit)}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                        {parseFloat(entry.credit) > 0 ? (
                          <span className="text-green-400 font-medium flex items-center justify-end gap-1">
                            <ArrowDownLeft size={13} />
                            {formatNPR(entry.credit)}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono whitespace-nowrap">
                        <span className={parseFloat(entry.balanceAfter) > 0 ? 'text-red-400' : 'text-green-400'}>
                          {formatNPR(entry.balanceAfter)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Summary Footer */}
                <tfoot className="bg-[#080d1a]/60 border-t-2 border-[#2a3d5c]">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-slate-300 hidden lg:table-cell">
                      Totals
                    </td>
                    <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-slate-300 lg:hidden">
                      Totals
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-red-400">
                      {formatNPR(summary?.totalCharged)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-green-400">
                      {formatNPR(summary?.totalPaid)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold">
                      <span className={hasOutstanding ? 'text-red-400' : 'text-green-400'}>
                        {formatNPR(outstandingNum)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Show More */}
          {!showAll && ledgerData?.total > 20 && (
            <div className="px-6 py-4 border-t border-[#1e2d45] text-center">
              <button
                onClick={() => setShowAll(true)}
                className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Show all {ledgerData.total} transactions
              </button>
            </div>
          )}
        </Card>

        {/* Settled notice */}
        {isInactive && !hasOutstanding && (
          <div className="bg-green-900/20 border border-green-700/40 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="text-green-400 shrink-0" size={20} />
            <div>
              <p className="text-green-300 font-semibold">Account Fully Settled</p>
              <p className="text-green-400/80 text-sm">All dues have been cleared. Thank you!</p>
            </div>
          </div>
        )}

        {/* Print footer */}
        <div className="hidden print:block mt-8 pt-4 border-t border-gray-300 text-xs text-gray-500 text-center">
          This is a computer-generated statement. Koshi Hostel, Biratnagar-10, Morang, Nepal.
        </div>
      </div>
    </div>
  );
}
