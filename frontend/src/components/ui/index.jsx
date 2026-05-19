import { Loader2 } from 'lucide-react';

export const Spinner = ({ size = 'md' }) => {
  const s = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6';
  return <Loader2 className={`${s} animate-spin text-blue-600`} />;
};

export const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <Spinner size="lg" />
      <p className="mt-3 text-sm text-gray-500">Loading…</p>
    </div>
  </div>
);

export const EmptyState = ({ icon: Icon, title, subtitle }) => (
  <div className="py-12 text-center">
    {Icon && <Icon className="w-10 h-10 mx-auto text-gray-300 mb-3" />}
    <p className="text-sm font-medium text-gray-500">{title}</p>
    {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
  </div>
);

export const StatusBadge = ({ status }) => {
  const map = {
    ok: 'badge-green',
    slow: 'badge-amber',
    over: 'badge-red',
    done: 'badge-gray',
    in_transit: 'bg-orange-100 text-orange-800',
    in_moulding: 'badge-purple',
    active: 'badge-blue',
    completed: 'badge-gray',
  };
  const labels = {
    ok: 'On Track', slow: 'Running Slow', over: 'Overdue',
    done: '✓ Complete', in_transit: '🚚 In Transit', in_moulding: 'At GR1 Moulding',
    active: 'Active', completed: 'Completed',
  };
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{labels[status] || status}</span>;
};

// 6-stage bar: Design, Program, VMC, Wirecut, Tool Room, GR1 Received
// dieStatus: 'active' | 'in_transit' | 'in_moulding' | 'completed'
export const StageBar = ({ currentStage, status, done, dieStatus }) => {
  const segs = [1, 2, 3, 4, 5, 6]; // 6 = GR1 received

  const getColor = (i) => {
    // Segment 6 = GR1 received — only green when die is in_moulding
    if (i === 6) {
      if (dieStatus === 'in_moulding' || dieStatus === 'completed') return 'bg-green-500';
      if (dieStatus === 'in_transit') return 'bg-orange-400';
      return 'bg-gray-200';
    }
    if (done || i < currentStage) return 'bg-green-500';
    if (i === currentStage) {
      if (status === 'over') return 'bg-red-500';
      if (status === 'slow') return 'bg-amber-400';
      return 'bg-blue-500';
    }
    return 'bg-gray-200';
  };

  return (
    <div className="flex gap-1 my-1.5">
      {segs.map(i => (
        <div key={i} className={`flex-1 h-1.5 rounded-full ${getColor(i)} transition-all`} />
      ))}
    </div>
  );
};

export const StageDots = () => (
  <div className="flex justify-between text-xs text-gray-400 px-0.5">
    {['Design', 'Program', 'VMC', 'Wirecut', 'Tool Rm', 'GR1'].map((s, i) => (
      <span key={s} className="text-center" style={{ width: `${100 / 6}%` }}>{s}</span>
    ))}
  </div>
);

export const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex justify-between items-center">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

export const ConfirmDialog = ({ open, onClose, onConfirm, title, message, confirmText = 'Confirm', danger = false }) => (
  <Modal open={open} onClose={onClose} title={title}>
    <p className="text-sm text-gray-600 mb-5">{message}</p>
    <div className="flex gap-3">
      <button className="btn btn-ghost flex-1" onClick={onClose}>Cancel</button>
      <button className={`btn flex-1 ${danger ? 'btn-danger' : 'btn-success'}`} onClick={onConfirm}>{confirmText}</button>
    </div>
  </Modal>
);
