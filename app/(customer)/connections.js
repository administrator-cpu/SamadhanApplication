// app/(customer)/connections.js
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import Screen, { ScreenFlatList } from '../../src/components/layout/Screen';
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

const CARD_CLASS = 'bg-[#ffffff] rounded-[24px] p-[12px] std:p-[16px]';


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
      <View className="flex-1 bg-[#f3f2fd] items-center justify-center">
        <ActivityIndicator size="large" color={C.ink} />
        <Text className="font-sans-semibold text-[13px] text-[#6d6a96] mt-[14px]">
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
        style={styles.card}
        className={`${CARD_CLASS} gap-[13px] active:opacity-90`}
      >
        {/* circuit id + state */}
        <View className="pb-2 flex-row items-center gap-[10px]">
          <View
            className={`w-[9px] h-[9px] rounded-[5px] ${isActive ? 'bg-[#12b886]' : 'bg-[#c3c0e2]'}`}
          />
          <Text
            className="flex-1 min-w-0 font-[ui-monospace] font-bold text-[14.5px] tracking-[-0.3px] text-[#151233]"
            
            numberOfLines={1}
          >
            {item.fabCircuitId}
          </Text>
          <Text
            className={`font-sans-semibold text-[10px] tracking-[1px] uppercase rounded-[999px] px-[9px] py-[5px] overflow-hidden ${isActive ? 'bg-[#ccf7e4] text-[#0f7a56]' : 'bg-[#f0eefc] text-[#6d6a96]'}`}
          >
            {isActive ? 'Active' : item.status || 'Inactive'}
          </Text>
        </View>

        {/* bandwidth · site · ticket */}
        <View className="flex-row items-end gap-[14px]">
          <View>
            <Text
              className="font-sans-medium text-[9.5px] tracking-[0.9px] uppercase text-[#9d9ac0]"
            >
              Bandwidth
            </Text>
            <View className="flex-row items-end gap-[3px] mt-[3px]">
              <Text
                className="font-sans-semibold text-[20px] tracking-[-0.6px] leading-[22px] text-[#151233]"
              >
                {fig}
              </Text>
              <Text className="font-sans-semibold text-[10.5px] text-[#6d6a96] leading-[15px]">
                {unit}
              </Text>
            </View>
          </View>

          <View className="flex-1 min-w-0">
            <Text
              className="font-sans-medium text-[9.5px] tracking-[0.9px] uppercase text-[#9d9ac0]"
            >
              Site
            </Text>
            <Text
              className="font-[ui-monospace] font-semibold text-[12.5px] text-[#3a3670] mt-[4px]"
              numberOfLines={1}
            >
              {site}
            </Text>
          </View>

          <View
            className="flex-row items-center gap-[6px] bg-[#151233] rounded-[999px] px-[13px] py-[9px]"
          >
            <Feather name="plus" size={12} color={C.bg} />
            <Text className="font-sans-semibold text-[11.5px] text-[#f3f2fd]">
              Ticket
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <Screen className="bg-[#f3f2fd]">
      {/* Header */}
      <View className="pt-[16px] pb-[18px] px-[16px] std:px-[20px]">
        <Text
          className="font-sans-semibold text-[10.5px] tracking-[1.4px] uppercase text-[#4a34c7]"
        >
          Your network
        </Text>
        <Text className="font-sans-semibold text-[31px] text-[#151233] mt-[3px]">
          Connections
        </Text>
        <Text className="font-sans text-[13px] text-[#6d6a96] mt-[5px]">
          {connections.length
            ? `${connections.length} ${connections.length === 1 ? 'service' : 'services'} · ${activeCount} active · tap one to raise a ticket`
            : 'Select a service to raise a support ticket'}
        </Text>
      </View>

      <ScreenFlatList
        data={groups}
        keyExtractor={(group, index) => String(group?.type ?? index)}
        contentContainerClassName="px-[12px] std:px-[16px] gap-[16px]"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6c5ce7" />
        }
        renderItem={({ item: group }) => (
          <View className="gap-[10px]">
            <View className="flex-row items-center gap-[9px] pl-[4px]">
              <Text
                className="font-sans-semibold text-[12px] tracking-[1.2px] uppercase text-[#151233]"
              >
                {group.type}
              </Text>
              <View className="flex-1 h-[1px] bg-[#e3e0f5]" />
              <Text className="font-sans-medium text-[11px] text-[#9d9ac0]">
                {group.items.length} {group.items.length === 1 ? 'link' : 'links'}
              </Text>
            </View>
            {group.items.map(renderRow)}
          </View>
        )}
        ListEmptyComponent={
          <View className={`${CARD_CLASS} py-[34px] px-[24px] items-center`} style={styles.card}>
            <View
              className="w-[76px] h-[76px] rounded-[38px] bg-[#f3f2fd] items-center justify-center mb-[16px]"
            >
              <MaterialCommunityIcons
                name={isError ? 'alert-circle-outline' : 'lan-disconnect'}
                size={34}
                color={C.muted}
              />
            </View>
            <Text className="font-sans-semibold text-[18px] text-[#151233] mb-[6px]">
              {isError ? 'Unable to connect' : 'No connections found'}
            </Text>
            <Text
              className="font-sans text-[12.5px] leading-[19px] text-[#6d6a96] text-center"
            >
              {isError
                ? 'Please pull down to refresh the list.'
                : "You don't have any active services right now."}
            </Text>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    shadowColor: '#151233',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
});
