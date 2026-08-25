// app/(admin)/staff/index.js — design 10b: coverage board + compact roster
import { Feather } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
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

const TINTS = [
  ['#ebe8ff', '#4a34c7'],
  ['#ccf7e4', '#0f7a56'],
  ['#ffe6d6', '#a8501b'],
  ['#e5eeff', '#1f4bb8'],
  ['#f6e2ff', '#7a2fa8'],
];

const SHADOW = {
  shadowColor: '#151233',
  shadowOpacity: 0.06,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
};

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

  const Avatar = ({ item, index, size = 38 }) => {
    const [bg, fg] = TINTS[index % TINTS.length];
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: 999,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {item.profile_image ? (
          <Image source={{ uri: item.profile_image }} style={{ width: size, height: size }} />
        ) : (
          <Text
            className="font-sans-bold"
            style={{ fontSize: size * 0.34, color: fg, letterSpacing: -0.2 }}
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
      <View style={{ flex: 1 }}>
        <Text className="font-sans-bold" style={{ fontSize: 24, letterSpacing: -0.8, color: tone }}>
          {n}
        </Text>
        <Text className="font-sans-semibold" style={{ fontSize: 10, lineHeight: 14, color: '#a09cd8', marginTop: 2 }}>
          {label}
        </Text>
      </View>
    );

    return (
      <View style={{ backgroundColor: C.ink, borderRadius: 26, padding: 18, marginBottom: 14 }}>
        <Text className="font-sans-semibold" style={{ fontSize: 10.5, letterSpacing: 1.2, color: '#a09cd8' }}>
          TICKET ROUTING COVERAGE
        </Text>

        <View style={{ flexDirection: 'row', marginTop: 14 }}>
          <Stat n={rows.length} label={'Categories\ncovered'} tone={C.bg} />
          <Stat n={coverage.thin} label={'One agent\ndeep'} tone={coverage.thin ? C.amber : C.bg} />
          <Stat n={unrouted.length} label={'Agents with\nno category'} tone={unrouted.length ? C.coralSoft : C.bg} />
        </View>

        {attention.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text className="font-sans-semibold" style={{ fontSize: 10.5, letterSpacing: 1.1, color: '#7c78b8' }}>
              ONLY ONE AGENT
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 9 }}>
              {attention.map((row) => (
                <View
                  key={row.name}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    borderRadius: 999,
                    paddingLeft: 4,
                    paddingRight: 10,
                    paddingVertical: 4,
                  }}
                >
                  {(() => {
                    const agent = row.agents[0];
                    const [bg, fg] = TINTS[0];
                    return (
                      <View
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 999,
                          backgroundColor: bg,
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                        }}
                      >
                        {agent.profile_image ? (
                          <Image source={{ uri: agent.profile_image }} style={{ width: 18, height: 18 }} />
                        ) : (
                          <Text className="font-sans-bold" style={{ fontSize: 8, color: fg }}>
                            {getInitials(agent.name)}
                          </Text>
                        )}
                      </View>
                    );
                  })()}
                  <Text className="font-sans-semibold" style={{ fontSize: 11, color: C.bg }}>
                    {row.name}
                  </Text>
                </View>
              ))}
              {extra > 0 && (
                <View
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    borderRadius: 999,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                  }}
                >
                  <Text style={{ fontFamily: MONO, fontSize: 10.5, color: '#a09cd8' }}>+{extra}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {unrouted.length > 0 && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 9,
              backgroundColor: 'rgba(255,107,87,0.16)',
              borderRadius: 16,
              padding: 12,
              marginTop: 16,
            }}
          >
            <Feather name="alert-triangle" size={15} color={C.coralSoft} />
            <Text className="font-sans-semibold" style={{ flex: 1, fontSize: 11.5, lineHeight: 16, color: C.coralSoft }}>
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
    <View style={{ gap: 14, marginBottom: 14, marginTop: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <View>
          <Text
            className="font-sans-semibold"
            style={{ fontSize: 10.5, letterSpacing: 1.2, color: C.violetDeep }}
          >
            TEAM
          </Text>
          <Text
            className="font-sans-bold"
            style={{ fontSize: 29, lineHeight: 33, letterSpacing: -0.7, color: C.ink, marginTop: 4 }}
          >
            Staff
          </Text>
        </View>
        <Pressable onPress={() => router.push('/(admin)/staff/create')}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 7,
              backgroundColor: C.ink,
              borderRadius: 999,
              paddingHorizontal: 14,
              paddingVertical: 9,
            }}
          >
            <Feather name="plus" size={14} color={C.bg} />
            <Text className="font-sans-bold" style={{ fontSize: 12, color: C.bg }}>
              Invite
            </Text>
          </View>
        </Pressable>
      </View>

      <CoverageBoard />

      <View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: C.card,
            borderRadius: 999,
            paddingHorizontal: 16,
            minHeight: 48,
          },
          SHADOW,
        ]}
      >
        <Feather name="search" size={16} color={C.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search the roster"
          placeholderTextColor={C.muted}
          className="font-sans"
          style={{ flex: 1, fontSize: 13.5, color: C.ink, paddingVertical: 0 }}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={10}>
            <Feather name="x" size={15} color={C.muted} />
          </Pressable>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {tabs.map((tab) => {
          const active = roleFilter === tab.key;
          return (
            <Pressable key={tab.key} onPress={() => setRoleFilter(tab.key)} style={{ flex: 1 }}>
              <View
                style={[
                  {
                    alignItems: 'center',
                    backgroundColor: active ? C.ink : C.card,
                    borderRadius: 999,
                    paddingVertical: 10,
                  },
                  SHADOW,
                ]}
              >
                <Text
                  className="font-sans-bold"
                  style={{ fontSize: 12, color: active ? C.bg : C.inkSoft, letterSpacing: -0.1 }}
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
    const catBg = gap ? C.dangerBg : isAgent ? C.mintBg : '#f0eefc';
    const catInk = gap ? C.dangerInk : isAgent ? C.mintInk : C.sub;

    return (
      <Pressable
        onPress={() => router.push(`/(admin)/staff/${item.employee_row_id}`)}
        android_ripple={{ color: '#efecff' }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingHorizontal: 12,
            paddingVertical: 11,
            borderRadius: 18,
          }}
        >
          <Avatar item={item} index={index} />

          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <Text
                className="font-sans-bold"
                numberOfLines={1}
                style={{ flexShrink: 1, fontSize: 13.5, letterSpacing: -0.25, color: C.ink }}
              >
                {item.name}
              </Text>
              <View
                style={{
                  backgroundColor: isAgent ? C.violetBg : C.slateBg,
                  borderRadius: 999,
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                }}
              >
                <Text
                  className="font-sans-bold"
                  style={{
                    fontSize: 9.5,
                    letterSpacing: 0.5,
                    color: isAgent ? C.violetDeep : C.slateInk,
                  }}
                >
                  {(ROLE_LABELS[item.role] || item.role || '').toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
              <Text style={{ fontFamily: MONO, fontSize: 10, color: C.muted }}>{item.employee_id}</Text>
              <Text className="font-sans" numberOfLines={1} style={{ flex: 1, fontSize: 11, color: C.sub }}>
                {item.phone || item.email}
              </Text>
            </View>
          </View>

          <View style={{ backgroundColor: catBg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
            <Text className="font-sans-bold" style={{ fontSize: 10.5, color: catInk }}>
              {catLabel}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  if (isError) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: C.dangerBg, padding: 16, borderRadius: 999, marginBottom: 16 }}>
          <Feather name="alert-circle" size={32} color={C.dangerInk} />
        </View>
        <Text className="font-sans-bold" style={{ fontSize: 20, color: C.ink, marginBottom: 8 }}>
          Unable to load staff
        </Text>
        <Text
          className="font-sans"
          style={{ fontSize: 13.5, lineHeight: 20, color: C.sub, textAlign: 'center', marginBottom: 28, paddingHorizontal: 16 }}
        >
          {error?.message || 'Please check your connection and try again.'}
        </Text>
        <Pressable onPress={() => refetch()}>
          <View
            style={{ backgroundColor: C.ink, paddingHorizontal: 32, paddingVertical: 15, borderRadius: 999 }}
          >
            <Text className="font-sans-bold" style={{ fontSize: 14.5, color: C.bg }}>
              Try Again
            </Text>
          </View>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        data={visible}
        keyExtractor={(item) => String(item.employee_row_id)}
        contentContainerStyle={{ padding: 16, paddingTop: 20, paddingBottom: 150 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<Header />}
        renderItem={renderItem}
        // the roster is one white card: rows sit inside it, hairline between
        CellRendererComponent={({ children, index, style, ...props }) => (
          <View
            {...props}
            style={[
              style,
              {
                backgroundColor: C.card,
                borderTopLeftRadius: index === 0 ? 24 : 0,
                borderTopRightRadius: index === 0 ? 24 : 0,
                borderBottomLeftRadius: index === visible.length - 1 ? 24 : 0,
                borderBottomRightRadius: index === visible.length - 1 ? 24 : 0,
                paddingTop: index === 0 ? 6 : 0,
                paddingBottom: index === visible.length - 1 ? 6 : 0,
                paddingHorizontal: 4,
              },
            ]}
          >
            {children}
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.violetDeep} />
        }
        ListEmptyComponent={
          isLoading ? null : (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
              <View
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: 999,
                  backgroundColor: '#eae7fb',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 20,
                }}
              >
                <Feather name="users" size={32} color={C.faint} />
              </View>
              <Text className="font-sans-bold" style={{ fontSize: 16, color: C.ink, marginBottom: 6 }}>
                {query || roleFilter !== 'ALL' ? 'Nobody matches that' : 'No staff members yet'}
              </Text>
              <Text
                className="font-sans"
                style={{ fontSize: 13, lineHeight: 19, color: C.sub, textAlign: 'center', paddingHorizontal: 40 }}
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
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <ActivityIndicator color={C.violetDeep} />
            </View>
          ) : pagination ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 16,
                paddingHorizontal: 4,
              }}
            >
              <Pressable
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 999,
                  backgroundColor: C.card,
                  opacity: page === 1 ? 0.4 : 1,
                }}
              >
                <Text className="font-sans-bold" style={{ fontSize: 12.5, color: C.inkSoft }}>
                  Previous
                </Text>
              </Pressable>

              <Text style={{ fontFamily: MONO, fontSize: 11, color: C.muted }}>
                {page} / {Math.max(1, Math.ceil(pagination.total / limit))}
              </Text>

              <Pressable
                onPress={() => setPage((p) => p + 1)}
                disabled={!hasNextPage}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 999,
                  backgroundColor: C.card,
                  opacity: !hasNextPage ? 0.4 : 1,
                }}
              >
                <Text className="font-sans-bold" style={{ fontSize: 12.5, color: C.inkSoft }}>
                  Next
                </Text>
              </Pressable>
            </View>
          ) : null
        }
      />
    </View>
  );
}
