// src/components/TicketCard.js
import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { statusLabel } from '../utils/ticketStatus';

export const STATUS_CONFIG = {
  OPEN: { bg: 'bg-blue-50', text: 'text-blue-700' },
  IN_PROGRESS: { bg: 'bg-amber-50', text: 'text-amber-700' },
  ESCALATED: { bg: 'bg-rose-50', text: 'text-rose-700' },
  RESOLVED: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  CLOSED: { bg: 'bg-slate-100', text: 'text-slate-500' },
  REOPENED: { bg: 'bg-rose-50', text: 'text-rose-700' },
};

const SOFT_SHADOW = {
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 6,
  elevation: 2,
};

// Default matches this card's most common host screen (the ticket list,
// bg-slate-50). Any screen with a different background — e.g. the
// Dashboard's bg-white — must override this via the `cutoutColor` prop,
// or the punch-out notches will show as visible gray dots instead of
// blending invisibly into the host background.
const DEFAULT_CUTOUT_COLOR = '#F8FAFC'; // slate-50

export const formatMetaDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function Dot() {
  return <Text className="text-slate-300 text-xs mx-1.5">•</Text>;
}

/**
 * "Boarding pass" style ticket card — main body, perforated divider with
 * punch-out notches, bottom stub.
 *
 * @param {object} ticket - the ticket record
 * @param {function} onPress
 * @param {string} [cutoutColor] - hex/rgba color for the two divider
 *   "cutout" circles. MUST match the background color of whatever screen
 *   renders this card, or the illusion of a physical hole breaks. Defaults
 *   to slate-50 (#F8FAFC) for the ticket list. Pass '#FFFFFF' (or your
 *   design token's white) when placing this on a pure-white background
 *   like the Dashboard.
 * @param {object} [containerStyle] - extra style merged onto the outer
 *   Pressable, for margin/width overrides per host screen (e.g. the
 *   Dashboard may want a tighter mb-3 instead of this card's default mb-4,
 *   or a fixed width if used inside a horizontal carousel).
 */
export const TicketCard = memo(function TicketCard({
  ticket,
  onPress,
  cutoutColor = DEFAULT_CUTOUT_COLOR,
  containerStyle,
}) {
  const config = STATUS_CONFIG[ticket?.status] || STATUS_CONFIG.CLOSED;

  const ticketNo = ticket?.ticket_no || 'TKT-PENDING';
  const subject = ticket?.subject?.trim() || 'No Subject Provided';
  const circuitDesc = ticket?.circuit_description?.trim();
  const customerName = ticket?.customer_name?.trim();
  const assignee = ticket?.assigned_employee_name?.trim() || 'Unassigned';
  const dateStr = formatMetaDate(ticket?.updated_at);

  const infoParts = [circuitDesc, customerName, dateStr].filter(Boolean);

  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
      style={({ pressed }) => [
        { opacity: pressed ? 0.85 : 1 },
        SOFT_SHADOW,
        containerStyle,
      ]}
      className="bg-white rounded-2xl mb-4 overflow-hidden"
    >
      {/* Main body */}
      <View className="p-4">
        <View className="flex-row items-start justify-between mb-1.5">
          <Text
            className="font-sans-semibold text-lg text-slate-800 flex-1 pr-3"
            numberOfLines={2}
          >
            {subject}
          </Text>
          <Text className="font-mono text-xs text-slate-400 pt-0.5" numberOfLines={1}>
            {ticketNo}
          </Text>
        </View>

        {infoParts.length > 0 && (
          <View className="flex-row flex-wrap items-center">
            {infoParts.map((part, index) => (
              <View key={`${part}-${index}`} className="flex-row items-center">
                {index > 0 && <Dot />}
                <Text className="font-sans-medium text-slate-500 text-xs" numberOfLines={1}>
                  {part}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Perforated divider with punch-out notches */}
      <View className="relative">
        <View className="border-t-2 border-dashed border-slate-200" />
        <View
          className="absolute w-4 h-4 rounded-full"
          style={{ left: -8, top: -8, backgroundColor: cutoutColor }}
        />
        <View
          className="absolute w-4 h-4 rounded-full"
          style={{ right: -8, top: -8, backgroundColor: cutoutColor }}
        />
      </View>

      {/* Stub */}
      <View className="flex-row items-center justify-between bg-slate-50/50 px-4 py-3">
        <View className={`px-2.5 py-1 rounded-full ${config.bg}`}>
          <Text className={`font-sans-semibold text-[10px] uppercase tracking-wide ${config.text}`}>
            {statusLabel(ticket?.status)}
          </Text>
        </View>
        <Text className="font-sans text-slate-400 text-xs italic" numberOfLines={1}>
          handled by {assignee}
        </Text>
      </View>
    </Pressable>
  );
});

export default TicketCard;