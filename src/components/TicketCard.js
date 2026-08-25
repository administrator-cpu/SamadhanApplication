// src/components/TicketCard.js
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { memo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { statusLabel } from '../utils/ticketStatus';

/* ---------------------------------------------------------------- */
/* Design tokens — vivid palette.                                    */
/* ---------------------------------------------------------------- */

export const C = {
  bg: '#F3F2FD',
  card: '#FFFFFF',
  ink: '#151233',
  inkMuted: '#6D6A96',
  inkFaint: '#9D9AC0',
  mono: '#9D9AC0',
  monoFaint: '#C3C0E2',
  violet: '#6C5CE7',
  violetDeep: '#5A48D6',
  violetLight: '#8271EF',
  violetTint: '#EBE8FF',
  violetTintWarm: '#E6E1FF',
  violetInk: '#4A34C7',
  mint: '#CCF7E4',
  mintInk: '#0D6B4B',
  mintInk2: '#0F7A56',
  mintSpine: '#12B886',
  marigold: '#FFD166',
  marigoldInk: '#6B4800',
  marigoldInk2: '#7A5200',
  coral: '#C2410C',
  coralSpine: '#FF8A3D',
  track: '#EBE8FF',
};

const STATUS_META = {
  OPEN: { tint: C.mint, ink: C.mintInk2, spine: C.mintSpine },
  IN_PROGRESS: { tint: C.violetTintWarm, ink: C.violetInk, spine: C.violet },
  ESCALATED: { tint: C.coral, ink: '#FFFFFF', spine: C.coralSpine },
  RESOLVED: { tint: C.mint, ink: C.mintInk2, spine: C.mintSpine },
  CLOSED: { tint: C.violetTint, ink: '#4A4776', spine: C.violet },
};

export const AVATAR_BG = [C.violetTintWarm, C.mint, C.marigold];
export const AVATAR_INK = [C.violetInk, C.mintInk2, C.marigoldInk];

const CUSTOMER_ROLES = ['USER', 'CUSTOMER'];
function isCustomerRole(role) {
  return CUSTOMER_ROLES.includes(String(role || '').toUpperCase());
}

export function initialsOf(name = '') {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function paletteIndex(seed = '') {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash + seed.charCodeAt(i)) % AVATAR_BG.length;
  return hash;
}

function priorityOf(ticket) {
  const raw = String(
    ticket?.priority ?? ticket?.priority_level ?? ticket?.severity ?? ''
  ).toUpperCase();
  if (/P?1|CRITICAL|URGENT|HIGH/.test(raw)) return 'P1';
  if (/P?2|MEDIUM|NORMAL/.test(raw)) return 'P2';
  if (/P?3|LOW/.test(raw)) return 'P3';
  return ticket?.status === 'ESCALATED' ? 'P1' : 'P2';
}

function sourceOf(ticket) {
  const raw = String(ticket?.source || ticket?.channel || '').toUpperCase();
  if (raw.includes('ALL') || raw.includes('PHONE')) return 'Call';
  if (raw.includes('AUTO') || raw.includes('SYSTEM')) return 'Auto';
  return ticket?.status === 'ESCALATED' ? 'Auto' : 'Call';
}

export function slaOf(ticket) {
  const due = ticket?.sla_due_at || ticket?.due_at || ticket?.sla_deadline;
  if (!due) {
    if (ticket?.status === 'ESCALATED') return { risk: 2, text: 'Escalated · SLA at risk' };
    if (ticket?.status === 'RESOLVED') return { risk: 0, text: 'Closed within SLA' };
    return { risk: 0, text: 'Within SLA window' };
  }
  const diffMin = Math.round((new Date(due).getTime() - Date.now()) / 60000);
  if (diffMin < 0) {
    const over = Math.abs(diffMin);
    return { risk: 2, text: over >= 60 ? `Overdue ${Math.floor(over / 60)}h` : `Overdue ${over}m` };
  }
  if (diffMin <= 60) return { risk: 1, text: `Due in ${diffMin}m` };
  if (diffMin <= 60 * 24) return { risk: 0, text: `Due in ${Math.floor(diffMin / 60)}h` };
  return { risk: 0, text: 'Within SLA window' };
}

// REOPENED removed from the "actively working" bucket.
function stageOf(ticket) {
  const assigned = Boolean(ticket?.assigned_employee_name?.trim());
  switch (ticket?.status) {
    case 'RESOLVED':
    case 'CLOSED':
      return 4;
    case 'IN_PROGRESS':
    case 'ESCALATED':
      return 3;
    default:
      return assigned ? 2 : 1;
  }
}

function blockStyle(ticket, sla) {
  if (sla.risk === 2) return { bg: C.coral, ink: '#FFFFFF' };
  if (sla.risk === 1) return { bg: C.marigold, ink: C.marigoldInk };
  if (ticket?.status === 'RESOLVED' || ticket?.status === 'CLOSED') {
    return { bg: C.mint, ink: C.mintInk2 };
  }
  return { bg: C.violetTint, ink: '#4A4776' };
}

function whenLabel(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${time}`;
}

export const TicketCard = memo(function TicketCard({ ticket, index = 0, onPress, role }) {
  const isCustomerView = isCustomerRole(role);

  const status = ticket?.status || 'CLOSED';
  const meta = STATUS_META[status] || STATUS_META.CLOSED;
  const sla = slaOf(ticket);
  const block = blockStyle(ticket, sla);
  const subject =
    ticket?.subject?.trim() ||
    ticket?.issue_category?.trim() ||
    ticket?.circuit_description?.trim() ||
    'No subject provided';
  const companyName = ticket?.customer_name?.trim() || 'Unknown Customer';
  const ticketNo = ticket?.ticket_no || 'TKT-PENDING';
  const assignee = ticket?.assigned_employee_name?.trim();
  const owner = assignee || 'No owner';
  const avIdx = index % AVATAR_BG.length;
  const slaInk = sla.risk === 2 ? C.coral : sla.risk === 1 ? '#8A5A00' : '#B8B8B8';
  const stage = stageOf(ticket);
  const stageFill = status === 'ESCALATED' ? C.coral : stage === 4 ? C.mintSpine : C.violet;
  const source = sourceOf(ticket);
  const leftBlockLabel = isCustomerView ? source : priorityOf(ticket);
  const leftBlockStyle = block;
  const subtitleText = isCustomerView ? ticket?.circuit_description?.trim() ||
    'No subject provided' : companyName;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      className="shadow-sm"
      style={{
        backgroundColor: C.card,
        borderRadius: 26,
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 12,
        gap: 11,
      }}
    >
      <View className="flex-row items-center" style={{ gap: 10 }}>
        <View
          className="items-center justify-center"
          style={{
            width:  42,
            height: 42,
            borderRadius: 16,
            backgroundColor: leftBlockStyle.bg,
          }}
        >
          <Text className="font-sans-semibold" style={{ fontSize: 13, color: leftBlockStyle.ink }}>
             <MaterialCommunityIcons name="ticket-confirmation-outline" size={20} color='' className=""/>
            
          </Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text className="font-sans-semibold" style={{ fontSize: 19, color: C.ink }} numberOfLines={1}>
            {subject}
          </Text>
          <Text className="font-sans " style={{ fontSize: 12, color: C.inkMuted }} numberOfLines={1}>
            {subtitleText}
          </Text>
        </View>
        <View
          className="items-center justify-center"
          style={{ width: 34, height: 34, borderRadius: 999, backgroundColor: C.violetTint }}
        >
          <Feather name="arrow-right" size={15} color={C.ink} />
        </View>
      </View>

      <View className="flex-row items-center" style={{ gap: 9 }}>
        <View style={{ backgroundColor: meta.tint, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text
            className="font-sans-semibold"
            style={{ fontSize: 9.5, letterSpacing: 0.7, textTransform: 'uppercase', color: meta.ink }}
          >
            {statusLabel(status)}
          </Text>
        </View>
        <Text
          className="font-sans-medium"
          style={{ flex: 1, minWidth: 0, fontSize: 11.5, color: slaInk }}
          numberOfLines={1}
        >
          {sla.text}
        </Text>



        <View
          className="items-center justify-center"
          style={{ width: 24, height: 24, borderRadius: 999, backgroundColor: AVATAR_BG[avIdx] }}
        >
          <Text className="font-sans-semibold" style={{ fontSize: 9, color: AVATAR_INK[avIdx] }}>
            {initialsOf(owner === 'No owner' ? '?' : owner)}
          </Text>
        </View>
        <Text className="font-sans" style={{ fontSize: 11, color: C.inkMuted }} numberOfLines={1}>
          {owner}
        </Text>


      </View>

      <View style={{ gap: 8, paddingTop: 2 }}>
        <View style={{ height: 3, borderRadius: 999, backgroundColor: C.track, overflow: 'hidden' }}>
          <View style={{ height: '100%', borderRadius: 999, width: `${(stage / 4) * 100}%`, backgroundColor: stageFill }} />
        </View>
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <Text className="font-mono" style={{ fontSize: 10.5, color: C.mono }} numberOfLines={1}>
            {ticketNo}
          </Text>
          <Text className="font-mono" style={{ flex: 1, minWidth: 0, fontSize: 10.5, color: C.monoFaint }} numberOfLines={1}>
            {isCustomerView? '':ticket?.circuit_description}
          </Text>
          <Feather name="clock" size={12} color={C.mono} />
          <Text className="font-sans-medium" style={{ fontSize: 10.5, color: C.inkMuted }} numberOfLines={1}>
            {whenLabel(ticket?.updated_at || ticket?.created_at)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default TicketCard;