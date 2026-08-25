import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, ActivityIndicator, Dimensions, Platform, Modal, TextInput, FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart } from 'react-native-gifted-charts';
import { useMyMetrics } from '../../src/hooks/useMyMetrics';
import { useMyConnections } from '../../src/hooks/useCustomers';

/* ── palette (matches design 6b) ───────────────────────────── */
const C = {
  bg: '#f3f2fd',
  card: '#ffffff',
  ink: '#151233',
  sub: '#6d6a96',
  muted: '#9d9ac0',
  grid: '#f0eefc',
  violet: '#6c5ce7',
  violetDeep: '#4a34c7',
  violetSoft: '#ebe8ff',
  violetTint: '#e3dfff',
  mint: '#12b886',
  marigold: '#ffd166',
  coral: '#ff6b57',
  dark: '#151233',
};
const THEME = {
  cyan: { bg: '#ccf7e4', ink: '#0b3b2c', sub: '#0f7a56', chip: '#a8eecd' },
  slate: { bg: '#ebe8ff', ink: '#2c2860', sub: '#6d6a96', chip: '#dcd8ff' },
  violet: { bg: '#e6e1ff', ink: '#2c2860', sub: '#4a34c7', chip: '#d3ccff' },
  amber: { bg: '#ffd166', ink: '#4a3200', sub: '#7a5200', chip: '#ffbe33' },
  coral: { bg: '#ffdcd3', ink: '#7a2a14', sub: '#c2461f', chip: '#ffc4b5' },
};
const ICON = {
  trending_flat: 'minus',
  trending_up: 'trending-up',
  trending_down: 'trending-down',
  timer: 'clock',
  verified_user: 'shield',
  check_circle: 'check-circle',
};
const SEV = [
  { key: 'Critical', color: C.coral },
  { key: 'Medium', color: C.marigold },
  { key: 'Low', color: C.mint },
];
const SERIES_COLORS = [C.violet, C.mint, C.marigold, C.coral, '#8271ef'];
const SLA_FLOOR = 99.5;

const screenWidth = Dimensions.get('window').width;
const CHART_WIDTH = screenWidth - 118;
const MAX_ROWS = 40;

const short = (n) => String(n || '').split(' ')[0].toUpperCase();
const sum = (arr, f) => arr.reduce((a, x) => a + (f ? f(x) : x), 0);
const hasData = (arr, key) => Array.isArray(arr) && arr.some((d) => (d?.[key] || 0) > 0);

/* integer-stepped axis max, so count charts never label half a fault */
const intMax = (max) => {
  if (!max || max <= 0) return 3;
  const raw = max / 3;
  const mag = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const step = Math.max(1, Math.round(([1, 2, 2.5, 5, 10].find((m) => mag * m >= raw) || 1) * mag));
  return step * 3;
};

/* ── small pieces ──────────────────────────────────────────── */
function KpiCard({ kpi, fallbackLabel }) {
  if (!kpi) return null;
  const t = THEME[kpi.theme] || THEME.slate;
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, borderRadius: 24, padding: 15, gap: 9 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <View style={{ width: 30, height: 30, borderRadius: 11, backgroundColor: t.chip, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name={ICON[kpi.icon] || 'activity'} size={15} color={t.ink} />
        </View>
        {!!kpi.badge && (
          <Text className="font-sans-semibold" style={{ fontSize: 9.5, color: t.sub, textAlign: 'right', flexShrink: 1 }}>
            {kpi.badge}
          </Text>
        )}
      </View>
      <View>
        <Text className="font-sans-semibold" style={{ fontSize: 26, lineHeight: 28, letterSpacing: -0.5, color: t.ink }}>
          {kpi.value ?? '—'}
        </Text>
        <Text className="font-sans-semibold" style={{ fontSize: 9.5, letterSpacing: 1, textTransform: 'uppercase', color: t.sub, marginTop: 6 }}>
          {kpi.label || fallbackLabel}
        </Text>
      </View>
      {!!kpi.displayText && (
        <Text className="font-sans-medium" style={{ fontSize: 11, lineHeight: 15, color: t.sub }}>{kpi.displayText}</Text>
      )}
    </View>
  );
}

function ChartCard({ title, subtitle, right, children }) {
  return (
    <View style={{ backgroundColor: C.card, borderRadius: 26, padding: 18, marginBottom: 14, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text className="font-sans-semibold" style={{ fontSize: 15, letterSpacing: -0.2, color: C.ink }}>{title}</Text>
          {!!subtitle && (
            <Text className="font-sans-medium" style={{ fontSize: 11.5, color: C.sub, marginTop: 3 }}>{subtitle}</Text>
          )}
        </View>
        {!!right && (
          <Text className="font-sans-semibold" style={{ fontSize: 22, letterSpacing: -0.5, color: C.ink }}>{right}</Text>
        )}
      </View>
      {children}
    </View>
  );
}

function Empty({ text }) {
  return (
    <View style={{ backgroundColor: '#f7f6ff', borderRadius: 18, padding: 18 }}>
      <Text className="font-sans-medium" style={{ fontSize: 11.5, lineHeight: 17, color: C.sub }}>{text}</Text>
    </View>
  );
}

function Legend({ items }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, borderTopWidth: 1, borderTopColor: C.grid, paddingTop: 12 }}>
      {items.map((l) => (
        <View key={l.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: l.color }} />
          <Text className="font-sans-semibold" style={{ fontSize: 11, color: '#3a3670' }}>{l.key}</Text>
          <Text className="font-sans-medium" style={{ fontSize: 11, color: C.muted }}>{l.n}</Text>
        </View>
      ))}
    </View>
  );
}

