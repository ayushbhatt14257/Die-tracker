import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ClipboardList, History, Clock, Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { dieAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { Spinner, EmptyState, StageBar } from '../components/ui';
import DieCard from '../components/die/DieCard';
import { STAGES, fmtDate, fmtHours } from '../utils/helpers';

const HISTORY_PAGE_SIZE = 5;

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const STAGE_KEYS = [
  { stage: 1, key: 'design',      label: 'Design' },
  { stage: 2, key: 'programming', label: 'Programming' },
  { stage: 3, key: 'vmc',         label: 'VMC Machining' },
  { stage: 4, key: 'wirecut',     label: 'Wirecut' },
  { stage: 5, key: 'toolroom',    label: 'Tool Room' },
];

const fmtTimestamp = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  });
};

const buildStageSummary = (part) => {
  return STAGE_KEYS.map(({ stage, key, label }) => {
    const startLog = part.stageLog?.find(l => l.stage === stage && l.action === 'started');
    const endLog   = part.stageLog?.find(l => l.stage === stage && l.action === 'completed');
    const hours    = part.stageTimes?.[key] || 0;
    if (!startLog) return null;
    return { label, inTime: startLog.timestamp, outTime: endLog?.timestamp || null, hours, by: endLog?.performedByName || startLog?.performedByName };
  }).filter(Boolean);
};

