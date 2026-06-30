import { useState, useEffect, useCallback } from 'react';
import { Factory, Clock, TrendingDown, AlertTriangle, CheckCircle, RefreshCw, Search, X, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { dieAPI } from '../api';
import { Spinner, EmptyState } from '../components/ui';
import DieCard from '../components/die/DieCard';
import toast from 'react-hot-toast';

const PAGE_SIZE = 5;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const StatCard = ({ label, value, color, icon: Icon, onClick, active }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    red: 'bg-red-50 text-red-700 border-red-100',
  };
  return (
    <div
      onClick={onClick}
      className={`card p-4 border cursor-pointer transition-all select-none
        ${colors[color]}
        ${active ? 'ring-2 ring-offset-1 ring-current shadow-md scale-[1.02]' : 'hover:shadow-md hover:scale-[1.01]'}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium opacity-70">{label}</p>
          <p className="text-2xl font-bold mt-0.5">{value ?? '—'}</p>
        </div>
        <Icon className="w-6 h-6 opacity-40" />
      </div>
      {active && <p className="text-xs mt-1 opacity-60">Filtered ↓</p>}
    </div>
  );
};

const Dashboard = () => {
  const now = new Date();

  const [stats, setStats] = useState(null);
  const [allDies, setAllDies] = useState([]); // all fetched dies, unfiltered
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState('active'); // active | in_transit | in_moulding | all
  const [statusFilter, setStatusFilter] = useState(''); // onTrack | delayed | overdue | ''
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Month filter — defaults to current month/year
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [year, setYear] = useState(now.getFullYear());
  const [monthActive, setMonthActive] = useState(true); // true = filtering by month, false = all-time

  const [page, setPage] = useState(1);

  const fetchData = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const dateParams = monthActive ? { month, year } : {};
      const [statsRes, diesRes] = await Promise.all([
        dieAPI.getStats(dateParams),
        dieAPI.getAll({ status: statusTab, search, limit: 1000, ...dateParams }),
      ]);
      if (statsRes.data.success) setStats(statsRes.data.data);
      if (diesRes.data.success) setAllDies(diesRes.data.data);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusTab, search, monthActive, month, year]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1); }, [statusTab, statusFilter, search, monthActive, month, year]);

  // Filter dies on the frontend based on statusFilter
  const filteredDies = (() => {
    if (!statusFilter) return allDies;
    const map = { onTrack: 'ok', delayed: 'slow', overdue: 'over' };
    const target = map[statusFilter];
    return allDies.filter(die => die.overallStatus === target);
  })();

  const totalPages = Math.max(1, Math.ceil(filteredDies.length / PAGE_SIZE));
  const pagedDies = filteredDies.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleCardClick = (cardFilter) => {
    setStatusTab('active');
    setStatusFilter(prev => prev === cardFilter ? '' : cardFilter);
  };

  const clearFilter = () => setStatusFilter('');

  const handleClearMonthFilter = () => {
    setMonthActive(false);
  };

  const handleMonthChange = (newMonth, newYear) => {
    setMonth(newMonth);
    setYear(newYear);
    setMonthActive(true);
  };

  const goPrevMonth = () => {
    let m = month - 1, y = year;
    if (m < 1) { m = 12; y -= 1; }
    handleMonthChange(m, y);
  };

  const goNextMonth = () => {
    let m = month + 1, y = year;
    if (m > 12) { m = 1; y += 1; }
    handleMonthChange(m, y);
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-900">Live Die Pipeline</h1>
        <button onClick={() => fetchData(true)} className="btn btn-ghost text-xs" disabled={refreshing}>
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Month filter bar */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-3 py-2 mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          {monthActive ? (
            <div className="flex items-center gap-1">
              <button onClick={goPrevMonth} className="p-1 text-gray-400 hover:text-gray-700">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-gray-800 min-w-[120px] text-center">
                {MONTH_NAMES[month - 1]} {year}
              </span>
              <button onClick={goNextMonth} className="p-1 text-gray-400 hover:text-gray-700">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <span className="text-sm font-medium text-gray-500">Showing all-time data</span>
          )}
        </div>
        {monthActive ? (
          <button onClick={handleClearMonthFilter} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
            <X className="w-3 h-3" /> Clear filter (show all)
          </button>
        ) : (
          <button
            onClick={() => handleMonthChange(now.getMonth() + 1, now.getFullYear())}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Jump to current month
          </button>
        )}
      </div>

      {/* KPI tiles */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <StatCard
            label="Active Dies" value={stats.active} color="blue" icon={Clock}
            onClick={() => { setStatusTab('active'); setStatusFilter(''); }}
            active={statusTab === 'active' && !statusFilter}
          />
          <StatCard
            label="On Track" value={stats.onTrack} color="green" icon={CheckCircle}
            onClick={() => handleCardClick('onTrack')}
            active={statusFilter === 'onTrack'}
          />
          <StatCard
            label="Delayed" value={stats.delayed} color="amber" icon={TrendingDown}
            onClick={() => handleCardClick('delayed')}
            active={statusFilter === 'delayed'}
          />
          <StatCard
            label="Overdue" value={stats.overdue} color="red" icon={AlertTriangle}
            onClick={() => handleCardClick('overdue')}
            active={statusFilter === 'overdue'}
          />
        </div>
      )}

      {/* Active status filter banner */}
      {statusFilter && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 mb-3">
          <span className="text-xs text-blue-700 font-medium">
            Showing: {statusFilter === 'onTrack' ? 'On Track' : statusFilter === 'delayed' ? 'Delayed' : 'Overdue'} dies only
            {' '}({filteredDies.length} of {allDies.length})
          </span>
          <button onClick={clearFilter} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
            <X className="w-3 h-3" /> Clear filter
          </button>
        </div>
      )}

      {/* Search + status tabs */}
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
        {[
          { key: 'active', label: 'Active' },
          { key: 'in_transit', label: 'In Transit' },
          { key: 'in_moulding', label: 'In Moulding' },
          { key: 'all', label: 'All' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => { setStatusTab(f.key); setStatusFilter(''); }}
            className={`btn text-xs ${statusTab === f.key && !statusFilter ? 'btn-primary' : 'btn-ghost'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filteredDies.length === 0
        ? <EmptyState icon={Factory} title="No dies found" subtitle={statusFilter || monthActive ? 'No dies match this filter' : 'Change filters or create a new die'} />
        : pagedDies.map(die => <DieCard key={die._id} die={die} onRefresh={fetchData} />)
      }

      {/* Pagination */}
      {filteredDies.length > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-xs text-gray-500">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredDies.length)} of {filteredDies.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn btn-ghost text-xs disabled:opacity-30"
            >
              <ChevronLeft className="w-3 h-3" /> Prev
            </button>
            <span className="text-xs text-gray-600 font-medium">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn btn-ghost text-xs disabled:opacity-30"
            >
              Next <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
