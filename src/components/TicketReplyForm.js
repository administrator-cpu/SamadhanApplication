// src/components/TicketReplyForm.js
import { useRef, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    Image,
    Pressable,
    TouchableOpacity,
    ActivityIndicator,
    Keyboard,
    Modal,
    ScrollView,
    Switch,
    ActionSheetIOS,
    Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAuthStore } from '../store/authStore';
import { useAddTicketEvent } from '../hooks/useTickets';

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

    const { mutate, isPending, error } = useAddTicketEvent(ticket?.id);

    const isClosed = ticket?.status === 'CLOSED';
    const customerCanReply = ticket?.allow_customer_reply === true;

    // Customer is blocked from replying unless staff has enabled it,
    // per the backend rule documented in your TRD.
    if (isCustomer && !customerCanReply) {
        return (
            <View className="flex-row items-center gap-2 p-3.5 bg-bg-subtle border-t border-border">
                <Feather name="lock" size={14} color="#9A9184" />
                <Text className="font-sans text-text-secondary text-[13px] flex-1">
                    Replies are currently disabled for this ticket by support staff.
                </Text>
            </View>
        );
    }

    if (isClosed) {
        return (
            <View className="flex-row items-center gap-2 p-3.5 bg-bg-subtle border-t border-border">
                <Feather name="check-circle" size={14} color="#9A9184" />
                <Text className="font-sans text-text-secondary text-[13px] flex-1">
                    This ticket is closed. No further replies can be added.
                </Text>
            </View>
        );
    }

    const hasContent = message.trim().length > 0 || attachments.length > 0;

    const handleSend = () => {
        if (isPending) return;

        // Empty input (and no attachments) on Send opens the Quick Reply
        // panel instead of submitting — it takes over the keyboard's space.
        if (!hasContent) {
            Keyboard.dismiss();
            setQuickReplyVisible(true);
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
                setMessage('');
                setAttachments([]);
            },
        });
    };

    const handleAttachPress = () => {
        if (isPending || attachments.length >= MAX_ATTACHMENTS) return;

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ['Cancel', 'Photo & Video', 'Document'],
                    cancelButtonIndex: 0,
                },
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

        // SDK 48+ returns { assets: [...] }; older SDKs return the asset
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
        // Wait for the sheet's close animation before requesting focus, or
        // the modal's own dismissal can steal it back from the input.
        setTimeout(() => inputRef.current?.focus(), 300);
    };

    const handleCloseQuickReply = () => {
        setQuickReplyVisible(false);
    };

    return (
        <View className="border-t border-border bg-surface p-3">
            {error ? (
                <Text className="font-sans text-error-text text-[13px] mb-2">
                    {error.message || 'Failed to send reply.'}
                </Text>
            ) : null}

            {isStaff ? (
                <View className="flex-row gap-5 mb-2.5 px-0.5">
                    <View className="flex-row items-center gap-2">
                        <Text className="font-sans text-text-secondary text-xs">Visible to customer</Text>
                        {/* Calm slate/blue toggle — was orange (#EAC49B track /
                            #C0703A thumb), which read as too intense for a
                            background-level control. */}
                        <Switch
                            value={visibleToCustomer}
                            onValueChange={setVisibleToCustomer}
                            trackColor={{ false: '#E2E8F0', true: '#93C5FD' }}
                            thumbColor={visibleToCustomer ? '#3B82F6' : '#F8FAFC'}
                        />
                    </View>
                    <View className="flex-row items-center gap-2">
                        <Text className="font-sans text-text-secondary text-xs">Send email</Text>
                        <Switch
                            value={sendEmail}
                            onValueChange={setSendEmail}
                            trackColor={{ false: '#E2E8F0', true: '#93C5FD' }}
                            thumbColor={sendEmail ? '#3B82F6' : '#F8FAFC'}
                        />
                    </View>
                </View>
            ) : null}

            {/* Attachment previews — shown above the input when files are staged. */}
            {attachments.length > 0 && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 10, paddingBottom: 10 }}
                >
                    {attachments.map((att) => (
                        <View key={att.id} className="relative">
                            {att.kind === 'image' ? (
                                <Image
                                    source={{ uri: att.uri }}
                                    className="w-16 h-16 rounded-xl bg-bg-subtle border border-border"
                                />
                            ) : (
                                <View className="w-16 h-16 rounded-xl bg-bg-subtle border border-border items-center justify-center px-1.5">
                                    <Feather
                                        name={att.kind === 'video' ? 'film' : 'file-text'}
                                        size={18}
                                        color="#6B6255"
                                    />
                                    <Text
                                        numberOfLines={1}
                                        className="font-sans text-text-tertiary text-[9px] mt-1 text-center"
                                    >
                                        {att.name}
                                    </Text>
                                </View>
                            )}
                            <Pressable
                                onPress={() => removeAttachment(att.id)}
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-800 items-center justify-center border border-surface"
                            >
                                <Feather name="x" size={11} color="#FFFFFF" />
                            </Pressable>
                        </View>
                    ))}
                </ScrollView>
            )}

            <View className="flex-row items-end gap-2">
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleAttachPress}
                    disabled={isPending || attachments.length >= MAX_ATTACHMENTS}
                    className="w-[42px] h-[42px] rounded-full items-center justify-center bg-bg-subtle border border-border"
                >
                    <Feather name="paperclip" size={18} color="#6B6255" />
                </TouchableOpacity>

                <TextInput
                    ref={inputRef}
                    value={message}
                    onChangeText={setMessage}
                    placeholder={isStaff && !visibleToCustomer ? 'Internal note...' : 'Type a reply...'}
                    placeholderTextColor="#9A9184"
                    multiline
                    editable={!isPending}
                    className="flex-1 border border-border rounded-xl px-3.5 py-2.5 font-sans text-text-primary text-[15px] max-h-[100px] bg-bg-subtle"
                />
                {/* Calm blue send button — was bg-primary-500 (orange). */}
                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleSend}
                    disabled={isPending}
                    className={`w-[42px] h-[42px] rounded-full items-center justify-center ${
                        isPending ? 'bg-slate-300' : 'bg-blue-500 shadow-sm'
                    }`}
                >
                    {isPending ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <Feather name={hasContent ? 'send' : 'zap'} size={18} color="#FFFFFF" />
                    )}
                </TouchableOpacity>
            </View>

            {/* Android attachment menu — iOS uses the native ActionSheetIOS instead. */}
            {Platform.OS !== 'ios' && (
                <Modal
                    visible={attachMenuVisible}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setAttachMenuVisible(false)}
                >
                    <Pressable
                        className="flex-1 justify-end bg-black/40"
                        onPress={() => setAttachMenuVisible(false)}
                    >
                        <Pressable
                            onPress={(e) => e.stopPropagation()}
                            className="bg-surface rounded-t-3xl shadow-xl px-4 pt-3 pb-8"
                        >
                            <View className="w-10 h-1 bg-border-strong rounded-full self-center mb-4" />

                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={handleAndroidPickMedia}
                                className="flex-row items-center gap-3 py-3.5 px-1"
                            >
                                <View className="w-9 h-9 rounded-full bg-primary-50 items-center justify-center">
                                    <Feather name="image" size={17} color="#C0703A" />
                                </View>
                                <Text className="font-sans-semibold text-text-primary text-base">
                                    Photo & Video
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={handleAndroidPickDocument}
                                className="flex-row items-center gap-3 py-3.5 px-1"
                            >
                                <View className="w-9 h-9 rounded-full bg-primary-50 items-center justify-center">
                                    <Feather name="file-text" size={17} color="#C0703A" />
                                </View>
                                <Text className="font-sans-semibold text-text-primary text-base">
                                    Document
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => setAttachMenuVisible(false)}
                                className="mt-2 py-3.5 items-center border-t border-border"
                            >
                                <Text className="font-sans-semibold text-text-secondary text-base">
                                    Cancel
                                </Text>
                            </TouchableOpacity>
                        </Pressable>
                    </Pressable>
                </Modal>
            )}

            {/* Quick Reply panel — slides up from the bottom in place of the
                keyboard when Send is tapped with an empty message. */}
            <Modal
                visible={quickReplyVisible}
                transparent
                animationType="slide"
                onRequestClose={handleCloseQuickReply}
            >
                <Pressable
                    className="flex-1 justify-end bg-black/40"
                    onPress={handleCloseQuickReply}
                >
                    <Pressable
                        onPress={(e) => e.stopPropagation()}
                        className="bg-surface rounded-t-3xl shadow-xl px-4 pt-4"
                        style={{ maxHeight: '70%', paddingBottom: 32 }}
                    >
                        <View className="flex-row items-center justify-between mb-3 px-0.5">
                            <Text className="font-sans-semibold text-text-primary text-base">
                                Quick Replies
                            </Text>
                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={handleCloseQuickReply}
                                className="w-8 h-8 rounded-full bg-bg-subtle items-center justify-center"
                            >
                                <Feather name="x" size={16} color="#2E2A24" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {quickReplies.map((reply, index) => (
                                <TouchableOpacity
                                    key={index}
                                    activeOpacity={0.85}
                                    onPress={() => handleSelectQuickReply(reply)}
                                    className="bg-surface border border-border rounded-2xl p-4 mb-3 shadow-sm"
                                >
                                    <Text
                                        numberOfLines={3}
                                        className="font-sans text-text-primary text-sm leading-5"
                                    >
                                        {reply}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}