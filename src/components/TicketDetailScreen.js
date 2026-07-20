// src/components/TicketDetailScreen.js
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLayoutEffect } from 'react';
import { KeyboardAvoidingView,Platform  } from 'react-native';

import { getEventConfig, formatEventTime } from '../utils/eventType';
import { statusLabel } from '../utils/ticketStatus';
import { useTicket } from '../hooks/useTickets';
import TicketStatusActions from './TicketStatusActions';
import TicketRating from './TicketRating';
import TicketReplyForm from './TicketReplyForm';
import TicketStaffTools from './TicketStaffTools';
import { useTicketSocket } from '../hooks/useTicketSocket';




// Premium Status Colors matching the list screen
const STATUS_COLORS = {
  OPEN: { bg: '#eff6ff', text: '#3b82f6' },
  IN_PROGRESS: { bg: '#fefce8', text: '#eab308' },
  ESCALATED: { bg: '#fef2f2', text: '#ef4444' },
  RESOLVED: { bg: '#f0fdf4', text: '#22c55e' },
  CLOSED: { bg: '#f3f4f6', text: '#6b7280' },
  REOPENED: { bg: '#faf5ff', text: '#a855f7' },
};

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { data, isLoading, isError, error, refetch, isRefetching } = useTicket(id);
  const navigation = useNavigation();
  useTicketSocket(id);


    useLayoutEffect(() => {
    if (data?.ticket?.ticket_no) {
      navigation.setOptions({ title: data.ticket.ticket_no });
    }
  }, [data?.ticket?.ticket_no]);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centerContainer}>
        <Feather name="alert-circle" size={42} color="#ef4444" style={{ marginBottom: 16 }} />
        <Text style={styles.errorTitle}>Couldn't load ticket details</Text>
        <Text style={styles.errorText}>{error?.message || 'Please try again.'}</Text>
        <Pressable onPress={() => refetch()} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Refresh</Text>
        </Pressable>
      </View>
    );
  }

  const { ticket, events } = data || {};
  const statusColors = STATUS_COLORS[ticket?.status] || STATUS_COLORS.CLOSED;

  return (
   <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === 'ios' ? 'padding' : "padding"}
    keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 90}
  >
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#3b82f6" />}
    >
      {/* 1. Header Card - Highly Structured */}
      <View style={styles.headerCard}>
        
        {/* Top Row: Ticket No & Badge */}
        <View style={styles.headerTopRow}>
          <View style={styles.ticketIdContainer}>
            <Feather name="hash" size={16} color="#64748b" />
            <Text style={styles.ticketNo}>{ticket?.ticket_no}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
            <Text style={[styles.statusBadgeText, { color: statusColors.text }]}>
              {statusLabel(ticket?.status)}
            </Text>
          </View>
        </View>

        {/* Title & Description */}
        {ticket?.subject && <Text style={styles.subject}>{ticket.subject}</Text>}
        <Text style={styles.descriptionText}>
          {ticket?.circuit_description || 'No detailed description provided for this ticket.'}
        </Text>

        <View style={styles.divider} />

        {/* Metadata Grid */}
        <View style={styles.metaContainer}>
          {ticket?.customer?.name && (
            <View style={styles.metaRow}>
              <View style={styles.metaIcon}>
                <Feather name="briefcase" size={14} color="#64748b" />
              </View>
              <View>
                <Text style={styles.metaLabel}>Customer</Text>
                <Text style={styles.metaValue}>{ticket.customer.name}</Text>
              </View>
            </View>
          )}

          <View style={styles.metaRow}>
            <View style={styles.metaIcon}>
              <Feather name="user" size={14} color="#64748b" />
            </View>
            <View>
              <Text style={styles.metaLabel}>Assignee</Text>
              <Text style={[styles.metaValue, !ticket?.assigned_employee?.name && { color: '#94a3b8' }]}>
                {ticket?.assigned_employee?.name || 'Unassigned'}
              </Text>
            </View>
          </View>

          {ticket?.created_at && (
            <View style={styles.metaRow}>
              <View style={styles.metaIcon}>
                <Feather name="calendar" size={14} color="#64748b" />
              </View>
              <View>
                <Text style={styles.metaLabel}>Created</Text>
                <Text style={styles.metaValue}>{formatEventTime(ticket.created_at)}</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {ticket?.rca ? (
        <View style={styles.rcaCard}>
          <View style={styles.rcaHeader}>
            <Feather name="file-text" size={16} color="#15803d" />
            <Text style={styles.rcaTitle}>Root Cause Analysis</Text>
          </View>
          <Text style={styles.rcaText}>{ticket.rca}</Text>

          {ticket.rca_images?.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
              {ticket.rca_images.map((url) => (
                <Image key={url} source={{ uri: url }} style={styles.rcaThumb} />
              ))}
            </ScrollView>
          )}
        </View>
      ) : null}

      <TicketStatusActions ticket={ticket} />
      <TicketStaffTools ticket={ticket} />
      <TicketRating ticket={ticket} />

      {/* 2. Timeline Section - Connected Flow */}
      <View style={styles.timelineSection}>
        <Text style={styles.timelineTitle}>Activity Timeline</Text>

        {(!events || events.length === 0) ? (
          <View style={styles.emptyTimeline}>
            <Feather name="clock" size={24} color="#cbd5e1" style={{ marginBottom: 8 }} />
            <Text style={styles.emptyTimelineText}>No activity recorded yet.</Text>
          </View>
        ) : (
          <View style={styles.timelineWrapper}>
            {events.map((event, index) => (
              <EventItem 
                key={event.id} 
                event={event} 
                isLast={index === events.length - 1} 
              />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
    <TicketReplyForm ticket={ticket} />
    </KeyboardAvoidingView>
  );
}

// ------------------------------------------------------------------
// EVENT ITEM COMPONENT (With vertical connecting line)
// ------------------------------------------------------------------
function EventItem({ event, isLast }) {
  const config = getEventConfig(event.event_type);
  const attachmentCount = event.metadata?.attachments?.length || 0;

  return (
    <View style={styles.eventRow}>
      {/* Left Column: Icon & Connecting Line */}
      <View style={styles.eventTrack}>
        <View style={[styles.eventIconWrap, { backgroundColor: `${config.color}15` }]}>
          <Feather name={config.icon} size={14} color={config.color} />
        </View>
        {/* Render the vertical line only if it's not the last item */}
        {!isLast && <View style={styles.connectingLine} />}
      </View>

      {/* Right Column: Content Card */}
      <View style={[styles.eventContent, isLast && { marginBottom: 0 }]}>
        <View style={styles.eventHeaderRow}>
          <Text style={[styles.eventLabel, { color: config.color }]}>{config.label}</Text>
          <Text style={styles.eventTime}>{formatEventTime(event.created_at)}</Text>
        </View>

        {event.message ? <Text style={styles.eventMessage}>{event.message}</Text> : null}

        {attachmentCount > 0 && (
          <View style={styles.attachmentPill}>
            <Feather name="paperclip" size={12} color="#64748b" />
            <Text style={styles.attachmentText}>
              {attachmentCount} attachment{attachmentCount > 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ------------------------------------------------------------------
// STYLESHEET
// ------------------------------------------------------------------
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8fafc' // Light gray canvas
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  errorText: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 24 },
  retryButton: { backgroundColor: '#3b82f6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 15 },
  rcaCard: {
  backgroundColor: '#f0fdf4',
  marginHorizontal: 16,
  marginBottom: 12,
  padding: 16,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: '#bbf7d0',
},
rcaHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
rcaTitle: { fontSize: 14, fontWeight: '700', color: '#15803d' },
rcaText: { fontSize: 14, color: '#166534', lineHeight: 20 },
rcaThumb: { width: 80, height: 80, borderRadius: 10, marginRight: 8, backgroundColor: '#e2e8f0' },

  // --- Header Card ---
  headerCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ticketIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ticketNo: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#64748b' 
  },
  statusBadge: { 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 8 
  },
  statusBadgeText: { 
    fontSize: 11, 
    fontWeight: '700', 
    textTransform: 'uppercase', 
    letterSpacing: 0.5 
  },
  subject: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#0f172a', 
    marginBottom: 8,
    lineHeight: 28,
  },
  descriptionText: { 
    fontSize: 15, 
    color: '#475569', 
    lineHeight: 24 
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 16,
  },
  
  // --- Meta Data Grid ---
  metaContainer: {
    gap: 16,
  },
  metaRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
  },
  metaIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  metaLabel: { 
    fontSize: 12, 
    color: '#64748b',
    marginBottom: 2,
  },
  metaValue: { 
    fontSize: 14, 
    fontWeight: '500', 
    color: '#0f172a' 
  },

  // --- Timeline Section ---
  timelineSection: { 
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  timelineTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#0f172a', 
    marginBottom: 16 
  },
  emptyTimeline: { 
    alignItems: 'center', 
    paddingVertical: 32 
  },
  emptyTimelineText: { 
    fontSize: 14, 
    color: '#94a3b8' 
  },
  timelineWrapper: {
    paddingLeft: 4,
  },

  // --- Event Item (Timeline Flow) ---
  eventRow: { 
    flexDirection: 'row',
  },
  eventTrack: {
    alignItems: 'center',
    marginRight: 12,
    width: 32, // Fixed width to center the line perfectly
  },
  eventIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2, // Keeps icon above the line
  },
  connectingLine: {
    width: 2,
    flex: 1, // Grows to connect to the next item
    backgroundColor: '#e2e8f0',
    marginTop: -4, 
    marginBottom: -4,
    zIndex: 1,
  },
  eventContent: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 20, // Space below each card
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  eventHeaderRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 8 
  },
  eventLabel: { 
    fontSize: 13, 
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  eventTime: { 
    fontSize: 12, 
    color: '#94a3b8' 
  },
  eventMessage: { 
    fontSize: 14, 
    color: '#334155', 
    lineHeight: 22 
  },
  attachmentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  attachmentText: { 
    fontSize: 12, 
    fontWeight: '500', 
    color: '#475569' 
  },
});