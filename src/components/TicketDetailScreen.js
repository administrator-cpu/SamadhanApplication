// src/components/TicketDetailScreen.js
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  Image,
  KeyboardAvoidingView,
  Platform,
  Modal,
  TouchableOpacity,
  Linking,
  Alert,
  Animated,
  Keyboard,
} from 'react-native';
import {
  PinchGestureHandler,
  PanGestureHandler,
  TapGestureHandler,
  State,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// SDK 54+: FileSystem.downloadAsync (and the rest of the classic API used
// below) moved to the legacy import path — the new default export uses
// different File/Directory classes with a different API shape.
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
// SDK 54+: MediaLibrary.saveToLibraryAsync (and requestPermissionsAsync,
// used below) moved to the legacy import path — the new default export
// uses a different class-based API.
import * as MediaLibrary from 'expo-media-library/legacy';

import { getEventConfig, formatEventTime } from '../utils/eventType';
import { statusLabel } from '../utils/ticketStatus';
import { useTicket } from '../hooks/useTickets';
import TicketStatusActions from './TicketStatusActions';
import TicketRating from './TicketRating';
import TicketReplyForm from './TicketReplyForm';
import TicketStaffTools from './TicketStaffTools';
import { useTicketSocket } from '../hooks/useTicketSocket';
import { useAuthStore } from '../store/authStore';


// Solid dot colors per status — distinct from the pale STATUS_STYLES
// backgrounds used elsewhere, since a dot needs to read at 8px.
const STATUS_DOT_COLORS = {
  OPEN: '#3B82F6',
  IN_PROGRESS: '#F59E0B',
  ESCALATED: '#EF4444',
  RESOLVED: '#10B981',
  CLOSED: '#94A3B8',
  REOPENED: '#A855F7',
};

function formatFullDateTime(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

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

// --- Attachment helpers (used by EventItem) ---
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

function getAttachmentType(url) {
  if (!url) return 'document';
  const clean = url.split('?')[0].split('#')[0];
  const ext = clean.split('.').pop()?.toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext) ? 'image' : 'document';
}

function getAttachmentFileName(url) {
  if (!url) return 'Attachment';
  const clean = url.split('?')[0].split('#')[0];
  const segments = clean.split('/');
  return decodeURIComponent(segments[segments.length - 1] || 'Attachment');
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
  if (canShare) {
    await Sharing.shareAsync(uri);
  } else {
    Alert.alert('Downloaded', `Saved to ${uri}`);
  }
}



export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { data, isLoading, isError, error, refetch, isRefetching } = useTicket(id);
  const navigation = useNavigation();
  const user = useAuthStore((state) => state.user);
  const insets = useSafeAreaInsets();
  useTicketSocket(id);

  const [isMenuVisible, setMenuVisible] = useState(false);
  const [isContactModalVisible, setContactModalVisible] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  const isCurrentUserCustomer = user?.role === 'USER';

  useEffect(() => {
    const showEvent = Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow';
    const hideEvent = Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide';

    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useLayoutEffect(() => {
    if (data?.ticket) {
      const ticket = data.ticket;

      const chatPartnerName = isCurrentUserCustomer
        ? ticket.assigned_employee?.name || 'Support Agent'
        : ticket.customer?.name || 'Unknown Customer';

      navigation.setOptions({
        headerTitle: () => (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setContactModalVisible(true)}
            className="max-w-[210px]"
          >
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              className="font-sans-semibold text-text-primary text-base"
            >
              {chatPartnerName}
            </Text>
            <Text className="font-sans text-text-tertiary text-xs mt-0.5">
              Ticket #{ticket.ticket_no}
            </Text>
          </TouchableOpacity>
        ),
        headerTitleAlign: 'left',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#F8FAFC' },
        headerRight: () => (
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 8, marginRight: 4 }}>
            <Feather name="more-vertical" size={24} color="#5C5348" />
          </TouchableOpacity>
        ),
      });
    }
  }, [data?.ticket, navigation, isCurrentUserCustomer]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center p-6">
        <ActivityIndicator size="large" color="#FF5A36" />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center p-6">
        <Feather name="alert-circle" size={48} color="#E0311F" style={{ marginBottom: 16 }} />
        <Text className="font-sans-semibold text-text-primary text-lg mb-2">
          Oops! Something went wrong.
        </Text>
        <Text className="font-sans text-text-secondary text-center mb-6">
          {error?.message || "We couldn't load this ticket."}
        </Text>
        <Pressable
          onPress={() => refetch()}
          className="bg-primary-500 px-6 py-3 rounded-full shadow-sm"
        >
          <Text className="font-sans-semibold text-white text-base">Try Again</Text>
        </Pressable>
      </View>
    );
  }

  const { ticket, events } = data || {};

  const contactPerson = isCurrentUserCustomer ? ticket?.assigned_employee : ticket?.customer;
  const contactName = isCurrentUserCustomer
    ? ticket?.assigned_employee?.name || 'Support Agent'
    : ticket?.customer?.name || 'Unknown Customer';
  const contactInitials = getInitials(contactName);
  const contactSubtitle = isCurrentUserCustomer
    ? contactPerson?.role || 'Support Agent'
    : `Ticket #${ticket?.ticket_no || 'N/A'}`;

  const contactRows = (
    isCurrentUserCustomer
      ? [
          contactPerson?.role && { icon: 'briefcase', label: 'Role', value: contactPerson.role },
          contactPerson?.email && {
            icon: 'mail',
            label: 'Email',
            value: contactPerson.email,
            action: 'email',
          },
          contactPerson?.phone && {
            icon: 'phone',
            label: 'Phone',
            value: contactPerson.phone,
            action: 'phone',
          },
        ]
      : [
          contactPerson?.email && {
            icon: 'mail',
            label: 'Email',
            value: contactPerson.email,
            action: 'email',
          },
          contactPerson?.phone && {
            icon: 'phone',
            label: 'Phone',
            value: contactPerson.phone,
            action: 'phone',
          },
          contactPerson?.company && { icon: 'briefcase', label: 'Company', value: contactPerson.company },
          contactPerson?.customer_id && {
            icon: 'hash',
            label: 'Customer ID',
            value: contactPerson.customer_id,
          },
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
    { icon: 'activity', label: 'Status', isStatus: true },
    ticket?.circuit_description && {
      icon: 'zap',
      label: 'Circuit ID',
      value: ticket.circuit_description,
    },
    { icon: 'calendar', label: 'Opened On', value: formatFullDateTime(ticket?.created_at) },
    { icon: 'clock', label: 'Last Updated', value: formatFullDateTime(ticket?.updated_at) },
  ].filter(Boolean);

  const showAgentSection = !isCurrentUserCustomer;
  const agentName = ticket?.assigned_employee?.name || 'Unassigned';
  const agentInitials = getInitials(agentName);
  const agentRole = ticket?.assigned_employee?.role || 'Support Agent';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 100}
    >
      <ScrollView
        className="flex-1 bg-slate-50"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#FF5A36" />}
      >
        <View className="bg-surface px-4 pt-4 pb-4 border-b border-border/40 mb-3">
          <Text className="font-sans-semibold text-text-primary text-base mb-1" numberOfLines={1}>
            {ticket?.subject || 'No Subject'}
          </Text>
          {ticket?.circuit_description && (
            <Text className="font-sans text-text-secondary text-sm leading-5" numberOfLines={2}>
              {ticket.circuit_description}
            </Text>
          )}

          <View className="h-px bg-bg-subtle my-3" />

          <TicketLiveTracker ticket={ticket} />
        </View>

        {ticket?.rca && (
          <View className="bg-surface mx-4 mb-4 p-4 rounded-2xl border border-border/40 shadow-sm">
            <View className="flex-row items-center mb-2.5">
              <View className="bg-success-bg p-1.5 rounded-lg mr-2">
                <Feather name="search" size={14} color="#0F9D58" />
              </View>
              <Text className="font-sans-semibold text-success-text text-sm">
                Root Cause Analysis
              </Text>
            </View>
            <Text className="font-sans text-text-primary text-sm leading-6">{ticket.rca}</Text>
            {ticket.rca_images?.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                {ticket.rca_images.map((url) => (
                  <Image
                    key={url}
                    source={{ uri: url }}
                    className="w-[70px] h-[70px] rounded-lg mr-2.5 bg-bg-subtle"
                  />
                ))}
              </ScrollView>
            )}
          </View>
        )}

        <TicketRating ticket={ticket} />

        {/* --- CONVERSATION TIMELINE ---
            Plain View for now — the ImageBackground texture is on hold
            until there's a real asset; a flat #F0F2F5 (WhatsApp Web's
            chat gray) reads far cleaner than a muddy untextured beige. */}
        <View className="px-4 pt-2 pb-2" style={{ backgroundColor: '#F0F2F5' }}>
          {!events || events.length === 0 ? (
            <View className="items-center py-10">
              <Text className="font-sans text-text-tertiary text-sm">Conversation starting...</Text>
            </View>
          ) : (
            events.map((event) => <EventItem key={event.id} event={event} ticket={ticket} />)
          )}
        </View>
      </ScrollView>

      <View className="bg-slate-50" style={{ paddingBottom: isKeyboardVisible ? 0 : insets.bottom }}>
        <TicketReplyForm ticket={ticket} />
      </View>

      <Modal
        visible={isMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(36,31,26,0.4)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            className="bg-surface rounded-t-3xl px-5 pb-10 pt-3"
            style={{ maxHeight: '80%' }}
          >
            <View className="w-10 h-1 bg-border-strong rounded-full self-center mb-4" />
            <Text className="font-sans-semibold text-text-primary text-base text-center mb-4">
              Manage Ticket
            </Text>

            <TicketStatusActions ticket={ticket} />
            <TicketStaffTools ticket={ticket} />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={isContactModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setContactModalVisible(false)}
      >
        <View className="flex-1 bg-black/40 justify-center p-5">
          <View
            className="bg-white rounded-3xl p-6 shadow-xl"
            style={{ maxHeight: '85%' }}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setContactModalVisible(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 items-center justify-center z-10"
            >
              <Feather name="x" size={16} color="#334155" />
            </TouchableOpacity>

            <View className="items-center">
              <View className="w-24 h-24 rounded-full bg-slate-100 items-center justify-center">
                <Text className="font-sans-semibold text-slate-500 text-3xl">
                  {contactInitials}
                </Text>
              </View>
              <Text className="text-2xl font-bold text-text-primary mt-4 text-center">
                {contactName}
              </Text>
              <Text className="font-sans text-text-tertiary text-sm mt-1">{contactSubtitle}</Text>
            </View>

            <ScrollView
              style={{ flexShrink: 1, marginVertical: 16 }}
              showsVerticalScrollIndicator={false}
            >
              <Text className="font-sans-semibold text-text-tertiary text-[11px] uppercase tracking-wide ml-1 mb-2">
                Contact Info
              </Text>
              <View className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                {contactRows.length > 0 ? (
                  contactRows.map((row, index) => {
                    const isActionable = row.action === 'email' || row.action === 'phone';
                    const RowWrapper = isActionable ? TouchableOpacity : View;
                    return (
                      <RowWrapper
                        key={row.label}
                        {...(isActionable
                          ? { activeOpacity: 0.6, onPress: () => handleContactAction(row) }
                          : {})}
                        className={`flex-row items-center py-3 ${
                          index > 0 ? 'border-t border-slate-100' : ''
                        }`}
                      >
                        <View className="w-9 h-9 rounded-full bg-primary-50 items-center justify-center mr-3">
                          <Feather name={row.icon} size={16} color="#C0703A" />
                        </View>
                        <View className="flex-1">
                          <Text className="font-sans text-text-tertiary text-[11px] uppercase tracking-wide">
                            {row.label}
                          </Text>
                          <Text
                            className="font-sans-semibold text-text-primary text-sm mt-0.5"
                            numberOfLines={1}
                          >
                            {row.value}
                          </Text>
                        </View>
                        {isActionable && (
                          <Feather name="chevron-right" size={18} color="#C7C0B4" />
                        )}
                      </RowWrapper>
                    );
                  })
                ) : (
                  <Text className="font-sans text-text-tertiary text-sm text-center py-2">
                    No additional contact details available.
                  </Text>
                )}
              </View>

              <Text className="font-sans-semibold text-text-tertiary text-[11px] uppercase tracking-wide ml-1 mb-2 mt-5">
                Ticket Info
              </Text>
              <View className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                {ticketInfoRows.map((row, index) => (
                  <View
                    key={row.label}
                    className={`flex-row items-center py-3 ${
                      index > 0 ? 'border-t border-slate-100' : ''
                    }`}
                  >
                    <View className="w-9 h-9 rounded-full bg-primary-50 items-center justify-center mr-3">
                      <Feather name={row.icon} size={16} color="#C0703A" />
                    </View>
                    <View className="flex-1">
                      <Text className="font-sans text-text-tertiary text-[11px] uppercase tracking-wide">
                        {row.label}
                      </Text>
                      {row.isStatus ? (
                        <View className="flex-row items-center mt-0.5">
                          <View
                            className="w-2 h-2 rounded-full mr-1.5"
                            style={{
                              backgroundColor: STATUS_DOT_COLORS[ticket?.status] || '#94A3B8',
                            }}
                          />
                          <Text className="font-sans-semibold text-text-primary text-sm">
                            {statusLabel(ticket?.status)}
                          </Text>
                        </View>
                      ) : (
                        <Text
                          className="font-sans-semibold text-text-primary text-sm mt-0.5"
                          numberOfLines={2}
                        >
                          {row.value}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>

              {showAgentSection && (
                <>
                  <Text className="font-sans-semibold text-text-tertiary text-[11px] uppercase tracking-wide ml-1 mb-2 mt-5">
                    Assigned Agent
                  </Text>
                  <View className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                    <View className="flex-row items-center">
                      <View className="w-12 h-12 rounded-full bg-slate-100 items-center justify-center mr-3">
                        <Text className="font-sans-semibold text-slate-500 text-base">
                          {agentInitials}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text
                          className="font-sans-semibold text-text-primary text-sm"
                          numberOfLines={1}
                        >
                          {agentName}
                        </Text>
                        <Text
                          className="font-sans text-text-tertiary text-xs mt-0.5"
                          numberOfLines={1}
                        >
                          {agentRole}
                        </Text>
                      </View>
                    </View>
                  </View>
                </>
              )}
            </ScrollView>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setContactModalVisible(false)}
              className="bg-primary-500 rounded-full py-3.5 items-center shadow-sm"
            >
              <Text className="font-sans-semibold text-white text-base">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ------------------------------------------------------------------
// EVENT ITEM COMPONENT — WhatsApp-style chat timeline
// ------------------------------------------------------------------
function EventItem({ event, ticket }) {
  const config = getEventConfig(event.event_type);
  const attachments = event.metadata?.attachments || [];
  const imageAttachments = attachments.filter((url) => getAttachmentType(url) === 'image');
  const documentAttachments = attachments.filter((url) => getAttachmentType(url) === 'document');

  // Fixed: the real event types (per BACKEND_SCHEMA.md) are USER_REPLY /
  // AGENT_REPLY / ADMIN_REPLY / INTERNAL_NOTE — 'CUSTOMER_REPLY', 'NOTE',
  // and 'MESSAGE' were never real event_type values, so every reply
  // except TICKET_CREATED/AGENT_REPLY was silently falling through to
  // the system-log branch below instead of rendering as a chat bubble.
  const chatEventTypes = ['TICKET_CREATED', 'USER_REPLY', 'AGENT_REPLY', 'ADMIN_REPLY', 'INTERNAL_NOTE'];
  const isMessage = chatEventTypes.includes(event.event_type);

  const currentUser = useAuthStore((state) => state.user);
  // ticket_events has no `user_id`/`email` column — the real FK is
  // `actor_user_id` (BACKEND_SCHEMA.md). String-normalized since the
  // event's id may come through as a number while the auth user's id
  // may be a uuid/string, depending on role.
  const isMe = event.actor_user_id != null && String(event.actor_user_id) === String(currentUser?.id);
  const alignRight = isMe;

  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [downloadingUrl, setDownloadingUrl] = useState(null);

  const handleDocumentPress = async (url) => {
    if (downloadingUrl) return;
    const fileName = getAttachmentFileName(url);
    try {
      setDownloadingUrl(url);
      await downloadAndOpenDocument(url, fileName);
    } catch (err) {
      Alert.alert('Download failed', 'This file could not be downloaded. Please try again.');
    } finally {
      setDownloadingUrl(null);
    }
  };

  // System events (status changes, assignment, RCA, automation) — a
  // calm, muted, centered pill, matching WhatsApp's date/security
  // notices rather than a chat message. rounded-2xl (not rounded-full)
  // because a fully-rounded pill looks wrong once text wraps to 2-3
  // lines — the end caps get stretched into an odd capsule shape. No
  // numberOfLines here: long status/reassignment messages need to wrap
  // fully rather than truncate with "…".
  if (!isMessage) {
    return (
      <View className="items-center my-4 px-6">
        <View className="flex-row items-start bg-slate-500/10 rounded-2xl px-3.5 py-2.5 max-w-full">
          <Feather
            name={config.icon || 'info'}
            size={11}
            color="#64748b"
            style={{ marginRight: 6, marginTop: 3 }}
          />
          <Text className="font-sans-medium text-slate-600 text-xs text-center flex-1 leading-4">
            {event.actor_name && (
              <Text className="font-sans-semibold text-slate-700">{event.actor_name}: </Text>
            )}
            <Text>{event.message || config.label}</Text>
          </Text>
        </View>
        <Text className="font-sans text-slate-400 text-[10px] mt-1.5">
          {formatEventTime(event.created_at)}
        </Text>
      </View>
    );
  }

  return (
    <View className={`flex-row items-end my-2 ${alignRight ? 'justify-end' : 'justify-start'}`}>
      {!alignRight && (
        <View className="w-7 h-7 rounded-full bg-bg-subtle items-center justify-center mr-2 mb-1">
          <Text className="font-sans-semibold text-text-secondary text-xs">
            {event.actor_name ? event.actor_name.charAt(0).toUpperCase() : 'C'}
          </Text>
        </View>
      )}

      {/* overflow-hidden + no padding on the bubble itself is the actual
          fix: previously px-4 py-3 applied uniformly to EVERYTHING inside
          the bubble, including images, which is what created the thick
          padding around attached photos. Text/document/timestamp content
          now lives in padded inner Views; images render as direct
          children of this outer container so they can bleed edge-to-edge.
          No explicit borderRadius is needed on the <Image> itself —
          overflow-hidden on this rounded-2xl container automatically
          clips any full-width child to follow the bubble's own corners,
          which is more reliable than trying to hand-match a radius value. */}
      <View
        className={`max-w-[75%] rounded-2xl shadow-sm overflow-hidden ${
          alignRight
            ? 'bg-[#DBEBFE] rounded-br-md'
            : 'bg-white border border-slate-200 rounded-bl-md'
        }`}
      >
        {(!alignRight || event.message) && (
          <View className="px-4 pt-3 pb-2">
            {!alignRight && (
              <Text className="font-sans-semibold text-[10px] uppercase tracking-wide mb-1 text-text-tertiary">
                {event.actor_name || 'System'}
              </Text>
            )}

            {event.message ? (
              <Text className="font-sans text-[15px] leading-5 text-slate-900">
                {event.message}
              </Text>
            ) : null}
          </View>
        )}

        {imageAttachments.length > 0 && (
          <>
            {imageAttachments.map((url) => (
              <TouchableOpacity
                key={url}
                activeOpacity={0.85}
                onPress={() => setLightboxUrl(url)}
              >
                <Image source={{ uri: url }} resizeMode="cover" className="w-full h-48" />
              </TouchableOpacity>
            ))}
          </>
        )}

        {documentAttachments.length > 0 && (
          <View className="px-4 pt-2">
            {documentAttachments.map((url) => {
              const fileName = getAttachmentFileName(url);
              const isDownloading = downloadingUrl === url;
              return (
                <TouchableOpacity
                  key={url}
                  activeOpacity={0.7}
                  onPress={() => handleDocumentPress(url)}
                  disabled={isDownloading}
                  className={`flex-row items-center p-3 mb-2 rounded-xl ${
                    alignRight ? 'bg-white/50' : 'bg-slate-50 border border-slate-100'
                  }`}
                >
                  <Feather name="file-text" size={18} color="#475569" />
                  <Text
                    numberOfLines={1}
                    className="flex-1 font-sans-semibold text-sm mx-2.5 text-slate-900"
                  >
                    {fileName}
                  </Text>
                  {isDownloading ? (
                    <ActivityIndicator size="small" color="#475569" />
                  ) : (
                    <Feather name="arrow-down-circle" size={18} color="#475569" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View className="flex-row justify-end items-center px-4 pb-3 pt-2">
          <Text className="font-sans text-[11px] text-slate-500">
            {formatEventTime(event.created_at)}
          </Text>
          {alignRight && (
            <Feather name="check" size={12} color="#64748b" style={{ marginLeft: 4 }} />
          )}
        </View>
      </View>

      {alignRight && (
        <View className="w-7 h-7 rounded-full bg-primary-600 items-center justify-center ml-2 mb-1">
          <Text className="font-sans-semibold text-white text-xs">
            {event.actor_name ? event.actor_name.charAt(0).toUpperCase() : 'A'}
          </Text>
        </View>
      )}

      <Modal
        visible={!!lightboxUrl}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setLightboxUrl(null)}
      >
        <LightboxContent url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      </Modal>
    </View>
  );
}

// ------------------------------------------------------------------
// LIGHTBOX CONTENT
// ------------------------------------------------------------------
function LightboxContent({ url, onClose }) {
  const insets = useSafeAreaInsets();

  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionState, setActionState] = useState(null);

  const downloadImageForAction = async (imageUrl) => {
    const baseName = getAttachmentFileName(imageUrl) || 'image.jpg';
    const localUri = `${FileSystem.cacheDirectory}${Date.now()}-${baseName}`;
    const result = await FileSystem.downloadAsync(imageUrl, localUri);
    if (!result?.uri) {
      throw new Error('Download did not return a local file URI.');
    }
    return result.uri;
  };

  const handleShare = async () => {
    if (!url || isProcessing) return;
    setIsProcessing(true);
    setActionState('sharing');
    try {
      const localUri = await downloadImageForAction(url);
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Sharing unavailable', 'Sharing is not supported on this device.');
        return;
      }
      await Sharing.shareAsync(localUri);
    } catch (err) {
      console.error('[Lightbox] Share failed:', err);
      Alert.alert('Share failed', err?.message || 'This image could not be shared. Please try again.');
    } finally {
      setIsProcessing(false);
      setActionState(null);
    }
  };

  const handleSave = async () => {
    if (!url || isProcessing) return;
    setIsProcessing(true);
    setActionState('saving');
    try {
      const localUri = await downloadImageForAction(url);
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'Please allow photo library access in your device settings to save images.'
        );
        return;
      }
      await MediaLibrary.saveToLibraryAsync(localUri);
      Alert.alert('Saved', 'Image saved to gallery.');
    } catch (err) {
      console.error('[Lightbox] Save failed:', err);
      Alert.alert('Save failed', err?.message || 'This image could not be saved. Please try again.');
    } finally {
      setIsProcessing(false);
      setActionState(null);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1 bg-black">
        <ZoomableImage uri={url} onSingleTap={() => setToolbarVisible((prev) => !prev)} />

        {toolbarVisible && (
          <View className="absolute top-0 left-0 right-0 z-20" pointerEvents="box-none">
            <LinearGradient
              colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0)']}
              style={{ paddingTop: insets.top + 10, paddingBottom: 28, paddingHorizontal: 16 }}
            >
              <View className="flex-row items-center justify-between">
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={onClose}
                  className="w-10 h-10 rounded-full bg-white/15 items-center justify-center"
                >
                  <Feather name="x" size={20} color="#FFFFFF" />
                </TouchableOpacity>

                {isProcessing && (
                  <View
                    className="flex-row items-center bg-white/15 px-3 py-1.5 rounded-full"
                    style={{ gap: 6 }}
                  >
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text className="font-sans-semibold text-white text-xs">
                      {actionState === 'saving' ? 'Saving…' : 'Sharing…'}
                    </Text>
                  </View>
                )}

                <View className="flex-row" style={{ gap: 10 }}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleShare}
                    disabled={isProcessing}
                    className={`w-10 h-10 rounded-full bg-white/15 items-center justify-center ${
                      isProcessing ? 'opacity-50' : ''
                    }`}
                  >
                    <Feather name="share" size={18} color="#FFFFFF" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleSave}
                    disabled={isProcessing}
                    className={`w-10 h-10 rounded-full bg-white/15 items-center justify-center ${
                      isProcessing ? 'opacity-50' : ''
                    }`}
                  >
                    <Feather name="download" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          </View>
        )}
      </View>
    </GestureHandlerRootView>
  );
}

// ------------------------------------------------------------------
// ZOOMABLE IMAGE
// ------------------------------------------------------------------
const MIN_SCALE = 1;
const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;

function ZoomableImage({ uri, onSingleTap }) {
  const pinchRef = useRef(null);
  const panRef = useRef(null);
  const doubleTapRef = useRef(null);
  const singleTapRef = useRef(null);

  const baseScale = useRef(new Animated.Value(1)).current;
  const pinchScale = useRef(new Animated.Value(1)).current;
  const scale = useRef(Animated.multiply(baseScale, pinchScale)).current;
  const lastScale = useRef(1);

  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const lastOffset = useRef({ x: 0, y: 0 });

  const [isZoomed, setIsZoomed] = useState(false);

  const resetTransform = () => {
    lastScale.current = 1;
    lastOffset.current = { x: 0, y: 0 };
    setIsZoomed(false);
    Animated.parallel([
      Animated.spring(baseScale, { toValue: 1, useNativeDriver: true }),
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
    ]).start(() => {
      translateX.setOffset(0);
      translateX.setValue(0);
      translateY.setOffset(0);
      translateY.setValue(0);
    });
  };

  const onPinchGestureEvent = Animated.event([{ nativeEvent: { scale: pinchScale } }], {
    useNativeDriver: true,
  });

  const onPinchHandlerStateChange = (event) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const nextScale = Math.min(
        Math.max(lastScale.current * event.nativeEvent.scale, MIN_SCALE),
        MAX_SCALE
      );
      lastScale.current = nextScale;
      pinchScale.setValue(1);
      baseScale.setValue(nextScale);
      if (nextScale <= MIN_SCALE) {
        resetTransform();
      } else {
        setIsZoomed(true);
      }
    }
  };

  const onPanGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
    { useNativeDriver: true }
  );

  const onPanHandlerStateChange = (event) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      lastOffset.current.x += event.nativeEvent.translationX;
      lastOffset.current.y += event.nativeEvent.translationY;
      translateX.setOffset(lastOffset.current.x);
      translateX.setValue(0);
      translateY.setOffset(lastOffset.current.y);
      translateY.setValue(0);
    }
  };

  const onDoubleTapStateChange = (event) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      if (lastScale.current > MIN_SCALE) {
        resetTransform();
      } else {
        lastScale.current = DOUBLE_TAP_SCALE;
        setIsZoomed(true);
        Animated.spring(baseScale, { toValue: DOUBLE_TAP_SCALE, useNativeDriver: true }).start();
      }
    }
  };

  const onSingleTapStateChange = (event) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      onSingleTap?.();
    }
  };

  return (
    <TapGestureHandler
      ref={singleTapRef}
      numberOfTaps={1}
      waitFor={doubleTapRef}
      onHandlerStateChange={onSingleTapStateChange}
    >
      <Animated.View style={{ flex: 1 }}>
        <TapGestureHandler ref={doubleTapRef} numberOfTaps={2} onHandlerStateChange={onDoubleTapStateChange}>
          <Animated.View style={{ flex: 1 }}>
            <PanGestureHandler
              ref={panRef}
              enabled={isZoomed}
              simultaneousHandlers={pinchRef}
              onGestureEvent={onPanGestureEvent}
              onHandlerStateChange={onPanHandlerStateChange}
            >
              <Animated.View style={{ flex: 1 }}>
                <PinchGestureHandler
                  ref={pinchRef}
                  simultaneousHandlers={panRef}
                  onGestureEvent={onPinchGestureEvent}
                  onHandlerStateChange={onPinchHandlerStateChange}
                >
                  <Animated.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Animated.Image
                      source={{ uri }}
                      resizeMode="contain"
                      style={{
                        width: '100%',
                        height: '100%',
                        transform: [{ translateX }, { translateY }, { scale }],
                      }}
                    />
                  </Animated.View>
                </PinchGestureHandler>
              </Animated.View>
            </PanGestureHandler>
          </Animated.View>
        </TapGestureHandler>
      </Animated.View>
    </TapGestureHandler>
  );
}

