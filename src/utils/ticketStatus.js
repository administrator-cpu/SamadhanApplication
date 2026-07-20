// src/utils/ticketStatus.js
export const STATUS_STYLES = {
  OPEN: { bg: 'bg-blue-100', text: 'text-blue-700' },
  IN_PROGRESS: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  ESCALATED: { bg: 'bg-red-100', text: 'text-red-700' },
  RESOLVED: { bg: 'bg-green-100', text: 'text-green-700' },
  CLOSED: { bg: 'bg-gray-100', text: 'text-gray-600' },
  REOPENED: { bg: 'bg-purple-100', text: 'text-purple-700' },
};

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