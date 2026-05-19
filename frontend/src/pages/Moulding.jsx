import { useState, useEffect } from 'react';
import { Factory, Clock, User, RefreshCw, Truck, CheckCircle2, Circle } from 'lucide-react';
import toast from 'react-hot-toast';
import { dieAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/ui';
import { fmtDate, fmtHours } from '../utils/helpers';

const FlowLine = ({ step }) => {
  const steps = [
    { label: 'GR2 Tool Room\nComplete', done: step >= 1 },
    { label: 'Dispatched\nto GR1', done: step >= 1 },
    { label: 'Received\nat GR1', done: step >= 2 },
  ];
  return (
    <div className="flex items-start gap-0 my-3">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center flex-1">
          <div className="flex flex-col items-center flex-shrink-0">
            {s.done
              ? <CheckCircle2 className="w-5 h-5 text-green-500" />
              : <Circle className="w-5 h-5 text-gray-300" />
            }
            <span className={`text-center mt-1 leading-tight whitespace-pre-line text-xs ${s.done ? 'text-green-700 font-medium' : 'text-gray-400'}`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-1 mt-[-10px] ${s.done ? 'bg-green-400' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
};

const MouldingCard = ({ die, onRefresh, canReceive, isTransit }) => {
  const [receiving, setReceiving] = useState(false);

  // Show receive button if:
  // 1. in_transit (normal flow), OR
  // 2. in_moulding but no receivedAtGR1By (old die, needs confirmation)
  const needsReceive = isTransit || (die.status === 'in_moulding' && !die.receivedAtGR1By);
  const isFullyComplete = die.status === 'in_moulding' && die.receivedAtGR1By;

  const handleReceive = async () => {
    setReceiving(true);
    try {
      const { data } = await dieAPI.receiveAtGR1(die._id);
      if (data.success) {
        toast.success(`${die.dieId} received at GR1 Moulding — flow complete!`);
        onRefresh();
      } else toast.error(data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    } finally { setReceiving(false); }
  };

  const borderColor = isFullyComplete ? 'border-l-purple-500' : 'border-l-orange-400';
  const step = isFullyComplete ? 2 : 1;

  return (
    <div className={`card border-l-4 ${borderColor} mb-3`}>
      <div className="px-4 py-3">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-2 mb-2">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="badge badge-gray font-mono text-xs">{die.dieId}</span>
              {isFullyComplete
                ? <span className="badge badge-purple">✅ At GR1 Moulding</span>
                : <span className="badge bg-orange-100 text-orange-800">🚚 {isTransit ? 'In Transit' : 'Pending Confirmation'}</span>
              }
              {die.priority === 'urgent' && <span className="badge badge-red">Urgent</span>}
            </div>
            <p className="font-semibold text-gray-900">{die.modelName}</p>
            <p className="text-xs text-gray-500">{die.designOption} · {die.blockType}</p>
          </div>
          {die.totalHours && (
            <p className={`text-xs font-semibold ${die.totalHours <= 36 ? 'text-green-600' : 'text-red-600'}`}>
              {fmtHours(die.totalHours)} total · {die.totalHours <= 36 ? '✓ On time' : '⚠ Over budget'}
            </p>
          )}
        </div>

        {/* Flow line */}
        <FlowLine step={step} />

        {/* Parts */}
        <div className="flex gap-2 flex-wrap mb-3">
          {die.parts.map(p => (
            <div key={p._id} className={`border rounded-lg px-2 py-1 text-xs ${isFullyComplete ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              <span className={`font-medium ${isFullyComplete ? 'text-green-800' : 'text-gray-800'}`}>{p.name}</span>
              {p.stageTimes?.vmc > 0 && (
                <span className={`ml-1 ${isFullyComplete ? 'text-green-600' : 'text-gray-500'}`}>· VMC {fmtHours(p.stageTimes.vmc)}</span>
              )}
            </div>
          ))}
        </div>

        {/* Dispatch info */}
        <div className="flex justify-between text-xs text-gray-500 mb-3 flex-wrap gap-1">
          <span className="flex items-center gap-1">
            <Truck className="w-3 h-3" />
            Dispatched by: <span className="font-medium text-gray-700 ml-1">{die.sentToGR1By || die.sentToMouldingBy || '—'}</span>
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />{fmtDate(die.sentToGR1At || die.sentToMouldingAt)}
          </span>
        </div>

        {/* Receive button — show if needs receive AND canReceive */}
        {needsReceive && canReceive && (
          <button
            className="btn w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3"
            onClick={handleReceive}
            disabled={receiving}
          >
            <CheckCircle2 className="w-4 h-4" />
            {receiving ? 'Processing…' : 'Mark Received at GR1 Moulding'}
          </button>
        )}

        {/* Waiting message if needs receive but can't act */}
        {needsReceive && !canReceive && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl py-3 text-center text-xs text-orange-700 font-medium">
            ⏳ Waiting for GR1 Moulding Receiver to confirm receipt
          </div>
        )}

        {/* Completion info */}
        {isFullyComplete && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3">
            <p className="text-xs font-semibold text-green-800 mb-1">🏭 Production flow complete</p>
            <div className="flex justify-between text-xs text-green-700 flex-wrap gap-1">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />Received by: {die.receivedAtGR1By}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />{fmtDate(die.receivedAtGR1At)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Moulding = () => {
  const { isOwner, isGR1Receiver } = useAuth();
  const [dies, setDies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const { data } = await dieAPI.getMoulding();
      if (data.success) setDies(data.data);
    } catch (err) {
      toast.error('Failed to load moulding data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, []);

  const canReceive = isGR1Receiver || isOwner;

  // In transit = awaiting GR1 confirmation
  const transitDies = dies.filter(d => d.status === 'in_transit');
  // Old in_moulding without receivedAtGR1By also need confirmation
  const pendingConfirmDies = dies.filter(d => d.status === 'in_moulding' && !d.receivedAtGR1By);
  // Fully complete = in_moulding with receivedAtGR1By
  const receivedDies = dies.filter(d => d.status === 'in_moulding' && d.receivedAtGR1By);

  const awaitingDies = [...transitDies, ...pendingConfirmDies];

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">GR1 Moulding Department</h1>
          <p className="text-xs text-gray-500">
            {awaitingDies.length} awaiting confirmation · {receivedDies.length} received at GR1
          </p>
        </div>
        <button onClick={() => fetchData(true)} className="btn btn-ghost text-xs" disabled={refreshing}>
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Awaiting GR1 Receive */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Truck className="w-4 h-4 text-orange-500" />
          <h2 className="text-sm font-semibold text-gray-800">Awaiting GR1 Receive</h2>
          {awaitingDies.length > 0 && (
            <span className="badge bg-orange-100 text-orange-700 font-bold">{awaitingDies.length}</span>
          )}
        </div>
        {awaitingDies.length === 0 ? (
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-center text-xs text-orange-500">
            No dies currently awaiting GR1 confirmation
          </div>
        ) : (
          awaitingDies.map(die => (
            <MouldingCard
              key={die._id}
              die={die}
              onRefresh={fetchData}
              canReceive={canReceive}
              isTransit={die.status === 'in_transit'}
            />
          ))
        )}
      </div>

      {/* Received at GR1 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Factory className="w-4 h-4 text-purple-500" />
          <h2 className="text-sm font-semibold text-gray-800">Received at GR1 Moulding</h2>
          {receivedDies.length > 0 && (
            <span className="badge badge-purple font-bold">{receivedDies.length}</span>
          )}
        </div>
        {receivedDies.length === 0 ? (
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-center text-xs text-purple-500">
            No dies confirmed received at GR1 yet
          </div>
        ) : (
          receivedDies.map(die => (
            <MouldingCard
              key={die._id}
              die={die}
              onRefresh={fetchData}
              canReceive={canReceive}
              isTransit={false}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default Moulding;
