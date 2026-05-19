export const STAGES = {
  1: 'Design',
  2: 'Programming',
  3: 'VMC Machining',
  4: 'Wirecut',
  5: 'Tool Room',
};

export const ROLE_LABELS = {
  owner: 'Owner',
  admin: 'Admin',
  designer: 'Designer',
  programmer: 'Programmer',
  vmc_operator: 'VMC Operator',
  wirecut_operator: 'Wirecut Operator',
  toolroom_head: 'Tool Room Head',
  gr1_receiver: 'GR1 Receiver',
};

export const fmtHours = (h) => {
  if (h === null || h === undefined || isNaN(h)) return '—';
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${hh}h ${String(mm).padStart(2, '0')}m`;
};

export const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  });
};

export const getStatusColor = (status) => {
  switch (status) {
    case 'ok': return 'green';
    case 'slow': return 'amber';
    case 'over': return 'red';
    case 'done': return 'gray';
    case 'in_transit': return 'orange';
    case 'in_moulding': return 'purple';
    default: return 'gray';
  }
};

export const getPartBorderColor = (status) => {
  switch (status) {
    case 'ok': return 'border-green-400';
    case 'slow': return 'border-amber-400';
    case 'over': return 'border-red-400';
    case 'done': return 'border-gray-300';
    default: return 'border-gray-200';
  }
};
