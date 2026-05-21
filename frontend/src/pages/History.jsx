import { useState, useEffect } from 'react';
import { Search, Calendar, Clock, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { dieAPI } from '../api';
import { Spinner, EmptyState } from '../components/ui';
import { fmtDate, fmtHours } from '../utils/helpers';
import toast from 'react-hot-toast';

const HistoryCard = ({ die }) => {
  const isOnTime = die.totalHours && die.totalHours <= 36;
  const borderColor = isOnTime ? 'border-l-green-500' : 'border-l-red-400';

  return (
    <div className={`card border-l-4 ${borderColor} mb-3`}>
      <div className="px-4 py-3">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="badge badge-gray font-mono text-xs">{die.dieId}</span>
              {die.priority === 'urgent' && <span className="badge badge-red">Urgent</span>}
              <span className="badge badge-purple">✅ Completed</span>
            </div>
            <p className="font-semibold text-gray-900">{die.modelName}</p>
            <p className="text-xs text-gray-500">{die.designOption} · {die.blockType} · {die.parts?.length} parts</p>
          </div>
          {die.totalHours && (
            <div className="text-right">
              <p className={`text-sm font-bold ${isOnTime ? 'text-green-600' : 'text-red-600'}`}>
                {fmtHours(die.totalHours)}
              </p>
              <p className={`text-xs ${isOnTime ? 'text-green-500' : 'text-red-500'}`}>
                {isOnTime ? '✓ On time' : '⚠ Over budget'}
              </p>
            </div>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>Created: {fmtDate(die.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-green-500" />
            <span>Completed: {fmtDate(die.receivedAtGR1At || die.sentToMouldingAt)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Total: {die.totalHours ? fmtHours(die.totalHours) : '—'}</span>
          </div>
          {die.receivedAtGR1By && (
            <div className="flex items-center gap-1">
              <span>Received by: {die.receivedAtGR1By}</span>
            </div>
          )}
        </div>

        {/* Parts summary */}
        <div className="mt-2 flex gap-2 flex-wrap">
          {die.parts?.map(p => (
            <div key={p._id} className="bg-green-50 border border-green-200 rounded-lg px-2 py-1 text-xs">
              <span className="font-medium text-green-800">{p.name}</span>
              {p.stageTimes?.vmc > 0 && (
                <span className="text-green-600 ml-1">· VMC {fmtHours(p.stageTimes.vmc)}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const History = () => {
  const [dies, setDies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchData = async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const params = { search, limit: 100 };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const { data } = await dieAPI.getHistory(params);
      if (data.success) setDies(data.data);
    } catch (err) {
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, [search, startDate, endDate]);

  const onTime = dies.filter(d => d.totalHours && d.totalHours <= 36).length;
  const overBudget = dies.filter(d => d.totalHours && d.totalHours > 36).length;

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Completed Dies History</h1>
          <p className="text-xs text-gray-500">
            {dies.length} completed · {onTime} on time · {overBudget} over budget
          </p>
        </div>
        <button onClick={() => fetchData(true)} className="btn btn-ghost text-xs" disabled={refreshing}>
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-gray-900">{dies.length}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
        <div className="card p-3 text-center bg-green-50">
          <p className="text-2xl font-bold text-green-700">{onTime}</p>
          <p className="text-xs text-green-600">On Time</p>
        </div>
        <div className="card p-3 text-center bg-red-50">
          <p className="text-2xl font-bold text-red-700">{overBudget}</p>
          <p className="text-xs text-red-600">Over Budget</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9 text-sm"
            placeholder="Search model, die ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <input
          className="input text-sm w-36"
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          placeholder="From date"
        />
        <input
          className="input text-sm w-36"
          type="date"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          placeholder="To date"
        />
        {(startDate || endDate || search) && (
          <button
            className="btn btn-ghost text-xs"
            onClick={() => { setSearch(''); setStartDate(''); setEndDate(''); }}
          >
            Clear
          </button>
        )}
      </div>

      {dies.length === 0
        ? <EmptyState icon={CheckCircle} title="No completed dies yet" subtitle="Dies will appear here once they are received at GR1 Moulding" />
        : dies.map(die => <HistoryCard key={die._id} die={die} />)
      }
    </div>
  );
};

export default History;
