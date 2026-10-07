import { LucideIcon } from 'lucide-react';

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'badge-active',
    draft: 'badge-draft',
    completed: 'badge-completed',
    scheduled: 'badge-scheduled',
    played: 'badge-played',
  };
  const labels: Record<string, string> = {
    active: 'Activa',
    draft: 'Borrador',
    completed: 'Finalizada',
    scheduled: 'Programado',
    played: 'Jugado',
  };
  return <span className={map[status] ?? 'badge-draft'}>{labels[status] ?? status}</span>;
}

export function EmptyState({
  icon: Icon,
  title,
  message,
}: {
  icon: LucideIcon;
  title: string;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-full bg-ink-100 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-ink-400" />
      </div>
      <h3 className="text-lg font-semibold text-ink-800 mb-1">{title}</h3>
      <p className="text-sm text-ink-500 max-w-sm">{message}</p>
    </div>
  );
}

export function LoadingSpinner({ label = 'Cargando...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-16 gap-3">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm text-ink-500">{label}</span>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-xl w-full ${maxWidth} animate-scale-in max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100">
          <h2 className="text-lg font-display font-semibold text-ink-900">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-400 hover:bg-ink-100 hover:text-ink-700 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirmar',
  danger = false,
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title} maxWidth="max-w-sm">
      <p className="text-sm text-ink-600 mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button onClick={onCancel} className="btn-secondary">
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          className={danger ? 'btn-danger' : 'btn-primary'}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
