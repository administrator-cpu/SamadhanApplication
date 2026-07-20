// src/utils/csv.js
function escapeCsvValue(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Wrap in quotes and escape internal quotes if the value contains
  // commas, quotes, or newlines — standard CSV escaping rules.
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function ticketsToCsv(tickets) {
  const headers = [
    'Ticket No',
    'Category',
    'Status',
    'Customer',
    'Circuit Description',
    'Assigned Agent',
    'RCA',
    'Created At',
    'Resolved At',
    'Closed At',
  ];

  const rows = tickets.map((t) => [
    t.ticket_no,
    t.category_name,
    t.status,
    t.customer_name,
    t.circuit_description,
    t.assigned_agent_name,
    t.rca,
    t.created_at,
    t.resolved_at,
    t.closed_at,
  ]);

  const csvLines = [
    headers.map(escapeCsvValue).join(','),
    ...rows.map((row) => row.map(escapeCsvValue).join(',')),
  ];

  return csvLines.join('\n');
}