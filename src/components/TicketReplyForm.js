// src/components/TicketReplyForm.js
import { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Switch,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { useAddTicketEvent } from '../hooks/useTickets';

const STAFF_ROLES = ['SUPPORT_AGENT', 'ADMIN'];

export default function TicketReplyForm({ ticket }) {
    const user = useAuthStore((state) => state.user);
    const isStaff = STAFF_ROLES.includes(user?.role);
    const isCustomer = user?.role === 'USER';

    const [message, setMessage] = useState('');
    const [visibleToCustomer, setVisibleToCustomer] = useState(true);
    const [sendEmail, setSendEmail] = useState(true);

    const { mutate, isPending, error } = useAddTicketEvent(ticket?.id);

    const isClosed = ticket?.status === 'CLOSED';
    const customerCanReply = ticket?.allow_customer_reply === true;

    // Customer is blocked from replying unless staff has enabled it,
    // per the backend rule documented in your TRD.
    if (isCustomer && !customerCanReply) {
        return (
            <View style={styles.disabledBanner}>
                <Feather name="lock" size={14} color="#6b7280" />
                <Text style={styles.disabledText}>
                    Replies are currently disabled for this ticket by support staff.
                </Text>
            </View>
        );
    }

    if (isClosed) {
        return (
            <View style={styles.disabledBanner}>
                <Feather name="check-circle" size={14} color="#6b7280" />
                <Text style={styles.disabledText}>This ticket is closed. No further replies can be added.</Text>
            </View>
        );
    }

    const handleSend = () => {
        if (!message.trim() || isPending) return;

        mutate(
            {
                message: message.trim(),
                visibleToCustomer: isStaff ? visibleToCustomer : true,
                send_email: isStaff ? sendEmail : true,
            },
            {
                onSuccess: () => setMessage(''),
            }
        );
    };

    return (
        
            <View style={styles.container}>
                {error ? (
                    <Text style={styles.errorText}>{error.message || 'Failed to send reply.'}</Text>
                ) : null}

                {isStaff ? (
                    <View style={styles.toggleRow}>
                        <View style={styles.toggleItem}>
                            <Text style={styles.toggleLabel}>Visible to customer</Text>
                            <Switch value={visibleToCustomer} onValueChange={setVisibleToCustomer} />
                        </View>
                        <View style={styles.toggleItem}>
                            <Text style={styles.toggleLabel}>Send email</Text>
                            <Switch value={sendEmail} onValueChange={setSendEmail} />
                        </View>
                    </View>
                ) : null}

                <View style={styles.inputRow}>
                    <TextInput
                        value={message}
                        onChangeText={setMessage}
                        placeholder={isStaff && !visibleToCustomer ? 'Internal note...' : 'Type a reply...'}
                        placeholderTextColor="#9ca3af"
                        multiline
                        style={styles.input}
                        editable={!isPending}
                    />
                    <Pressable
                        onPress={handleSend}
                        disabled={!message.trim() || isPending}
                        style={[styles.sendButton, (!message.trim() || isPending) && styles.sendButtonDisabled]}
                    >
                        {isPending ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                            <Feather name="send" size={18} color="#ffffff" />
                        )}
                    </Pressable>
                </View>
            </View>
    
    );
}

const styles = {
    container: {
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        backgroundColor: '#ffffff',
        padding: 12,
    },
    disabledBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 14,
        backgroundColor: '#f8fafc',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    disabledText: { fontSize: 13, color: '#6b7280', flex: 1 },
    errorText: { color: '#dc2626', fontSize: 13, marginBottom: 8 },
    toggleRow: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 10,
        paddingHorizontal: 2,
    },
    toggleItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    toggleLabel: { fontSize: 12, color: '#4b5563' },
    inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 15,
        maxHeight: 100,
        backgroundColor: '#f8fafc',
    },
    sendButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#3b82f6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonDisabled: { backgroundColor: '#93c5fd' },
};