import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, ActivityIndicator, TextInput, FlatList, useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart } from 'react-native-gifted-charts';
import { useMyMetrics } from '../../src/hooks/useMyMetrics';
import { useMyConnections } from '../../src/hooks/useCustomers';
import Screen, { ScreenScrollView } from '../../src/components/layout/Screen';
import Sheet from '../../src/components/layout/Sheet';
import { DENSE_FONT_SCALE } from '../../src/components/layout/tokens';

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
  cyan: { bg: 'bg-[#ccf7e4]', ink: '#0b3b2c', inkText: 'text-[#0b3b2c]', sub: 'text-[#0f7a56]', chip: 'bg-[#a8eecd]' },
  slate: { bg: 'bg-[#ebe8ff]', ink: '#2c2860', inkText: 'text-[#2c2860]', sub: 'text-[#6d6a96]', chip: 'bg-[#dcd8ff]' },
  violet: { bg: 'bg-[#e6e1ff]', ink: '#2c2860', inkText: 'text-[#2c2860]', sub: 'text-[#4a34c7]', chip: 'bg-[#d3ccff]' },
  amber: { bg: 'bg-[#ffd166]', ink: '#4a3200', inkText: 'text-[#4a3200]', sub: 'text-[#7a5200]', chip: 'bg-[#ffbe33]' },
  coral: { bg: 'bg-[#ffdcd3]', ink: '#7a2a14', inkText: 'text-[#7a2a14]', sub: 'text-[#c2461f]', chip: 'bg-[#ffc4b5]' },
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
  { key: 'Critical', color: C.coral, swatch: 'bg-[#ff6b57]' },
  { key: 'Medium', color: C.marigold, swatch: 'bg-[#ffd166]' },
  { key: 'Low', color: C.mint, swatch: 'bg-[#12b886]' },
];
const SERIES_COLORS = [C.violet, C.mint, C.marigold, C.coral, '#8271ef'];
const SERIES_SWATCH = ['bg-[#6c5ce7]', 'bg-[#12b886]', 'bg-[#ffd166]', 'bg-[#ff6b57]', 'bg-[#8271ef]'];
const SLA_FLOOR = 99.5;

// Chart card padding (18 × 2) + y-axis label column (34) + spare (16).
const CHART_INSET = 86;
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
    <View className={`flex-1 rounded-[24px] p-[15px] gap-[9px] ${t.bg}`}>
      <View className="flex-row items-center justify-between gap-[8px]">
        <View className={`w-[30px] h-[30px] rounded-[11px] items-center justify-center ${t.chip}`}>
          <Feather name={ICON[kpi.icon] || 'activity'} size={15} color={t.ink} />
        </View>
        {!!kpi.badge && (
          <Text maxFontSizeMultiplier={DENSE_FONT_SCALE} className={`font-sans-semibold text-[9.5px] text-right shrink ${t.sub}`}>
            {kpi.badge}
          </Text>
        )}
      </View>
      <View>
        <Text maxFontSizeMultiplier={DENSE_FONT_SCALE} className={`font-sans-semibold text-[26px] leading-[28px] tracking-[-0.5px] ${t.inkText}`}>
          {kpi.value ?? '—'}
        </Text>
        <Text maxFontSizeMultiplier={DENSE_FONT_SCALE} className={`font-sans-semibold text-[9.5px] tracking-[1px] uppercase mt-[6px] ${t.sub}`}>
          {kpi.label || fallbackLabel}
        </Text>
      </View>
      {!!kpi.displayText && (
        <Text maxFontSizeMultiplier={DENSE_FONT_SCALE} className={`font-sans-medium text-[11px] leading-[15px] ${t.sub}`}>{kpi.displayText}</Text>
      )}
    </View>
  );
}

function ChartCard({ title, subtitle, right, children }) {
  return (
    <View className="bg-[#ffffff] rounded-[26px] p-[18px] mb-[14px] gap-[14px]">
      <View className="flex-row items-start justify-between gap-[10px]">
        <View className="flex-1">
          <Text className="font-sans-semibold text-[15px] tracking-[-0.2px] text-[#151233]">{title}</Text>
          {!!subtitle && (
            <Text className="font-sans-medium text-[11.5px] text-[#6d6a96] mt-[3px]">{subtitle}</Text>
          )}
        </View>
        {!!right && (
          <Text className="font-sans-semibold text-[22px] tracking-[-0.5px] text-[#151233]">{right}</Text>
        )}
      </View>
      {children}
    </View>
  );
}

