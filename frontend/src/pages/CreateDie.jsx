import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Info, UserRound, ClipboardCheck, Layers, Box, Puzzle, Flag, StickyNote } from 'lucide-react';
import toast from 'react-hot-toast';
import { dieAPI } from '../api';
import { ManagedOptionList, SectionHeader } from '../components/ui';

const PART_OPTIONS = [
  { name: 'Pocket', desc: 'Always required', required: true },
  { name: 'Cavity', desc: 'Always required', required: true },
  { name: 'Insert', desc: 'Optional — only for some moulds' },
];

// Auto-format: uppercase + underscores only
const formatModelName = (value) => {
  return value
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '');
};

const isValidModelName = (value) => {
  return /^[A-Z0-9]+(_[A-Z0-9]+)*$/.test(value);
};

const CreateDie = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    modelName: '',
    sentBy: '',
    checkDimensionSOP: false,
    designPlanning: [],
    master: '',
    parts: ['Pocket', 'Cavity'],
    priority: 'normal',
    notes: '',
  });

  const handleModelNameChange = (e) => {
    const formatted = formatModelName(e.target.value);
    setForm(f => ({ ...f, modelName: formatted }));
  };

  const togglePart = (name) => {
    const required = ['Pocket', 'Cavity'];
    if (required.includes(name)) return;
    setForm(f => ({
      ...f,
      parts: f.parts.includes(name) ? f.parts.filter(p => p !== name) : [...f.parts, name],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.modelName)
      return toast.error('Please fill all required fields');

    if (!isValidModelName(form.modelName))
      return toast.error('Model name must be UPPERCASE with underscores only. Example: 22_NOTHING_PHONE_4A_MAG_CASE');

    setLoading(true);
    try {
      const { data } = await dieAPI.create(form);
      if (data.success) {
        toast.success(`${data.data.dieId} created — ${form.parts.length} parts added to programming queue`);
        navigate('/dashboard');
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating die');
    } finally {
      setLoading(false);
    }
  };

  const modelNameValid = form.modelName === '' || isValidModelName(form.modelName);
  const selectedSummary = [form.master, ...(form.designPlanning || [])].filter(Boolean);

  return (
    <div className="max-w-lg mx-auto pb-24">
      <h1 className="text-lg font-bold text-gray-900 mb-4">Create New Die</h1>

      <div className="card">
        <form onSubmit={handleSubmit} className="p-5 space-y-5">

          <div>
            <label className="label">Model name <span className="text-red-500">*</span></label>
            <input
              className={`input font-mono ${!modelNameValid ? 'border-red-400 focus:ring-red-400' : ''}`}
              placeholder="e.g. 22_NOTHING_PHONE_4A_MAG_CASE"
              value={form.modelName}
              onChange={handleModelNameChange}
            />
            {!modelNameValid && (
              <p className="text-xs text-red-500 mt-1">Must be UPPERCASE with underscores. Example: 22_NOTHING_PHONE_4A_MAG_CASE</p>
            )}
            {form.modelName && modelNameValid && (
              <p className="text-xs text-green-600 mt-1">✓ Valid format</p>
            )}
            <p className="text-xs text-gray-400 mt-1">Spaces auto-convert to underscores. Only letters, numbers and underscores allowed.</p>
          </div>

          <hr className="border-gray-100" />

          <div className="space-y-2.5">
            <SectionHeader icon={UserRound} title="Sent by" />
            <ManagedOptionList
              type="sentBy"
              value={form.sentBy}
              onChange={val => setForm(f => ({ ...f, sentBy: val }))}
            />
          </div>

          <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors
            ${form.checkDimensionSOP ? 'border-green-400 bg-green-50/60' : 'border-gray-200 hover:border-gray-300'}`}>
            <input
              type="checkbox"
              checked={form.checkDimensionSOP}
              onChange={e => setForm(f => ({ ...f, checkDimensionSOP: e.target.checked }))}
              className="w-4 h-4 text-green-600 rounded"
            />
            <ClipboardCheck className={`w-4 h-4 flex-shrink-0 ${form.checkDimensionSOP ? 'text-green-600' : 'text-gray-400'}`} />
            <span className="text-sm font-medium text-gray-900">Check dimension / Check with SOP</span>
          </label>

          <hr className="border-gray-100" />

          <div className="space-y-2.5">
            <SectionHeader icon={Layers} title="Design planning" hint="Select all that apply" />
            <ManagedOptionList
              type="designPlanning"
              multi
              value={form.designPlanning}
              onChange={val => setForm(f => ({ ...f, designPlanning: val }))}
            />
          </div>

          <div className="space-y-2.5">
            <SectionHeader icon={Box} title="Master" />
            <ManagedOptionList
              type="master"
              value={form.master}
              onChange={val => setForm(f => ({ ...f, master: val }))}
            />
          </div>

          <hr className="border-gray-100" />

          <div className="space-y-2.5">
            <SectionHeader icon={Puzzle} title="Parts for this die" />
            <div className="space-y-2">
              {PART_OPTIONS.map(({ name, desc, required }) => (
                <label
                  key={name}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors
                    ${form.parts.includes(name)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                    ${required ? 'opacity-90' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={form.parts.includes(name)}
                    onChange={() => togglePart(name)}
                    disabled={required}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{name}</p>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </div>
                  {required && <span className="badge badge-gray text-xs">Required</span>}
                </label>
              ))}
            </div>
            <div className="flex items-start gap-1.5 text-xs text-blue-600 bg-blue-50 rounded-lg p-2.5">
              <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              Each part runs independently through Design → VMC → Wirecut. Tool Room handles all parts together as one die.
            </div>
          </div>

          <hr className="border-gray-100" />

          <div className="space-y-2.5">
            <SectionHeader icon={Flag} title="Priority" />
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'normal', label: 'Normal' },
                { key: 'urgent', label: 'Urgent' },
              ].map(p => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, priority: p.key }))}
                  className={`py-2.5 rounded-xl text-sm font-semibold border transition-all active:scale-95
                    ${form.priority === p.key
                      ? p.key === 'urgent'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                >
                  {p.key === 'urgent' ? '🔥 ' : ''}{p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            <SectionHeader icon={StickyNote} title="Notes" hint="Optional" />
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="Any additional notes…"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>

          {selectedSummary.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500 bg-gray-50 rounded-lg p-2.5">
              <span className="font-medium text-gray-600">Summary:</span>
              {selectedSummary.map(s => (
                <span key={s} className="badge badge-blue">{s}</span>
              ))}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary w-full py-3"
            disabled={loading || !modelNameValid || !form.modelName}
          >
            <Plus className="w-4 h-4" />
            {loading ? 'Creating…' : `Create Die — ${form.parts.length} parts`}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateDie;
