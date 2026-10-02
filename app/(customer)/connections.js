// app/(customer)/connections.js
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useMyConnections } from '../../src/hooks/useCustomers';

/* ── palette (matches design 8b) ───────────────────────────── */
const C = {
  bg: '#f3f2fd',
  card: '#ffffff',
  ink: '#151233',
  inkSoft: '#3a3670',
  sub: '#6d6a96',
  muted: '#9d9ac0',
  rule: '#e3e0f5',
  violetDeep: '#4a34c7',
  mint: '#12b886',
  mintBg: '#ccf7e4',
  mintInk: '#0f7a56',
  idle: '#c3c0e2',
  idleBg: '#f0eefc',
};

const CARD = {
  backgroundColor: C.card,
  borderRadius: 24,
  padding: 16,
  shadowColor: '#151233',
  shadowOpacity: 0.06,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
  
};

const MONO = 'ui-monospace';

function formatBandwidth(bandwidth) {
  const n = Number(bandwidth);
  if (!bandwidth || Number.isNaN(n)) return { fig: '—', unit: '' };
  if (n >= 1000) return { fig: String(+(n / 1024).toFixed(n % 1000 === 0 ? 0 : 1)), unit: 'Gbps' };
  return { fig: String(n), unit: 'Mbps' };
}

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

  const groups = useMemo(() => {
    const byType = new Map();
    connections.forEach((item) => {
      const key = item?.serviceType || 'Other';
      if (!byType.has(key)) byType.set(key, []);
      byType.get(key).push(item);
    });
    return Array.from(byType, ([type, items]) => ({ type, items }));
  }, [connections]);

  const activeCount = connections.filter(
    (c) => (c?.status || 'Active').toLowerCase() === 'active'
  ).length;

  if (isLoading && !refreshing) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={C.ink} />
        <Text className="font-sans-semibold" style={{ fontSize: 13, color: C.sub, marginTop: 14 }}>
          Fetching connections...
        </Text>
      </View>
    );
  }

  const renderRow = (item, index) => {
    const isActive = (item.status || 'Active').toLowerCase() === 'active';
    const { fig, unit } = formatBandwidth(item.bandwidth);
    const site = item.bEndBtsId === "N/A" ? item.aEndBtsId : item.bEndBtsId || '—';

    return (
      <Pressable
        key={String(item?.id ?? `${item?.fabCircuitId}-${index}`)}
        onPress={() =>
          router.push(`/(customer)/raise-ticket?circuitId=${encodeURIComponent(item.fabCircuitId)}`)
        }
        style={({ pressed }) => [CARD, { gap: 13, opacity: pressed ? 0.9 : 1 }]}
        className=" p-3 px-[16px] bg-[#fff] rounded-xl"
      >
        {/* circuit id + state */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} className="pb-2">
          <View
            style={{
              width: 9,
              height: 9,
              borderRadius: 5,
              backgroundColor: isActive ? C.mint : C.idle,
            }}
          />
          <Text
            style={{
              flex: 1,
              minWidth: 0,
              fontFamily: MONO,
              fontWeight: '700',
              fontSize: 14.5,
              letterSpacing: -0.3,
              color: C.ink,
            }}
            
            numberOfLines={1}
          >
            {item.fabCircuitId}
          </Text>
          <Text
            className="font-sans-semibold"
            style={{
              fontSize: 10,
              letterSpacing: 1,
              textTransform: 'uppercase',
              backgroundColor: isActive ? C.mintBg : C.idleBg,
              borderRadius: 999,
              paddingHorizontal: 9,
              paddingVertical: 5,
              overflow: 'hidden',
              color: isActive ? C.mintInk : C.sub,
            }}
          >
            {isActive ? 'Active' : item.status || 'Inactive'}
          </Text>
        </View>

        {/* bandwidth · site · ticket */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14 }}>
          <View>
            <Text
              className="font-sans-medium"
              style={{ fontSize: 9.5, letterSpacing: 0.9, textTransform: 'uppercase', color: C.muted }}
            >
              Bandwidth
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, marginTop: 3 }}>
              <Text
                className="font-sans-semibold"
                style={{ fontSize: 20, letterSpacing: -0.6, lineHeight: 22, color: C.ink }}
              >
                {fig}
              </Text>
              <Text className="font-sans-semibold" style={{ fontSize: 10.5, color: C.sub, lineHeight: 15 }}>
                {unit}
              </Text>
            </View>
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              className="font-sans-medium"
              style={{ fontSize: 9.5, letterSpacing: 0.9, textTransform: 'uppercase', color: C.muted }}
            >
              Site
            </Text>
            <Text
              style={{
                fontFamily: MONO,
                fontWeight: '600',
                fontSize: 12.5,
                color: C.inkSoft,
                marginTop: 4,
              }}
              numberOfLines={1}
            >
              {site}
            </Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: C.ink,
              borderRadius: 999,
              paddingHorizontal: 13,
              paddingVertical: 9,
            }}
          >
            <Feather name="plus" size={12} color={C.bg} />
            <Text className="font-sans-semibold" style={{ fontSize: 11.5, color: C.bg }}>
              Ticket
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Header */}
      <View style={{ paddingTop: 48, paddingBottom: 18, paddingHorizontal: 20 }}>
        <Text
          className="font-sans-semibold"
          style={{ fontSize: 10.5, letterSpacing: 1.4, textTransform: 'uppercase', color: C.violetDeep }}
        >
          Your network
        </Text>
        <Text className="font-sans-semibold" style={{ fontSize: 31, color: C.ink, marginTop: 3 }}>
          Connections
        </Text>
        <Text className="font-sans" style={{ fontSize: 13, color: C.sub, marginTop: 5 }}>
          {connections.length
            ? `${connections.length} ${connections.length === 1 ? 'service' : 'services'} · ${activeCount} active · tap one to raise a ticket`
            : 'Select a service to raise a support ticket'}
        </Text>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(group, index) => String(group?.type ?? index)}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 160, gap: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6c5ce7" />
        }
        renderItem={({ item: group }) => (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, paddingLeft: 4 }}>
              <Text
                className="font-sans-semibold"
                style={{ fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: C.ink }}
              >
                {group.type}
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: C.rule }} />
              <Text className="font-sans-medium" style={{ fontSize: 11, color: C.muted }}>
                {group.items.length} {group.items.length === 1 ? 'link' : 'links'}
              </Text>
            </View>
            {group.items.map(renderRow)}
          </View>
        )}
        ListEmptyComponent={
          <View style={{ ...CARD, paddingVertical: 34, paddingHorizontal: 24, alignItems: 'center' }}>
            <View
              style={{
                width: 76,
                height: 76,
                borderRadius: 38,
                backgroundColor: C.bg,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <MaterialCommunityIcons
                name={isError ? 'alert-circle-outline' : 'lan-disconnect'}
                size={34}
                color={C.muted}
              />
            </View>
            <Text className="font-sans-semibold" style={{ fontSize: 18, color: C.ink, marginBottom: 6 }}>
              {isError ? 'Unable to connect' : 'No connections found'}
            </Text>
            <Text
              className="font-sans"
              style={{ fontSize: 12.5, lineHeight: 19, color: C.sub, textAlign: 'center' }}
            >
              {isError
                ? 'Please pull down to refresh the list.'
                : "You don't have any active services right now."}
            </Text>
          </View>
        }
      />
    </View>
  );
}
