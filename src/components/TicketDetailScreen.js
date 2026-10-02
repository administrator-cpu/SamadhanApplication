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
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTicket } from '../hooks/useTickets';
import { useTicketSocket } from '../hooks/useTicketSocket';
import { useAuthStore } from '../store/authStore';
import { getEventConfig } from '../utils/eventType';
import { STATUS_DOT_COLORS, statusLabel } from '../utils/ticketStatus';
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

const SHADOW_CARD = {
  shadowColor: '#1C365C',
  shadowOpacity: 0.07,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
};

const SHADOW_FLOAT = {
  shadowColor: '#1C365C',
  shadowOpacity: 0.09,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 5 },
  elevation: 5,
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
      accentInk: C.greenInk,
      accentTint: C.greenTint,
      bubble: C.bubbleGreen,
      bubbleMeta: C.bubbleGreenMeta,
      headline: 'All fixed',
      pillText: C.greenInk,
    };
  }
  if (s === 'ESCALATED') {
    return {
      index: 1,
      closed: false,
      ground: GRADIENT.live,
      accent: C.danger,
      accentInk: '#96271B',
      accentTint: C.dangerTint,
      bubble: C.bubbleBlue,
      bubbleMeta: C.bubbleBlueMeta,
      headline: 'Escalated to our\nsenior engineers',
      pillText: '#96271B',
    };
  }
  if (s === 'IN_PROGRESS' || s === 'REOPENED') {
    return {
      index: 1,
      closed: false,
      ground: GRADIENT.live,
      accent: C.blue,
      accentInk: C.blueInk,
      accentTint: C.blueTint,
      bubble: C.bubbleBlue,
      bubbleMeta: C.bubbleBlueMeta,
      headline: "We're on it,\nnothing needed from you",
      pillText: C.blueDeep,
    };
  }
  return {
    index: 0,
    closed: false,
    ground: GRADIENT.live,
    accent: C.blue,
    accentInk: C.blueInk,
    accentTint: C.blueTint,
    bubble: C.bubbleBlue,
    bubbleMeta: C.bubbleBlueMeta,
    headline: "We've got your\nreport",
    pillText: C.blueDeep,
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
  const insets = useSafeAreaInsets();
  useTicketSocket(id);

  const [isMenuVisible, setMenuVisible] = useState(false);
  const [isDetailsVisible, setDetailsVisible] = useState(false);
  const [isRcaVisible, setRcaVisible] = useState(false);
  const [isRcaDismissed, setRcaDismissed] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const scrollViewRef = useRef(null);
  const scrollToBottom = (animated = true) => scrollViewRef.current?.scrollToEnd({ animated });

  const isCurrentUserCustomer = user?.role === 'USER';
  const isStaff = user?.role === 'ADMIN' || user?.role === 'SUPPORT_AGENT';

  // No nav bar at all — the chrome is two floating buttons over the gradient.
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    const showEvent = Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow';
    const hideEvent = Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide';
    const showSub = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
      requestAnimationFrame(() => scrollToBottom(true));
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.blue} />
          <Text className="font-sans-medium" style={{ fontSize: 13, color: C.muted, marginTop: 14 }}>
            Loading your conversation…
          </Text>
        </View>
      </Ground>
    );
  }

  if (isError) {
    return (
      <Ground colors={GRADIENT.live}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 }}>
          <View
            style={{
              width: 62,
              height: 62,
              borderRadius: 20,
              backgroundColor: C.dangerTint,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}
          >
            <Feather name="wifi-off" size={26} color={C.danger} />
          </View>
          <Text
            className="font-sans-semibold"
            style={{ fontSize: 20, letterSpacing: -0.4, color: C.ink, marginBottom: 8, textAlign: 'center' }}
          >
            We couldn't load this chat
          </Text>
          <Text
            className="font-sans-medium"
            style={{ fontSize: 13.5, lineHeight: 21, color: C.muted, textAlign: 'center', marginBottom: 26 }}
          >
            {error?.message || 'Your ticket is safe — this is just a connection hiccup.'}
          </Text>
          <Pressable
            onPress={() => refetch()}
            style={{ backgroundColor: C.ink, paddingHorizontal: 28, height: 50, borderRadius: 999, justifyContent: 'center' }}
          >
            <Text className="font-sans-semibold" style={{ fontSize: 15, color: '#FFFFFF' }}>
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* FLOATING CHROME — the only pinned elements */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: insets.top + 8,
            paddingHorizontal: 14,
            paddingBottom: 2,
          }}
        >
          <RoundButton icon="arrow-left" onPress={() => router.back()} />

          {/* IDENTITY PILL — who + which ticket, opens the details sheet */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setDetailsVisible(true)}
            style={[
              {
                flex: 1,
                marginHorizontal: 9,
                height: 52,
                borderRadius: 999,
                backgroundColor: C.surface,
                flexDirection: 'row',
                alignItems: 'center',
                paddingLeft: 7,
                paddingRight: 12,
                gap: 10,
              },
              SHADOW_FLOAT,
            ]}
          >
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 999,
                backgroundColor: tone.accentTint,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text className="font-sans-semibold" style={{ fontSize: 13, color: tone.accentInk }}>
                {getInitials(partnerName)}
              </Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} className="font-sans-semibold" style={{ fontSize: 13, color: C.ink }}>
                {partnerName}
              </Text>
              <Text numberOfLines={1} className="font-sans-medium" style={{ fontSize: 11, color: C.soft, marginTop: 2 }}>
                {[`#${ticket?.ticket_no || '—'}`, statusLabel(ticket?.status), !isCurrentUserCustomer && ticket?.priority]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
            <Feather name="chevron-down" size={16} color={C.faint} />
          </TouchableOpacity>
          {contactPerson?.email && (
            <CallButton toEmail={contactPerson.email} ticketId={ticket?.id} />
          )}
          <RoundButton icon="more-vertical" onPress={() => setMenuVisible(true)} />
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 12 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollToBottom(true)}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={tone.accent} />}
        >
          {/* HEADLINE — scrolls away with the thread */}
          <View style={{ alignItems: 'center', paddingHorizontal: 6, paddingBottom: 6 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 7,
                backgroundColor: 'rgba(255,255,255,0.72)',
                borderRadius: 999,
                paddingHorizontal: 13,
                paddingVertical: 6,
              }}
            >
              {tone.closed ? (
                <Feather name="check" size={12} color={C.green} />
              ) : (
                <LivePulse color={tone.accent} />
              )}
              <Text className="font-sans-semibold" style={{ fontSize: 11.5, color: tone.pillText }}>
                {statusPill}
              </Text>
            </View>

            <Text
              className="font-sans-semibold"
              style={{
                fontSize: 27,
                lineHeight: 32,
                letterSpacing: -0.8,
                color: C.ink,
                textAlign: 'center',
                marginTop: 13,
              }}
            >
              {tone.headline}
            </Text>

            <Text
              className="font-sans-medium"
              style={{ fontSize: 13, lineHeight: 19.5, color: C.muted, textAlign: 'center', marginTop: 9 }}
            >
              {subline}
            </Text>
          </View>

          {/* TWO-UP STATS */}
          <View style={{ flexDirection: 'row', gap: 11, marginTop: 18, marginBottom: 13 }}>
            <StatTile
              icon="wifi"
              tint={C.blueTint}
              iconColor={C.blue}
              title="Your line"
              value={ticket?.circuit_description || 'Not specified'}
            />
            <StatTile
              icon="clock"
              tint={C.amberTint}
              iconColor={C.amber}
              title="Reported"
              value={stampPhrase(ticket?.created_at)}
            />
          </View>

          {/* WHAT HAPPENS NEXT — live tickets only */}
          {!tone.closed ? (
            <StepsCard steps={getSteps(ticket?.status, isCurrentUserCustomer ? agentName : null)} accent={tone.accent} />
          ) : null}

          {/* THREAD */}
          {timeline.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 30 }}>
              <Text className="font-sans-medium" style={{ fontSize: 13.5, color: C.faint }}>
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
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 6,
            paddingBottom: isKeyboardVisible ? 8 : insets.bottom + 8,
            gap: 11,
          }}
        >
          {/* Resolved or closed + staff + no RCA yet → write it right here */}
          {tone.closed && isStaff && !ticket?.rca && !isRcaDismissed && !isKeyboardVisible ? (
            <RcaPrompt onWrite={() => setRcaVisible(true)} onLater={() => setRcaDismissed(true)} />
          ) : null}

          {tone.closed && !isStaff ? (
            <ClosedCard onReopen={() => setMenuVisible(true)} />
          ) : (
            <View style={[{ backgroundColor: C.surface, borderRadius: 26, paddingHorizontal: 6, paddingVertical: 4 }, SHADOW_FLOAT]}>
              <TicketReplyForm ticket={ticket} />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* MANAGE SHEET */}
      <Modal visible={isMenuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(12,21,36,0.38)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{
              backgroundColor: C.surface,
              borderTopLeftRadius: 30,
              borderTopRightRadius: 30,
              paddingHorizontal: 18,
              paddingTop: 12,
              paddingBottom: insets.bottom + 26,
              maxHeight: '82%',
            }}
          >
            <View
              style={{ width: 40, height: 4, borderRadius: 999, backgroundColor: '#DEE5EE', alignSelf: 'center', marginBottom: 18 }}
            />
            <Text className="font-sans-semibold" style={{ fontSize: 16, letterSpacing: -0.3, color: C.ink, textAlign: 'center' }}>
              What would you like to do?
            </Text>
            <Text className="font-sans-medium" style={{ fontSize: 12.5, color: C.muted, textAlign: 'center', marginTop: 5, marginBottom: 18 }}>
              Nothing here sends a message on its own.
            </Text>

            <TicketStatusActions ticket={ticket} />
            <TicketStaffTools ticket={ticket} />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* DETAILS SHEET */}
      <Modal visible={isDetailsVisible} transparent animationType="fade" onRequestClose={() => setDetailsVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(12,21,36,0.38)', justifyContent: 'center', padding: 18 }}>
          <View style={{ backgroundColor: C.surface, borderRadius: 30, padding: 22, maxHeight: '86%' }}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setDetailsVisible(false)}
              style={{ position: 'absolute', top: 12, right: 12, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
            >
              <View
                style={{ width: 32, height: 32, borderRadius: 999, backgroundColor: C.chipGrey, alignItems: 'center', justifyContent: 'center' }}
              >
                <Feather name="x" size={16} color={C.body} />
              </View>
            </TouchableOpacity>

            <View style={{ alignItems: 'center', paddingTop: 8 }}>
              <View
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: 26,
                  backgroundColor: tone.accentTint,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text className="font-sans-semibold" style={{ fontSize: 24, color: tone.accentInk }}>
                  {getInitials(partnerName)}
                </Text>
              </View>
              <Text
                className="font-sans-semibold"
                style={{ fontSize: 20, letterSpacing: -0.4, color: C.ink, marginTop: 14, textAlign: 'center' }}
              >
                {partnerName}
              </Text>
              <Text className="font-sans-medium" style={{ fontSize: 12.5, color: C.muted, marginTop: 4 }}>
                {isCurrentUserCustomer ? contactPerson?.role || 'Your support agent' : `Ticket #${ticket?.ticket_no || '—'}`}
              </Text>
            </View>

            <ScrollView style={{ flexShrink: 1, marginVertical: 18 }} showsVerticalScrollIndicator={false}>
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

              <SheetLabel style={{ marginTop: contactRows.length ? 20 : 0 }}>This ticket</SheetLabel>
              <InfoGroup>
                {ticketInfoRows.map((row, index) => (
                  <InfoRow key={row.label} row={row} first={index === 0} status={ticket?.status} />
                ))}
              </InfoGroup>

              {!isCurrentUserCustomer ? (
                <>
                  <SheetLabel style={{ marginTop: 20 }}>Assigned agent</SheetLabel>
                  <InfoGroup>
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13 }}>
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 15,
                          backgroundColor: C.blueTint,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 12,
                        }}
                      >
                        <Text className="font-sans-semibold" style={{ fontSize: 14.5, color: C.blueInk }}>
                          {getInitials(agentName)}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} className="font-sans-semibold" style={{ fontSize: 14, color: C.ink }}>
                          {agentName}
                        </Text>
                        <Text numberOfLines={1} className="font-sans-medium" style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
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
                  <SheetLabel style={{ marginTop: 20 }}>Root cause analysis</SheetLabel>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                      setDetailsVisible(false);
                      setRcaVisible(true);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      backgroundColor: C.amberTint,
                      borderRadius: 20,
                      paddingHorizontal: 16,
                      paddingVertical: 15,
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 12,
                        backgroundColor: '#FBE4D2',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Feather name="edit-3" size={16} color={C.amber} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text className="font-sans-semibold" style={{ fontSize: 12.5, color: C.ink }}>
                        {ticket?.rca ? 'Edit the analysis' : 'Write the analysis'}
                      </Text>
                      <Text className="font-sans-medium" style={{ fontSize: 11.5, color: '#8A6A52', marginTop: 2 }}>
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
              style={{ backgroundColor: C.ink, borderRadius: 999, height: 50, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text className="font-sans-semibold" style={{ fontSize: 15, color: '#FFFFFF' }}>
                Back to chat
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* RCA SHEET — agent and admin, on a resolved or closed ticket */}
      <Modal visible={isRcaVisible} transparent animationType="fade" onRequestClose={() => setRcaVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(12,21,36,0.38)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: C.surface,
              borderTopLeftRadius: 30,
              borderTopRightRadius: 30,
              paddingHorizontal: 18,
              paddingTop: 12,
              paddingBottom: insets.bottom + 20,
              maxHeight: '88%',
            }}
          >
            <View
              style={{ width: 40, height: 4, borderRadius: 999, backgroundColor: '#DEE5EE', alignSelf: 'center', marginBottom: 16 }}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text className="font-sans-semibold" style={{ fontSize: 16, letterSpacing: -0.3, color: C.ink }}>
                  Root cause analysis
                </Text>
                <Text className="font-sans-medium" style={{ fontSize: 12.5, color: C.muted, marginTop: 4 }}>
                  What went wrong and what you did. The customer sees this.
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setRcaVisible(false)}
                style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 999,
                    backgroundColor: C.chipGrey,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Feather name="x" size={16} color={C.body} />
                </View>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <TicketRCAForm ticket={ticket} onDone={() => setRcaVisible(false)} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Ground>
  );
}

