// app/(customer)/support-guidelines.js
import React from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  Platform 
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

// --- DATA MODELS ---
const severityLevels = [
  {
    id: 'critical',
    title: 'Critical',
    icon: 'alert-circle',
    color: '#ef4444', // Red
    bgLight: '#fef2f2',
    description: 'Complete service outage or business-critical functionality unavailable. No workaround exists.',
    response: 'Immediate',
    resolution: '2-4 hours',
  },
  {
    id: 'medium',
    title: 'Medium',
    icon: 'alert-triangle',
    color: '#f97316', // Orange
    bgLight: '#fff7ed',
    description: 'Partial service degradation or issue affecting a limited number of users. Workaround available.',
    response: 'Immediate',
    resolution: '4-6 hours',
  },
  {
    id: 'low',
    title: 'Low',
    icon: 'info',
    color: '#eab308', // Yellow/Amber
    bgLight: '#fefce8',
    description: 'Minor issue, cosmetic defect, or information request. No significant business impact.',
    response: 'Immediate',
    resolution: 'Standard',
  },
];

const escalationMatrix = [
  {
    level: 'L1',
    owner: 'Samadhan AI Agent',
    icon: 'robot-outline',
    email: null,
    responsibility: 'Ticket creation, initial troubleshooting, customer acknowledgement, regular status updates, coordination with field/vendor teams.',
    trigger: 'Immediately upon incident logging.',
    comms: 'Initial acknowledgement within 15 minutes, then updates every 30-60 minutes.',
  },
  {
    level: 'L2',
    owner: 'NOC Head',
    icon: 'account-tie-outline',
    email: 'noc.head@fab5network.com',
    responsibility: 'Review technical progress, allocate additional resources, coordinate with OEM/vendors, drive incident resolution, monitor SLA compliance.',
    trigger: 'Incident remains unresolved for 4 hours or MTTR is at risk.',
    comms: 'Updates to customer and management every 30-60 minutes until restoration.',
  },
  {
    level: 'L3',
    owner: 'Operations Head',
    icon: 'shield-account-outline',
    email: 'operation.head@fab5network.com',
    responsibility: 'Executive ownership, cross-functional coordination, customer executive communication, resource prioritization, management escalation, and final decision-making.',
    trigger: 'Incident remains unresolved for 6 hours, MTTR is breached, or incident is business-critical.',
    comms: 'Executive updates every 30-60 minutes until service restoration and RCA initiation.',
  },
];

