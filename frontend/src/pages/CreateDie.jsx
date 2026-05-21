import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { dieAPI } from '../api';

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
    designOption: '',
    blockType: '',
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
    if (!form.modelName || !form.designOption || !form.blockType)
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

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-lg font-bold text-gray-900 mb-4">Create New Die</h1>

      <div className="card">
        <form onSubmit={handleSubmit} className="p-5 space-y-4">

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

          <div>
            <label className="label">Design option <span className="text-red-500">*</span></label>
            <input
              className="input"
              placeholder="e.g. MAG_CASE"
              value={form.designOption}
              onChange={e => setForm(f => ({ ...f, designOption: e.target.value }))}
            />
          </div>

          <div>
            <label className="label">Block type <span className="text-red-500">*</span></label>
            <input
              className="input"
              placeholder="e.g. H-H"
              value={form.blockType}
              onChange={e => setForm(f => ({ ...f, blockType: e.target.value }))}
            />
          </div>

          <div>
            <label className="label">Parts for this die</label>
            <div className="space-y-2">
              {PART_OPTIONS.map(({ name, desc, required }) => (
                <label
                  key={name}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
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
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{name}</p>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </div>
                  {required && <span className="badge badge-gray text-xs">Required</span>}
                </label>
              ))}
            </div>
            <div className="mt-2 flex items-start gap-1.5 text-xs text-blue-600 bg-blue-50 rounded-lg p-2.5">
              <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              Each part runs independently through Design → VMC → Wirecut. Tool Room handles all parts together as one die.
            </div>
          </div>

          <div>
            <label className="label">Priority</label>
            <select
              className="input"
              value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
            >
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div>
            <label className="label">Notes (optional)</label>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="Any additional notes…"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>

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