/* ------------------------------------------------------------------
   GROUND — the gradient every screen state sits on
------------------------------------------------------------------ */
function Ground({ colors, children }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors[0] }}>
      <LinearGradient colors={colors} locations={[0, 0.34, 1]} style={StyleSheet.absoluteFill} />
      {children}
    </View>
  );
}

function RoundButton({ icon, onPress }) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        {
          width: 46,
          height: 46,
          borderRadius: 999,
          backgroundColor: C.surface,
          alignItems: 'center',
          justifyContent: 'center',
        },
        SHADOW_FLOAT,
      ]}
    >
      <Feather name={icon} size={19} color="#101828" />
    </TouchableOpacity>
  );
}

function LivePulse({ color }) {
  const pulse = useRef(new Animated.Value(0)).current;
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
    <View style={{ width: 8, height: 8, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: 8,
          height: 8,
          borderRadius: 999,
          backgroundColor: color,
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) }],
        }}
      />
      <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: color }} />
    </View>
  );
}

/* ------------------------------------------------------------------
   CARDS
------------------------------------------------------------------ */
function StatTile({ icon, tint, iconColor, title, value }) {
  return (
    <View style={[{ flex: 1, backgroundColor: C.surface, borderRadius: 20, padding: 15 }, SHADOW_CARD]}>
      <View
        style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: tint, alignItems: 'center', justifyContent: 'center' }}
      >
        <Feather name={icon} size={16} color={iconColor} />
      </View>
      <Text className="font-sans-semibold" style={{ fontSize: 13.5, color: C.ink, marginTop: 12 }}>
        {title}
      </Text>
      <Text numberOfLines={2} className="font-sans-medium" style={{ fontSize: 12, lineHeight: 16, color: C.muted, marginTop: 3 }}>
        {value}
      </Text>
    </View>
  );
}

