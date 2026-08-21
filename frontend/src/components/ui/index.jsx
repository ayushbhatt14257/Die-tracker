import { useState, useEffect, useRef } from 'react';
import { Loader2, Plus, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { listOptionAPI } from '../../api';

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

// A creatable + deletable option list, usable as single-select (radio-like) or multi-select (checkbox).
// Backed by /api/list-options, type = 'sentBy' | 'designPlanning' | 'master'.
export const ManagedOptionList = ({ type, value, onChange, multi = false, canManage = true, emptyText = 'No options yet — add the first one' }) => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newValue, setNewValue] = useState('');
  const [adding, setAdding] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const inputRef = useRef(null);

  const fetchOptions = async () => {
    try {
      const { data } = await listOptionAPI.get(type);
      if (data.success) setOptions(data.data);
    } catch (err) {
      toast.error('Failed to load options');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchOptions(); }, [type]);
  useEffect(() => { if (addOpen) inputRef.current?.focus(); }, [addOpen]);

  const isSelected = (val) => multi ? (value || []).includes(val) : value === val;
  const selectedCount = multi ? (value || []).length : (value ? 1 : 0);

  const toggle = (val) => {
    if (multi) {
      const current = value || [];
      onChange(current.includes(val) ? current.filter(v => v !== val) : [...current, val]);
    } else {
      onChange(value === val ? '' : val);
    }
  };

  const closeAdd = () => { setAddOpen(false); setNewValue(''); };

  const handleAdd = async () => {
    if (!newValue.trim() || adding) return;
    setAdding(true);
    try {
      const { data } = await listOptionAPI.add(type, newValue.trim());
      if (data.success) {
        setOptions(o => [...o, data.data].sort((a, b) => a.value.localeCompare(b.value)));
        toggle(data.data.value);
        setNewValue('');
        setAddOpen(false);
      } else toast.error(data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error adding option');
    } finally { setAdding(false); }
  };

  const handleDelete = async (id, val, e) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      const { data } = await listOptionAPI.delete(id);
      if (data.success) {
        setOptions(o => o.filter(opt => opt._id !== id));
        if (multi) onChange((value || []).filter(v => v !== val));
        else if (value === val) onChange('');
      } else toast.error(data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting option');
    } finally { setDeletingId(null); }
  };

  if (loading) {
    return (
      <div className="flex gap-1.5">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-8 rounded-full bg-gray-100 animate-pulse" style={{ width: 56 + i * 18 }} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {options.length === 0 && !addOpen && (
          <p className="text-xs text-gray-400 py-1.5">{emptyText}</p>
        )}
        {options.map(opt => {
          const selected = isSelected(opt.value);
          return (
            <button
              type="button"
              key={opt._id}
              onClick={() => toggle(opt.value)}
              className={`group relative flex items-center gap-1 pl-3 pr-2.5 py-1.5 rounded-full border text-xs font-medium
                transition-all duration-150 active:scale-95
                ${selected
                  ? 'border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-200'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:bg-blue-50/60'}`}
            >
              <span className={`grid place-items-center overflow-hidden transition-all duration-150 ${selected ? 'w-3 mr-0.5' : 'w-0'}`}>
                <Check className="w-3 h-3 flex-shrink-0" strokeWidth={3} />
              </span>
              {opt.value}
              {canManage && (
                <span
                  onClick={(e) => handleDelete(opt._id, opt.value, e)}
                  className={`ml-0.5 -mr-1 p-0.5 rounded-full transition-colors
                    ${selected ? 'hover:bg-white/25 text-white/70 hover:text-white' : 'text-gray-300 hover:bg-red-100 hover:text-red-500'}`}
                  title="Remove option"
                >
                  {deletingId === opt._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                </span>
              )}
            </button>
          );
        })}

        {canManage && !addOpen && (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1 pl-2.5 pr-3 py-1.5 rounded-full border border-dashed border-gray-300 text-xs font-medium text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/60 transition-colors"
          >
            <Plus className="w-3 h-3" /> Add new
          </button>
        )}

        {canManage && addOpen && (
          <div className="flex items-center gap-1 pl-3 pr-1.5 py-1 rounded-full border border-blue-400 bg-blue-50/60 ring-2 ring-blue-100">
            <input
              ref={inputRef}
              className="bg-transparent text-xs font-medium text-gray-800 placeholder-gray-400 outline-none w-28"
              placeholder="Type & press enter…"
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
                if (e.key === 'Escape') { e.preventDefault(); closeAdd(); }
              }}
              onBlur={() => { if (!newValue.trim()) closeAdd(); }}
            />
            <button
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={handleAdd}
              disabled={adding || !newValue.trim()}
              className="p-1 rounded-full bg-blue-600 text-white disabled:opacity-40 hover:bg-blue-700 transition-colors"
            >
              {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" strokeWidth={3} />}
            </button>
            <button
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={closeAdd}
              className="p-1 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
      {multi && selectedCount > 0 && (
        <p className="text-xs text-gray-400 mt-1.5">{selectedCount} selected</p>
      )}
    </div>
  );
};

// Small eyebrow header used to group related fields inside a longer form
export const SectionHeader = ({ icon: Icon, title, hint }) => (
  <div className="flex items-center gap-2 pt-1">
    {Icon && (
      <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
        <Icon className="w-3.5 h-3.5" />
      </div>
    )}
    <div className="min-w-0">
      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{title}</p>
      {hint && <p className="text-xs text-gray-400 leading-tight">{hint}</p>}
    </div>
  </div>
);

export const ConfirmDialog = ({ open, onClose, onConfirm, title, message, confirmText = 'Confirm', danger = false }) => (
  <Modal open={open} onClose={onClose} title={title}>
    <p className="text-sm text-gray-600 mb-5">{message}</p>
    <div className="flex gap-3">
      <button className="btn btn-ghost flex-1" onClick={onClose}>Cancel</button>
      <button className={`btn flex-1 ${danger ? 'btn-danger' : 'btn-success'}`} onClick={onConfirm}>{confirmText}</button>
    </div>
  </Modal>
);
