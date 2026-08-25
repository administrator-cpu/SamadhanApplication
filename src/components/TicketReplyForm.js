// src/components/TicketReplyForm.js
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAddTicketEvent } from '../hooks/useTickets';
import { useAuthStore } from '../store/authStore';
import { haptics } from '../utils/haptics';
import { CARD_SHADOW, T } from './ticketTheme';

const STAFF_ROLES = ['SUPPORT_AGENT', 'ADMIN'];
const MAX_ATTACHMENTS = 6;

const quickReplies = [
  "To expedite and prioritize the restoration of your services, we are performing detailed troubleshooting. The estimated resolution time is 45 minutes.",
  "We regret to inform you that the link is currently affected due to an outage in Bharti media. Our team is actively coordinating with the concerned team to expedite the restoration of services. The Estimated Restoration Time is 4hrs.",
  "Link was reported for high latency, after re-routing the traffic , latency was back to optimal.",
  "Kindly share the current and optimal latency logs with us for further troubleshooting.",
  "Upon our investigation of the media, we have confirmed that the link is currently operational on the main path. Please verify and confirm the current status of the link on your end.",
  "We are currently coordinating with our Network Tier 2 team for end-to-end media verification. Rest assured, we will keep you informed with the latest updates as soon as they become available. The tentative Estimated Resolution Time is 90 min. We appreciate your patience during this process.",
  "We have received your request for BTS access. Our team is currently working on it and will provide you with access within the next 2hr. Thank you for your patience and understanding.",
  "We have performed troubleshooting at our end and as per our observation there are no alarms in the network. The Service Request is being resolved now. In case you still face the issue, you can reopen the Service Request by logging into our online portal.",
  "We are pleased to inform you that your complaint has been successfully resolved. With this, we are proceeding to close your complaint in our system. If you believe the issue has not been fully resolved or require any further assistance, then please reopen the ticket with 24 hrs. We would appreciate it if you could take a moment to share your feedback on portal of your experience with our support team. Your input is valuable and helps us improve our services.",
  "This is to inform you that our concerned team is reviewing the details thoroughly to ensure an accurate and effective resolution. We appreciate your patience while we work on this.",
  "We regret to inform you that the link is currently affected due to an outage in Extreme IX. Our team is actively coordinating with the concerned team to expedite the restoration of services. The Estimated Restoration Time is 4hrs.",
  "Field engineers are working on site to expedite the resolution of the outage. However, it is taking longer than previously anticipated timeline due to unforeseen reasons. We are in continuous touch with the team for faster restoration of the service. ERT is awaited.",
];