function StepsCard({ steps, accent }) {
  return (
    <View style={[{ backgroundColor: C.surface, borderRadius: 22, padding: 18, marginBottom: 16 }, SHADOW_CARD]}>
      <Text className="font-sans-semibold" style={{ fontSize: 12.5, color: C.ink, marginBottom: 16 }}>
        What happens next
      </Text>

      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const done = step.state === 'done';
        const now = step.state === 'now';
        return (
          <View key={step.title} style={{ flexDirection: 'row', gap: 13 }}>
            <View style={{ width: 22, alignItems: 'center' }}>
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  backgroundColor: done ? C.greenTint : now ? C.blueTint : C.chipGrey,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {done ? <Feather name="check" size={11} color={C.green} /> : null}
                {now ? <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: accent }} /> : null}
              </View>
              {!isLast ? <View style={{ flex: 1, width: 2, backgroundColor: C.hair, marginVertical: 4 }} /> : null}
            </View>

            <View style={{ flex: 1, paddingBottom: isLast ? 0 : 16 }}>
              <Text
                className={now ? 'font-sans-semibold' : 'font-sans-medium'}
                style={{ fontSize: 13.5, lineHeight: 19, color: now || done ? C.ink : C.muted }}
              >
                {step.title}
              </Text>
              <Text
                className={now ? 'font-sans-semibold' : 'font-sans-medium'}
                style={{ fontSize: 12, lineHeight: 18, color: now ? accent : C.soft, marginTop: 3 }}
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
    <View style={[{ backgroundColor: C.surface, borderRadius: 22, overflow: 'hidden', marginTop: 14 }, SHADOW_CARD]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 18, paddingTop: 17 }}>
        <View
          style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.greenTint, alignItems: 'center', justifyContent: 'center' }}
        >
          <Feather name="search" size={16} color={C.green} />
        </View>
        <Text className="font-sans-semibold" style={{ fontSize: 13, color: C.ink }}>
          What went wrong
        </Text>
      </View>

      {ticket.rca ? (
        <View style={{ paddingHorizontal: 18, paddingTop: 15 }}>
          <Text className="font-sans-semibold" style={{ fontSize: 11, color: C.soft, marginBottom: 5 }}>
            Cause and fix
          </Text>
          <Text className="font-sans" style={{ fontSize: 13.5, lineHeight: 21, color: C.body }}>
            {ticket.rca}
          </Text>
        </View>
      ) : null}

      {ticket.rca_images?.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 15, paddingLeft: 18 }}>
          {ticket.rca_images.map((url) => (
            <TouchableOpacity key={url} activeOpacity={0.85} onPress={() => setLightboxUrl(url)}>
              <Image
                source={{ uri: url }}
                style={{ width: 56, height: 56, borderRadius: 14, marginRight: 9, backgroundColor: C.chipGrey }}
                contentFit="cover"
                cachePolicy="disk"
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}

      <View style={{ paddingHorizontal: 18, paddingTop: 15, paddingBottom: 18 }}>
        <View style={{ height: 1, backgroundColor: C.hair, marginBottom: 13 }} />
        <Text className="font-sans-medium" style={{ fontSize: 12, color: C.muted }}>
          {fixedIn ? `Fixed in ${fixedIn} from when you reported it.` : 'Marked as resolved by our team.'}
        </Text>
      </View>

      <Modal visible={!!lightboxUrl} transparent={false} animationType="fade" onRequestClose={() => setLightboxUrl(null)}>
        <LightboxContent url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      </Modal>
    </View>
  );
}

