// app/(admin)/staff/index.js — design 10b: coverage board + compact roster
import { Feather } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Screen, { ScreenFlatList } from '../../../src/components/layout/Screen';
import { useRouter } from 'expo-router';

import { useEmployees } from '../../../src/hooks/useCustomers';

/* ── palette (matches connections.js / raise-ticket) ───────── */
const C = {
  bg: '#f3f2fd',
  card: '#ffffff',
  ink: '#151233',
  inkSoft: '#3a3670',
  sub: '#6d6a96',
  muted: '#9d9ac0',
  faint: '#c3c0e2',
  violetDeep: '#4a34c7',
  violetBg: '#ebe8ff',
  mint: '#12b886',
  mintBg: '#ccf7e4',
  mintInk: '#0f7a56',
  amber: '#ffd166',
  coral: '#ff6b57',
  coralSoft: '#ff9d8f',
  dangerBg: '#ffe1e1',
  dangerInk: '#b3261e',
  slateBg: '#eef0f6',
  slateInk: '#5b6178',
};

const MONO = 'ui-monospace';

// [background class, ink class] avatar tints.
const TINTS = [
  ['bg-[#ebe8ff]', 'text-[#4a34c7]'],
  ['bg-[#ccf7e4]', 'text-[#0f7a56]'],
  ['bg-[#ffe6d6]', 'text-[#a8501b]'],
  ['bg-[#e5eeff]', 'text-[#1f4bb8]'],
  ['bg-[#f6e2ff]', 'text-[#7a2fa8]'],
];

const ROLE_LABELS = {
  SUPPORT_AGENT: 'Support',
  SALES: 'Sales',
  ADMIN: 'Admin',
  SUPER_ADMIN: 'Admin',
};

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

// categories come back as objects; tolerate a few shapes
function categoryName(cat) {
  if (!cat) return null;
  if (typeof cat === 'string') return cat;
  return cat.name || cat.category_name || cat.title || cat.category || null;
}

function categoriesOf(item) {
  return (item?.categories || []).map(categoryName).filter(Boolean);
}

