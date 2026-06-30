import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ClipboardList, History, Clock, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { dieAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { Spinner, EmptyState, StageBar, StageDots } from '../components/ui';
import DieCard from '../components/die/DieCard';
import { STAGES, fmtDate, fmtHours } from '../utils/helpers';

const HistoryDieCard = ({ die }) => {
  const isOnTime = die.totalHours && die.totalHours <= 36;
  return (
    <div className={`card border-l-4 ${isOnTime ? 'border-l-green-400' : 'border-l-amber-400'} mb-3 opacity-80`}>
      <div className="px-4 py-3">
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
          {die.totalHours && (
            <p className={`text-xs font-semibold ${isOnTime ? 'text-green-600' : 'text-red-500'}`}>
              {fmtHours(die.totalHours)} {isOnTime ? '✓' : '⚠'}
            </p>
          )}
        </div>

        {/* Stage bars for each part */}
        <div className="mt-2 space-y-2">
          {die.parts?.map(p => (
            <div key={p._id}>
              <div className="flex items-center justify-between text-xs text-gray-500 mb-0.5">
                <span className="font-medium">{p.name}</span>
                <span>{p.isCompleted ? '✓ Done' : `Stage ${p.currentStage}: ${STAGES[p.currentStage] || ''}`}</span>
              </div>
              <StageBar
                currentStage={p.currentStage}
                status={p.isCompleted ? 'done' : 'ok'}
                done={p.isCompleted}
                dieStatus={die.status}
              />
            </div>
          ))}
        </div>

        <div className="mt-2 flex gap-3 text-xs text-gray-400 flex-wrap">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />Created: {fmtDate(die.createdAt)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {die.status === 'in_moulding' ? 'Completed at GR1' : `Now at: ${STAGES[die.parts?.[0]?.currentStage] || 'Stage ' + die.parts?.[0]?.currentStage}`}
          </span>
        </div>
      </div>
    </div>
  );
};

const MyQueue = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState('active');
  const [dies, setDies] = useState([]);
  const [historyDies, setHistoryDies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const myStage = {
    programmer: 2,
    vmc_operator: 3,
    wirecut_operator: 4,
    toolroom_head: 5,
    designer: 1,
  }[user?.role];

  const filterMyParts = (allDies) => {
    return allDies.filter(die => {
      // Normal case: a part is waiting at this user's stage
      const hasPendingPart = die.parts.some(part => {
        if (part.isCompleted) return false;
        if (part.currentStage !== myStage) return false;
        if (user?.role === 'vmc_operator' && part.assignedMachine && part.assignedMachine !== user.assignedMachine) return false;
        return true;
      });
      if (hasPendingPart) return true;

      // Tool Room Head special case: keep die visible after all parts are
      // completed so the "Send to GR1 Moulding" dispatch button still shows
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
      const { data } = await dieAPI.getMyHistory({ limit: 100 });
      if (data.success) setHistoryDies(data.data);
    } catch (err) {
      toast.error('Failed to load history');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => { fetchActive(); }, [fetchActive]);

  useEffect(() => {
    if (tab === 'history' && historyDies.length === 0) fetchHistory();
  }, [tab]);

  useEffect(() => {
    const interval = setInterval(() => { if (tab === 'active') fetchActive(); }, 20000);
    return () => clearInterval(interval);
  }, [fetchActive, tab]);

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
              : `${historyDies.length} die(s) completed by you`
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
          {dies.length > 0 && (
            <span className="badge badge-blue text-xs">{dies.length}</span>
          )}
        </button>
        <button
          onClick={() => setTab('history')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-all ${tab === 'history' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
        >
          <History className="w-4 h-4" />
          My History
          {historyDies.length > 0 && (
            <span className="badge badge-gray text-xs">{historyDies.length}</span>
          )}
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
            : dies.map(die => (
              <DieCard key={die._id} die={die} onRefresh={fetchActive} operatorView={true} />
            ))
          }
        </>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <>
          {historyLoading
            ? <div className="flex justify-center py-10"><Spinner /></div>
            : historyDies.length === 0
              ? <EmptyState icon={History} title="No history yet" subtitle="Dies you complete will appear here once they move to the next stage" />
              : historyDies.map(die => <HistoryDieCard key={die._id} die={die} />)
          }
        </>
      )}
    </div>
  );
};

export default MyQueue;