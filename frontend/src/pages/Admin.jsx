import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, CalendarOff, Archive } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI, dieAPI } from '../api';
import { Spinner, Modal } from '../components/ui';
import { ROLE_LABELS, fmtDate } from '../utils/helpers';

const ROLES = ['designer', 'programmer', 'vmc_operator', 'wirecut_operator', 'toolroom_head', 'gr1_receiver', 'admin'];
const MACHINES = ['M-01', 'M-02', 'M-03', 'M-04', 'M-05', 'M-06', 'M-07', 'M-08', 'M-09', 'Wirecut-1', 'Wirecut-2'];

// ── User Modal ──────────────────────────────────────────
const UserModal = ({ open, onClose, user: editUser, onSave }) => {
  const [form, setForm] = useState({ username: '', password: '', name: '', role: 'designer', assignedMachine: '', isActive: true });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editUser) setForm({ ...editUser, password: '' });
    else setForm({ username: '', password: '', name: '', role: 'designer', assignedMachine: '', isActive: true });
  }, [editUser, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (editUser) {
        const { data } = await adminAPI.updateUser(editUser._id, payload);
        if (data.success) { toast.success('User updated'); onSave(); onClose(); }
        else toast.error(data.message);
      } else {
        const { data } = await adminAPI.createUser(payload);
        if (data.success) { toast.success('User created'); onSave(); onClose(); }
        else toast.error(data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    } finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={editUser ? 'Edit User' : 'Create User'}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="label">Full name *</label>
          <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
        </div>
        {!editUser && (
          <div>
            <label className="label">Username *</label>
            <input className="input" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
          </div>
        )}
        <div>
          <label className="label">{editUser ? 'New password (leave blank to keep)' : 'Password *'}</label>
          <input className="input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required={!editUser} />
        </div>
        <div>
          <label className="label">Role *</label>
          <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
            {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </div>
        {form.role === 'vmc_operator' && (
          <div>
            <label className="label">Assigned machine</label>
            <select className="input" value={form.assignedMachine} onChange={e => setForm(f => ({ ...f, assignedMachine: e.target.value }))}>
              <option value="">Select machine</option>
              {MACHINES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        )}
        {editUser && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4" />
            <span className="text-sm text-gray-700">Active account</span>
          </label>
        )}
        <button type="submit" className="btn btn-primary w-full mt-2" disabled={loading}>
          {loading ? 'Saving…' : editUser ? 'Update User' : 'Create User'}
        </button>
      </form>
    </Modal>
  );
};

// ── Holiday Modal ───────────────────────────────────────
const HolidayModal = ({ open, onClose, onSave }) => {
  const [form, setForm] = useState({ date: '', description: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setForm({ date: '', description: '' });
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await adminAPI.addHoliday(form);
      if (data.success) {
        toast.success('Holiday added — timer will pause for this date');
        onSave(); onClose();
      } else toast.error(data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    } finally { setLoading(false); }
  };

  // Min date = today
  const today = new Date().toISOString().split('T')[0];

  return (
    <Modal open={open} onClose={onClose} title="Add Holiday">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
          The 36h production timer will be paused for the entire holiday day (12:00 AM – 11:59 PM). Past dates cannot be added.
        </div>
        <div>
          <label className="label">Holiday date *</label>
          <input
            className="input"
            type="date"
            min={today}
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="label">Description (optional)</label>
          <input
            className="input"
            placeholder="e.g. Diwali, Republic Day…"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
        </div>
        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
          {loading ? 'Adding…' : 'Add Holiday'}
        </button>
      </form>
    </Modal>
  );
};

// ── Main Admin Page ──────────────────────────────────────
const Admin = () => {
  const [users, setUsers] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [deletedDies, setDeletedDies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [tab, setTab] = useState('users');
  const [deletingHoliday, setDeletingHoliday] = useState(null);

  const fetchUsers = async () => {
    try {
      const { data } = await adminAPI.getUsers();
      if (data.success) setUsers(data.data);
    } catch (err) {
      toast.error('Failed to load users');
    } finally { setLoading(false); }
  };

  const fetchHolidays = async () => {
    try {
      const { data } = await adminAPI.getHolidays();
      if (data.success) setHolidays(data.data);
    } catch (err) {
      toast.error('Failed to load holidays');
    }
  };

  const fetchDeletedDies = async () => {
    try {
      const { data } = await dieAPI.getDeleted();
      if (data.success) setDeletedDies(data.data);
    } catch (err) {
      toast.error('Failed to load deleted dies');
    }
  };

  useEffect(() => { fetchUsers(); fetchHolidays(); fetchDeletedDies(); }, []);

  const handleDeleteHoliday = async (id) => {
    setDeletingHoliday(id);
    try {
      const { data } = await adminAPI.deleteHoliday(id);
      if (data.success) { toast.success('Holiday removed'); fetchHolidays(); }
      else toast.error(data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    } finally { setDeletingHoliday(null); }
  };

  const openCreate = () => { setEditUser(null); setModalOpen(true); };
  const openEdit = (u) => { setEditUser(u); setModalOpen(true); };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div>
      <h1 className="text-lg font-bold text-gray-900 mb-4">Admin Panel</h1>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
        {[
          { key: 'users', label: 'Users' },
          { key: 'holidays', label: 'Holidays' },
          { key: 'deleted', label: 'Deleted Dies' },
          { key: 'settings', label: 'Settings' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${tab === t.key ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Users tab */}
      {tab === 'users' && (
        <>
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-gray-500">{users.length} users total</p>
            <button className="btn btn-primary text-xs" onClick={openCreate}>
              <Plus className="w-3 h-3" /> Add user
            </button>
          </div>
          <div className="space-y-2">
            {users.map(u => (
              <div key={u._id} className={`card p-3 flex items-center justify-between gap-3 ${!u.isActive ? 'opacity-50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm text-gray-900">{u.name}</p>
                    <span className="badge badge-blue text-xs">{ROLE_LABELS[u.role] || u.role}</span>
                    {!u.isActive && <span className="badge badge-gray text-xs">Inactive</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    @{u.username}{u.assignedMachine ? ` · ${u.assignedMachine}` : ''}
                  </p>
                </div>
                <button onClick={() => openEdit(u)} className="btn btn-ghost p-2">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Holidays tab */}
      {tab === 'holidays' && (
        <>
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-gray-500">{holidays.length} holiday(s) scheduled</p>
            <button className="btn btn-primary text-xs" onClick={() => setHolidayModalOpen(true)}>
              <Plus className="w-3 h-3" /> Add Holiday
            </button>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-700">
            Holidays pause the 36h production timer for the entire day. The timer resumes automatically the next day.
          </div>

          {holidays.length === 0 ? (
            <div className="py-12 text-center">
              <CalendarOff className="w-10 h-10 mx-auto text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-500">No holidays scheduled</p>
              <p className="text-xs text-gray-400 mt-1">Add a holiday to pause the timer for that day</p>
            </div>
          ) : (
            <div className="space-y-2">
              {holidays.map(h => {
                const holidayDate = new Date(h.date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const isPast = holidayDate < today;
                return (
                  <div key={h._id} className={`card p-3 flex items-center justify-between gap-3 ${isPast ? 'opacity-50' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm text-gray-900">
                          {holidayDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', weekday: 'short' })}
                        </p>
                        {isPast
                          ? <span className="badge badge-gray text-xs">Past</span>
                          : <span className="badge badge-green text-xs">Upcoming</span>
                        }
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{h.description}</p>
                      <p className="text-xs text-gray-400">Added by {h.createdByName}</p>
                    </div>
                    {!isPast && (
                      <button
                        onClick={() => handleDeleteHoliday(h._id)}
                        disabled={deletingHoliday === h._id}
                        className="btn btn-ghost p-2 text-red-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Deleted Dies tab */}
      {tab === 'deleted' && (
        <>
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-gray-500">{deletedDies.length} deleted die(s)</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-4 text-xs text-gray-600">
            Dies deleted by designers/admins are kept here for reference and are not permanently removed.
          </div>
          {deletedDies.length === 0 ? (
            <div className="py-12 text-center">
              <Archive className="w-10 h-10 mx-auto text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-500">No deleted dies</p>
            </div>
          ) : (
            <div className="space-y-2">
              {deletedDies.map(d => (
                <div key={d._id} className="card p-3">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="badge badge-gray font-mono text-xs">{d.dieId}</span>
                    <span className="font-medium text-sm text-gray-900">{d.modelName}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Deleted by {d.deletedByName || '—'} · {fmtDate(d.deletedAt)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Created by {d.createdByName} · {fmtDate(d.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Settings tab */}
      {tab === 'settings' && (
        <div className="space-y-3">
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900 mb-1">Time Budgets</h3>
            <p className="text-xs text-gray-500 mb-3">Configure in backend .env file</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Total die budget</span><span className="font-semibold">36 hours</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Warning alert at</span><span className="font-semibold text-amber-600">30 hours</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Critical alert at</span><span className="font-semibold text-red-600">36 hours</span></div>
              <div className="flex justify-between"><span className="text-gray-600">VMC minimum time</span><span className="font-semibold">14 hours</span></div>
            </div>
          </div>
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900 mb-1">Production Flow</h3>
            <div className="text-xs text-gray-500 space-y-1 mt-2">
              <p>Designer → Programming → VMC Machining → Wirecut → Tool Room (GR2)</p>
              <p>↓ Tool Room sends to GR1</p>
              <p>GR1 Receiver marks received → Flow complete</p>
            </div>
          </div>
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900 mb-1">WhatsApp Alerts</h3>
            <p className="text-xs text-gray-500">Configured in backend .env (up to 5 numbers)</p>
          </div>
        </div>
      )}

      <UserModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        user={editUser}
        onSave={fetchUsers}
      />
      <HolidayModal
        open={holidayModalOpen}
        onClose={() => setHolidayModalOpen(false)}
        onSave={fetchHolidays}
      />
    </div>
  );
};

export default Admin;