export default function TicketReplyForm({ ticket }) {
  const user = useAuthStore((state) => state.user);
  const isStaff = STAFF_ROLES.includes(user?.role);
  const isCustomer = user?.role === 'USER';

  const [message, setMessage] = useState('');
  const [visibleToCustomer, setVisibleToCustomer] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const [quickReplyVisible, setQuickReplyVisible] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [attachMenuVisible, setAttachMenuVisible] = useState(false);

  const inputRef = useRef(null);

  const { mutate, isPending, isPaused, error } = useAddTicketEvent(ticket?.id);

  const isClosed = ticket?.status === 'CLOSED';
  const customerCanReply = ticket?.allow_customer_reply === true;

  // Customer is blocked from replying unless staff has enabled it,
  // per the backend rule documented in your TRD.
  if (isCustomer && !customerCanReply) {
    return <QuietNotice icon="lock" text="Replies are turned off for this ticket right now. Our team will keep you updated here." />;
  }

  if (isClosed) {
    return <QuietNotice icon="check-circle" text="This ticket is closed, so no new replies can be added." />;
  }

  const hasContent = message.trim().length > 0 || attachments.length > 0;
  const isInternal = isStaff && !visibleToCustomer;
  // Quick Replies are an internal staff shortcut (canned troubleshooting
  // copy) — customers and Sales shouldn't see them at all.
  const canUseQuickReplies = isStaff;

  const handleSend = () => {
    if (isPending) return;

    // Empty input (and no attachments) on Send opens the Quick Reply
    // panel instead of submitting. Only staff get this.
    if (!hasContent) {
      if (canUseQuickReplies) {
        Keyboard.dismiss();
        setQuickReplyVisible(true);
      }
      return;
    }

    const trimmedMessage = message.trim();
    const flags = {
      visibleToCustomer: isStaff ? visibleToCustomer : true,
      send_email: isStaff ? sendEmail : true,
    };

    let payload;
    if (attachments.length > 0) {
      // Attachments require multipart form-data, same convention as
      // the RCA and ticket-creation endpoints.
      payload = new FormData();
      if (trimmedMessage) payload.append('message', trimmedMessage);
      payload.append('visibleToCustomer', String(flags.visibleToCustomer));
      payload.append('send_email', String(flags.send_email));
      attachments.forEach((att, index) => {
        payload.append('files', {
          uri: att.uri,
          name: att.name || `attachment-${Date.now()}-${index}`,
          type: att.mimeType || 'application/octet-stream',
        });
      });
    } else {
      payload = { message: trimmedMessage, ...flags };
    }

    mutate(payload, {
      onSuccess: () => {
        haptics.success();
        setMessage('');
        setAttachments([]);
        inputRef.current?.focus();
      },
      onError: () => haptics.error(),
    });
  };

  const handleAttachPress = () => {
    if (isPending || attachments.length >= MAX_ATTACHMENTS) return;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'Photo & Video', 'Document'], cancelButtonIndex: 0 },
        (buttonIndex) => {
          if (buttonIndex === 1) pickMedia();
          else if (buttonIndex === 2) pickDocument();
        }
      );
    } else {
      setAttachMenuVisible(true);
    }
  };

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_ATTACHMENTS - attachments.length,
      quality: 0.7,
    });
    if (result.canceled) return;

    const picked = result.assets.map((asset, index) => ({
      id: `${Date.now()}-${index}-${asset.assetId || asset.fileName || asset.uri}`,
      uri: asset.uri,
      name: asset.fileName || asset.uri.split('/').pop(),
      mimeType: asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg'),
      kind: asset.type === 'video' ? 'video' : 'image',
    }));
    setAttachments((prev) => [...prev, ...picked].slice(0, MAX_ATTACHMENTS));
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: true,
      copyToCacheDirectory: true,
      type: '*/*',
    });
    if (result.canceled) return;

    // SDK 48 returns { assets: [...] }; older SDKs return the asset
    // fields directly on the result — support both shapes.
    const assets = result.assets || [result];
    const picked = assets.map((asset, index) => ({
      id: `${Date.now()}-${index}-${asset.uri}`,
      uri: asset.uri,
      name: asset.name || asset.uri.split('/').pop(),
      mimeType: asset.mimeType || 'application/octet-stream',
      kind: 'document',
    }));
    setAttachments((prev) => [...prev, ...picked].slice(0, MAX_ATTACHMENTS));
  };

  const handleAndroidPickMedia = () => {
    setAttachMenuVisible(false);
    pickMedia();
  };

  const handleAndroidPickDocument = () => {
    setAttachMenuVisible(false);
    pickDocument();
  };

  const removeAttachment = (id) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSelectQuickReply = (text) => {
    setMessage(text);
    setQuickReplyVisible(false);
    setTimeout(() => inputRef.current?.focus(), 300);
  };

  const handleCloseQuickReply = () => setQuickReplyVisible(false);

  const attachDisabled = isPending || attachments.length >= MAX_ATTACHMENTS;

  return (
    // Transparent root — the screen wraps this in a floating white pill.
    <View style={{ paddingHorizontal: 4, paddingVertical: 3 }}>
      {error ? (
        <Text style={styles.error}>{error.message || 'That reply did not send. Please try again.'}</Text>
      ) : null}

      {isPaused ? (
        <View style={styles.offlineRow}>
          <Feather name="clock" size={12} color={T.amberInk} />
          <Text style={styles.offlineText}>You're offline — this sends by itself once you're back.</Text>
        </View>
      ) : null}

      {/* Staff-only delivery switches, as two quiet toggle chips. */}
      {isStaff ? (
        <View style={styles.chipRow}>
          <ToggleChip
            active={visibleToCustomer}
            onPress={() => setVisibleToCustomer((v) => !v)}
            icon={visibleToCustomer ? 'eye' : 'eye-off'}
            label={visibleToCustomer ? 'Customer sees this' : 'Internal note'}
            activeTint={T.blueTint}
            activeColor={T.blueInk}
            idleTint={T.amberTint}
            idleColor={T.amberInk}
          />
          <ToggleChip
            active={sendEmail}
            onPress={() => setSendEmail((v) => !v)}
            icon="mail"
            label={sendEmail ? 'Email on' : 'Email off'}
            activeTint={T.blueTint}
            activeColor={T.blueInk}
            idleTint={T.field}
            idleColor={T.soft}
          />
        </View>
      ) : null}

      {/* Staged attachments */}
      {attachments.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10, paddingHorizontal: 8, paddingTop: 4, paddingBottom: 10 }}
        >
          {attachments.map((att) => (
            <View key={att.id} style={{ position: 'relative' }}>
              {att.kind === 'image' ? (
                <Image
                  source={{ uri: att.uri }}
                  style={styles.thumb}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ) : (
                <View style={styles.fileThumb}>
                  <Feather name={att.kind === 'video' ? 'film' : 'file-text'} size={17} color={T.blue} />
                  <Text numberOfLines={1} style={styles.fileThumbName}>
                    {att.name}
                  </Text>
                </View>
              )}
              <Pressable onPress={() => removeAttachment(att.id)} style={styles.removeBadge} hitSlop={8}>
                <Feather name="x" size={11} color="#FFFFFF" />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      ) : null}

      {/* COMPOSER ROW */}
      <View style={styles.composerRow}>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={handleAttachPress}
          disabled={attachDisabled}
          style={[styles.circleButton, { backgroundColor: T.field }, attachDisabled ? { opacity: 0.4 } : null]}
        >
          <Feather name="plus" size={21} color={T.ink} />
        </TouchableOpacity>

        <TextInput
          ref={inputRef}
          value={message}
          onChangeText={setMessage}
          placeholder={isInternal ? 'Internal note…' : 'Write a message…'}
          placeholderTextColor={T.hint}
          multiline
          style={[
            styles.input,
            isInternal ? { backgroundColor: T.amberTint } : null,
          ]}
        />

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleSend}
          disabled={isPending}
          style={[
            styles.circleButton,
            {
              backgroundColor: isPaused ? T.amber : isPending ? T.hint : hasContent || !canUseQuickReplies ? T.blue : T.ink,
            },
          ]}
        >
          {isPaused ? (
            <Feather name="clock" size={19} color="#FFFFFF" />
          ) : isPending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Feather name={hasContent || !canUseQuickReplies ? 'send' : 'zap'} size={19} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* Android attachment menu — iOS uses the native ActionSheetIOS. */}
      {Platform.OS !== 'ios' ? (
        <Modal
          visible={attachMenuVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setAttachMenuVisible(false)}
        >
          <Pressable style={styles.scrim} onPress={() => setAttachMenuVisible(false)}>
            <Pressable onPress={(e) => e.stopPropagation()} style={styles.sheet}>
              <View style={styles.grabber} />
              <Text style={styles.sheetTitle}>Add to this message</Text>

              <TouchableOpacity activeOpacity={0.7} onPress={handleAndroidPickMedia} style={styles.sheetRow}>
                <View style={[styles.sheetChip, { backgroundColor: T.blueTint }]}>
                  <Feather name="image" size={17} color={T.blue} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetRowTitle}>Photo or video</Text>
                  <Text style={styles.sheetRowNote}>Up to {MAX_ATTACHMENTS} files per message</Text>
                </View>
                <Feather name="chevron-right" size={18} color="#C3CDDB" />
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.7} onPress={handleAndroidPickDocument} style={styles.sheetRow}>
                <View style={[styles.sheetChip, { backgroundColor: T.greenTint }]}>
                  <Feather name="file-text" size={17} color={T.green} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetRowTitle}>Document</Text>
                  <Text style={styles.sheetRowNote}>PDF, logs, reports</Text>
                </View>
                <Feather name="chevron-right" size={18} color="#C3CDDB" />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setAttachMenuVisible(false)}
                style={styles.sheetCancel}
              >
                <Text style={styles.sheetCancelText}>Cancel</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}

      {/* Quick Reply panel — takes the keyboard's place when Send is
          tapped with an empty message. */}
      <Modal visible={quickReplyVisible} transparent animationType="slide" onRequestClose={handleCloseQuickReply}>
        <Pressable style={styles.scrim} onPress={handleCloseQuickReply}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[styles.sheet, { maxHeight: '74%', paddingBottom: 30 }]}
          >
            <View style={styles.grabber} />
            <View style={styles.quickHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>Saved replies</Text>
                <Text style={styles.sheetSubtitle}>Tap one to drop it in — you can edit before sending.</Text>
              </View>
              <TouchableOpacity activeOpacity={0.7} onPress={handleCloseQuickReply} style={styles.closeButton}>
                <Feather name="x" size={16} color={T.body} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 4 }}>
              {quickReplies.map((reply, index) => (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.85}
                  onPress={() => handleSelectQuickReply(reply)}
                  style={styles.quickCard}
                >
                  <Text numberOfLines={3} style={styles.quickText}>
                    {reply}
                  </Text>
                  <Feather name="corner-down-left" size={15} color={T.faint} style={{ marginTop: 9 }} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function QuietNotice({ icon, text }) {
  return (
    <View style={styles.quietNotice}>
      <Feather name={icon} size={16} color={T.faint} />
      <Text style={styles.quietText}>{text}</Text>
    </View>
  );
}

function ToggleChip({ active, onPress, icon, label, activeTint, activeColor, idleTint, idleColor }) {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[styles.toggleChip, { backgroundColor: active ? activeTint : idleTint }]}
    >
      <Feather name={icon} size={13} color={active ? activeColor : idleColor} />
      <Text style={[styles.toggleChipText, { color: active ? activeColor : idleColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  error: { fontSize: 12.5, lineHeight: 18, color: T.dangerInk, paddingHorizontal: 12, paddingTop: 6, paddingBottom: 4 },

  offlineRow: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingTop: 6, paddingBottom: 2 },
  offlineText: { fontSize: 11.5, color: T.amberInk, flex: 1 },

  chipRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 8, paddingTop: 6, paddingBottom: 8 },
  toggleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  toggleChipText: { fontSize: 11.5, fontWeight: '600' },

  thumb: { width: 62, height: 62, borderRadius: 16, backgroundColor: T.field },
  fileThumb: {
    width: 62,
    height: 62,
    borderRadius: 16,
    backgroundColor: T.field,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  fileThumbName: { fontSize: 9, color: T.muted, marginTop: 4, textAlign: 'center' },
  removeBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 21,
    height: 21,
    borderRadius: 999,
    backgroundColor: T.ink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  circleButton: { width: 46, height: 46, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 110,
    backgroundColor: T.field,
    borderRadius: 23,
    paddingHorizontal: 18,
    paddingTop: 13,
    paddingBottom: 13,
    fontSize: 15.5,
    lineHeight: 21,
    color: T.ink,
  },

  quietNotice: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  quietText: { flex: 1, fontSize: 12.5, lineHeight: 18, color: T.muted },

  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(12,21,36,0.38)' },
  sheet: {
    backgroundColor: T.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 34,
  },
  grabber: { width: 40, height: 4, borderRadius: 999, backgroundColor: '#DEE5EE', alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3, color: T.ink },
  sheetSubtitle: { fontSize: 12, color: T.muted, marginTop: 3 },

  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 13 },
  sheetChip: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sheetRowTitle: { fontSize: 15, fontWeight: '600', color: T.ink },
  sheetRowNote: { fontSize: 11.5, color: T.muted, marginTop: 2 },
  sheetCancel: { height: 50, borderRadius: 999, backgroundColor: T.field, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  sheetCancelText: { fontSize: 14.5, fontWeight: '700', color: T.body },

  quickHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  closeButton: { width: 32, height: 32, borderRadius: 999, backgroundColor: T.field, alignItems: 'center', justifyContent: 'center' },
  quickCard: {
    backgroundColor: T.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 11,
    ...CARD_SHADOW,
  },
  quickText: { fontSize: 13.5, lineHeight: 20, color: T.body },
});