// src/components/TicketDetailScreen.js
import { Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
// import * as MediaLibrary from 'expo-media-library/legacy';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
// import {
//   GestureHandlerRootView,
//   PanGestureHandler,
//   PinchGestureHandler,
//   State,
//   TapGestureHandler,
// } from 'react-native-gesture-handler';
import { KeyboardAvoidingView, useKeyboardState } from 'react-native-keyboard-controller';
import { BottomInset, TopInset } from './layout/Screen';
import Sheet from './layout/Sheet';

import { useTicket } from '../hooks/useTickets';
import { useTicketSocket } from '../hooks/useTicketSocket';
import { useAuthStore } from '../store/authStore';
import { getEventConfig } from '../utils/eventType';
import { STATUS_DOT_CLASSES, statusLabel } from '../utils/ticketStatus';
import TicketRating from './TicketRating';
import TicketReplyForm from './TicketReplyForm';
import TicketStaffTools from './TicketStaffTools';
import TicketStatusActions from './TicketStatusActions';
import TicketRCAForm from './TicketRCAForm';
import CallButton from './calls/CallButton';
import { LightboxContent } from './ImageLightbox';

/* ------------------------------------------------------------------
   PALETTE — ink on white, one accent, one signal. Colour only in chips.
------------------------------------------------------------------ */
const C = {
  ink: '#0C1524',
  body: '#26313F',
  muted: '#5C7291',
  soft: '#6B7A93',
  faint: '#8397B0',
  hint: '#9AAAC0',
  hair: '#EDF1F7',
  chipGrey: '#F2F5F9',
  surface: '#FFFFFF',
  blue: '#1B72E8',
  blueInk: '#1B5FC0',
  blueDeep: '#2C5FA8',
  blueTint: '#EAF2FE',
  bubbleBlue: '#DCEBFC',
  bubbleBlueMeta: '#6D8CB4',
  green: '#188A62',
  greenInk: '#1E6B50',
  greenTint: '#DFF3EA',
  bubbleGreen: '#DDEFE7',
  bubbleGreenMeta: '#6E9384',
  amber: '#D9722B',
  amberTint: '#FEF1E7',
  danger: '#C0392B',
  dangerTint: '#FDECEA',
};

// Two grounds: live (ice blue) and resolved (mint). Everything else is shared.
const GRADIENT = {
  live: ['#FFFFFF', '#F4F9FF', '#E7F1FC'],
  done: ['#FFFFFF', '#F5FBF8', '#E8F5EF'],
};


const CHAT_EVENT_TYPES = [
  'TICKET_CREATED',
  'USER_REPLY',
  'AGENT_REPLY',
  'ADMIN_REPLY',
  'INTERNAL_NOTE',
];

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'm4v', 'webm', 'avi', '3gp'];

/* ---------------------------- time, in words ---------------------------- */