// ------------------------------------------------------------------
// LIVE TRACKER COMPONENT
// ------------------------------------------------------------------
function TicketLiveTracker({ ticket }) {
  const status = ticket?.status || 'OPEN';

  let activeIndex = 0;
  if (['IN_PROGRESS', 'ESCALATED', 'REOPENED'].includes(status)) activeIndex = 1;
  else if (status === 'RESOLVED' || status === 'CLOSED') activeIndex = 2;

  const trackerStates = [
    {
      title: 'Ticket Received',
      message: 'Your request is securely logged. We are assigning it to an expert.',
      icon: 'inbox',
      iconColor: '#0E8074',
      iconBg: 'bg-info-bg',
      barColor: 'bg-info-text',
    },
    {
      title: 'Investigating',
      message: "Our team is actively working on a fix. We'll keep you posted.",
      icon: 'activity',
      iconColor: '#FF5A36',
      iconBg: 'bg-primary-50',
      barColor: 'bg-primary-500',
    },
    {
      title: 'Resolved',
      message: 'This issue has been successfully resolved and closed.',
      icon: 'check-circle',
      iconColor: '#0F9D58',
      iconBg: 'bg-success-bg',
      barColor: 'bg-success-text',
    },
  ];

  const currentState = trackerStates[activeIndex];

  return (
    <View>
      <View className="flex-row justify-between items-center mb-3">
        <View className="flex-row items-center">
          <View className={`w-8 h-8 rounded-lg items-center justify-center mr-2.5 ${currentState.iconBg}`}>
            <Feather name={currentState.icon} size={18} color={currentState.iconColor} />
          </View>
          <Text className="font-sans-semibold text-text-primary text-sm">{currentState.title}</Text>
        </View>

        {ticket?.updated_at && (
          <Text className="font-sans-medium text-text-tertiary text-[11px]">
            {formatEventTime(ticket.updated_at)}
          </Text>
        )}
      </View>

      <View className="flex-row mb-2.5" style={{ gap: 6 }}>
        {[0, 1, 2].map((stepIndex) => {
          const isCompleted = stepIndex <= activeIndex;
          return (
            <View
              key={stepIndex}
              className={`flex-1 h-1 rounded-full ${
                isCompleted ? currentState.barColor : 'bg-bg-subtle'
              }`}
            />
          );
        })}
      </View>

      <Text className="font-sans-medium text-text-secondary text-xs leading-relaxed">
        {currentState.message}
      </Text>
    </View>
  );
}