const HistoryDieCard = ({ die }) => {
  const [expanded, setExpanded] = useState(false);
  const isOnTime = die.totalHours && die.totalHours <= 36;

  return (
    <div className={`card border-l-4 ${isOnTime ? 'border-l-green-400' : 'border-l-amber-400'} mb-3 opacity-90`}>
      <div className="px-4 py-3 cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="badge badge-gray font-mono text-xs">{die.dieId}</span>
              {die.priority === 'urgent' && <span className="badge badge-red">Urgent</span>}
              <span className="badge badge-green text-xs">✓ My stage done</span>
            </div>
            <p className="font-semibold text-gray-900 text-sm">{die.modelName}</p>
            <p className="text-xs text-gray-500">{die.designOption} · {die.blockType}</p>
          </div>
          <div className="text-right">
            {die.totalHours && (
              <p className={`text-xs font-semibold ${isOnTime ? 'text-green-600' : 'text-red-500'}`}>
                {fmtHours(die.totalHours)} {isOnTime ? '✓ On time' : '⚠ Over budget'}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-0.5">{expanded ? '▲ Hide detail' : '▼ Show detail'}</p>
          </div>
        </div>

        <div className="mt-2 space-y-1.5">
          {die.parts?.map(p => (
            <div key={p._id}>
              <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                <span className="font-medium">{p.name}</span>
                <span>{p.isCompleted ? '✓ Done' : `Stage ${p.currentStage}: ${STAGES[p.currentStage] || ''}`}</span>
              </div>
              <StageBar currentStage={p.currentStage} status={p.isCompleted ? 'done' : 'ok'} done={p.isCompleted} dieStatus={die.status} />
            </div>
          ))}
        </div>

        <div className="mt-2 flex gap-3 text-xs text-gray-400 flex-wrap">
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Created: {fmtDate(die.createdAt)}</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {die.status === 'in_moulding' ? 'Completed at GR1' : `Now at: ${STAGES[die.parts?.[0]?.currentStage] || ''}`}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-4">
          {die.parts?.map(part => {
            const summary = buildStageSummary(part);
            return (
              <div key={part._id}>
                <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">{part.name}</p>
                <div className="space-y-1">
                  {summary.map(({ label, inTime, outTime, hours, by }) => (
                    <div key={label} className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <span className="text-xs font-medium text-gray-800">{label}</span>
                        <span className="text-xs font-semibold text-gray-700">
                          {hours > 0 ? fmtHours(hours) : outTime ? fmtHours((new Date(outTime) - new Date(inTime)) / 3600000) : '—'}
                        </span>
                      </div>
                      <div className="flex gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                        <span>In: {fmtTimestamp(inTime)}</span>
                        <span>Out: {fmtTimestamp(outTime)}</span>
                        {by && <span>By: {by}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const MyQueue = () => {
  const now = new Date();
  const { user } = useAuth();
  const [tab, setTab] = useState('active');
  const [dies, setDies] = useState([]);
  const [allHistoryDies, setAllHistoryDies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [histMonth, setHistMonth] = useState(now.getMonth() + 1);
  const [histYear, setHistYear] = useState(now.getFullYear());
  const [histMonthActive, setHistMonthActive] = useState(true);
  const [histPage, setHistPage] = useState(1);

  const myStage = {
    programmer: 2,
    vmc_operator: 3,
    wirecut_operator: 4,
    toolroom_head: 5,
    designer: 1,
  }[user?.role];

  const filterMyParts = (allDies) => {
    return allDies.filter(die => {
      const hasPendingPart = die.parts.some(part => {
        if (part.isCompleted) return false;
        if (part.currentStage !== myStage) return false;
        if (user?.role === 'vmc_operator' && part.assignedMachine && part.assignedMachine !== user.assignedMachine) return false;
        return true;
      });
      if (hasPendingPart) return true;
      if (user?.role === 'toolroom_head') {
        const allPartsDone = die.parts.every(p => p.isCompleted);
        if (allPartsDone && die.status === 'active') return true;
      }
      return false;
    });
  };

  const fetchActive = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const { data } = await dieAPI.getAll({ status: 'active', limit: 100 });
      if (data.success) setDies(filterMyParts(data.data));
    } catch (err) {
      toast.error('Failed to load queue');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.role, user?.assignedMachine]);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const { data } = await dieAPI.getMyHistory({ limit: 1000 });
      if (data.success) setAllHistoryDies(data.data);
    } catch (err) {
      toast.error('Failed to load history');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => { fetchActive(); }, [fetchActive]);
  useEffect(() => {
    if (tab === 'history' && allHistoryDies.length === 0) fetchHistory();
  }, [tab]);
  useEffect(() => {
    const interval = setInterval(() => { if (tab === 'active') fetchActive(); }, 20000);
    return () => clearInterval(interval);
  }, [fetchActive, tab]);
  useEffect(() => { setHistPage(1); }, [histMonth, histYear, histMonthActive]);

  const filteredHistory = histMonthActive
    ? allHistoryDies.filter(die => {
        const d = new Date(die.createdAt);
        return d.getMonth() + 1 === histMonth && d.getFullYear() === histYear;
      })
    : allHistoryDies;

  const histTotalPages = Math.max(1, Math.ceil(filteredHistory.length / HISTORY_PAGE_SIZE));
  const pagedHistory = filteredHistory.slice((histPage - 1) * HISTORY_PAGE_SIZE, histPage * HISTORY_PAGE_SIZE);

  const goPrevMonth = () => {
    let m = histMonth - 1, y = histYear;
    if (m < 1) { m = 12; y -= 1; }
    setHistMonth(m); setHistYear(y); setHistMonthActive(true);
  };
  const goNextMonth = () => {
    let m = histMonth + 1, y = histYear;
    if (m > 12) { m = 1; y += 1; }
    setHistMonth(m); setHistYear(y); setHistMonthActive(true);
  };

  const queueLabel = {
    designer: 'Design stage',
    programmer: 'Programming queue',
    vmc_operator: `VMC Queue — ${user?.assignedMachine || 'All machines'}`,
    wirecut_operator: 'Wirecut queue',
    toolroom_head: 'Tool Room',
  }[user?.role] || 'My Queue';

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">{queueLabel}</h1>
          <p className="text-xs text-gray-500">
            {tab === 'active'
              ? `${dies.length} die(s) waiting · Stage ${myStage}: ${STAGES[myStage]}`
              : `${filteredHistory.length} die(s) completed by you${histMonthActive ? ` in ${MONTH_NAMES[histMonth - 1]} ${histYear}` : ' (all time)'}`
            }
          </p>
        </div>
        <button
          onClick={() => tab === 'active' ? fetchActive(true) : fetchHistory()}
          className="btn btn-ghost text-xs"
          disabled={refreshing || historyLoading}
        >
          <RefreshCw className={`w-3 h-3 ${(refreshing || historyLoading) ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
        <button
          onClick={() => setTab('active')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-all ${tab === 'active' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
        >
          <ClipboardList className="w-4 h-4" />
          Active Queue
          {dies.length > 0 && <span className="badge badge-blue text-xs">{dies.length}</span>}
        </button>
        <button
          onClick={() => setTab('history')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-all ${tab === 'history' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
        >
          <History className="w-4 h-4" />
          My History
          {allHistoryDies.length > 0 && <span className="badge badge-gray text-xs">{allHistoryDies.length}</span>}
        </button>
      </div>

      {/* Active tab */}
      {tab === 'active' && (
        <>
          {user?.role === 'programmer' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-xs text-blue-700">
              Pick any die from the queue. When you mark received, the 36-hour clock starts for that part.
            </div>
          )}
          {user?.role === 'vmc_operator' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-700">
              Machine {user?.assignedMachine} · You can have multiple parts running simultaneously. Each tracked independently. Min 14h before marking done.
            </div>
          )}
          {user?.role === 'toolroom_head' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 text-xs text-green-700">
              Mark each part complete individually. Once ALL parts of a die are done, the "Send to GR1 Moulding" button appears.
            </div>
          )}
          {dies.length === 0
            ? <EmptyState icon={ClipboardList} title="Queue empty" subtitle="No parts waiting at your stage right now" />
            : dies.map(die => <DieCard key={die._id} die={die} onRefresh={fetchActive} operatorView={true} />)
          }
        </>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <>
          {/* Month filter */}
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-3 py-2 mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              {histMonthActive ? (
                <div className="flex items-center gap-1">
                  <button onClick={goPrevMonth} className="p-1 text-gray-400 hover:text-gray-700">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium text-gray-800 min-w-[120px] text-center">
                    {MONTH_NAMES[histMonth - 1]} {histYear}
                  </span>
                  <button onClick={goNextMonth} className="p-1 text-gray-400 hover:text-gray-700">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <span className="text-sm font-medium text-gray-500">All time data</span>
              )}
            </div>
            {histMonthActive ? (
              <button onClick={() => setHistMonthActive(false)} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                <X className="w-3 h-3" /> Show all
              </button>
            ) : (
              <button onClick={() => { setHistMonth(now.getMonth() + 1); setHistYear(now.getFullYear()); setHistMonthActive(true); }} className="text-xs text-blue-600 hover:text-blue-800">
                Current month
              </button>
            )}
          </div>

          {/* Summary */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 mb-3 flex items-center justify-between">
            <span className="text-xs text-gray-600">
              {histMonthActive ? `${MONTH_NAMES[histMonth - 1]} ${histYear}` : 'All time'}:{' '}
              <span className="font-semibold text-gray-900">{filteredHistory.length} dies</span> completed
            </span>
            {allHistoryDies.length !== filteredHistory.length && (
              <span className="text-xs text-gray-400">All time: {allHistoryDies.length}</span>
            )}
          </div>

          {historyLoading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : filteredHistory.length === 0 ? (
            <EmptyState icon={History} title="No history" subtitle={histMonthActive ? `No dies completed in ${MONTH_NAMES[histMonth - 1]} ${histYear}` : 'No dies completed yet'} />
          ) : (
            <>
              {pagedHistory.map(die => <HistoryDieCard key={die._id} die={die} />)}

              {filteredHistory.length > HISTORY_PAGE_SIZE && (
                <div className="flex items-center justify-between mt-4 px-1">
                  <p className="text-xs text-gray-500">
                    Showing {(histPage - 1) * HISTORY_PAGE_SIZE + 1}–{Math.min(histPage * HISTORY_PAGE_SIZE, filteredHistory.length)} of {filteredHistory.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setHistPage(p => Math.max(1, p - 1))} disabled={histPage === 1} className="btn btn-ghost text-xs disabled:opacity-30">
                      <ChevronLeft className="w-3 h-3" /> Prev
                    </button>
                    <span className="text-xs text-gray-600 font-medium">Page {histPage} of {histTotalPages}</span>
                    <button onClick={() => setHistPage(p => Math.min(histTotalPages, p + 1))} disabled={histPage === histTotalPages} className="btn btn-ghost text-xs disabled:opacity-30">
                      Next <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default MyQueue;