function Empty({ text }) {
  return (
    <View className="bg-[#f7f6ff] rounded-[18px] p-[18px]">
      <Text className="font-sans-medium text-[11.5px] leading-[17px] text-[#6d6a96]">{text}</Text>
    </View>
  );
}

function Legend({ items }) {
  return (
    <View className="flex-row flex-wrap gap-[14px] border-t border-t-[#f0eefc] pt-[12px]">
      {items.map((l) => (
        <View key={l.key} className="flex-row items-center gap-[6px]">
          <View className={`w-[9px] h-[9px] rounded-[3px] ${l.swatch}`} />
          <Text className="font-sans-semibold text-[11px] text-[#3a3670]">{l.key}</Text>
          <Text className="font-sans-medium text-[11px] text-[#9d9ac0]">{l.n}</Text>
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
  const { width: windowWidth } = useWindowDimensions();
  const [contentWidth, setContentWidth] = useState(0);
  // Measured from the scroll content; window-based until the first layout.
  const chartWidth = Math.max((contentWidth || windowWidth - 32) - CHART_INSET, 120);

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
    width: chartWidth,
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
  const sevLegend = SEV.map((s) => ({ key: s.key, swatch: s.swatch, n: sum(sevRows, (r) => r[s.key] || 0) }));
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
    key: k, swatch: SERIES_SWATCH[i % SERIES_SWATCH.length], n: sum(repeatRows, (r) => r[k] || 0),
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
    <Screen className="bg-[#f3f2fd]">
      {/* header */}
      <View className="flex-row items-center gap-[12px] px-[16px] std:px-[20px] bg-[#f3f2fd] pt-[10px] pb-[14px]">
        <Pressable
          onPress={() => back()}
          hitSlop={15}
          className="w-[40px] h-[40px] rounded-[20px] bg-[#ffffff] items-center justify-center"
        >
          <Feather name="chevron-left" size={20} color={C.ink} />
        </Pressable>
        <View className="flex-1">
          <Text className="font-sans-semibold text-[10px] tracking-[1.2px] uppercase text-[#6d6a96]">
            {isAll ? `${totalCircuits} links · fleet rollup` : (selected?.customerName || 'Connection')}
          </Text>
          <Text className="font-sans-semibold text-[16px] tracking-[-0.2px] text-[#151233]" numberOfLines={1}>
            {isAll ? 'All connections' : (selected?.fabCircuitId || circuitId)}
          </Text>
        </View>
      </View>

      {/* scope switch */}
      <View className="px-[12px] std:px-[16px] gap-[10px]">
        <View className="flex-row gap-[4px] bg-[#ffffff] rounded-[999px] p-[5px]">
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
                className={`flex-1 items-center justify-center rounded-[999px] py-[10px] min-h-[40px] ${on ? 'bg-[#151233]' : 'bg-transparent'}`}
              >
                <Text className={`font-sans-semibold text-[12px] ${on ? 'text-[#f3f2fd]' : 'text-[#6d6a96]'}`}>{s.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {!isAll && (
          <Pressable
            onPress={() => { setQuery(''); setPickerOpen(true); }}
            className="flex-row items-center gap-[12px] bg-[#ffffff] rounded-[20px] p-[13px] min-h-[56px]"
          >
            <View className="w-[34px] h-[34px] rounded-[12px] bg-[#ebe8ff] items-center justify-center">
              <Feather name="git-branch" size={16} color={C.violetDeep} />
            </View>
            <View className="flex-1">
              <Text className="font-sans-semibold text-[12.5px] text-[#151233]" numberOfLines={1}>
                {selected?.fabCircuitId || circuitId}
              </Text>
              <Text className="font-sans-medium text-[11px] text-[#6d6a96] mt-[2px]" numberOfLines={1}>
                {selected?.customerName || 'Selected connection'}
              </Text>
            </View>
            <Text className="font-sans-semibold text-[11px] text-[#4a34c7]">Change</Text>
          </Pressable>
        )}
      </View>

      {isLoading && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={C.violet} />
          <Text className="font-sans-semibold text-[#6d6a96] mt-[14px]">Crunching data…</Text>
        </View>
      )}

      {isError && !isLoading && (
        <View className="p-[12px] std:p-[16px]">
          <Empty text="We could not load metrics for this selection. Pull back and try again." />
        </View>
      )}

      {data && !isLoading && !isError && (
        <ScreenScrollView className="flex-1 px-[12px] std:px-[16px] pt-[14px]">
          {/* KPI grid */}
          <View className="gap-[11px] mb-[14px]" onLayout={(e) => setContentWidth(e.nativeEvent.layout.width)}>
            <View className="flex-row gap-[11px]">
              <KpiCard kpi={data.kpiHighlights?.uptimeDelta} fallbackLabel="Uptime" />
              <KpiCard kpi={data.kpiHighlights?.mttrReduction} fallbackLabel="MTTR" />
            </View>
            <View className="flex-row gap-[11px]">
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
                  <View className="flex-row items-center gap-[7px] border-t border-t-[#f0eefc] pt-[12px]">
                    <View className="w-[16px] h-[2px] rounded-[999px] bg-[#ff6b57]" />
                    <Text className="font-sans-semibold text-[10.5px] text-[#6d6a96]">{SLA_FLOOR}% SLA floor</Text>
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
              <View className="flex-row items-center gap-[16px]">
                <PieChart
                  data={cats.map((d, i) => ({ value: d.value, color: SERIES_COLORS[i % SERIES_COLORS.length] }))}
                  donut
                  radius={62}
                  innerRadius={42}
                  innerCircleColor={C.card}
                  centerLabelComponent={() => (
                    <View className="items-center">
                      <Text className="font-sans-semibold text-[24px] text-[#151233]">{catTotal}</Text>
                      <Text className="font-sans-semibold text-[8.5px] tracking-[1px] uppercase text-[#9d9ac0] mt-[2px]">
                        Faults
                      </Text>
                    </View>
                  )}
                />
                <View className="flex-1 gap-[9px]">
                  {cats.map((d, i) => (
                    <View key={d.name} className="flex-row items-center gap-[8px]">
                      <View className={`w-[9px] h-[9px] rounded-[3px] ${SERIES_SWATCH[i % SERIES_SWATCH.length]}`} />
                      <Text className="font-sans-semibold flex-1 text-[11.5px] text-[#151233]" numberOfLines={1}>{d.name}</Text>
                      <Text className="font-sans-semibold text-[11px] text-[#6d6a96]">
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
        </ScreenScrollView>
      )}

      {/* searchable circuit picker — scales from 1 to hundreds of links */}
      <Sheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        maxHeightRatio={0.78}
        backdropClassName="bg-[rgba(21,18,51,0.35)]"
        className="bg-[#ffffff] rounded-tl-[28px] rounded-tr-[28px] px-[12px] std:px-[16px] pt-[16px] pb-[12px]"
      >
            <View className="flex-row items-center gap-[10px] bg-[#f7f6ff] rounded-[999px] px-[14px] py-[11px]">
              <Feather name="search" size={16} color={C.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search by circuit ID, customer or site"
                placeholderTextColor={C.muted}
                autoCorrect={false}
                className="flex-1 text-[12.5px] text-[#151233] p-0"
              />
              <Pressable onPress={() => setPickerOpen(false)} hitSlop={10}>
                <Text className="font-sans-semibold text-[11.5px] text-[#4a34c7]">Done</Text>
              </Pressable>
            </View>

            <Text className="font-sans-semibold text-[10px] tracking-[1px] uppercase text-[#9d9ac0] mt-[14px] mb-[6px]">
              {hits.length > MAX_ROWS
                ? `Showing ${MAX_ROWS} of ${hits.length} · keep typing to narrow`
                : `${hits.length} of ${totalCircuits} links`}
            </Text>

            <FlatList
              data={hits.slice(0, MAX_ROWS)}
              keyExtractor={(c, i) => String(c?.id || c?.fabCircuitId || i)}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={(
                <Text className="font-sans-medium text-[12px] text-[#9d9ac0] text-center py-[24px]">
                  No link matches that search.
                </Text>
              )}
              renderItem={({ item }) => {
                const on = item?.fabCircuitId === circuitId;
                return (
                  <Pressable
                    onPress={() => { setCircuitId(item?.fabCircuitId); setPickerOpen(false); }}
                    className={`flex-row items-center gap-[10px] px-[10px] py-[11px] min-h-[48px] rounded-[14px] ${on ? 'bg-[#f3f2fd]' : 'bg-[#ffffff]'}`}
                  >
                    <View className="flex-1">
                      <Text className="font-sans-semibold text-[11.5px] text-[#151233]" numberOfLines={1}>
                        {item?.fabCircuitId || 'Unknown'}
                      </Text>
                      <Text className="font-sans-medium text-[10.5px] text-[#6d6a96] mt-[2px]" numberOfLines={1}>
                        {item?.customerName || item?.siteName || item?.location || '—'}
                      </Text>
                    </View>
                    {on && <Feather name="check" size={16} color={C.violetDeep} />}
                  </Pressable>
                );
              }}
            />
      </Sheet>
    </Screen>
  );
}