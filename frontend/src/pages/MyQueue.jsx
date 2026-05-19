import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';
import { dieAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { Spinner, EmptyState } from '../components/ui';
import DieCard from '../components/die/DieCard';
import { STAGES } from '../utils/helpers';

const MyQueue = () => {
  const { user } = useAuth();
  const [dies, setDies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Determine which stage this operator works on
  const myStage = {
    programmer: 2,
    vmc_operator: 3,
    wirecut_operator: 4,
    toolroom_head: 5,
    designer: 1,
  }[user?.role];

  const filterMyParts = (allDies) => {
    // Filter dies that have at least one part at my stage
    return allDies.filter(die =>
      die.parts.some(part => {
        if (part.isCompleted) return false;
        if (part.currentStage !== myStage) return false;
        // VMC: only show parts on my machine
        if (user?.role === 'vmc_operator' && part.assignedMachine && part.assignedMachine !== user.assignedMachine) return false;
        return true;
      })
    );
  };

  const fetchData = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const { data } = await dieAPI.getAll({ status: 'active', limit: 100 });
      if (data.success) {
        setDies(filterMyParts(data.data));
      }
    } catch (err) {
      toast.error('Failed to load queue');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.role, user?.assignedMachine]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 20 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchData(), 20000);
    return () => clearInterval(interval);
  }, [fetchData]);

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
          <p className="text-xs text-gray-500">{dies.length} die(s) waiting · Stage {myStage}: {STAGES[myStage]}</p>
        </div>
        <button onClick={() => fetchData(true)} className="btn btn-ghost text-xs" disabled={refreshing}>
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Info banner for programmer */}
      {user?.role === 'programmer' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-xs text-blue-700">
          Pick any die from the queue. When you mark received, the 36-hour clock starts for that part.
        </div>
      )}

      {/* Info banner for VMC */}
      {user?.role === 'vmc_operator' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-700">
          Machine {user?.assignedMachine} · You can have multiple parts running simultaneously. Each tracked independently. Min 14h before marking done.
        </div>
      )}

      {/* Info banner for tool room */}
      {user?.role === 'toolroom_head' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 text-xs text-green-700">
          Mark each part complete individually. Once ALL parts of a die are done, the "Send to Moulding" button appears.
        </div>
      )}

      {dies.length === 0
        ? <EmptyState icon={ClipboardList} title="Queue empty" subtitle="No parts waiting at your stage right now" />
        : dies.map(die => (
          <DieCard key={die._id} die={die} onRefresh={fetchData} operatorView={true} />
        ))
      }
    </div>
  );
};

export default MyQueue;