function clockTime(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatFullDateTime(dateString) {
  if (!dateString) return 'Not available';
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function dayLabel(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  const diff = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return d.toLocaleDateString('en-US', { weekday: 'long' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function dayKey(dateString) {
  if (!dateString) return 'unknown';
  const d = new Date(dateString);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// "Yesterday, 5:12 PM" for the stat tile.
function stampPhrase(dateString) {
  if (!dateString) return '—';
  return `${dayLabel(dateString)}, ${clockTime(dateString)}`;
}

function spanPhrase(from, to = Date.now()) {
  if (!from) return null;
  const mins = Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000));
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'}`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? '' : 's'}`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
}

/* ---------------------------- small utilities ---------------------------- */

function getInitials(name) {
  return (
    (name || '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join('') || '?'
  );
}

function getAttachmentType(url) {
  if (!url) return 'document';
  const clean = url.split('?')[0].split('#')[0];
  const ext = clean.split('.').pop()?.toLowerCase();
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (VIDEO_EXTENSIONS.includes(ext)) return 'video';
  return 'document';
}

function getAttachmentFileName(url) {
  if (!url) return 'Attachment';
  const clean = url.split('?')[0].split('#')[0];
  const segments = clean.split('/');
  return decodeURIComponent(segments[segments.length - 1] || 'Attachment');
}

function prettyFileName(url) {
  const raw = getAttachmentFileName(url);
  const dot = raw.lastIndexOf('.');
  const stem = dot > 0 ? raw.slice(0, dot) : raw;
  const ext = dot > 0 ? raw.slice(dot + 1).toUpperCase() : 'FILE';
  const words = stem.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return { title: words.charAt(0).toUpperCase() + words.slice(1) || raw, ext };
}

async function ensureLocalCopy(url, fileName) {
  const localUri = `${FileSystem.cacheDirectory}${fileName}`;
  const info = await FileSystem.getInfoAsync(localUri);
  if (info.exists) return localUri;
  const { uri } = await FileSystem.downloadAsync(url, localUri);
  return uri;
}

async function downloadAndOpenDocument(url, fileName) {
  const uri = await ensureLocalCopy(url, fileName);
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) await Sharing.shareAsync(uri);
  else Alert.alert('Downloaded', `Saved to ${uri}`);
}

/* ------------------------------------------------------------------
   STATUS → headline, ground, accent
------------------------------------------------------------------ */
function getTone(status) {
  const s = status || 'OPEN';
  if (s === 'RESOLVED' || s === 'CLOSED') {
    return {
      index: 2,
      closed: true,
      ground: GRADIENT.done,
      accent: C.green,
      accentText: 'text-[#188A62]',
      accentBg: 'bg-[#188A62]',
      accentInkText: 'text-[#1E6B50]',
      accentTintBg: 'bg-[#DFF3EA]',
      bubbleBg: 'bg-[#DDEFE7]',
      bubbleMetaText: 'text-[#6E9384]',
      headline: 'All fixed',
      pillText: 'text-[#1E6B50]',
    };
  }
  if (s === 'ESCALATED') {
    return {
      index: 1,
      closed: false,
      ground: GRADIENT.live,
      accent: C.danger,
      accentText: 'text-[#C0392B]',
      accentBg: 'bg-[#C0392B]',
      accentInkText: 'text-[#96271B]',
      accentTintBg: 'bg-[#FDECEA]',
      bubbleBg: 'bg-[#DCEBFC]',
      bubbleMetaText: 'text-[#6D8CB4]',
      headline: 'Escalated to our\nsenior engineers',
      pillText: 'text-[#96271B]',
    };
  }
  if (s === 'IN_PROGRESS' || s === 'REOPENED') {
    return {
      index: 1,
      closed: false,
      ground: GRADIENT.live,
      accent: C.blue,
      accentText: 'text-[#1B72E8]',
      accentBg: 'bg-[#1B72E8]',
      accentInkText: 'text-[#1B5FC0]',
      accentTintBg: 'bg-[#EAF2FE]',
      bubbleBg: 'bg-[#DCEBFC]',
      bubbleMetaText: 'text-[#6D8CB4]',
      headline: "We're on it,\nnothing needed from you",
      pillText: 'text-[#2C5FA8]',
    };
  }
  return {
    index: 0,
    closed: false,
    ground: GRADIENT.live,
    accent: C.blue,
    accentText: 'text-[#1B72E8]',
    accentBg: 'bg-[#1B72E8]',
    accentInkText: 'text-[#1B5FC0]',
    accentTintBg: 'bg-[#EAF2FE]',
    bubbleBg: 'bg-[#DCEBFC]',
    bubbleMetaText: 'text-[#6D8CB4]',
    headline: "We've got your\nreport",
    pillText: 'text-[#2C5FA8]',
  };
}

function getSteps(status, agentName) {
  const tone = getTone(status);
  const agent = agentName && agentName !== 'Unassigned' ? agentName.split(' ')[0] : 'Our team';
  const steps = [
    { title: 'We received your report', note: "It's logged and nothing is lost." },
    { title: `${agent} is looking into it`, note: 'Updates appear right here in this chat.' },
    { title: 'We check it works with you', note: 'Then we close the ticket together.' },
  ];
  return steps.map((step, i) => ({
    ...step,
    state: i < tone.index ? 'done' : i === tone.index ? 'now' : 'later',
  }));
}

/* ------------------------------------------------------------------
   TIMELINE
------------------------------------------------------------------ */
function buildTimeline(events, currentUserId) {
  const rows = [];
  let lastDay = null;
  let prevKind = null;
  let prevSender = null;

  (events || []).forEach((event) => {
    const key = dayKey(event.created_at);
    if (key !== lastDay) {
      rows.push({ kind: 'day', id: `day-${key}`, label: dayLabel(event.created_at) });
      lastDay = key;
      prevKind = 'day';
      prevSender = null;
    }

    if (!CHAT_EVENT_TYPES.includes(event.event_type)) {
      rows.push({ kind: 'system', id: event.id, event });
      prevKind = 'system';
      prevSender = null;
      return;
    }

    const isMe =
      event.actor_user_id != null && String(event.actor_user_id) === String(currentUserId);
    const sender = isMe ? '__me__' : String(event.actor_user_id ?? event.actor_name ?? 'system');
    const runStart = prevKind !== 'message' || prevSender !== sender;

    rows.push({ kind: 'message', id: event.id, event, isMe, runStart });
    prevKind = 'message';
    prevSender = sender;
  });

  for (let i = 0; i < rows.length; i += 1) {
    if (rows[i].kind !== 'message') continue;
    const next = rows[i + 1];
    rows[i].runEnd = !next || next.kind !== 'message' || next.runStart;
  }
  return rows;
}

/* ==================================================================
   SCREEN
================================================================== */
export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const navigation = useNavigation();
  const { data, isLoading, isError, error, refetch, isRefetching } = useTicket(id);
  const user = useAuthStore((state) => state.user);
  useTicketSocket(id);

  const [isMenuVisible, setMenuVisible] = useState(false);
  const [isDetailsVisible, setDetailsVisible] = useState(false);
  const [isRcaVisible, setRcaVisible] = useState(false);
  const [isRcaDismissed, setRcaDismissed] = useState(false);
  const isKeyboardVisible = useKeyboardState((state) => state.isVisible);
  const scrollViewRef = useRef(null);
  const scrollToBottom = (animated = true) => scrollViewRef.current?.scrollToEnd({ animated });

  const isCurrentUserCustomer = user?.role === 'USER';
  const isStaff = user?.role === 'ADMIN' || user?.role === 'SUPPORT_AGENT';

  // No nav bar at all — the chrome is two floating buttons over the gradient.
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    if (isKeyboardVisible) requestAnimationFrame(() => scrollToBottom(true));
  }, [isKeyboardVisible]);

  const ticket = data?.ticket;
  const events = data?.events;
  const tone = getTone(ticket?.status);
  const timeline = useMemo(() => buildTimeline(events, user?.id), [events, user?.id]);

  useEffect(() => {
    if (timeline.length > 0) requestAnimationFrame(() => scrollToBottom(true));
  }, [timeline.length]);


  const partnerName = isCurrentUserCustomer
    ? ticket?.assigned_employee?.name || 'Support team'
    : ticket?.customer?.name || 'Customer';
  const agentName = ticket?.assigned_employee?.name || 'Unassigned';

  if (isLoading) {
    return (
      <Ground colors={GRADIENT.live}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={C.blue} />
          <Text className="font-sans-medium text-[13px] text-[#5C7291] mt-[14px]">
            Loading your conversation…
          </Text>
        </View>
      </Ground>
    );
  }

  if (isError) {
    return (
      <Ground colors={GRADIENT.live}>
        <View className="flex-1 items-center justify-center p-[30px]">
          <View
            className="w-[62px] h-[62px] rounded-[20px] bg-[#FDECEA] items-center justify-center mb-[20px]"
          >
            <Feather name="wifi-off" size={26} color={C.danger} />
          </View>
          <Text
            className="font-sans-semibold text-[20px] tracking-[-0.4px] text-[#0C1524] mb-[8px] text-center"
          >
            We couldn't load this chat
          </Text>
          <Text
            className="font-sans-medium text-[13.5px] leading-[21px] text-[#5C7291] text-center mb-[26px]"
          >
            {error?.message || 'Your ticket is safe — this is just a connection hiccup.'}
          </Text>
          <Pressable
            onPress={() => refetch()}
            className="bg-[#0C1524] px-[28px] h-[50px] rounded-[999px] justify-center"
          >
            <Text className="font-sans-semibold text-[15px] text-[#FFFFFF]">
              Try again
            </Text>
          </Pressable>
        </View>
      </Ground>
    );
  }

  const openFor = spanPhrase(ticket?.created_at);
  const fixedIn = ticket?.created_at && ticket?.updated_at ? spanPhrase(ticket.created_at, ticket.updated_at) : null;
  const statusPill = tone.closed
    ? `Ticket #${ticket?.ticket_no} · closed ${spanPhrase(ticket?.updated_at)} ago`
    : `Ticket #${ticket?.ticket_no} · open ${openFor}`;

  const subline = tone.closed
    ? [ticket?.subject, fixedIn && `fixed in ${fixedIn}`].filter(Boolean).join(' · ')
    : ticket?.subject || 'We will update you here';

  const contactPerson = isCurrentUserCustomer ? ticket?.assigned_employee : ticket?.customer;
  const contactRows = (
    isCurrentUserCustomer
      ? [
        contactPerson?.role && { icon: 'briefcase', label: 'Role', value: contactPerson.role },
        contactPerson?.email && { icon: 'mail', label: 'Email', value: contactPerson.email, action: 'email' },
        contactPerson?.phone && { icon: 'phone', label: 'Phone', value: contactPerson.phone, action: 'phone' },
      ]
      : [
        contactPerson?.email && { icon: 'mail', label: 'Email', value: contactPerson.email, action: 'email' },
        contactPerson?.phone && { icon: 'phone', label: 'Phone', value: contactPerson.phone, action: 'phone' },
        contactPerson?.company && { icon: 'briefcase', label: 'Company', value: contactPerson.company },
        contactPerson?.customer_id && { icon: 'hash', label: 'Customer ID', value: contactPerson.customer_id },
      ]
  ).filter(Boolean);

  const handleContactAction = (row) => {
    if (row.action === 'email') {
      Linking.openURL(`mailto:${row.value}`).catch(() =>
        Alert.alert('Unable to open', 'No email app is available on this device.')
      );
    } else if (row.action === 'phone') {
      Linking.openURL(`tel:${row.value}`).catch(() =>
        Alert.alert('Unable to open', 'No phone dialer is available on this device.')
      );
    }
  };

  const ticketInfoRows = [
    { icon: 'file-text', label: 'What you reported', value: ticket?.subject || 'No subject' },
    { icon: 'activity', label: 'Status', isStatus: true },
    ticket?.circuit_description && { icon: 'zap', label: 'Your line', value: ticket.circuit_description },
    { icon: 'calendar', label: 'Reported on', value: formatFullDateTime(ticket?.created_at) },
    { icon: 'clock', label: 'Last update', value: formatFullDateTime(ticket?.updated_at) },
  ].filter(Boolean);

  return (
    <Ground colors={tone.ground}>
      <KeyboardAvoidingView className="flex-1" behavior="padding">
        {/* FLOATING CHROME — the only pinned elements */}
        <TopInset extra={8} className="flex-row items-center justify-between px-[14px] pb-[2px]">
          <RoundButton icon="arrow-left" onPress={() => router.back()} />

          {/* IDENTITY PILL — who + which ticket, opens the details sheet */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setDetailsVisible(true)}
            className="flex-1 mx-[9px] h-[52px] rounded-[999px] bg-[#FFFFFF] flex-row items-center pl-[7px] pr-[12px] gap-[10px]"
            style={sx.shadowFloat}
          >
            <View className={`w-[38px] h-[38px] rounded-[999px] items-center justify-center ${tone.accentTintBg}`}>
              <Text className={`font-sans-semibold text-[13px] ${tone.accentInkText}`}>
                {getInitials(partnerName)}
              </Text>
            </View>
            <View className="flex-1 min-w-0">
              <Text numberOfLines={1} className="font-sans-semibold text-[13px] text-[#0C1524]">
                {partnerName}
              </Text>
              <Text numberOfLines={1} className="font-sans-medium text-[11px] text-[#6B7A93] mt-[2px]">
                {[`#${ticket?.ticket_no || '—'}`, statusLabel(ticket?.status), !isCurrentUserCustomer && ticket?.priority]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
            <Feather name="chevron-down" size={16} color={C.faint} />
          </TouchableOpacity>
          {contactPerson?.email && (
            <CallButton
              toEmail={contactPerson.email}
              ticketId={ticket?.id}
              ticketNumber={ticket?.ticket_no}
              peerName={contactPerson.name}
            />
          )}
          <RoundButton icon="more-vertical" onPress={() => setMenuVisible(true)} />
        </TopInset>

        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          contentContainerClassName="px-[12px] std:px-[16px] pt-[18px] pb-[12px]"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollToBottom(true)}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={tone.accent} />}
        >
          {/* HEADLINE — scrolls away with the thread */}
          <View className="items-center px-[6px] pb-[6px]">
            <View
              className="flex-row items-center gap-[7px] bg-[rgba(255,255,255,0.72)] rounded-[999px] px-[13px] py-[6px]"
            >
              {tone.closed ? (
                <Feather name="check" size={12} color={C.green} />
              ) : (
                <LivePulse color={tone.accent} dotClass={tone.accentBg} />
              )}
              <Text className={`font-sans-semibold text-[11.5px] ${tone.pillText}`}>
                {statusPill}
              </Text>
            </View>

            <Text
              className="font-sans-semibold text-[27px] leading-[32px] tracking-[-0.8px] text-[#0C1524] text-center mt-[13px]"
            >
              {tone.headline}
            </Text>

            <Text
              className="font-sans-medium text-[13px] leading-[19.5px] text-[#5C7291] text-center mt-[9px]"
            >
              {subline}
            </Text>
          </View>

          {/* TWO-UP STATS */}
          <View className="flex-row gap-[11px] mt-[18px] mb-[13px]">
            <StatTile
              icon="wifi"
              tint="bg-[#EAF2FE]"
              iconColor={C.blue}
              title="Your line"
              value={ticket?.circuit_description || 'Not specified'}
            />
            <StatTile
              icon="clock"
              tint="bg-[#FEF1E7]"
              iconColor={C.amber}
              title="Reported"
              value={stampPhrase(ticket?.created_at)}
            />
          </View>

          {/* WHAT HAPPENS NEXT — live tickets only */}
          {!tone.closed ? (
            <StepsCard steps={getSteps(ticket?.status, isCurrentUserCustomer ? agentName : null)} accentText={tone.accentText} accentBg={tone.accentBg} />
          ) : null}

          {/* THREAD */}
          {timeline.length === 0 ? (
            <View className="items-center py-[30px]">
              <Text className="font-sans-medium text-[13.5px] text-[#8397B0]">
                No messages yet — say hello below.
              </Text>
            </View>
          ) : (
            timeline.map((row) => {
              if (row.kind === 'day') return <DayDivider key={row.id} label={row.label} />;
              if (row.kind === 'system') return <SystemPill key={row.id} event={row.event} />;
              return (
                <MessageBubble
                  key={row.id}
                  event={row.event}
                  isMe={row.isMe}
                  runStart={row.runStart}
                  runEnd={row.runEnd}
                  tone={tone}
                />
              );
            })
          )}

          {/* OUTCOME + RATING at the end, the way a conversation ends */}
          {tone.closed ? <OutcomeCard ticket={ticket} fixedIn={fixedIn} /> : null}
          <TicketRating ticket={ticket} />
        </ScrollView>

        {/* FLOATING COMPOSER / RCA PROMPT / CLOSED CARD */}
        <BottomInset extra={8} keyboardAware className="px-[12px] std:px-[16px] pt-[6px] gap-[11px]">
          {/* Resolved or closed + staff + no RCA yet → write it right here */}
          {tone.closed && isStaff && !ticket?.rca && !isRcaDismissed && !isKeyboardVisible ? (
            <RcaPrompt onWrite={() => setRcaVisible(true)} onLater={() => setRcaDismissed(true)} />
          ) : null}

          {tone.closed && !isStaff ? (
            <ClosedCard onReopen={() => setMenuVisible(true)} />
          ) : (
            <View className="bg-[#FFFFFF] rounded-[26px] px-[6px] py-[4px]" style={sx.shadowFloat}>
              <TicketReplyForm ticket={ticket} />
            </View>
          )}
        </BottomInset>
      </KeyboardAvoidingView>

      {/* MANAGE SHEET */}
      <Sheet
        visible={isMenuVisible}
        onClose={() => setMenuVisible(false)}
        animationType="fade"
        maxHeightRatio={0.82}
        backdropClassName="bg-[rgba(12,21,36,0.38)]"
        className="bg-[#FFFFFF] rounded-tl-[30px] rounded-tr-[30px] px-[18px] pt-[12px] pb-[26px]"
      >
            <View
              className="w-[40px] h-[4px] rounded-[999px] bg-[#DEE5EE] self-center mb-[18px]"
            />
            <Text className="font-sans-semibold text-[16px] tracking-[-0.3px] text-[#0C1524] text-center">
              What would you like to do?
            </Text>
            <Text className="font-sans-medium text-[12.5px] text-[#5C7291] text-center mt-[5px] mb-[18px]">
              Nothing here sends a message on its own.
            </Text>

            <TicketStatusActions ticket={ticket} />
            <TicketStaffTools ticket={ticket} />
      </Sheet>

      {/* DETAILS SHEET */}
      <Sheet
        visible={isDetailsVisible}
        onClose={() => setDetailsVisible(false)}
        variant="center"
        keyboard={false}
        dismissOnBackdrop={false}
        backdropClassName="bg-[rgba(12,21,36,0.38)]"
        className="bg-[#FFFFFF] rounded-[30px] p-[22px]"
      >
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setDetailsVisible(false)}
              className="absolute top-[12px] right-[12px] w-[44px] h-[44px] items-center justify-center z-[10]"
            >
              <View
                className="w-[32px] h-[32px] rounded-[999px] bg-[#F2F5F9] items-center justify-center"
              >
                <Feather name="x" size={16} color={C.body} />
              </View>
            </TouchableOpacity>

            <View className="items-center pt-[8px]">
              <View className={`w-[76px] h-[76px] rounded-[26px] items-center justify-center ${tone.accentTintBg}`}>
                <Text className={`font-sans-semibold text-[24px] ${tone.accentInkText}`}>
                  {getInitials(partnerName)}
                </Text>
              </View>
              <Text
                className="font-sans-semibold text-[20px] tracking-[-0.4px] text-[#0C1524] mt-[14px] text-center"
              >
                {partnerName}
              </Text>
              <Text className="font-sans-medium text-[12.5px] text-[#5C7291] mt-[4px]">
                {isCurrentUserCustomer ? contactPerson?.role || 'Your support agent' : `Ticket #${ticket?.ticket_no || '—'}`}
              </Text>
            </View>

            <ScrollView className="shrink my-[18px]" showsVerticalScrollIndicator={false}>
              {contactRows.length > 0 ? (
                <>
                  <SheetLabel>Reach them directly</SheetLabel>
                  <InfoGroup>
                    {contactRows.map((row, index) => (
                      <InfoRow
                        key={row.label}
                        row={row}
                        first={index === 0}
                        onPress={row.action ? () => handleContactAction(row) : null}
                      />
                    ))}
                  </InfoGroup>
                </>
              ) : null}

              <SheetLabel className={contactRows.length ? 'mt-[20px]' : 'mt-0'}>This ticket</SheetLabel>
              <InfoGroup>
                {ticketInfoRows.map((row, index) => (
                  <InfoRow key={row.label} row={row} first={index === 0} status={ticket?.status} />
                ))}
              </InfoGroup>

              {!isCurrentUserCustomer ? (
                <>
                  <SheetLabel className="mt-[20px]">Assigned agent</SheetLabel>
                  <InfoGroup>
                    <View className="flex-row items-center py-[13px]">
                      <View
                        className="w-[44px] h-[44px] rounded-[15px] bg-[#EAF2FE] items-center justify-center mr-[12px]"
                      >
                        <Text className="font-sans-semibold text-[14.5px] text-[#1B5FC0]">
                          {getInitials(agentName)}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text numberOfLines={1} className="font-sans-semibold text-[14px] text-[#0C1524]">
                          {agentName}
                        </Text>
                        <Text numberOfLines={1} className="font-sans-medium text-[12px] text-[#5C7291] mt-[2px]">
                          {ticket?.assigned_employee?.role || 'Support agent'}
                        </Text>
                      </View>
                    </View>
                  </InfoGroup>
                </>
              ) : null}

              {/* RCA — second entry point, reachable after dismissing the prompt */}
              {isStaff && tone.closed ? (
                <>
                  <SheetLabel className="mt-[20px]">Root cause analysis</SheetLabel>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                      setDetailsVisible(false);
                      setRcaVisible(true);
                    }}
                    className="flex-row items-center gap-[12px] bg-[#FEF1E7] rounded-[20px] px-[12px] std:px-[16px] py-[15px]"
                  >
                    <View
                      className="w-[36px] h-[36px] rounded-[12px] bg-[#FBE4D2] items-center justify-center"
                    >
                      <Feather name="edit-3" size={16} color={C.amber} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-sans-semibold text-[12.5px] text-[#0C1524]">
                        {ticket?.rca ? 'Edit the analysis' : 'Write the analysis'}
                      </Text>
                      <Text className="font-sans-medium text-[11.5px] text-[#8A6A52] mt-[2px]">
                        {ticket?.rca ? 'Written · visible to the customer' : 'Not written yet'}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={18} color="#D3B69E" />
                  </TouchableOpacity>
                </>
              ) : null}
            </ScrollView>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setDetailsVisible(false)}
              className="bg-[#0C1524] rounded-[999px] h-[50px] items-center justify-center"
            >
              <Text className="font-sans-semibold text-[15px] text-[#FFFFFF]">
                Back to chat
              </Text>
            </TouchableOpacity>
      </Sheet>

      {/* RCA SHEET — agent and admin, on a resolved or closed ticket */}
      <Sheet
        visible={isRcaVisible}
        onClose={() => setRcaVisible(false)}
        animationType="fade"
        dismissOnBackdrop={false}
        maxHeightRatio={0.88}
        backdropClassName="bg-[rgba(12,21,36,0.38)]"
        className="bg-[#FFFFFF] rounded-tl-[30px] rounded-tr-[30px] px-[18px] pt-[12px] pb-[20px]"
      >
            <View
              className="w-[40px] h-[4px] rounded-[999px] bg-[#DEE5EE] self-center mb-[16px]"
            />
            <View className="flex-row items-center mb-[16px]">
              <View className="flex-1">
                <Text className="font-sans-semibold text-[16px] tracking-[-0.3px] text-[#0C1524]">
                  Root cause analysis
                </Text>
                <Text className="font-sans-medium text-[12.5px] text-[#5C7291] mt-[4px]">
                  What went wrong and what you did. The customer sees this.
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setRcaVisible(false)}
                className="w-[44px] h-[44px] items-center justify-center"
              >
                <View
                  className="w-[32px] h-[32px] rounded-[999px] bg-[#F2F5F9] items-center justify-center"
                >
                  <Feather name="x" size={16} color={C.body} />
                </View>
              </TouchableOpacity>
            </View>

            <ScrollView className="shrink" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <TicketRCAForm ticket={ticket} onDone={() => setRcaVisible(false)} />
            </ScrollView>
      </Sheet>
    </Ground>
  );
}