function RcaPrompt({ onWrite, onLater }) {
  return (
    <View style={[{ backgroundColor: C.surface, borderRadius: 22, padding: 16 }, SHADOW_FLOAT]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: C.amberTint,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Feather name="edit-3" size={17} color={C.amber} />
        </View>
        <View style={{ flex: 1 }}>
          <Text className="font-sans-semibold" style={{ fontSize: 13, color: C.ink }}>
            Root cause analysis pending
          </Text>
          <Text className="font-sans-medium" style={{ fontSize: 11.5, color: C.soft, marginTop: 2 }}>
            Needed before this ticket closes
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 9, marginTop: 14 }}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onWrite}
          style={{ flex: 1, height: 46, borderRadius: 999, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text className="font-sans-semibold" style={{ fontSize: 13, color: '#FFFFFF' }}>
            Write RCA
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onLater}
          style={{
            height: 46,
            paddingHorizontal: 18,
            borderRadius: 999,
            backgroundColor: C.chipGrey,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text className="font-sans-semibold" style={{ fontSize: 13, color: C.body }}>
            Later
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ClosedCard({ onReopen }) {
  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: C.surface, borderRadius: 22, padding: 14 },
        SHADOW_FLOAT,
      ]}
    >
      <Feather name="lock" size={17} color={C.faint} />
      <View style={{ flex: 1 }}>
        <Text className="font-sans-semibold" style={{ fontSize: 12.5, color: C.body }}>
          This conversation is closed
        </Text>
        <Text className="font-sans-medium" style={{ fontSize: 11.5, color: C.soft, marginTop: 2 }}>
          Reopen it if the problem comes back
        </Text>
      </View>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onReopen}
        style={{ height: 44, justifyContent: 'center', paddingHorizontal: 18, borderRadius: 999, backgroundColor: C.blueTint }}
      >
        <Text className="font-sans-semibold" style={{ fontSize: 12.5, color: C.blueInk }}>
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
      style={{
        alignSelf: 'center',
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 7,
        marginVertical: 12,
      }}
    >
      <Text className="font-sans-semibold" style={{ fontSize: 11, color: C.muted }}>
        {label}
      </Text>
    </View>
  );
}

