import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus,
  Search,
  Filter,
  Eye,
  Edit,
  UserCheck,
  UserX,
  ArrowUpDown,
  RefreshCw,
  Building,
} from 'lucide-react';
import { useStudents, useActivateStudent, useDeactivateStudent } from '../../hooks/useStudents';
import { useFeeGroups } from '../../hooks/useFeeGroups';
import Table, { TableRow, TableCell } from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Pagination from '../../components/ui/Pagination';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import { formatNPR } from '../../utils/formatCurrency';

export default function StudentList() {
  const navigate = useNavigate();

  // Filters & State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'
  const [feeGroupFilter, setFeeGroupFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [sortBy, setSortBy] = useState('fullName');
  const [sortOrder, setSortOrder] = useState('asc');

  // Deactivate / Activate action state
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [confirmActionType, setConfirmActionType] = useState(null); // 'ACTIVATE' | 'DEACTIVATE'
  const [deactivateReason, setDeactivateReason] = useState('');

  // Queries & Mutations
  const { data: feeGroupsData } = useFeeGroups();
  const feeGroups = Array.isArray(feeGroupsData) ? feeGroupsData : feeGroupsData?.data || [];

  const { data: studentsResponse, isLoading, isError, refetch } = useStudents({
    search: search || undefined,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    feeGroupId: feeGroupFilter || undefined,
    page,
    limit: pageSize,
    sortBy,
    sortOrder,
  });

  const activateMutation = useActivateStudent();
  const deactivateMutation = useDeactivateStudent();

  // Extract students safely whether wrapped in pagination or raw array
  let studentsList = [];
  let totalItems = 0;
  let totalPages = 1;

  if (Array.isArray(studentsResponse)) {
    studentsList = studentsResponse;
    totalItems = studentsResponse.length;
    totalPages = Math.ceil(totalItems / pageSize) || 1;
  } else if (studentsResponse?.students) {
    studentsList = studentsResponse.students;
    totalItems = studentsResponse.total || studentsResponse.totalItems || studentsList.length;
    totalPages = studentsResponse.totalPages || Math.ceil(totalItems / pageSize) || 1;
  } else if (studentsResponse?.data) {
    studentsList = studentsResponse.data;
    totalItems = studentsResponse.total || studentsList.length;
    totalPages = studentsResponse.totalPages || Math.ceil(totalItems / pageSize) || 1;
  }

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleConfirmStatusChange = async () => {
    if (!selectedStudent) return;

    if (confirmActionType === 'ACTIVATE') {
      await activateMutation.mutateAsync(selectedStudent.id);
    } else if (confirmActionType === 'DEACTIVATE') {
      await deactivateMutation.mutateAsync({
        id: selectedStudent.id,
        reason: deactivateReason,
      });
    }

    setSelectedStudent(null);
    setConfirmActionType(null);
    setDeactivateReason('');
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Students Directory</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage hostel residents, account status, and monthly fee packages
          </p>
        </div>

        <Button
          variant="primary"
          icon={UserPlus}
          onClick={() => navigate('/admin/students/new')}
        >
          Add New Student
        </Button>
      </div>

      {/* Filter and Search Bar Card */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 p-1 bg-navy-900 rounded-lg border border-navy-700/60 self-start">
            {['ALL', 'ACTIVE', 'INACTIVE'].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setStatusFilter(tab);
                  setPage(1);
                }}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  statusFilter === tab
                    ? 'bg-cyan-500 text-navy-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800'
                }`}
              >
                {tab === 'ALL' ? 'All Residents' : tab === 'ACTIVE' ? 'Active' : 'Inactive'}
              </button>
            ))}
          </div>

          {/* Search & Fee Group Filter */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="w-full sm:w-64">
              <Input
                placeholder="Search name, ID, or room..."
                icon={Search}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="w-full sm:w-52">
              <Select
                placeholder="All Fee Groups"
                value={feeGroupFilter}
                onChange={(e) => {
                  setFeeGroupFilter(e.target.value);
                  setPage(1);
                }}
                options={feeGroups.map((g) => ({
                  value: g.id,
                  label: `${g.name} (${formatNPR(g.monthlyAmount)})`,
                }))}
              />
            </div>

            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={() => refetch()}
              title="Refresh student list"
            />
          </div>
        </div>
      </Card>

      {/* Students Data Table */}
      <Card className="overflow-hidden p-0 border border-navy-600/70">
        {isLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton count={8} className="h-10" />
          </div>
        ) : studentsList.length > 0 ? (
          <>
            <Table
              headers={[
                {
                  label: (
                    <button
                      onClick={() => handleSort('fullName')}
                      className="inline-flex items-center gap-1.5 hover:text-cyan-400 transition-colors"
                    >
                      <span>Student Name</span>
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  ),
                },
                {
                  label: (
                    <button
                      onClick={() => handleSort('studentId')}
                      className="inline-flex items-center gap-1.5 hover:text-cyan-400 transition-colors"
                    >
                      <span>Student ID</span>
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  ),
                },
                { label: 'Room' },
                { label: 'Fee Group' },
                { label: 'Monthly Fee', align: 'right' },
                { label: 'Outstanding', align: 'right' },
                { label: 'Status', align: 'center' },
                { label: 'Actions', align: 'right' },
              ]}
            >
              {studentsList.map((student) => {
                const isActive = (student.status || 'ACTIVE').toUpperCase() === 'ACTIVE';
                const dues = Number(student.outstandingBalance || student.balance || 0);

                return (
                  <TableRow key={student.id}>
                    {/* Name & Contact */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-navy-700 border border-navy-600 flex items-center justify-center font-bold text-cyan-400 text-xs shrink-0">
                          {student.fullName?.charAt(0).toUpperCase() || 'S'}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-100 hover:text-cyan-400 transition-colors">
                            {student.fullName}
                          </p>
                          <p className="text-xs text-slate-400">{student.phone || student.email || '-'}</p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Student ID */}
                    <TableCell className="text-xs font-mono text-cyan-400 font-semibold">
                      {student.studentId || student.id}
                    </TableCell>

                    {/* Room */}
                    <TableCell>
                      <span className="px-2 py-0.5 rounded bg-navy-700/80 text-xs font-medium text-slate-300">
                        {student.roomNumber || '-'}
                      </span>
                    </TableCell>

                    {/* Fee Group */}
                    <TableCell>
                      <span className="text-xs text-slate-300">
                        {student.feeGroup?.name || student.feeGroupName || 'Standard'}
                      </span>
                    </TableCell>

                    {/* Monthly Fee */}
                    <TableCell align="right" className="text-xs font-medium text-slate-200">
                      {formatNPR(student.feeGroup?.monthlyAmount || student.monthlyFee || 0)}
                    </TableCell>

                    {/* Outstanding */}
                    <TableCell align="right" className="font-semibold text-xs">
                      <span className={dues > 0 ? 'text-red-400 font-bold' : 'text-slate-400'}>
                        {formatNPR(dues)}
                      </span>
                    </TableCell>

                    {/* Status */}
                    <TableCell align="center">
                      <Badge variant={isActive ? 'ACTIVE' : 'INACTIVE'} dot size="xs">
                        {isActive ? 'ACTIVE' : 'INACTIVE'}
                      </Badge>
                    </TableCell>

                    {/* Actions */}
                    <TableCell align="right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/admin/students/${student.id}`)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                          title="View Profile & Financial Ledger"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => navigate(`/admin/students/${student.id}?edit=true`)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                          title="Edit Student Information"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {isActive ? (
                          <button
                            onClick={() => {
                              setSelectedStudent(student);
                              setConfirmActionType('DEACTIVATE');
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Deactivate Student"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedStudent(student);
                              setConfirmActionType('ACTIVATE');
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                            title="Activate Student"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </Table>

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={(newPage) => setPage(newPage)}
            />
          </>
        ) : (
          <EmptyState
            title="No students match the criteria"
            description={
              search || feeGroupFilter || statusFilter !== 'ALL'
                ? 'Try clearing the search query or adjusting your filters.'
                : 'Get started by registering the first hostel student.'
            }
            actionLabel="Add New Student"
            onAction={() => navigate('/admin/students/new')}
          />
        )}
      </Card>

      {/* Confirmation Dialog for Status Change */}
      <ConfirmDialog
        isOpen={Boolean(selectedStudent && confirmActionType)}
        onClose={() => {
          setSelectedStudent(null);
          setConfirmActionType(null);
          setDeactivateReason('');
        }}
        onConfirm={handleConfirmStatusChange}
        title={
          confirmActionType === 'ACTIVATE'
            ? `Re-activate ${selectedStudent?.fullName}?`
            : `Deactivate ${selectedStudent?.fullName}?`
        }
        message={
          confirmActionType === 'ACTIVATE'
            ? 'This will restore the student to active status and include them in upcoming monthly billing cycles.'
            : 'Marking a student as inactive will remove them from automatic monthly billing runs. Unpaid dues will remain tracked.'
        }
        confirmText={confirmActionType === 'ACTIVATE' ? 'Activate Student' : 'Deactivate Student'}
        type={confirmActionType === 'ACTIVATE' ? 'info' : 'danger'}
        loading={activateMutation.isPending || deactivateMutation.isPending}
      >
        {confirmActionType === 'DEACTIVATE' && (
          <div className="mt-3">
            <Input
              label="Departure Reason / Notes"
              placeholder="e.g. Completed college semester, relocated"
              value={deactivateReason}
              onChange={(e) => setDeactivateReason(e.target.value)}
            />
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}