/* ------------------------------------------------------------------
   GROUND — the gradient every screen state sits on
------------------------------------------------------------------ */
function Ground({ colors, children }) {
  return (
    <View className="flex-1 bg-white">
      <LinearGradient colors={colors} locations={[0, 0.34, 1]} className="absolute inset-0" />
      {children}
    </View>
  );
}

function RoundButton({ icon, onPress }) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      className="w-[46px] h-[46px] rounded-[999px] bg-[#FFFFFF] items-center justify-center"
      style={sx.shadowFloat}
    >
      <Feather name={icon} size={19} color="#101828" />
    </TouchableOpacity>
  );
}

function LivePulse({ color, dotClass }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const ringStyle = useMemo(
    () => [
      sx.pulseRing,
      {
        backgroundColor: color,
        opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
        transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) }],
      },
    ],
    [color, pulse],
  );
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1100, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View className="w-[8px] h-[8px] items-center justify-center">
      <Animated.View style={ringStyle} />
      <View className={`w-[8px] h-[8px] rounded-[999px] ${dotClass}`} />
    </View>
  );
}

/* ------------------------------------------------------------------
   CARDS
------------------------------------------------------------------ */
function StatTile({ icon, tint, iconColor, title, value }) {
  return (
    <View className="flex-1 bg-[#FFFFFF] rounded-[20px] p-[15px]" style={sx.shadowCard}>
      <View className={`w-[36px] h-[36px] rounded-[12px] items-center justify-center ${tint}`}>
        <Feather name={icon} size={16} color={iconColor} />
      </View>
      <Text className="font-sans-semibold text-[13.5px] text-[#0C1524] mt-[12px]">
        {title}
      </Text>
      <Text numberOfLines={2} className="font-sans-medium text-[12px] leading-[16px] text-[#5C7291] mt-[3px]">
        {value}
      </Text>
    </View>
  );
}

