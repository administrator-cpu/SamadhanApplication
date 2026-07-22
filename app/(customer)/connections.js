// app/(customer)/connections.js
import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  Pressable, 
  ActivityIndicator, 
  StyleSheet, 
  RefreshControl,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useMyConnections } from '../../src/hooks/useCustomers';

export default function MyConnections() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useMyConnections();
  const [refreshing, setRefreshing] = useState(false);

  const connections = data?.connections || [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (refetch) await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0f172a" />
        <Text style={styles.loadingText}>Fetching connections...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Connections</Text>
        <Text style={styles.headerSubtitle}>Select a service to raise a support ticket</Text>
      </View>

      <FlatList
        data={connections}
        keyExtractor={(item, index) => String(item?.id ?? index)}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0f172a" />
        }
        renderItem={({ item }) => {
          const isActive = (item.status || 'Active').toLowerCase() === 'active';
          
          return (
            <Pressable
              // This is the bulletproof way to handle Pressable styles
              style={({ pressed }) => [
                styles.pressableWrapper,
                pressed && styles.pressedState
              ]}
              onPress={() => router.push(`/(customer)/raise-ticket?circuitId=${encodeURIComponent(item.fabCircuitId)}`)}
            >
              {/* The layout is now safely wrapped in a standard View */}
              <View style={styles.tile}>
                
                {/* Left Icon Area */}
                <View style={styles.iconContainer}>
                  <View style={styles.iconBackground}>
                    <Feather name="server" size={18} color="#3b82f6" />
                  </View>
                  <View style={[styles.statusDot, isActive ? styles.dotActive : styles.dotInactive]} />
                </View>

                {/* Center Info Area */}
                <View style={styles.infoContainer}>
                  <Text style={styles.circuitId} numberOfLines={1}>
                    {item.fabCircuitId}
                  </Text>
                  
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>{item.serviceType || 'Unknown'}</Text>
                    <View style={styles.metaDivider} />
                    <Text style={styles.metaText}>{item.bandwidth || 'N/A'}Mbps</Text>
                    <View style={styles.metaDivider} />
                    <Text style={styles.metaText}>{item.installationCode || item.aEndBtsId || 'N/A'}</Text>
                  </View>
                </View>

                {/* Right Affordance Area */}
                <View style={styles.chevronContainer}>
                  <Feather name="chevron-right" size={20} color="#cbd5e1" />
                </View>

              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <MaterialCommunityIcons 
                name={isError ? "alert-circle-outline" : "lan-disconnect"} 
                size={40} 
                color="#94a3b8" 
              />
            </View>
            <Text style={styles.emptyTitle}>
              {isError ? "Unable to connect" : "No connections found"}
            </Text>
            <Text style={styles.emptyText}>
              {isError 
                ? "Please pull down to refresh the list." 
                : "You don't have any active services right now."}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8fafc' 
  },
  centerContainer: { 
    flex: 1, 
    backgroundColor: '#f8fafc', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  loadingText: {
    marginTop: 14,
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500'
  },
  
  header: { 
    paddingHorizontal: 20, 
    paddingTop: Platform.OS === 'ios' ? 60 : 44, 
    paddingBottom: 24,
    backgroundColor: '#f8fafc',
  },
  headerTitle: { 
    fontSize: 28, 
    fontWeight: '800', 
    color: '#0f172a',
    letterSpacing: -0.5
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '500'
  },
  
  listContainer: { 
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap:5,
  },

  /* BULLETPROOF TILE STYLING */
  pressableWrapper: {
    marginBottom: 12,
  },
  pressedState: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }] // Smooth interaction
  },
  tile: {
    flexDirection: 'row',       // This will now work 100%
    alignItems: 'center',
    backgroundColor: '#ffffff', // Your white card is back
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  
  /* ICON & STATUS */
  iconContainer: {
    position: 'relative',
    marginRight: 16,
  },
  iconBackground: { 
    width: 48, 
    height: 48, 
    borderRadius: 14, 
    backgroundColor: '#eff6ff', 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  statusDot: { 
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14, 
    height: 14, 
    borderRadius: 7, 
    borderWidth: 2,
    borderColor: '#ffffff' // Hides the blue background behind the dot
  },
  dotActive: { backgroundColor: '#10b981' },
  dotInactive: { backgroundColor: '#cbd5e1' },
  
  /* TYPOGRAPHY & INFO */
  infoContainer: {
    flex: 1, // Pushes the chevron to the right
    justifyContent: 'center',
  },
  circuitId: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#0f172a',
    marginBottom: 4,
    letterSpacing: -0.2
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    // marginBottom: 4
  },
  metaText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500'
  },
  metaDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    marginHorizontal: 8
  },
  codeText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '400'
  },

  chevronContainer: {
    paddingLeft: 12,
  },

  /* EMPTY STATE */
  emptyContainer: { 
    alignItems: 'center', 
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 30
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8
  },
  emptyText: { 
    textAlign: 'center', 
    color: '#64748b',
    fontSize: 14,
    lineHeight: 22
  },
});