export default function SupportGuidelines() {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      
      {/* HEADER PAGE */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Support Guidelines</Text>
        <Text style={styles.headerSubtitle}>
          Understanding our SLA commitments and escalation procedures.
        </Text>
      </View>

      {/* SEVERITY LEVELS SECTION */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Feather name="shield" size={20} color="#4f46e5" />
          <Text style={styles.sectionTitle}>Severity Levels</Text>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScrollPad}
          snapToInterval={296} // Width of card (280) + margin (16)
          decelerationRate="fast"
        >
          {severityLevels.map((item) => (
            <View key={item.id} style={styles.severityCard}>
              <View style={styles.sevCardHeader}>
                <View style={[styles.sevIconWrap, { backgroundColor: item.bgLight }]}>
                  <Feather name={item.icon} size={18} color={item.color} />
                </View>
                <Text style={styles.sevTitle}>{item.title}</Text>
              </View>
              
              <Text style={styles.sevDesc}>{item.description}</Text>
              
              <View style={styles.sevDivider} />
              
              <View style={styles.sevMetricRow}>
                <Text style={styles.sevMetricLabel}>RESPONSE</Text>
                <View style={styles.badgeGray}>
                  <Text style={styles.badgeTextGray}>{item.response}</Text>
                </View>
              </View>
              
              <View style={styles.sevMetricRow}>
                <Text style={styles.sevMetricLabel}>RESOLUTION</Text>
                <View style={[styles.badgeColor, { backgroundColor: item.bgLight }]}>
                  <Text style={[styles.badgeTextColor, { color: item.color }]}>{item.resolution}</Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* ESCALATION MATRIX SECTION */}
      <View style={[styles.section, styles.bottomPadding]}>
        <View style={styles.sectionHeader}>
          <Feather name="trending-up" size={20} color="#4f46e5" />
          <Text style={styles.sectionTitle}>Escalation Matrix</Text>
        </View>

        <View style={styles.matrixContainer}>
          {escalationMatrix.map((item, index) => (
            <View key={item.level} style={styles.matrixCard}>
              
              {/* Card Header: Level & Owner */}
              <View style={styles.matrixCardHeader}>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelBadgeText}>{item.level}</Text>
                </View>
                <View style={styles.ownerInfo}>
                  <View style={styles.ownerTitleRow}>
                    <MaterialCommunityIcons name={item.icon} size={18} color="#0f172a" />
                    <Text style={styles.ownerName}>{item.owner}</Text>
                  </View>
                  {item.email && (
                    <Text style={styles.ownerEmail}>{item.email}</Text>
                  )}
                </View>
              </View>

              <View style={styles.matrixDivider} />

              {/* Matrix Data Rows */}
              <MatrixDataRow label="Responsibility" value={item.responsibility} />
              <MatrixDataRow label="Escalation Trigger" value={item.trigger} 
                highlight={item.trigger.includes('4 hours') || item.trigger.includes('6 hours') ? '#ef4444' : null} 
              />
              <MatrixDataRow label="Communication" value={item.comms} />

            </View>
          ))}
        </View>
      </View>

    </ScrollView>
  );
}

// Helper component for the Escalation Matrix rows
function MatrixDataRow({ label, value, highlight }) {
  // Simple check to render highlighted text (like "4 hours" or "6 hours" in red)
  const renderValue = () => {
    if (!highlight) return <Text style={styles.matrixValue}>{value}</Text>;
    
    // Quick logic to highlight specific phrases for the UI
    const parts = value.split(/(4 hours|6 hours)/gi);
    return (
      <Text style={styles.matrixValue}>
        {parts.map((part, i) => 
          (part.toLowerCase() === '4 hours' || part.toLowerCase() === '6 hours') 
            ? <Text key={i} style={{ color: highlight, fontWeight: '700' }}>{part}</Text> 
            : part
        )}
      </Text>
    );
  };

  return (
    <View style={styles.matrixDataRow}>
      <Text style={styles.matrixLabel}>{label}</Text>
      {renderValue()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#64748b',
    marginTop: 6,
    lineHeight: 22,
  },
  
  section: {
    marginTop: 8,
  },
  bottomPadding: {
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },

  /* SEVERITY CARDS (Horizontal Scroll) */
  horizontalScrollPad: {
    paddingHorizontal: 20,
    paddingBottom: 20, // space for shadow
  },
  severityCard: {
    width: 280,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  sevCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  sevIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sevTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  sevDesc: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    minHeight: 60, // Keeps cards uniform height
  },
  sevDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 16,
  },
  sevMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sevMetricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  badgeGray: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeTextGray: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  badgeColor: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeTextColor: {
    fontSize: 12,
    fontWeight: '700',
  },

  /* ESCALATION MATRIX CARDS (Vertical Stack) */
  matrixContainer: {
    paddingHorizontal: 20,
  },
  matrixCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  matrixCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  levelBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#e0e7ff', // Soft Indigo
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadgeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4f46e5', // Indigo text
  },
  ownerInfo: {
    flex: 1,
  },
  ownerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  ownerEmail: {
    fontSize: 13,
    color: '#3b82f6', // Blue link color
    marginTop: 2,
  },
  matrixDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 14,
  },
  matrixDataRow: {
    marginBottom: 12,
  },
  matrixLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  matrixValue: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
});