function SystemPill({ event }) {
  const config = getEventConfig(event.event_type);
  return (
    <View style={{ alignItems: 'center', marginVertical: 9, paddingHorizontal: 16 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 8,
          backgroundColor: 'rgba(255,255,255,0.7)',
          borderRadius: 20,
          paddingHorizontal: 15,
          paddingVertical: 8,
        }}
      >
        <Feather name={config.icon || 'info'} size={12} color={C.muted} style={{ marginTop: 2 }} />
        <Text className="font-sans-medium" style={{ fontSize: 12, lineHeight: 17, color: C.muted, flexShrink: 1 }}>
          {event.actor_name ? (
            <Text className="font-sans-semibold" style={{ color: C.body }}>
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

  const big = 20;
  const tail = 7;
  const radius = isMe
    ? {
      borderTopLeftRadius: big,
      borderTopRightRadius: runStart ? big : tail,
      borderBottomRightRadius: tail,
      borderBottomLeftRadius: big,
    }
    : {
      borderTopLeftRadius: runStart ? big : tail,
      borderTopRightRadius: big,
      borderBottomRightRadius: big,
      borderBottomLeftRadius: tail,
    };

  const imageOnly = !event.message && images.length > 0;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: isMe ? 'flex-end' : 'flex-start',
        marginTop: runStart ? 8 : 4,
      }}
    >
      {!isMe ? (
        runEnd ? (
          <View
            style={[
              {
                width: 32,
                height: 32,
                borderRadius: 999,
                backgroundColor: C.surface,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 10,
                marginBottom: 2,
              },
              SHADOW_CARD,
            ]}
          >
            <Text className="font-sans-semibold" style={{ fontSize: 12, color: tone.accent }}>
              {event.actor_name ? event.actor_name.charAt(0).toUpperCase() : 'S'}
            </Text>
          </View>
        ) : (
          <View style={{ width: 42 }} />
        )
      ) : null}

      <View
        style={[
          {
            maxWidth: '82%',
            backgroundColor: isMe ? tone.bubble : C.surface,
            overflow: 'hidden',
            padding: imageOnly ? 5 : 0,
          },
          radius,
          isMe ? null : SHADOW_CARD,
        ]}
      >
        {!isMe && runStart ? (
          <Text
            className="font-sans-semibold"
            style={{ fontSize: 11.5, color: tone.accent, paddingHorizontal: 16, paddingTop: 13 }}
          >
            {event.actor_name || 'Support'}
          </Text>
        ) : null}

        {event.message ? (
          <Text
            className="font-sans"
            style={{
              fontSize: 15.5,
              lineHeight: 23,
              color: C.ink,
              paddingHorizontal: 16,
              paddingTop: !isMe && runStart ? 5 : 13,
            }}
          >
            {event.message}
          </Text>
        ) : null}

        {images.map((url, i) => (
          <TouchableOpacity
            key={url}
            activeOpacity={0.85}
            onPress={() => setLightboxUrl(url)}
            style={{ marginTop: imageOnly && i === 0 ? 0 : 8 }}
          >
            <Image
              source={{ uri: url }}
              contentFit="cover"
              style={{ width: 232, height: 150, borderRadius: imageOnly ? 16 : 0 }}
              cachePolicy="disk"
              transition={150}
            />
            {imageOnly && i === images.length - 1 ? (
              <View
                style={{
                  position: 'absolute',
                  right: 9,
                  bottom: 9,
                  backgroundColor: 'rgba(12,21,36,0.55)',
                  borderRadius: 999,
                  paddingHorizontal: 9,
                  paddingVertical: 4,
                }}
              >
                <Text className="font-sans-medium" style={{ fontSize: 11, color: '#FFFFFF' }}>
                  {clockTime(event.created_at)}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        ))}

        {videos.length > 0 ? (
          <View style={{ paddingHorizontal: 10, paddingTop: 10 }}>
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
          <View style={{ paddingHorizontal: 10, paddingTop: 10 }}>
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
          <View style={{ alignItems: 'flex-end', paddingHorizontal: 16, paddingBottom: 10, paddingTop: 5 }}>
            <Text className="font-sans-medium" style={{ fontSize: 11.5, color: isMe ? tone.bubbleMeta : C.faint }}>
              {clockTime(event.created_at)}
            </Text>
          </View>
        ) : null}
      </View>

      <Modal visible={!!lightboxUrl} transparent={false} animationType="fade" onRequestClose={() => setLightboxUrl(null)}>
        <LightboxContent url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      </Modal>
    </View>
  );
}

function AttachmentRow({ icon, actionIcon, title, meta, isMe, isDownloading, onPress }) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={isDownloading}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 11,
        backgroundColor: isMe ? 'rgba(255,255,255,0.6)' : C.chipGrey,
        borderRadius: 15,
        paddingHorizontal: 12,
        paddingVertical: 11,
        marginBottom: 4,
        minWidth: 210,
      }}
    >
      <View
        style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.blueTint, alignItems: 'center', justifyContent: 'center' }}
      >
        <Feather name={icon} size={16} color={C.blue} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} className="font-sans-semibold" style={{ fontSize: 13, color: C.ink }}>
          {title}
        </Text>
        <Text className="font-sans-medium" style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>
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
function SheetLabel({ children, style }) {
  return (
    <Text className="font-sans-semibold" style={[{ fontSize: 11.5, color: C.soft, marginLeft: 4, marginBottom: 8 }, style]}>
      {children}
    </Text>
  );
}

