import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Home,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Lock,
  Tag,
  CheckCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreateStudent } from '../../hooks/useStudents';
import { useFeeGroups } from '../../hooks/useFeeGroups';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { formatNPR } from '../../utils/formatCurrency';

export default function StudentForm() {
  const navigate = useNavigate();
  const createStudentMutation = useCreateStudent();
  const { data: feeGroupsData, isLoading: feeGroupsLoading } = useFeeGroups();

  const feeGroups = Array.isArray(feeGroupsData) ? feeGroupsData : feeGroupsData?.data || [];

  const [formData, setFormData] = useState({
    fullName: '',
    roomNumber: '',
    phone: '',
    email: '',
    address: '',
    admissionDate: new Date().toISOString().split('T')[0],
    feeGroupId: '',
    username: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Auto populate username suggestion if empty and fullName typed
    if (name === 'fullName' && !formData.username) {
      const generated = value
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 12);
      if (generated) {
        setFormData((prev) => ({ ...prev, username: generated }));
      }
    }
    // Clear error for field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.roomNumber.trim()) newErrors.roomNumber = 'Room number is required';
    if (!formData.admissionDate) newErrors.admissionDate = 'Admission date is required';
    if (!formData.feeGroupId) newErrors.feeGroupId = 'Please assign a fee group';
    if (!formData.username.trim()) newErrors.username = 'Username is required';
    else if (formData.username.length < 3) newErrors.username = 'Username must be at least 3 characters';

    if (!formData.password) newErrors.password = 'Initial password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please provide a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please resolve the errors highlighted in the form.');
      return;
    }

    try {
      const res = await createStudentMutation.mutateAsync({
        fullName: formData.fullName.trim(),
        roomNumber: formData.roomNumber.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        admissionDate: formData.admissionDate,
        feeGroupId: formData.feeGroupId,
        username: formData.username.trim(),
        password: formData.password,
      });

      const newId = res?.id || res?.data?.id || res?.student?.id;
      if (newId) {
        navigate(`/admin/students/${newId}`);
      } else {
        navigate('/admin/students');
      }
    } catch {
      // Handled in mutation onError
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top back button & title */}
      <div className="flex items-center gap-4">
        <Button
          variant="secondary"
          size="sm"
          icon={ArrowLeft}
          onClick={() => navigate('/admin/students')}
        >
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Register New Student</h1>
          <p className="text-xs text-slate-400">
            Create resident profile, assign hostel room, fee package, and login account
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Personal & Residency Details */}
        <Card title="Student Residency Information" subtitle="Basic personal and contact info">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              name="fullName"
              placeholder="e.g. Ramesh Adhikari"
              value={formData.fullName}
              onChange={handleChange}
              error={errors.fullName}
              icon={User}
              required
            />

            <Input
              label="Room Number"
              name="roomNumber"
              placeholder="e.g. 102, 204-B"
              value={formData.roomNumber}
              onChange={handleChange}
              error={errors.roomNumber}
              icon={Home}
              required
            />

            <Input
              label="Phone Number"
              name="phone"
              type="tel"
              placeholder="e.g. 9842012345"
              value={formData.phone}
              onChange={handleChange}
              error={errors.phone}
              icon={Phone}
            />

            <Input
              label="Email Address"
              name="email"
              type="email"
              placeholder="e.g. ramesh@example.com"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              icon={Mail}
            />

            <div className="md:col-span-2">
              <Input
                label="Permanent Address"
                name="address"
                placeholder="e.g. Itahari-4, Sunsari, Nepal"
                value={formData.address}
                onChange={handleChange}
                error={errors.address}
                icon={MapPin}
              />
            </div>
          </div>
        </Card>

        {/* Section 2: Hostel Admission & Fee Assignment */}
        <Card title="Admission & Fee Group" subtitle="Billing package configuration">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Admission Date"
              name="admissionDate"
              type="date"
              value={formData.admissionDate}
              onChange={handleChange}
              error={errors.admissionDate}
              icon={Calendar}
              required
            />

            <Select
              label="Assigned Fee Group"
              name="feeGroupId"
              value={formData.feeGroupId}
              onChange={handleChange}
              error={errors.feeGroupId}
              required
              placeholder={feeGroupsLoading ? 'Loading packages...' : 'Select a fee group'}
              options={feeGroups.map((g) => ({
                value: g.id,
                label: `${g.name} — ${formatNPR(g.monthlyAmount)} / month`,
              }))}
            />
          </div>
        </Card>

        {/* Section 3: Portal Login Credentials */}
        <Card title="Student Portal Account" subtitle="Credentials for student to view their statement and dues">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Portal Username"
              name="username"
              placeholder="e.g. ramesh102"
              value={formData.username}
              onChange={handleChange}
              error={errors.username}
              icon={User}
              required
            />

            <Input
              label="Initial Password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              icon={Lock}
              required
              endIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-cyan-400 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            <Input
              label="Confirm Password"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              icon={Lock}
              required
              endIcon={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-slate-400 hover:text-cyan-400 focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />
          </div>
        </Card>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Button
            variant="secondary"
            onClick={() => navigate('/admin/students')}
            disabled={createStudentMutation.isPending}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            icon={CheckCircle}
            loading={createStudentMutation.isPending}
          >
            Complete Registration
          </Button>
        </div>
      </form>
    </div>
  );
}