function StepsCard({ steps, accentText, accentBg }) {
  return (
    <View className="bg-[#FFFFFF] rounded-[22px] p-[18px] mb-[16px]" style={sx.shadowCard}>
      <Text className="font-sans-semibold text-[12.5px] text-[#0C1524] mb-[16px]">
        What happens next
      </Text>

      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const done = step.state === 'done';
        const now = step.state === 'now';
        return (
          <View key={step.title} className="flex-row gap-[13px]">
            <View className="w-[22px] items-center">
              <View
                className={`w-[22px] h-[22px] rounded-[999px] items-center justify-center ${done ? 'bg-[#DFF3EA]' : now ? 'bg-[#EAF2FE]' : 'bg-[#F2F5F9]'}`}
              >
                {done ? <Feather name="check" size={11} color={C.green} /> : null}
                {now ? <View className={`w-[8px] h-[8px] rounded-[999px] ${accentBg}`} /> : null}
              </View>
              {!isLast ? <View className="flex-1 w-[2px] bg-[#EDF1F7] my-[4px]" /> : null}
            </View>

            <View className={`flex-1 ${isLast ? 'pb-0' : 'pb-[16px]'}`}>
              <Text
                className={`${now ? 'font-sans-semibold' : 'font-sans-medium'} text-[13.5px] leading-[19px] ${now || done ? 'text-[#0C1524]' : 'text-[#5C7291]'}`}
              >
                {step.title}
              </Text>
              <Text
                className={`${now ? 'font-sans-semibold' : 'font-sans-medium'} text-[12px] leading-[18px] mt-[3px] ${now ? accentText : 'text-[#6B7A93]'}`}
              >
                {step.note}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function OutcomeCard({ ticket, fixedIn }) {
  const [lightboxUrl, setLightboxUrl] = useState(null);

  if (!ticket?.rca && !ticket?.rca_images?.length) return null;
  return (
    <View className="bg-[#FFFFFF] rounded-[22px] overflow-hidden mt-[14px]" style={sx.shadowCard}>
      <View className="flex-row items-center gap-[11px] px-[18px] pt-[17px]">
        <View
          className="w-[36px] h-[36px] rounded-[12px] bg-[#DFF3EA] items-center justify-center"
        >
          <Feather name="search" size={16} color={C.green} />
        </View>
        <Text className="font-sans-semibold text-[13px] text-[#0C1524]">
          What went wrong
        </Text>
      </View>

      {ticket.rca ? (
        <View className="px-[18px] pt-[15px]">
          <Text className="font-sans-semibold text-[11px] text-[#6B7A93] mb-[5px]">
            Cause and fix
          </Text>
          <Text className="font-sans text-[13.5px] leading-[21px] text-[#26313F]">
            {ticket.rca}
          </Text>
        </View>
      ) : null}

      {ticket.rca_images?.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-[15px] pl-[18px]">
          {ticket.rca_images.map((url) => (
            <TouchableOpacity key={url} activeOpacity={0.85} onPress={() => setLightboxUrl(url)}>
              <Image
                source={{ uri: url }}
                className="w-[56px] h-[56px] rounded-[14px] mr-[9px] bg-[#F2F5F9]"
                contentFit="cover"
                cachePolicy="disk"
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}

      <View className="px-[18px] pt-[15px] pb-[18px]">
        <View className="h-[1px] bg-[#EDF1F7] mb-[13px]" />
        <Text className="font-sans-medium text-[12px] text-[#5C7291]">
          {fixedIn ? `Fixed in ${fixedIn} from when you reported it.` : 'Marked as resolved by our team.'}
        </Text>
      </View>

      <Sheet
        visible={!!lightboxUrl}
        onClose={() => setLightboxUrl(null)}
        variant="full"
        edges={[]}
        animationType="fade"
        keyboard={false}
        className="bg-black"
      >
        <LightboxContent url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      </Sheet>
    </View>
  );
}

function RcaPrompt({ onWrite, onLater }) {
  return (
    <View className="bg-[#FFFFFF] rounded-[22px] p-[12px] std:p-[16px]" style={sx.shadowFloat}>
      <View className="flex-row items-center gap-[11px]">
        <View
          className="w-[38px] h-[38px] rounded-[12px] bg-[#FEF1E7] items-center justify-center"
        >
          <Feather name="edit-3" size={17} color={C.amber} />
        </View>
        <View className="flex-1">
          <Text className="font-sans-semibold text-[13px] text-[#0C1524]">
            Root cause analysis pending
          </Text>
          <Text className="font-sans-medium text-[11.5px] text-[#6B7A93] mt-[2px]">
            Needed before this ticket closes
          </Text>
        </View>
      </View>

      <View className="flex-row gap-[9px] mt-[14px]">
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onWrite}
          className="flex-1 h-[46px] rounded-[999px] bg-[#0C1524] items-center justify-center"
        >
          <Text className="font-sans-semibold text-[13px] text-[#FFFFFF]">
            Write RCA
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onLater}
          className="h-[46px] px-[18px] rounded-[999px] bg-[#F2F5F9] items-center justify-center"
        >
          <Text className="font-sans-semibold text-[13px] text-[#26313F]">
            Later
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ClosedCard({ onReopen }) {
  return (
    <View className="flex-row items-center gap-[13px] bg-[#FFFFFF] rounded-[22px] p-[14px]" style={sx.shadowFloat}>
      <Feather name="lock" size={17} color={C.faint} />
      <View className="flex-1">
        <Text className="font-sans-semibold text-[12.5px] text-[#26313F]">
          This conversation is closed
        </Text>
        <Text className="font-sans-medium text-[11.5px] text-[#6B7A93] mt-[2px]">
          Reopen it if the problem comes back
        </Text>
      </View>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onReopen}
        className="h-[44px] justify-center px-[18px] rounded-[999px] bg-[#EAF2FE]"
      >
        <Text className="font-sans-semibold text-[12.5px] text-[#1B5FC0]">
          Reopen
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/* ------------------------------------------------------------------
   THREAD FURNITURE
------------------------------------------------------------------ */
function DayDivider({ label }) {
  return (
    <View
      className="self-center bg-[rgba(255,255,255,0.7)] rounded-[999px] px-[14px] py-[7px] my-[12px]"
    >
      <Text className="font-sans-semibold text-[11px] text-[#5C7291]">
        {label}
      </Text>
    </View>
  );
}

function SystemPill({ event }) {
  const config = getEventConfig(event.event_type);
  return (
    <View className="items-center my-[9px] px-[12px] std:px-[16px]">
      <View
        className="flex-row items-start gap-[8px] bg-[rgba(255,255,255,0.7)] rounded-[20px] px-[15px] py-[8px]"
      >
        <View className="mt-[2px]">
          <Feather name={config.icon || 'info'} size={12} color={C.muted} />
        </View>
        <Text className="font-sans-medium text-[12px] leading-[17px] text-[#5C7291] shrink">
          {event.actor_name ? (
            <Text className="font-sans-semibold text-[#26313F]">
              {event.actor_name}{' '}
            </Text>
          ) : null}
          {event.message || config.label}
          <Text>{`  ·  ${clockTime(event.created_at)}`}</Text>
        </Text>
      </View>
    </View>
  );
}

function MessageBubble({ event, isMe, runStart, runEnd, tone }) {
  const attachments = event.metadata?.attachments || [];
  const images = attachments.filter((url) => getAttachmentType(url) === 'image');
  const videos = attachments.filter((url) => getAttachmentType(url) === 'video');
  const documents = attachments.filter((url) => getAttachmentType(url) === 'document');

  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [downloadingUrl, setDownloadingUrl] = useState(null);

  const handleFilePress = async (url) => {
    if (downloadingUrl) return;
    try {
      setDownloadingUrl(url);
      await downloadAndOpenDocument(url, getAttachmentFileName(url));
    } catch (err) {
      Alert.alert('Download failed', 'This file could not be downloaded. Please try again.');
    } finally {
      setDownloadingUrl(null);
    }
  };

  // 20 for the rounded corners, 7 for the tail corner.
  const radius = isMe
    ? `rounded-tl-[20px] rounded-bl-[20px] rounded-br-[7px] ${runStart ? 'rounded-tr-[20px]' : 'rounded-tr-[7px]'}`
    : `rounded-tr-[20px] rounded-br-[20px] rounded-bl-[7px] ${runStart ? 'rounded-tl-[20px]' : 'rounded-tl-[7px]'}`;

  const imageOnly = !event.message && images.length > 0;

  return (
    <View
      className={`flex-row items-end ${isMe ? 'justify-end' : 'justify-start'} ${runStart ? 'mt-[8px]' : 'mt-[4px]'}`}
    >
      {!isMe ? (
        runEnd ? (
          <View
            className="w-[32px] h-[32px] rounded-[999px] bg-[#FFFFFF] items-center justify-center mr-[10px] mb-[2px]"
            style={sx.shadowCard}
          >
            <Text className={`font-sans-semibold text-[12px] ${tone.accentText}`}>
              {event.actor_name ? event.actor_name.charAt(0).toUpperCase() : 'S'}
            </Text>
          </View>
        ) : (
          <View className="w-[42px]" />
        )
      ) : null}

      <View
        className={`max-w-[82%] overflow-hidden ${imageOnly ? 'p-[5px]' : 'p-0'} ${isMe ? tone.bubbleBg : 'bg-[#FFFFFF]'} ${radius}`}
        style={isMe ? undefined : sx.shadowCard}
      >
        {!isMe && runStart ? (
          <Text
            className={`font-sans-semibold text-[11.5px] px-[12px] std:px-[16px] pt-[13px] ${tone.accentText}`}
          >
            {event.actor_name || 'Support'}
          </Text>
        ) : null}

        {event.message ? (
          <Text
            className={`font-sans text-[15.5px] leading-[23px] text-[#0C1524] px-[12px] std:px-[16px] ${!isMe && runStart ? 'pt-[5px]' : 'pt-[13px]'}`}
          >
            {event.message}
          </Text>
        ) : null}

        {images.map((url, i) => (
          <TouchableOpacity
            key={url}
            activeOpacity={0.85}
            onPress={() => setLightboxUrl(url)}
            className={`${imageOnly && i === 0 ? 'mt-0' : 'mt-[8px]'}`}
          >
            <Image
              source={{ uri: url }}
              contentFit="cover"
              className={`w-[232px] h-[150px] ${imageOnly ? 'rounded-[16px]' : 'rounded-none'}`}
              cachePolicy="disk"
              transition={150}
            />
            {imageOnly && i === images.length - 1 ? (
              <View
                className="absolute right-[9px] bottom-[9px] bg-[rgba(12,21,36,0.55)] rounded-[999px] px-[9px] py-[4px]"
              >
                <Text className="font-sans-medium text-[11px] text-[#FFFFFF]">
                  {clockTime(event.created_at)}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        ))}

        {videos.length > 0 ? (
          <View className="px-[10px] pt-[10px]">
            {videos.map((url) => (
              <AttachmentRow
                key={url}
                icon="film"
                actionIcon="play-circle"
                title={prettyFileName(url).title}
                meta="Video · tap to play"
                isMe={isMe}
                isDownloading={downloadingUrl === url}
                onPress={() => handleFilePress(url)}
              />
            ))}
          </View>
        ) : null}

        {documents.length > 0 ? (
          <View className="px-[10px] pt-[10px]">
            {documents.map((url) => {
              const { title, ext } = prettyFileName(url);
              return (
                <AttachmentRow
                  key={url}
                  icon="file-text"
                  actionIcon="arrow-down-circle"
                  title={title}
                  meta={`${ext} · tap to open`}
                  isMe={isMe}
                  isDownloading={downloadingUrl === url}
                  onPress={() => handleFilePress(url)}
                />
              );
            })}
          </View>
        ) : null}

        {!imageOnly ? (
          <View className="items-end px-[12px] std:px-[16px] pb-[10px] pt-[5px]">
            <Text className={`font-sans-medium text-[11.5px] ${isMe ? tone.bubbleMetaText : 'text-[#8397B0]'}`}>
              {clockTime(event.created_at)}
            </Text>
          </View>
        ) : null}
      </View>

      <Sheet
        visible={!!lightboxUrl}
        onClose={() => setLightboxUrl(null)}
        variant="full"
        edges={[]}
        animationType="fade"
        keyboard={false}
        className="bg-black"
      >
        <LightboxContent url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      </Sheet>
    </View>
  );
}

function AttachmentRow({ icon, actionIcon, title, meta, isMe, isDownloading, onPress }) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={isDownloading}
      className={`flex-row items-center gap-[11px] rounded-[15px] px-[12px] py-[11px] mb-[4px] min-w-[210px] ${isMe ? 'bg-[rgba(255,255,255,0.6)]' : 'bg-[#F2F5F9]'}`}
    >
      <View
        className="w-[36px] h-[36px] rounded-[12px] bg-[#EAF2FE] items-center justify-center"
      >
        <Feather name={icon} size={16} color={C.blue} />
      </View>
      <View className="flex-1 min-w-0">
        <Text numberOfLines={1} className="font-sans-semibold text-[13px] text-[#0C1524]">
          {title}
        </Text>
        <Text className="font-sans-medium text-[11.5px] text-[#5C7291] mt-[2px]">
          {meta}
        </Text>
      </View>
      {isDownloading ? <ActivityIndicator size="small" color={C.muted} /> : <Feather name={actionIcon} size={19} color={C.soft} />}
    </TouchableOpacity>
  );
}

/* ------------------------------------------------------------------
   SHEET PIECES
------------------------------------------------------------------ */
function SheetLabel({ children, className = '' }) {
  return (
    <Text className={`font-sans-semibold text-[11.5px] text-[#6B7A93] ml-[4px] mb-[8px] ${className}`}>
      {children}
    </Text>
  );
}

function InfoGroup({ children }) {
  return (
    <View className="bg-[#FFFFFF] rounded-[20px] px-[14px]" style={sx.shadowCard}>{children}</View>
  );
}

function InfoRow({ row, first, status, onPress }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      {...(onPress ? { activeOpacity: 0.6, onPress } : {})}
      className={`flex-row items-center min-h-[58px] py-[12px] border-t-[#EDF1F7] ${first ? 'border-t-0' : 'border-t'}`}
    >
      <View
        className="w-[36px] h-[36px] rounded-[12px] bg-[#EAF2FE] items-center justify-center mr-[12px]"
      >
        <Feather name={row.icon} size={15} color={C.blue} />
      </View>
      <View className="flex-1">
        <Text className="font-sans-medium text-[11.5px] text-[#6B7A93]">
          {row.label}
        </Text>
        {row.isStatus ? (
          <View className="flex-row items-center mt-[3px]">
            <View
              className={`w-[8px] h-[8px] rounded-[999px] mr-[7px] ${STATUS_DOT_CLASSES[status] || 'bg-[#8397B0]'}`}
            />
            <Text className="font-sans-semibold text-[14px] text-[#0C1524]">
              {statusLabel(status)}
            </Text>
          </View>
        ) : (
          <Text numberOfLines={2} className="font-sans-semibold text-[14px] text-[#0C1524] mt-[2px]">
            {row.value}
          </Text>
        )}
      </View>
      {onPress ? <Feather name="chevron-right" size={18} color="#C3CDDB" /> : null}
    </Wrapper>
  );
}




const sx = StyleSheet.create({
  shadowCard: {
    shadowColor: '#1C365C',
    shadowOpacity: 0.07,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  shadowFloat: {
    shadowColor: '#1C365C',
    shadowOpacity: 0.09,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  pulseRing: { position: 'absolute', width: 8, height: 8, borderRadius: 999 },
});
