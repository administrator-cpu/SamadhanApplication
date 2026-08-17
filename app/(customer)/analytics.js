import { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart } from 'react-native-gifted-charts';
import { useMyMetrics } from '../../src/hooks/useMyMetrics';
import { useMyConnections } from '../../src/hooks/useCustomers';

const screenWidth = Dimensions.get('window').width;
const CHART_WIDTH = screenWidth - 96;

// Vibrant Warmth chart palette — primary is exact brand coral, secondary
// shifted from dark stone to a rich slate for a crisper, cooler contrast
// color alongside the warm coral.
const CHART_COLORS = {
  primary: '#FF5A36',   // brand coral
  secondary: '#334155', // rich slate
  warning: '#f59e0b',
  success: '#10b981',
  danger: '#f43f5e',
  muted: '#94a3b8',
};

function KpiCard({ label, kpi }) {
  if (!kpi) return null;

  return (
    <View className="bg-white rounded-3xl p-5 flex-1 mx-2 shadow-sm border border-slate-200">
      <Text className="font-sans-semibold text-slate-500 text-[11px] uppercase tracking-widest mb-1.5">
        {label}
      </Text>
      <Text className="font-sans-semibold text-slate-900 text-2xl tracking-tight">{kpi.value}</Text>
      {kpi.displayText && (
        <Text className="font-sans-medium text-slate-500 text-xs mt-1.5">{kpi.displayText}</Text>
      )}
    </View>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <View className="bg-white rounded-[28px] p-6 mb-5 shadow-sm border border-slate-200">
      <View className="mb-6">
        <Text className="font-sans-semibold text-slate-900 text-lg tracking-tight">{title}</Text>
        {subtitle && <Text className="font-sans-medium text-slate-500 text-xs mt-1">{subtitle}</Text>}
      </View>
      {children}
    </View>
  );
}

