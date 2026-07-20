// src/utils/eventType.js
export const EVENT_CONFIG = {
  TICKET_CREATED: { icon: 'plus-circle', color: '#2563eb', label: 'Ticket Created' },
  TICKET_ASSIGNED: { icon: 'user-check', color: '#7c3aed', label: 'Assigned' },
  USER_REPLY: { icon: 'message-circle', color: '#2563eb', label: 'Customer Reply' },
  AGENT_REPLY: { icon: 'message-circle', color: '#0891b2', label: 'Agent Reply' },
  ADMIN_REPLY: { icon: 'message-circle', color: '#0891b2', label: 'Admin Reply' },
  INTERNAL_NOTE: { icon: 'lock', color: '#6b7280', label: 'Internal Note' },
  STATUS_CHANGED: { icon: 'refresh-cw', color: '#ea580c', label: 'Status Changed' },
  TICKET_RCA_UPDATED: { icon: 'file-text', color: '#15803d', label: 'RCA Updated' },
  AUTOMATED_UPDATE: { icon: 'zap', color: '#9ca3af', label: 'Automated Update' },
};

export function getEventConfig(eventType) {
  return EVENT_CONFIG[eventType] || { icon: 'circle', color: '#9ca3af', label: eventType };
}

export function formatEventTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}