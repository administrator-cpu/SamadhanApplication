// src/utils/ticketStatus.js
export const STATUS_STYLES = {
  OPEN: { text: 'text-blue-50', bg: 'bg-blue-700' },
  IN_PROGRESS: { text: 'text-violet-900', bg: 'bg-purple-50' },
  ESCALATED: { text: 'text-rose-50', bg: 'bg-rose-700' },
  RESOLVED: { text: 'text-emerald-700', bg: 'bg-emerald-50' },
  CLOSED: { text: 'text-slate-100', bg: 'bg-slate-500' },
  REOPENED: { text: 'text-rose-50', bg: 'bg-rose-700' },
};

export const STATUS_DOT_COLORS = {
  OPEN: '#3B82F6',
  IN_PROGRESS: '#8B5CF6',
  ESCALATED: '#EF4444',
  RESOLVED: '#10B981',
  CLOSED: '#94A3B8',
  REOPENED: '#A855F7',
};

export function getStatusStyle(status) {
  return STATUS_STYLES[status] || STATUS_STYLES.CLOSED;
}

export function statusLabel(status) {
  return (status || '').replace(/_/g, ' ');
}

export function canReopen(ticket) {
  if (!ticket) return false;
  if (ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED') return false;

  const referenceTime = ticket.status === 'CLOSED' ? ticket.closed_at : ticket.resolved_at;
  if (!referenceTime) return false;

  const elapsedMs = Date.now() - new Date(referenceTime).getTime();
  return elapsedMs < 24 * 60 * 60 * 1000;
}