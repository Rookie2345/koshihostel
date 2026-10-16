import React from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  loading = false,
  children,
}) {
  const icons = {
    danger: <AlertTriangle className="w-6 h-6 text-red-400" />,
    warning: <AlertTriangle className="w-6 h-6 text-amber-400" />,
    info: <Info className="w-6 h-6 text-cyan-400" />,
  };

  const bgColors = {
    danger: 'bg-red-500/10 border-red-500/20',
    warning: 'bg-amber-500/10 border-amber-500/20',
    info: 'bg-cyan-500/10 border-cyan-500/20',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-full border shrink-0 ${bgColors[type] || bgColors.danger}`}>
          {icons[type] || icons.danger}
        </div>
        <div className="flex-1">
          <h4 className="text-base font-semibold text-slate-100">{title}</h4>
          <p className="mt-1 text-sm text-slate-400">{message}</p>
        </div>
      </div>

      {children && <div className="mt-4">{children}</div>}

      <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-navy-700/60">
        <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>
          {cancelText}
        </Button>
        <Button
          variant={type === 'danger' ? 'danger' : 'primary'}
          size="sm"
          onClick={onConfirm}
          loading={loading}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
}