function InfoGroup({ children }) {
  return (
    <View style={[{ backgroundColor: C.surface, borderRadius: 20, paddingHorizontal: 14 }, SHADOW_CARD]}>{children}</View>
  );
}

function InfoRow({ row, first, status, onPress }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      {...(onPress ? { activeOpacity: 0.6, onPress } : {})}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 58,
        paddingVertical: 12,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: C.hair,
      }}
    >
      <View
        style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.blueTint, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}
      >
        <Feather name={row.icon} size={15} color={C.blue} />
      </View>
      <View style={{ flex: 1 }}>
        <Text className="font-sans-medium" style={{ fontSize: 11.5, color: C.soft }}>
          {row.label}
        </Text>
        {row.isStatus ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
            <View
              style={{ width: 8, height: 8, borderRadius: 999, marginRight: 7, backgroundColor: STATUS_DOT_COLORS[status] || C.faint }}
            />
            <Text className="font-sans-semibold" style={{ fontSize: 14, color: C.ink }}>
              {statusLabel(status)}
            </Text>
          </View>
        ) : (
          <Text numberOfLines={2} className="font-sans-semibold" style={{ fontSize: 14, color: C.ink, marginTop: 2 }}>
            {row.value}
          </Text>
        )}
      </View>
      {onPress ? <Feather name="chevron-right" size={18} color="#C3CDDB" /> : null}
    </Wrapper>
  );
}



