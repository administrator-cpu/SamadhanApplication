// src/components/TicketCard.js
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { memo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { statusLabel } from '../utils/ticketStatus';
import { useAuthStore } from '../store/authStore';
import { DENSE_FONT_SCALE } from './layout/tokens';

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
  OPEN: { tint: 'bg-[#CCF7E4]', ink: 'text-[#0F7A56]' },
  IN_PROGRESS: { tint: 'bg-[#E6E1FF]', ink: 'text-[#4A34C7]' },
  ESCALATED: { tint: 'bg-[#C2410C]', ink: 'text-[#FFFFFF]' },
  RESOLVED: { tint: 'bg-[#CCF7E4]', ink: 'text-[#0F7A56]' },
  CLOSED: { tint: 'bg-[#EBE8FF]', ink: 'text-[#4A4776]' },
};

export const AVATAR_BG = [C.violetTintWarm, C.mint, C.marigold];
export const AVATAR_INK = [C.violetInk, C.mintInk2, C.marigoldInk];
// NativeWind class equivalents of AVATAR_BG / AVATAR_INK.
export const AVATAR_BG_CLASS = ['bg-[#E6E1FF]', 'bg-[#CCF7E4]', 'bg-[#FFD166]'];
export const AVATAR_INK_CLASS = ['text-[#4A34C7]', 'text-[#0F7A56]', 'text-[#6B4800]'];

const STAGE_WIDTH = { 1: 'w-[25%]', 2: 'w-[50%]', 3: 'w-[75%]', 4: 'w-full' };

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
  if (sla.risk === 2) return { bg: 'bg-[#C2410C]', ink: '#FFFFFF' };
  if (sla.risk === 1) return { bg: 'bg-[#FFD166]', ink: C.marigoldInk };
  if (ticket?.status === 'RESOLVED' || ticket?.status === 'CLOSED') {
    return { bg: 'bg-[#CCF7E4]', ink: C.mintInk2 };
  }
  return { bg: 'bg-[#EBE8FF]', ink: '#4A4776' };
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
  const isAgentView = (role=="SUPPORT_AGENT");
  const user = useAuthStore((state) => state.user);


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
  const owner = assignee ||user?.name|| 'No owner';
  const avIdx = index % AVATAR_BG.length;
  const slaInk = sla.risk === 2 ? 'text-[#C2410C]' : sla.risk === 1 ? 'text-[#8A5A00]' : 'text-[#B8B8B8]';
  const stage = stageOf(ticket);
  const stageFill = status === 'ESCALATED' ? 'bg-[#C2410C]' : stage === 4 ? 'bg-[#12B886]' : 'bg-[#6C5CE7]';
  const source = sourceOf(ticket);
  const leftBlockLabel = isCustomerView ? source : priorityOf(ticket);
  const leftBlockStyle = block;
  const subtitleText = isCustomerView ? ticket?.circuit_description?.trim() ||
    'No subject provided' : companyName;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      className="shadow-sm rounded-[26px] p-[12px] std:p-[16px] mx-[12px] std:mx-[16px] mb-[12px] gap-[11px] bg-[#FFFFFF]"
    >
      <View className="flex-row items-center gap-[10px]">
        <View className={`items-center justify-center w-[42px] h-[42px] rounded-[16px] ${leftBlockStyle.bg}`}>
          <MaterialCommunityIcons name="ticket-confirmation-outline" size={20} color={leftBlockStyle.ink} />
        </View>
        <View className="flex-1 min-w-0">
          <Text className="font-sans-semibold text-[19px] text-[#151233]" numberOfLines={1}>
            {subject}
          </Text>
          <Text className="font-sans text-[12px] text-[#6D6A96]" numberOfLines={1}>
            {subtitleText}
          </Text>
        </View>
        <View
          className="items-center justify-center w-[34px] h-[34px] rounded-[999px] bg-[#EBE8FF]"
        >
          <Feather name="arrow-right" size={15} color={C.ink} />
        </View>
      </View>

      <View className="flex-row items-center gap-[9px]">
        <View className={`rounded-[999px] px-[10px] py-[4px] ${meta.tint}`}>
          <Text
            maxFontSizeMultiplier={DENSE_FONT_SCALE}
            className={`font-sans-semibold text-[9.5px] tracking-[0.7px] uppercase ${meta.ink}`}
          >
            {statusLabel(status)}
          </Text>
        </View>
        <Text
          className={`font-sans-medium flex-1 min-w-0 text-[11.5px] ${slaInk}`}
          numberOfLines={1}
        >
          {sla.text}
        </Text>



        <View className={`items-center justify-center w-[24px] h-[24px] rounded-[999px] ${AVATAR_BG_CLASS[avIdx]}`}>
          <Text maxFontSizeMultiplier={DENSE_FONT_SCALE} className={`font-sans-semibold text-[9px] ${AVATAR_INK_CLASS[avIdx]}`}>
            {initialsOf(owner === 'No owner' ? '?' : owner)}
          </Text>
        </View>
        <Text className="font-sans text-[11px] text-[#6D6A96]" numberOfLines={1}>
          {owner}
        </Text>


      </View>

      <View className="gap-[8px] pt-[2px]">
        <View className="h-[3px] rounded-[999px] overflow-hidden bg-[#EBE8FF]">
          <View className={`h-full rounded-[999px] ${STAGE_WIDTH[stage]} ${stageFill}`} />
        </View>
        <View className="flex-row items-center gap-[8px]">
          <Text className="font-mono text-[10.5px] text-[#9D9AC0]" numberOfLines={1}>
            {ticketNo}
          </Text>
          <Text className="font-mono flex-1 min-w-0 text-[10.5px] text-[#C3C0E2]" numberOfLines={1}>
            {isCustomerView? '':ticket?.circuit_description}
          </Text>
          <Feather name="clock" size={12} color={C.mono} />
          <Text className="font-sans-medium text-[10.5px] text-[#6D6A96]" numberOfLines={1}>
            {whenLabel(ticket?.updated_at || ticket?.created_at)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default TicketCard;