/* ── screen ────────────────────────────────────────────────── */
export default function CustomerAnalytics() {
  const { back } = useRouter();
  const [circuitId, setCircuitId] = useState('ALL');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');

  const { data: connectionsData } = useMyConnections();
  const connections = connectionsData?.connections ?? [];
  const totalCircuits = connections.length;


  const { data, isLoading, isError } = useMyMetrics({ circuitId, totalCircuits });

  const isAll = circuitId === 'ALL';
  const selected = useMemo(
    () => connections.find((c) => c?.fabCircuitId === circuitId),
    [connections, circuitId],
  );
  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return connections;
    return connections.filter((c) =>
      `${c?.fabCircuitId || ''} ${c?.customerName || ''} ${c?.siteName || c?.location || ''}`.toLowerCase().includes(q));
  }, [connections, query]);

  const axis = {
    width: CHART_WIDTH,
    yAxisTextStyle: { color: C.muted, fontSize: 10, fontWeight: '600' },
    xAxisLabelTextStyle: { color: C.muted, fontSize: 9.5, fontWeight: '600' },
    rulesColor: C.grid,
    yAxisColor: 'transparent',
    xAxisColor: C.grid,
    yAxisLabelWidth: 34,
    initialSpacing: 14,
    noOfSections: 3,
    hideOrigin: true,
  };

  /* charts derived from the payload (same shape for ALL and a single circuit) */
  const uptimeRows = data?.monthlyUptimeTrend ?? [];
  const uptimeVals = uptimeRows.map((d) => d.uptime || 0);
  const uptimeLow = uptimeVals.length ? Math.min(...uptimeVals) : 100;
  const uptimeBase = uptimeLow >= 100 ? 99.5 : Math.floor((uptimeLow - 0.1) * 10) / 10;
  const uptimeAvg = uptimeVals.length ? sum(uptimeVals) / uptimeVals.length : 0;

  const faultRows = data?.totalFaultsByMonth ?? [];
  const faultTotal = sum(faultRows, (d) => d.count || 0);
  const faultMax = intMax(Math.max(0, ...faultRows.map((d) => d.count || 0)));

  const sevRows = data?.faultSeverity ?? [];
  const sevMax = intMax(Math.max(0, ...sevRows.map((r) => sum(SEV, (s) => r[s.key] || 0))));
  const sevStacks = sevRows.map((r) => {
    // FIX 2: Filter out 0 values, but provide a dummy stack if the array ends up completely empty
    // to prevent the GiftedCharts empty stack crash.
    const active = SEV.filter((s) => (r[s.key] || 0) > 0);
    return {
      label: short(r.name),
      stacks: active.length > 0 
        ? active.map((s) => ({ value: r[s.key], color: s.color, borderRadius: 5 }))
        : [{ value: 0, color: 'transparent' }],
    };
  });
  const sevLegend = SEV.map((s) => ({ key: s.key, color: s.color, n: sum(sevRows, (r) => r[s.key] || 0) }));
  const sevHasData = sevLegend.some((l) => l.n > 0);

  const mttrRows = data?.mttrTrend ?? [];
  const mttrVals = mttrRows.map((d) => d.mttr || 0);
  const mttrLive = mttrVals.some((v) => v > 0);
  const mttrAvg = mttrLive ? sum(mttrVals.filter((v) => v > 0)) / mttrVals.filter((v) => v > 0).length : 0;

  // FIX 3: Strip out zero-value categories completely so they don't corrupt the pie chart layout or legend
  const cats = (data?.faultCategoryDistribution ?? []).filter((c) => (c.value || 0) > 0);
  const catTotal = sum(cats, (d) => d.value || 0);

  const repeatRows = data?.repeatFaultComparison ?? [];
  const repeatKeys = repeatRows.length ? Object.keys(repeatRows[0]).filter((k) => k !== 'name') : [];
  const repeatLegend = repeatKeys.map((k, i) => ({
    key: k, color: SERIES_COLORS[i % SERIES_COLORS.length], n: sum(repeatRows, (r) => r[k] || 0),
  }));
  const repeatHasData = repeatLegend.some((l) => l.n > 0);
  const repeatMax = intMax(Math.max(0, ...repeatRows.flatMap((r) => repeatKeys.map((k) => r[k] || 0))));
  const repeatBars = repeatRows.flatMap((r) =>
    repeatKeys.map((k, i) => ({
      value: r[k] || 0,
      frontColor: SERIES_COLORS[i % SERIES_COLORS.length],
      spacing: i === repeatKeys.length - 1 ? 18 : 2,
      label: i === 0 ? short(r.name) : undefined,
      labelWidth: i === 0 ? 46 : 0,
    })));

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20,
        backgroundColor: C.bg, paddingTop: Platform.OS === 'ios' ? 58 : 42, paddingBottom: 14,
      }}>
        <Pressable
          onPress={() => back()}
          hitSlop={15}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' }}
        >
          <Feather name="chevron-left" size={20} color={C.ink} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text className="font-sans-semibold" style={{ fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: C.sub }}>
            {isAll ? `${totalCircuits} links · fleet rollup` : (selected?.customerName || 'Connection')}
          </Text>
          <Text className="font-sans-semibold" style={{ fontSize: 16, letterSpacing: -0.2, color: C.ink }} numberOfLines={1}>
            {isAll ? 'All connections' : (selected?.fabCircuitId || circuitId)}
          </Text>
        </View>
      </View>

      {/* scope switch */}
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 4, backgroundColor: C.card, borderRadius: 999, padding: 5 }}>
          {[{ key: 'ALL', label: 'All connections' }, { key: 'ONE', label: 'Single link' }].map((s) => {
            const on = s.key === 'ALL' ? isAll : !isAll;
            return (
              <Pressable
                key={s.key}
                onPress={() => {
                  if (s.key === 'ALL') setCircuitId('ALL');
                  else if (isAll) {
                    const first = connections[0]?.fabCircuitId;
                    if (first) setCircuitId(first);
                    setPickerOpen(true);
                  }
                }}
                style={{
                  flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 999,
                  paddingVertical: 10, minHeight: 40, backgroundColor: on ? C.dark : 'transparent',
                }}
              >
                <Text className="font-sans-semibold" style={{ fontSize: 12, color: on ? '#f3f2fd' : C.sub }}>{s.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {!isAll && (
          <Pressable
            onPress={() => { setQuery(''); setPickerOpen(true); }}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card,
              borderRadius: 20, padding: 13, minHeight: 56,
            }}
          >
            <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: C.violetSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="git-branch" size={16} color={C.violetDeep} />
            </View>
            <View style={{ flex: 1 }}>
              <Text className="font-sans-semibold" style={{ fontSize: 12.5, color: C.ink }} numberOfLines={1}>
                {selected?.fabCircuitId || circuitId}
              </Text>
              <Text className="font-sans-medium" style={{ fontSize: 11, color: C.sub, marginTop: 2 }} numberOfLines={1}>
                {selected?.customerName || 'Selected connection'}
              </Text>
            </View>
            <Text className="font-sans-semibold" style={{ fontSize: 11, color: C.violetDeep }}>Change</Text>
          </Pressable>
        )}
      </View>

      {isLoading && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.violet} />
          <Text className="font-sans-semibold" style={{ color: C.sub, marginTop: 14 }}>Crunching data…</Text>
        </View>
      )}

      {isError && !isLoading && (
        <View style={{ padding: 16 }}>
          <Empty text="We could not load metrics for this selection. Pull back and try again." />
        </View>
      )}

      {data && !isLoading && !isError && (
        <ScrollView
          style={{ flex: 1, paddingHorizontal: 16, paddingTop: 14 }}
          contentContainerStyle={{ paddingBottom: 160 }}
          showsVerticalScrollIndicator={false}
        >
          {/* KPI grid */}
          <View style={{ gap: 11, marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', gap: 11 }}>
              <KpiCard kpi={data.kpiHighlights?.uptimeDelta} fallbackLabel="Uptime" />
              <KpiCard kpi={data.kpiHighlights?.mttrReduction} fallbackLabel="MTTR" />
            </View>
            <View style={{ flexDirection: 'row', gap: 11 }}>
              <KpiCard kpi={data.kpiHighlights?.zeroCoreOutage} fallbackLabel="Core outage" />
              <KpiCard kpi={data.kpiHighlights?.repeatFaultReduction} fallbackLabel="Repeat faults" />
            </View>
          </View>

          {/* uptime */}
          <ChartCard
            title="Uptime availability"
            subtitle={`Avg ${uptimeAvg.toFixed(2)}% · low ${uptimeLow.toFixed(2)}%`}
            right={uptimeVals.length ? `${uptimeVals[uptimeVals.length - 1].toFixed(2)}%` : '—'}
          >
            {/* FIX 1: Explicitly require array.length > 1. A curved line chart with 1 data point will fatally crash. */}
            {hasData(uptimeRows, 'uptime') && uptimeRows.length > 1 ? (
              <>
                <LineChart
                  {...axis}
                  data={uptimeRows.map((d) => ({ value: d.uptime, label: short(d.name) }))}
                  yAxisOffset={uptimeBase}
                  maxValue={100}
                  color={C.violet}
                  thickness={3}
                  curved
                  areaChart
                  startFillColor={C.violet}
                  startOpacity={0.3}
                  endFillColor={C.violet}
                  endOpacity={0.02}
                  dataPointsColor={C.violet}
                  dataPointsRadius={4}
                  showReferenceLine1={uptimeBase < SLA_FLOOR}
                  referenceLine1Position={SLA_FLOOR}
                  referenceLine1Config={{ color: C.coral, dashWidth: 5, dashGap: 5, thickness: 1.5 }}
                />
                {uptimeBase < SLA_FLOOR && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, borderTopWidth: 1, borderTopColor: C.grid, paddingTop: 12 }}>
                    <View style={{ width: 16, height: 2, borderRadius: 999, backgroundColor: C.coral }} />
                    <Text className="font-sans-semibold" style={{ fontSize: 10.5, color: C.sub }}>{SLA_FLOOR}% SLA floor</Text>
                  </View>
                )}
              </>
            ) : (
              <Empty text="Not enough historical availability data to plot a trend line yet." />
            )}
          </ChartCard>

          {/* fault volume */}
          <ChartCard
            title="Fault volume"
            subtitle={faultRows.length ? `${(faultTotal / faultRows.length).toFixed(1)} per month · peak ${Math.max(0, ...faultRows.map((d) => d.count || 0))}` : 'No period data'}
            right={String(faultTotal)}
          >
            {hasData(faultRows, 'count') ? (
              <BarChart
                {...axis}
                data={faultRows.map((d) => ({
                  value: d.count || 0,
                  label: short(d.name),
                  frontColor: (d.count || 0) >= faultMax * 0.75 ? C.violetDeep : C.violet,
                }))}
                maxValue={faultMax}
                barBorderRadius={6}
                barWidth={22}
                spacing={18}
              />
            ) : (
              <Empty text="No faults recorded in this window." />
            )}
          </ChartCard>

          {/* severity */}
          <ChartCard title="Severity mix" subtitle="Faults by severity, per month">
            {sevHasData ? (
              <>
                <BarChart
                  {...axis}
                  stackData={sevStacks}
                  maxValue={sevMax}
                  barWidth={22}
                  spacing={18}
                />
                <Legend items={sevLegend} />
              </>
            ) : (
              <Empty text="No faults to break down by severity." />
            )}
          </ChartCard>

          {/* categories */}
          <ChartCard title="Fault categories" subtitle={catTotal ? `${catTotal} fault${catTotal > 1 ? 's' : ''} classified` : 'Nothing classified yet'}>
            {cats.length > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <PieChart
                  data={cats.map((d, i) => ({ value: d.value, color: SERIES_COLORS[i % SERIES_COLORS.length] }))}
                  donut
                  radius={62}
                  innerRadius={42}
                  innerCircleColor={C.card}
                  centerLabelComponent={() => (
                    <View style={{ alignItems: 'center' }}>
                      <Text className="font-sans-semibold" style={{ fontSize: 24, color: C.ink }}>{catTotal}</Text>
                      <Text className="font-sans-semibold" style={{ fontSize: 8.5, letterSpacing: 1, textTransform: 'uppercase', color: C.muted, marginTop: 2 }}>
                        Faults
                      </Text>
                    </View>
                  )}
                />
                <View style={{ flex: 1, gap: 9 }}>
                  {cats.map((d, i) => (
                    <View key={d.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: SERIES_COLORS[i % SERIES_COLORS.length] }} />
                      <Text className="font-sans-semibold" style={{ flex: 1, fontSize: 11.5, color: C.ink }} numberOfLines={1}>{d.name}</Text>
                      <Text className="font-sans-semibold" style={{ fontSize: 11, color: C.sub }}>
                        {Math.round((d.value / (catTotal || 1)) * 100)}%
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <Empty text="No faults have been categorised in this window." />
            )}
          </ChartCard>

          {/* MTTR */}
          <ChartCard
            title="Mean time to repair"
            subtitle={mttrLive ? `Average ${mttrAvg.toFixed(1)}h per fault` : 'No closed faults yet'}
            right={mttrLive ? `${mttrVals.filter((v) => v > 0).slice(-1)[0].toFixed(1)}h` : '—'}
          >
            {/* FIX 1: Same as uptime. Explicitly require array.length > 1 to prevent fatal curve calculation crash. */}
            {mttrLive && mttrRows.length > 1 ? (
              <LineChart
                {...axis}
                data={mttrRows.map((d) => ({ value: d.mttr || 0, label: short(d.name) }))}
                maxValue={Math.max(...mttrVals, 4)}
                color={C.mint}
                thickness={3}
                curved
                areaChart
                startFillColor={C.mint}
                startOpacity={0.28}
                endFillColor={C.mint}
                endOpacity={0.02}
                dataPointsColor={C.mint}
                dataPointsRadius={4}
                showReferenceLine1
                referenceLine1Position={mttrAvg}
                referenceLine1Config={{ color: C.muted, dashWidth: 4, dashGap: 4, thickness: 1.2 }}
              />
            ) : (
              <Empty text="Not enough historical repair data to plot a trend line yet." />
            )}
          </ChartCard>

          {/* repeat faults */}
          <ChartCard title="Repeat faults" subtitle={repeatHasData ? 'Occurrences by fault type, per month' : 'No fault type recurred in this window'}>
            {repeatHasData ? (
              <>
                <BarChart
                  {...axis}
                  data={repeatBars}
                  maxValue={repeatMax}
                  barWidth={9}
                  barBorderRadius={3}
                  spacing={2}
                />
                <Legend items={repeatLegend} />
              </>
            ) : (
              <Empty text="Nothing has recurred on this selection — every fault type sits at zero." />
            )}
          </ChartCard>
        </ScrollView>
      )}

      {/* searchable circuit picker — scales from 1 to hundreds of links */}
      <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={() => setPickerOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(21,18,51,0.35)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 28, maxHeight: '78%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f7f6ff', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 11 }}>
              <Feather name="search" size={16} color={C.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search by circuit ID, customer or site"
                placeholderTextColor={C.muted}
                autoCorrect={false}
                style={{ flex: 1, fontSize: 12.5, color: C.ink, padding: 0 }}
              />
              <Pressable onPress={() => setPickerOpen(false)} hitSlop={10}>
                <Text className="font-sans-semibold" style={{ fontSize: 11.5, color: C.violetDeep }}>Done</Text>
              </Pressable>
            </View>

            <Text className="font-sans-semibold" style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: C.muted, marginTop: 14, marginBottom: 6 }}>
              {hits.length > MAX_ROWS
                ? `Showing ${MAX_ROWS} of ${hits.length} · keep typing to narrow`
                : `${hits.length} of ${totalCircuits} links`}
            </Text>

            <FlatList
              data={hits.slice(0, MAX_ROWS)}
              keyExtractor={(c, i) => String(c?.id || c?.fabCircuitId || i)}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={(
                <Text className="font-sans-medium" style={{ fontSize: 12, color: C.muted, textAlign: 'center', paddingVertical: 24 }}>
                  No link matches that search.
                </Text>
              )}
              renderItem={({ item }) => {
                const on = item?.fabCircuitId === circuitId;
                return (
                  <Pressable
                    onPress={() => { setCircuitId(item?.fabCircuitId); setPickerOpen(false); }}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10,
                      paddingVertical: 11, minHeight: 48, borderRadius: 14, backgroundColor: on ? C.bg : C.card,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text className="font-sans-semibold" style={{ fontSize: 11.5, color: C.ink }} numberOfLines={1}>
                        {item?.fabCircuitId || 'Unknown'}
                      </Text>
                      <Text className="font-sans-medium" style={{ fontSize: 10.5, color: C.sub, marginTop: 2 }} numberOfLines={1}>
                        {item?.customerName || item?.siteName || item?.location || '—'}
                      </Text>
                    </View>
                    {on && <Feather name="check" size={16} color={C.violetDeep} />}
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}