export default function StaffScreen() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const limit = 10;

  const { data, isLoading, isError, error, refetch, isRefetching } = useEmployees({
    page,
    limit,
  });
  const arr = ["spyderhj11@gmail.com", "ajay@finviatech.co", "administrator@fab5network.com"];
  const employees = data?.employees.filter((e) => !arr.includes(e?.email)) ?? [];

  const pagination = data?.pagination;
  const hasNextPage = pagination ? page * limit < pagination.total : false;

  const coverage = useMemo(() => {
    const agents = employees.filter((e) => e.role === 'SUPPORT_AGENT');
    const byCat = new Map();
    agents.forEach((agent) => {
      categoriesOf(agent).forEach((name) => {
        if (!byCat.has(name)) byCat.set(name, []);
        byCat.get(name).push(agent);
      });
    });
    const rows = Array.from(byCat, ([name, list]) => ({
      name,
      agents: list,
      count: list.length,
    })).sort((a, b) => a.count - b.count || a.name.localeCompare(b.name));
    return { rows, agentCount: agents.length, thin: rows.filter((r) => r.count === 1).length };
  }, [employees]);

  const unrouted = useMemo(
    () => employees.filter((e) => e.role === 'SUPPORT_AGENT' && categoriesOf(e).length === 0),
    [employees]
  );

  const tabs = useMemo(() => {
    const count = (key) =>
      key === 'ALL' ? employees.length : employees.filter((e) => e.role === key).length;
    return [
      { key: 'ALL', label: 'Everyone', n: count('ALL') },
      { key: 'SUPPORT_AGENT', label: 'Support', n: count('SUPPORT_AGENT') },
      { key: 'SALES', label: 'Sales', n: count('SALES') },
    ];
  }, [employees]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return employees.filter((e) => {
      if (roleFilter !== 'ALL' && e.role !== roleFilter) return false;
      if (!needle) return true;
      return `${e.name || ''}${e.email || ''}${e.employee_id || ''}`.toLowerCase().includes(needle);
    });
  }, [employees, query, roleFilter]);

  /* ── pieces ──────────────────────────────────────────────── */

  const Avatar = ({ item, index }) => {
    const [bg, fg] = TINTS[index % TINTS.length];
    return (
      <View className={`w-[38px] h-[38px] rounded-[999px] items-center justify-center overflow-hidden ${bg}`}>
        {item.profile_image ? (
          <Image source={{ uri: item.profile_image }} className="w-[38px] h-[38px]" />
        ) : (
          <Text
            maxFontSizeMultiplier={1.2}
            className={`font-sans-bold tracking-[-0.2px] text-[12.9px] ${fg}`}
          >
            {getInitials(item.name)}
          </Text>
        )}
      </View>
    );
  };

  const CoverageBoard = () => {
    const rows = coverage.rows;
    if (!rows.length && !unrouted.length) return null;
    const attention = rows.filter((r) => r.count === 1).slice(0, 8);
    const extra = rows.filter((r) => r.count === 1).length - attention.length;

    const Stat = ({ n, label, tone }) => (
      <View className="flex-1">
        <Text maxFontSizeMultiplier={1.2} className={`font-sans-bold text-[24px] tracking-[-0.8px] ${tone}`}>
          {n}
        </Text>
        <Text className="font-sans-semibold text-[10px] leading-[14px] text-[#a09cd8] mt-[2px]">
          {label}
        </Text>
      </View>
    );

    return (
      <View className="bg-[#151233] rounded-[26px] p-[18px] mb-[14px]">
        <Text className="font-sans-semibold text-[10.5px] tracking-[1.2px] text-[#a09cd8]">
          TICKET ROUTING COVERAGE
        </Text>

        <View className="flex-row mt-[14px]">
          <Stat n={rows.length} label={'Categories\ncovered'} tone="text-[#f3f2fd]" />
          <Stat n={coverage.thin} label={'One agent\ndeep'} tone={coverage.thin ? 'text-[#ffd166]' : 'text-[#f3f2fd]'} />
          <Stat n={unrouted.length} label={'Agents with\nno category'} tone={unrouted.length ? 'text-[#ff9d8f]' : 'text-[#f3f2fd]'} />
        </View>

        {attention.length > 0 && (
          <View className="mt-[16px]">
            <Text className="font-sans-semibold text-[10.5px] tracking-[1.1px] text-[#7c78b8]">
              ONLY ONE AGENT
            </Text>
            <View className="flex-row flex-wrap gap-[6px] mt-[9px]">
              {attention.map((row) => (
                <View
                  key={row.name}
                  className="flex-row items-center gap-[6px] bg-[rgba(255,255,255,0.08)] rounded-[999px] pl-[4px] pr-[10px] py-[4px]"
                >
                  {(() => {
                    const agent = row.agents[0];
                    const [bg, fg] = TINTS[0];
                    return (
                      <View className={`w-[18px] h-[18px] rounded-[999px] items-center justify-center overflow-hidden ${bg}`}>
                        {agent.profile_image ? (
                          <Image source={{ uri: agent.profile_image }} className="w-[18px] h-[18px]" />
                        ) : (
                          <Text className={`font-sans-bold text-[8px] ${fg}`}>
                            {getInitials(agent.name)}
                          </Text>
                        )}
                      </View>
                    );
                  })()}
                  <Text className="font-sans-semibold text-[11px] text-[#f3f2fd]">
                    {row.name}
                  </Text>
                </View>
              ))}
              {extra > 0 && (
                <View
                  className="bg-[rgba(255,255,255,0.08)] rounded-[999px] px-[10px] py-[6px]"
                >
                  <Text className="font-[ui-monospace] text-[10.5px] text-[#a09cd8]">+{extra}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {unrouted.length > 0 && (
          <View
            className="flex-row items-center gap-[9px] bg-[rgba(255,107,87,0.16)] rounded-[16px] p-[12px] mt-[16px]"
          >
            <Feather name="alert-triangle" size={15} color={C.coralSoft} />
            <Text className="font-sans-semibold flex-1 text-[11.5px] leading-[16px] text-[#ff9d8f]">
              {unrouted.length === 1
                ? `${unrouted[0].name} has no categories — no ticket can route to them.`
                : `${unrouted.length} agents have no categories — no ticket can route to them.`}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const Header = () => (
    <View className="gap-[14px] mb-[14px] mt-[10px]">
      <View className="flex-row items-end justify-between gap-[12px]">
        <View>
          <Text
            className="font-sans-semibold text-[10.5px] tracking-[1.2px] text-[#4a34c7]"
          >
            TEAM
          </Text>
          <Text
            className="font-sans-bold text-[29px] leading-[33px] tracking-[-0.7px] text-[#151233] mt-[4px]"
          >
            Staff
          </Text>
        </View>
        <Pressable onPress={() => router.push('/(admin)/staff/create')}>
          <View
            className="flex-row items-center gap-[7px] bg-[#151233] rounded-[999px] px-[14px] py-[9px]"
          >
            <Feather name="plus" size={14} color={C.bg} />
            <Text className="font-sans-bold text-[12px] text-[#f3f2fd]">
              Invite
            </Text>
          </View>
        </Pressable>
      </View>

      <CoverageBoard />

      <View
        className="flex-row items-center gap-[10px] bg-[#ffffff] rounded-[999px] px-[12px] std:px-[16px] min-h-[48px]"
        style={styles.shadow}
      >
        <Feather name="search" size={16} color={C.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search the roster"
          placeholderTextColor={C.muted}
          className="font-sans flex-1 text-[13.5px] text-[#151233] py-0"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={10}>
            <Feather name="x" size={15} color={C.muted} />
          </Pressable>
        )}
      </View>

      <View className="flex-row gap-[8px]">
        {tabs.map((tab) => {
          const active = roleFilter === tab.key;
          return (
            <Pressable key={tab.key} onPress={() => setRoleFilter(tab.key)} className="flex-1">
              <View
                className={`items-center rounded-[999px] py-[10px] min-h-[44px] justify-center ${active ? 'bg-[#151233]' : 'bg-[#ffffff]'}`}
                style={styles.shadow}
              >
                <Text
                  className={`font-sans-bold text-[12px] tracking-[-0.1px] ${active ? 'text-[#f3f2fd]' : 'text-[#3a3670]'}`}
                >
                  {tab.label} {tab.n}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const renderItem = ({ item, index }) => {
    const cats = categoriesOf(item);
    const isAgent = item.role === 'SUPPORT_AGENT';
    const gap = isAgent && cats.length === 0;
    const catLabel = gap ? 'No categories' : isAgent ? `${cats.length} categories` : 'Pipeline only';
    const catBg = gap ? 'bg-[#ffe1e1]' : isAgent ? 'bg-[#ccf7e4]' : 'bg-[#f0eefc]';
    const catInk = gap ? 'text-[#b3261e]' : isAgent ? 'text-[#0f7a56]' : 'text-[#6d6a96]';

    return (
      <Pressable
        onPress={() => router.push(`/(admin)/staff/${item.employee_row_id}`)}
        android_ripple={{ color: '#efecff' }}
      >
        <View
          className="flex-row items-center gap-[12px] px-[12px] py-[11px] rounded-[18px]"
        >
          <Avatar item={item} index={index} />

          <View className="flex-1 min-w-0">
            <View className="flex-row items-center gap-[7px]">
              <Text
                className="font-sans-bold shrink text-[13.5px] tracking-[-0.25px] text-[#151233]"
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <View
                className={`rounded-[999px] px-[7px] py-[2px] ${isAgent ? 'bg-[#ebe8ff]' : 'bg-[#eef0f6]'}`}
              >
                <Text
                  className={`font-sans-bold text-[9.5px] tracking-[0.5px] ${isAgent ? 'text-[#4a34c7]' : 'text-[#5b6178]'}`}
                >
                  {(ROLE_LABELS[item.role] || item.role || '').toUpperCase()}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-[8px] mt-[3px]">
              <Text className="font-[ui-monospace] text-[10px] text-[#9d9ac0]">{item.employee_id}</Text>
              <Text className="font-sans flex-1 text-[11px] text-[#6d6a96]" numberOfLines={1}>
                {item.phone || item.email}
              </Text>
            </View>
          </View>

          <View className={`rounded-[999px] px-[10px] py-[5px] ${catBg}`}>
            <Text maxFontSizeMultiplier={1.2} className={`font-sans-bold text-[10.5px] ${catInk}`}>
              {catLabel}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  if (isError) {
    return (
      <View className="flex-1 bg-[#f3f2fd] items-center justify-center p-[24px]">
        <View className="bg-[#ffe1e1] p-[12px] std:p-[16px] rounded-[999px] mb-[16px]">
          <Feather name="alert-circle" size={32} color={C.dangerInk} />
        </View>
        <Text className="font-sans-bold text-[20px] text-[#151233] mb-[8px]">
          Unable to load staff
        </Text>
        <Text
          className="font-sans text-[13.5px] leading-[20px] text-[#6d6a96] text-center mb-[28px] px-[12px] std:px-[16px]"
        >
          {error?.message || 'Please check your connection and try again.'}
        </Text>
        <Pressable onPress={() => refetch()}>
          <View
            className="bg-[#151233] px-[32px] py-[15px] rounded-[999px]"
          >
            <Text className="font-sans-bold text-[14.5px] text-[#f3f2fd]">
              Try Again
            </Text>
          </View>
        </Pressable>
      </View>
    );
  }

  return (
    <Screen className="bg-[#f3f2fd]">
      <ScreenFlatList
        data={visible}
        keyExtractor={(item) => String(item.employee_row_id)}
        contentContainerClassName="p-[12px] std:p-[16px] pt-[12px]"
        ListHeaderComponent={<Header />}
        renderItem={renderItem}
        // the roster is one white card: rows sit inside it, hairline between
        CellRendererComponent={({ children, index, style, ...props }) => (
          <View
            {...props}
            style={style}
            className={`bg-[#ffffff] px-[4px] ${index === 0 ? 'rounded-tl-[24px] rounded-tr-[24px] pt-[6px]' : ''} ${index === visible.length - 1 ? 'rounded-bl-[24px] rounded-br-[24px] pb-[6px]' : ''}`}
          >
            {children}
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.violetDeep} />
        }
        ListEmptyComponent={
          isLoading ? null : (
            <View className="items-center justify-center py-[60px]">
              <View
                className="w-[84px] h-[84px] rounded-[999px] bg-[#eae7fb] items-center justify-center mb-[20px]"
              >
                <Feather name="users" size={32} color={C.faint} />
              </View>
              <Text className="font-sans-bold text-[16px] text-[#151233] mb-[6px]">
                {query || roleFilter !== 'ALL' ? 'Nobody matches that' : 'No staff members yet'}
              </Text>
              <Text
                className="font-sans text-[13px] leading-[19px] text-[#6d6a96] text-center px-[40px]"
              >
                {query || roleFilter !== 'ALL'
                  ? 'Try a different name, email or employee ID.'
                  : 'Employees you add will show up here.'}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          isLoading ? (
            <View className="py-[24px] items-center">
              <ActivityIndicator color={C.violetDeep} />
            </View>
          ) : pagination ? (
            <View
              className="flex-row items-center justify-between mt-[16px] px-[4px]"
            >
              <Pressable
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`px-[12px] std:px-[16px] py-[10px] rounded-[999px] bg-[#ffffff] ${page === 1 ? 'opacity-[0.4]' : 'opacity-100'}`}
              >
                <Text className="font-sans-bold text-[12.5px] text-[#3a3670]">
                  Previous
                </Text>
              </Pressable>

              <Text className="font-[ui-monospace] text-[11px] text-[#9d9ac0]">
                {page} / {Math.max(1, Math.ceil(pagination.total / limit))}
              </Text>

              <Pressable
                onPress={() => setPage((p) => p + 1)}
                disabled={!hasNextPage}
                className={`px-[12px] std:px-[16px] py-[10px] rounded-[999px] bg-[#ffffff] ${!hasNextPage ? 'opacity-[0.4]' : 'opacity-100'}`}
              >
                <Text className="font-sans-bold text-[12.5px] text-[#3a3670]">
                  Next
                </Text>
              </Pressable>
            </View>
          ) : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#151233',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
});