export default function CustomerAnalytics() {
  const router = useRouter();
  const [circuitId, setCircuitId] = useState('ALL');

  const { data: connectionsData } = useMyConnections();
  const connections = connectionsData?.connections ?? [];
  const totalCircuits = connections.length;

  const { data, isLoading, isError } = useMyMetrics({ circuitId, totalCircuits });

  const commonChartProps = {
    width: CHART_WIDTH,
    yAxisTextStyle: { color: '#94a3b8', fontSize: 11, fontWeight: '600' },
    xAxisLabelTextStyle: { color: '#94a3b8', fontSize: 11, fontWeight: '600' },
    rulesColor: '#f1f5f9',
    yAxisColor: 'transparent',
    xAxisColor: '#e2e8f0',
    initialSpacing: 20,
    hideOrigin: true,
  };

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <View
        className="flex-row items-center px-6 bg-white border-b border-slate-200 z-10 shadow-sm"
        style={{ paddingTop: Platform.OS === 'ios' ? 60 : 44, paddingBottom: 20 }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={15}
          className="w-10 h-10 rounded-full bg-slate-50 items-center justify-center mr-4 active:bg-slate-100"
        >
          <Feather name="arrow-left" size={20} color="#0F172A" />
        </Pressable>
        <View>
          <Text className="font-sans-semibold text-slate-900 text-2xl tracking-tight">Analytics</Text>
          <Text className="font-sans-medium text-slate-500 text-xs mt-1">Network performance metrics</Text>
        </View>
      </View>

      {/* Filter pills */}
      <View className="bg-white border-b border-slate-200 shadow-sm pb-1">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 14, gap: 10 }}
        >
          <Pressable
            onPress={() => setCircuitId('ALL')}
            className={`px-5 py-2.5 rounded-full border ${
              circuitId === 'ALL'
                ? 'bg-primary-500 border-primary-500 shadow-sm'
                : 'bg-white border-slate-200 active:bg-slate-50'
            }`}
          >
            <Text
              className={`font-sans-semibold tracking-wide text-sm ${
                circuitId === 'ALL' ? 'text-white' : 'text-slate-500'
              }`}
            >
              All Circuits
            </Text>
          </Pressable>
          {connections.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => setCircuitId(c.fabCircuitId)}
              className={`px-5 py-2.5 rounded-full border ${
                circuitId === c.fabCircuitId
                  ? 'bg-primary-500 border-primary-500 shadow-sm'
                  : 'bg-white border-slate-200 active:bg-slate-50'
              }`}
            >
              <Text
                className={`font-sans-semibold tracking-wide text-sm ${
                  circuitId === c.fabCircuitId ? 'text-white' : 'text-slate-500'
                }`}
              >
                {c.fabCircuitId}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* States */}
      {isLoading && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#FF5A36" />
          <Text className="font-sans-semibold text-slate-500 tracking-wide mt-4">
            Crunching the data...
          </Text>
        </View>
      )}

      {isError && (
        <View className="flex-1 items-center justify-center px-10">
          <View className="w-20 h-20 bg-rose-50 rounded-full items-center justify-center mb-5 border border-rose-100">
            <Feather name="alert-triangle" size={32} color="#f43f5e" />
          </View>
          <Text className="font-sans-semibold text-slate-900 text-xl mb-2">Analytics Unavailable</Text>
          <Text className="font-sans-medium text-slate-500 text-center leading-relaxed">
            We couldn't load your performance data right now. Please try again later.
          </Text>
        </View>
      )}

      {/* Charts & Metrics */}
      {data && !isLoading && !isError && (
        <ScrollView
          className="flex-1 px-5 pt-6"
          contentContainerStyle={{ paddingBottom: 160 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row mb-3 px-1">
            <KpiCard label="Uptime" kpi={data.kpiHighlights?.uptimeDelta} />
            <KpiCard label="MTTR" kpi={data.kpiHighlights?.mttrReduction} />
          </View>
          <View className="flex-row mb-6 px-1">
            <KpiCard label="Core Outage" kpi={data.kpiHighlights?.zeroCoreOutage} />
            <KpiCard label="Repeat Faults" kpi={data.kpiHighlights?.repeatFaultReduction} />
          </View>

          <ChartCard title="Monthly Uptime Trend" subtitle="Percentage of network availability">
            <LineChart
              {...commonChartProps}
              data={(data.monthlyUptimeTrend ?? []).map((d) => ({ value: d.uptime, label: d.name }))}
              color={CHART_COLORS.primary}
              thickness={4}
              curved
              dataPointsColor={CHART_COLORS.primary}
              dataPointsRadius={4}
              areaChart
              startFillColor="rgba(255, 90, 54, 0.25)"
              endFillColor="rgba(255, 90, 54, 0.01)"
              startOpacity={0.9}
              endOpacity={0.1}
            />
          </ChartCard>

          <ChartCard title="Total Faults by Month" subtitle="Number of recorded incidents">
            <BarChart
              {...commonChartProps}
              data={(data.totalFaultsByMonth ?? []).map((d) => ({ value: d.count, label: d.name }))}
              frontColor={CHART_COLORS.secondary}
              barBorderRadius={6}
              barWidth={32}
            />
          </ChartCard>

          <ChartCard title="MTTR Trend" subtitle="Mean Time To Recovery (Hours)">
            <LineChart
              {...commonChartProps}
              data={(data.mttrTrend ?? []).map((d) => ({ value: d.mttr, label: d.name }))}
              color={CHART_COLORS.warning}
              thickness={4}
              curved
              dataPointsColor={CHART_COLORS.warning}
              dataPointsRadius={4}
            />
          </ChartCard>

          <ChartCard title="Fault Category Distribution" subtitle="Breakdown of incident types">
            <View className="items-center py-6">
              <PieChart
                data={(data.faultCategoryDistribution ?? []).map((d, i) => ({
                  value: d.value,
                  color: [CHART_COLORS.primary, CHART_COLORS.warning, CHART_COLORS.success, CHART_COLORS.danger, CHART_COLORS.muted][i % 5],
                }))}
                donut
                radius={110}
                innerRadius={72}
                innerCircleColor="#ffffff"
                centerLabelComponent={() => (
                  <View className="items-center justify-center">
                    <Text className="font-sans-semibold text-slate-400 text-[10px] uppercase tracking-widest">
                      Total
                    </Text>
                    <Text className="font-sans-semibold text-slate-900 text-3xl mt-0.5">
                      {data.faultCategoryDistribution?.reduce((acc, curr) => acc + curr.value, 0) || 0}
                    </Text>
                  </View>
                )}
              />
            </View>
            <View className="flex-row flex-wrap justify-center gap-x-4 gap-y-3 mt-4 px-2">
              {(data.faultCategoryDistribution ?? []).map((d, i) => (
                <View key={d.name} className="flex-row items-center">
                  <View
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: [CHART_COLORS.primary, CHART_COLORS.warning, CHART_COLORS.success, CHART_COLORS.danger, CHART_COLORS.muted][i % 5] }}
                  />
                  <Text className="font-sans-semibold text-slate-600 text-xs">
                    {d.name} ({d.value})
                  </Text>
                </View>
              ))}
            </View>
          </ChartCard>

          <ChartCard title="Fault Severity Breakdown" subtitle="Incidents categorized by impact">
            <BarChart
              {...commonChartProps}
              stackData={(data.faultSeverity ?? []).map((d) => ({
                label: d.name,
                stacks: [
                  { value: d.Critical ?? 0, color: CHART_COLORS.danger },
                  { value: d.Medium ?? 0, color: CHART_COLORS.warning },
                  { value: d.Low ?? 0, color: CHART_COLORS.success },
                ],
              }))}
              barWidth={32}
              barBorderRadius={4}
            />
            <View className="flex-row justify-center gap-6 mt-8 border-t border-slate-200 pt-5">
              <View className="flex-row items-center">
                <View className="w-3.5 h-3.5 rounded-full bg-rose-500 mr-2" />
                <Text className="font-sans-semibold text-slate-600 text-xs uppercase tracking-wide">
                  Critical
                </Text>
              </View>
              <View className="flex-row items-center">
                <View className="w-3.5 h-3.5 rounded-full bg-amber-500 mr-2" />
                <Text className="font-sans-semibold text-slate-600 text-xs uppercase tracking-wide">
                  Medium
                </Text>
              </View>
              <View className="flex-row items-center">
                <View className="w-3.5 h-3.5 rounded-full bg-emerald-500 mr-2" />
                <Text className="font-sans-semibold text-slate-600 text-xs uppercase tracking-wide">
                  Low
                </Text>
              </View>
            </View>
          </ChartCard>
        </ScrollView>
      )}
    </View>
  );
}