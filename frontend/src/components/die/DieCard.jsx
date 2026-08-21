import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Clock, MapPin, User, Factory, Truck, CheckCircle2, Pencil, Trash2, Copy, History as HistoryIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { StatusBadge, StageBar, StageDots, Modal, ManagedOptionList } from '../ui';
import { fmtHours, fmtDate, STAGES, getPartBorderColor } from '../../utils/helpers';
import { dieAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';

const formatModelName = (value) =>
  value.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');

const PartRow = ({ die, part, onRefresh, operatorView = false }) => {
  const { user, isOwner } = useAuth();
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueText, setIssueText] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const canAct = operatorView || isOwner;
  const isAtVMC = part.currentStage === 3;
  const isVMCOperator = user?.role === 'vmc_operator';

  const handleAdvance = async () => {
    setLoading(true);
    try {
      const payload = {};
      if (part.currentStage === 2) payload.machine = user.assignedMachine;
      const { data } = await dieAPI.advancePart(die._id, part._id, payload);
      if (data.success) { toast.success(`${part.name} advanced`); onRefresh(); }
      else toast.error(data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    } finally { setLoading(false); }
  };

  const handleCompleteToolroom = async () => {
    setLoading(true);
    try {
      const { data } = await dieAPI.completeToolroom(die._id, part._id);
      if (data.success) { toast.success(`${part.name} completed at Tool Room`); onRefresh(); }
      else toast.error(data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    } finally { setLoading(false); }
  };

  const handleReportIssue = async () => {
    if (!issueText.trim()) return toast.error('Describe the issue');
    setLoading(true);
    try {
      const { data } = await dieAPI.reportIssue(die._id, part._id, { description: issueText });
      if (data.success) {
        toast.success('Issue reported — WhatsApp sent');
        setIssueText(''); setIssueOpen(false); onRefresh();
      } else toast.error(data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    } finally { setLoading(false); }
  };

  const openIssues = part.issues?.filter(i => !i.isResolved) || [];
  const borderColor = getPartBorderColor(part.status);

  const getAdvanceLabel = () => {
    if (part.currentStage === 1) return 'Mark Design Complete → Programming Queue';
    if (part.currentStage === 2) return 'Mark Received → Start Programming (36h clock starts)';
    if (part.currentStage === 3) {
      if (!part.canMarkVmcDone) return 'Mark VMC Complete → Send to Wirecut (min time not reached)';
      return 'Mark VMC Complete → Send to Wirecut';
    }
    if (part.currentStage === 4) return 'Mark Wirecut Complete → Send to Tool Room';
    return '';
  };

  const canAdvance = () => {
    if (part.isCompleted || part.currentStage >= 5) return false;
    if (part.currentStage === 3 && !part.canMarkVmcDone) return false;
    if (user?.role === 'designer' && part.currentStage !== 1) return false;
    if (user?.role === 'programmer' && part.currentStage !== 2) return false;
    if (user?.role === 'vmc_operator' && part.currentStage !== 3) return false;
    if (user?.role === 'wirecut_operator' && part.currentStage !== 4) return false;
    if (user?.role === 'toolroom_head') return false;
    return true;
  };

  return (
    <div className={`border-l-4 ${borderColor} bg-gray-50 rounded-r-lg p-3 mb-2`}>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="badge badge-blue font-bold">{part.name}</span>
          {part.isCompleted
            ? <span className="badge badge-green">✓ Complete</span>
            : <StatusBadge status={part.status} />
          }
          {openIssues.length > 0 && (
            <span className="badge badge-red">{openIssues.length} issue{openIssues.length > 1 ? 's' : ''}</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {/* Hide timer for VMC operator at VMC stage */}
          {part.clockStartedAt && !part.isCompleted && !(isAtVMC && isVMCOperator) && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {fmtHours(part.elapsedHours)} / 36h
            </span>
          )}
          <button onClick={() => setExpanded(!expanded)} className="text-gray-400">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <StageBar
        currentStage={part.currentStage}
        status={part.status}
        done={part.isCompleted}
        dieStatus={die.status}
      />
      <StageDots />

      {!part.isCompleted && (
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500 flex-wrap gap-1">
          <span className="font-medium text-gray-700">{STAGES[part.currentStage]}</span>
          {part.assignedMachine && (
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{part.assignedMachine}</span>
          )}
          {part.assignedOperator?.name && (
            <span className="flex items-center gap-1"><User className="w-3 h-3" />{part.assignedOperator.name}</span>
          )}
          {/* Hide stage elapsed and ETA for VMC operators at VMC stage */}
          {!(isAtVMC && isVMCOperator) && part.elapsedHours > 0 && (
            <span>Stage: {fmtHours(part.stageElapsedHours)}</span>
          )}
          {!(isAtVMC && isVMCOperator) && part.eta && (
            <span className="text-blue-600">ETA: {new Date(part.eta).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short' })}</span>
          )}
        </div>
      )}

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-gray-200 pt-3">
          {part.stageTimes && Object.entries(part.stageTimes).filter(([, v]) => v > 0).map(([stage, hours]) => (
            <div key={stage} className="flex justify-between text-xs">
              <span className="text-gray-500 capitalize">{stage}</span>
              <span className="font-medium">{fmtHours(hours)}</span>
            </div>
          ))}
          {openIssues.map(issue => (
            <div key={issue._id} className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs">
              <p className="font-medium text-red-700">{issue.stageName}</p>
              <p className="text-red-600">{issue.description}</p>
              <p className="text-red-400">{issue.reportedByName} · {fmtDate(issue.createdAt)}</p>
            </div>
          ))}
          {part.stageLog?.length > 0 && (
            <div className="pt-1">
              <p className="flex items-center gap-1 text-xs font-medium text-gray-500 mb-1.5">
                <HistoryIcon className="w-3 h-3" /> Stage history
              </p>
              <div className="space-y-1.5 border-l-2 border-gray-200 ml-1 pl-3">
                {[...part.stageLog].reverse().map((log, i) => (
                  <div key={i} className="relative text-xs">
                    <span className="absolute -left-[17px] top-1 w-2 h-2 rounded-full bg-gray-300" />
                    <span className="text-gray-700 font-medium">{log.stageName}</span>
                    <span className="text-gray-400"> — {log.action}</span>
                    <p className="text-gray-400">{log.performedByName} · {fmtDate(log.timestamp)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {canAct && !part.isCompleted && (
        <div className="mt-3 space-y-2">
          {canAdvance() && (
            <button
              className="btn btn-success w-full text-xs"
              onClick={handleAdvance}
              disabled={loading || (part.currentStage === 3 && !part.canMarkVmcDone)}
            >
              {getAdvanceLabel()}
            </button>
          )}

          {part.currentStage === 5 && (user?.role === 'toolroom_head' || isOwner) && (
            <button className="btn btn-success w-full text-xs" onClick={handleCompleteToolroom} disabled={loading}>
              Mark {part.name} Complete at Tool Room
            </button>
          )}

          {/* Hide VMC time remaining from VMC operators */}
          {part.currentStage === 3 && !part.canMarkVmcDone && !isVMCOperator && (
            <div className="text-xs text-center text-amber-700 bg-amber-50 rounded-lg py-1.5 px-2">
              Minimum 14h VMC time not reached.{' '}
              {fmtHours(Math.max(0, (part.vmcMinHours || 14) - part.stageElapsedHours))} remaining.
            </div>
          )}

          {/* For VMC operator: just show that min time not reached without the countdown */}
          {part.currentStage === 3 && !part.canMarkVmcDone && isVMCOperator && (
            <div className="text-xs text-center text-amber-700 bg-amber-50 rounded-lg py-1.5 px-2">
              Minimum machining time not yet reached.
            </div>
          )}

          <button
            className="btn btn-ghost w-full text-xs text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => setIssueOpen(!issueOpen)}
          >
            <AlertTriangle className="w-3 h-3" />
            Report an issue with {part.name}
          </button>

          {issueOpen && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-red-700">Describe the issue — WhatsApp will fire immediately</p>
              <textarea
                className="input text-xs resize-none"
                rows={3}
                placeholder="e.g. Tool broke, machine vibration, material defect…"
                value={issueText}
                onChange={e => setIssueText(e.target.value)}
              />
              <button className="btn btn-danger w-full text-xs" onClick={handleReportIssue} disabled={loading}>
                Send Issue Report + WhatsApp Alert
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const DieCard = ({ die, onRefresh, operatorView = false, compact = false }) => {
  const { isOwner, isGR1Receiver, user } = useAuth();
  const [expanded, setExpanded] = useState(!compact);
  const [sendingToMoulding, setSendingToMoulding] = useState(false);
  const [receivingGR1, setReceivingGR1] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    modelName: die.modelName,
    sentBy: die.sentBy || '',
    checkDimensionSOP: !!die.checkDimensionSOP,
    designPlanning: die.designPlanning || [],
    master: die.master || '',
    priority: die.priority,
    notes: die.notes || '',
    parts: die.parts.map(p => p.name),
  });

  // Can edit/delete only if ALL parts still at stage 1
  const canEditDelete = (isOwner || user?.role === 'designer') &&
    die.status === 'active' &&
    die.parts.every(p => p.currentStage === 1 && !p.isCompleted);

  const handleEdit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      const { data } = await dieAPI.update(die._id, editForm);
      if (data.success) {
        toast.success(`${die.dieId} updated`);
        setEditOpen(false);
        onRefresh();
      } else toast.error(data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating die');
    } finally { setEditLoading(false); }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const { data } = await dieAPI.delete(die._id);
      if (data.success) {
        toast.success(`${die.dieId} deleted`);
        onRefresh();
      } else toast.error(data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting die');
    } finally { setDeleteLoading(false); setDeleteConfirm(false); }
  };

  const toggleEditPart = (name) => {
    const required = ['Pocket', 'Cavity'];
    if (required.includes(name) && editForm.parts.includes(name)) return;
    setEditForm(f => ({
      ...f,
      parts: f.parts.includes(name) ? f.parts.filter(p => p !== name) : [...f.parts, name],
    }));
  };

  const allPartsComplete = die.parts.every(p => p.isCompleted);
  const openIssues = die.parts.flatMap(p => p.issues?.filter(i => !i.isResolved) || []);
  const dieStatus = die.overallStatus;

  const borderColor = {
    ok: 'border-l-green-500',
    slow: 'border-l-amber-500',
    over: 'border-l-red-500',
    in_transit: 'border-l-orange-400',
    in_moulding: 'border-l-purple-500',
    completed: 'border-l-gray-400',
  }[dieStatus] || 'border-l-gray-200';

  const handleSendToMoulding = async () => {
    setSendingToMoulding(true);
    try {
      const { data } = await dieAPI.sendToMoulding(die._id);
      if (data.success) {
        toast.success(`${die.dieId} dispatched to GR1 Moulding — WhatsApp sent`);
        onRefresh();
      } else toast.error(data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    } finally { setSendingToMoulding(false); }
  };

  const handleReceiveGR1 = async () => {
    setReceivingGR1(true);
    try {
      const { data } = await dieAPI.receiveAtGR1(die._id);
      if (data.success) {
        toast.success(`${die.dieId} received at GR1 Moulding — flow complete!`);
        onRefresh();
      } else toast.error(data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    } finally { setReceivingGR1(false); }
  };

  const canSendToMoulding = allPartsComplete && die.status === 'active' &&
    (user?.role === 'toolroom_head' || isOwner);

  const canReceiveGR1 = die.status === 'in_transit' &&
    (user?.role === 'gr1_receiver' || isOwner);

  return (
    <div className={`card border-l-4 ${borderColor} mb-4`}>
      <div
        className="px-4 py-3 flex items-start justify-between cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="badge badge-gray font-mono text-xs">{die.dieId}</span>
            <button
              onClick={e => {
                e.stopPropagation();
                navigator.clipboard.writeText(die.dieId);
                toast.success('Die ID copied');
              }}
              className="p-0.5 text-gray-300 hover:text-blue-600 transition-colors"
              title="Copy Die ID"
            >
              <Copy className="w-3 h-3" />
            </button>
            {die.priority === 'urgent' && <span className="badge badge-red">Urgent</span>}
            <StatusBadge status={dieStatus} />
            {openIssues.length > 0 && (
              <span className="badge badge-red">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {openIssues.length} issue{openIssues.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="font-semibold text-gray-900 text-sm leading-tight">{die.modelName}</p>
          <p className="text-xs text-gray-500">
            {[die.master, ...(die.designPlanning || [])].filter(Boolean).join(' · ') || '—'} · {die.parts.length} parts
          </p>
        </div>
        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
          {canEditDelete && (
            <>
              <button
                onClick={e => { e.stopPropagation(); setEditForm({ modelName: die.modelName, sentBy: die.sentBy || '', checkDimensionSOP: !!die.checkDimensionSOP, designPlanning: die.designPlanning || [], master: die.master || '', priority: die.priority, notes: die.notes || '', parts: die.parts.map(p => p.name) }); setEditOpen(true); }}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Edit die"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={e => { e.stopPropagation(); setDeleteConfirm(true); }}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete die"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <span className="text-xs text-gray-400">
            {die.parts.filter(p => p.isCompleted).length}/{die.parts.length} done
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4">
          {die.parts.map(part => (
            <PartRow key={part._id} die={die} part={part} onRefresh={onRefresh} operatorView={operatorView} />
          ))}

          {canSendToMoulding && (
            <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-sm font-semibold text-green-800 mb-1">All parts complete at Tool Room!</p>
              <p className="text-xs text-green-600 mb-3">Ready to dispatch from GR2 to GR1 Moulding</p>
              <button
                className="btn btn-success w-full"
                onClick={handleSendToMoulding}
                disabled={sendingToMoulding}
              >
                <Truck className="w-4 h-4" />
                {sendingToMoulding ? 'Dispatching…' : 'Send to GR1 Moulding (Dispatch)'}
              </button>
            </div>
          )}

          {die.status === 'in_transit' && !canReceiveGR1 && (
            <div className="mt-3 bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
              <p className="text-sm font-semibold text-orange-800">🚚 In Transit to GR1</p>
              <p className="text-xs text-orange-600 mt-1">
                Dispatched by {die.sentToGR1By || die.sentToMouldingBy} · {fmtDate(die.sentToGR1At || die.sentToMouldingAt)}
              </p>
              <p className="text-xs text-orange-500 mt-1">Awaiting GR1 receiver confirmation</p>
            </div>
          )}

          {canReceiveGR1 && (
            <div className="mt-3 bg-orange-50 border border-orange-300 rounded-xl p-4 text-center">
              <p className="text-sm font-semibold text-orange-800 mb-1">🚚 Die Arrived at GR1</p>
              <p className="text-xs text-orange-600 mb-3">
                Dispatched by {die.sentToGR1By || die.sentToMouldingBy} · {fmtDate(die.sentToGR1At || die.sentToMouldingAt)}
              </p>
              <button
                className="btn w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                onClick={handleReceiveGR1}
                disabled={receivingGR1}
              >
                <CheckCircle2 className="w-4 h-4" />
                {receivingGR1 ? 'Processing…' : 'Mark Received at GR1 Moulding'}
              </button>
            </div>
          )}

          {die.status === 'in_moulding' && (
            <div className="mt-3 bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">
              <p className="text-sm font-semibold text-purple-800">✅ Received at GR1 Moulding</p>
              <p className="text-xs text-purple-600 mt-1">
                {die.receivedAtGR1By
                  ? `Received by ${die.receivedAtGR1By} · ${fmtDate(die.receivedAtGR1At)}`
                  : `Sent by ${die.sentToMouldingBy || '—'} · ${fmtDate(die.sentToMouldingAt)}`
                }
              </p>
              {die.totalHours && (
                <p className={`text-xs font-semibold mt-1 ${die.totalHours <= 36 ? 'text-green-600' : 'text-red-600'}`}>
                  Total: {fmtHours(die.totalHours)} {die.totalHours <= 36 ? '✓ On time' : '⚠ Over budget'}
                </p>
              )}
            </div>
          )}

          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-400 flex-wrap gap-1">
            <span className="flex items-center gap-1"><User className="w-3 h-3" />{die.createdByName}</span>
            <span>{fmtDate(die.createdAt)}</span>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={`Edit ${die.dieId}`}>
        <form onSubmit={handleEdit} className="space-y-3">
          <div>
            <label className="label">Model name *</label>
            <input
              className="input font-mono"
              value={editForm.modelName}
              onChange={e => setEditForm(f => ({ ...f, modelName: formatModelName(e.target.value) }))}
              required
            />
            <p className="text-xs text-gray-400 mt-0.5">Auto-converts to UPPERCASE_WITH_UNDERSCORES</p>
          </div>
          <div>
            <label className="label">Sent by</label>
            <ManagedOptionList type="sentBy" value={editForm.sentBy} onChange={val => setEditForm(f => ({ ...f, sentBy: val }))} />
          </div>
          <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-gray-300">
            <input
              type="checkbox"
              checked={editForm.checkDimensionSOP}
              onChange={e => setEditForm(f => ({ ...f, checkDimensionSOP: e.target.checked }))}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm font-medium text-gray-900">Check dimension / Check with SOP</span>
          </label>
          <div>
            <label className="label">Design planning</label>
            <ManagedOptionList type="designPlanning" multi value={editForm.designPlanning} onChange={val => setEditForm(f => ({ ...f, designPlanning: val }))} />
          </div>
          <div>
            <label className="label">Master</label>
            <ManagedOptionList type="master" value={editForm.master} onChange={val => setEditForm(f => ({ ...f, master: val }))} />
          </div>
          <div>
            <label className="label">Parts</label>
            {['Pocket', 'Cavity', 'Insert'].map(name => (
              <label key={name} className={`flex items-center gap-2 p-2 rounded-lg border mb-1 cursor-pointer ${editForm.parts.includes(name) ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}>
                <input
                  type="checkbox"
                  checked={editForm.parts.includes(name)}
                  onChange={() => toggleEditPart(name)}
                  disabled={['Pocket', 'Cavity'].includes(name)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{name}</span>
                {['Pocket', 'Cavity'].includes(name) && <span className="text-xs text-gray-400 ml-auto">Required</span>}
              </label>
            ))}
          </div>
          <div>
            <label className="label">Priority</label>
            <select className="input" value={editForm.priority} onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))}>
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={2} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setEditOpen(false)} className="btn btn-ghost flex-1">Cancel</button>
            <button type="submit" className="btn btn-primary flex-1" disabled={editLoading}>
              {editLoading ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={deleteConfirm} onClose={() => setDeleteConfirm(false)} title={`Delete ${die.dieId}?`}>
        <p className="text-sm text-gray-600 mb-2">Are you sure you want to delete <span className="font-semibold">{die.modelName}</span>?</p>
        <p className="text-xs text-red-500 mb-5">This cannot be undone.</p>
        <div className="flex gap-2">
          <button onClick={() => setDeleteConfirm(false)} className="btn btn-ghost flex-1">Cancel</button>
          <button onClick={handleDelete} className="btn btn-danger flex-1" disabled={deleteLoading}>
            {deleteLoading ? 'Deleting…' : 'Yes, delete'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default DieCard;
export { PartRow };
