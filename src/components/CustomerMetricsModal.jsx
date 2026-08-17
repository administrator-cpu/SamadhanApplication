import { useState } from 'react';
import {
    Modal, View, Text, ScrollView, TouchableOpacity,
    ActivityIndicator, Dimensions, StyleSheet
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart, StackedBarChart } from 'react-native-gifted-charts';
import { useCustomerMetrics } from '../hooks/useCustomerMetrics';
import { useCustomerConnections } from '../hooks/useCustomers';

// Dynamically calculate chart width based on screen size minus padding
const screenWidth = Dimensions.get('window').width;
const CHART_WIDTH = screenWidth - 96; // Adjusting for card padding

// Plain StyleSheet (not NativeWind className) for the circuit-filter pills
// specifically. Every crash report for the "Couldn't find a navigation
// context" error traced back to react-native-css-interop's runtime
// (interop/renderComponent) — code that only ever runs on components
// using `className`. Switching component type (Pressable ->
// TouchableOpacity) and switching from template-literal to static-string
// classNames both failed to fix it, which rules out those as the actual
// mechanism. Rather than keep guessing at what's wrong inside that
// library's interaction with this Modal + expo-router's nested stack,
// these specific elements are pulled out of NativeWind's className
// pipeline entirely — react-native-css-interop can't crash on a
// component it never processes.
const pillStyles = StyleSheet.create({
    base: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 9999,
        marginRight: 12,
        borderWidth: 1,
    },
    active: {
        backgroundColor: '#2563eb',
        borderColor: '#2563eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    inactive: {
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
    },
    textBase: {
        fontSize: 14,
    },
    textActive: {
        color: '#ffffff',
        fontWeight: '700',
    },
    textInactive: {
        color: '#475569',
        fontWeight: '600',
    },
    loadingPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 9999,
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#ffffff',
    },
});

function CircuitPill({ label, isActive, onPress }) {
    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={onPress}
            style={[pillStyles.base, isActive ? pillStyles.active : pillStyles.inactive]}
        >
            <Text style={[pillStyles.textBase, isActive ? pillStyles.textActive : pillStyles.textInactive]}>
                {label}
            </Text>
        </TouchableOpacity>
    );
}

function KpiCard({ label, kpi }) {
    if (!kpi) return null;
    const positive = (kpi.trend ?? 0) >= 0;

    return (
        <View className="bg-white rounded-[20px] p-5 flex-1 mx-2 shadow-sm border border-slate-100">
            <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">{label}</Text>

            <View className="flex-row items-baseline">
                <Text className="text-slate-900 text-2xl font-extrabold tracking-tight">
                    {kpi.value}
                </Text>
                {kpi.unit && (
                    <Text className="text-slate-400 text-sm font-semibold ml-1">{kpi.unit}</Text>
                )}
            </View>

            {kpi.trend != null && (
                <View
                    className={
                        positive
                            ? 'flex-row items-center mt-3 self-start px-2 py-1 rounded-md bg-emerald-50'
                            : 'flex-row items-center mt-3 self-start px-2 py-1 rounded-md bg-red-50'
                    }
                >
                    <Feather
                        name={positive ? 'trending-up' : 'trending-down'}
                        size={12}
                        color={positive ? '#059669' : '#dc2626'}
                    />
                    <Text
                        className={
                            positive ? 'text-xs font-bold ml-1 text-emerald-700' : 'text-xs font-bold ml-1 text-red-700'
                        }
                    >
                        {Math.abs(kpi.trend)}%
                    </Text>
                </View>
            )}
        </View>
    );
}

function ChartCard({ title, subtitle, children }) {
    return (
        <View className="bg-white rounded-[24px] p-5 mb-5 shadow-sm border border-slate-100">
            <View className="mb-6">
                <Text className="text-slate-900 text-base font-bold">{title}</Text>
                {subtitle && <Text className="text-slate-500 text-xs mt-1">{subtitle}</Text>}
            </View>
            {children}
        </View>
    );
}

export default function CustomerMetricsModal({ visible, onClose, customerId }) {
    const [circuitId, setCircuitId] = useState('ALL');

    // Only fetch while the modal is actually open — CustomerMetricsModal
    // stays mounted by the parent screen even when `visible` is false (the
    // inner <Modal> just hides its native overlay), so gating on `visible`
    // here avoids firing requests every time the parent re-renders.
    const activeCustomerId = visible ? customerId : null;

    const { data: connections = [], isLoading: isConnectionsLoading } =
        useCustomerConnections(activeCustomerId);
    const totalCircuits = connections.length;

    const { data, isLoading, isError, error } = useCustomerMetrics(activeCustomerId, {
        circuitId,
        totalCircuits,
    });

    // Common styles to make gifted-charts look much cleaner
    const commonChartProps = {
        width: CHART_WIDTH,
        yAxisTextStyle: { color: '#94a3b8', fontSize: 11, fontWeight: '500' },
        xAxisLabelTextStyle: { color: '#94a3b8', fontSize: 11, fontWeight: '500' },
        rulesColor: '#f1f5f9',
        yAxisColor: 'transparent',
        xAxisColor: '#e2e8f0',
        initialSpacing: 20,
        hideOrigin: true,
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View className="flex-1 bg-[#f8fafc]">

                {/* Header */}
                <View className="flex-row items-center justify-between px-6 pt-6 pb-4 bg-white border-b border-slate-100 z-10">
                    <View>
                        <Text className="text-xl font-extrabold text-slate-900 tracking-tight">Network Analytics</Text>
                        <Text className="text-slate-500 text-xs font-medium mt-1">Real-time performance metrics</Text>
                    </View>
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={onClose}
                        hitSlop={15}
                        className="w-10 h-10 bg-slate-100 rounded-full items-center justify-center active:bg-slate-200"
                    >
                        <Feather name="x" size={20} color="#475569" />
                    </TouchableOpacity>
                </View>

                {/* Circuit Filter */}
                <View className="bg-white border-b border-slate-100 shadow-sm z-0">
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
                    >
                        <CircuitPill
                            label="All Circuits"
                            isActive={circuitId === 'ALL'}
                            onPress={() => setCircuitId('ALL')}
                        />

                        {(connections || []).map((c, index) => (
                            <CircuitPill
                                key={c.fabCircuitId || index}
                                label={c.fabCircuitId}
                                isActive={circuitId === c.fabCircuitId}
                                onPress={() => setCircuitId(c.fabCircuitId)}
                            />
                        ))}

                        {isConnectionsLoading && (
                            <View style={pillStyles.loadingPill}>
                                <ActivityIndicator size="small" color="#94a3b8" />
                            </View>
                        )}
                    </ScrollView>
                </View>

                {isLoading && (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#3b82f6" />
                        <Text className="text-slate-500 font-medium mt-4">Crunching the data...</Text>
                    </View>
                )}

                {isError && (
                    <View className="flex-1 items-center justify-center px-10">
                        <View className="w-16 h-16 bg-red-50 rounded-full items-center justify-center mb-4">
                            <Feather name="alert-triangle" size={28} color="#ef4444" />
                        </View>
                        <Text className="text-slate-800 font-bold text-lg mb-2">Analytics Unavailable</Text>
                        <Text className="text-slate-500 text-center">We couldn't load the performance data for this customer right now.</Text>
                    </View>
                )}

                {data && !isLoading && !isError && (
                    <ScrollView className="flex-1 px-4 pt-6" contentContainerStyle={{ paddingBottom: 60 }}>

                        {/* KPI Rows */}
                        <View className="flex-row mb-4 px-2">
                            <KpiCard label="Uptime Δ" kpi={data.kpiHighlights?.uptimeDelta} />
                            <KpiCard label="MTTR Reduction" kpi={data.kpiHighlights?.mttrReduction} />
                        </View>
                        <View className="flex-row mb-6 px-2">
                            <KpiCard label="Zero-Core Outage" kpi={data.kpiHighlights?.zeroCoreOutage} />
                            <KpiCard label="Repeat Faults" kpi={data.kpiHighlights?.repeatFaultReduction} />
                        </View>

                        {/* Monthly Uptime Trend */}
                        <ChartCard title="Monthly Uptime Trend" subtitle="Percentage of network availability">
                            <LineChart
                                {...commonChartProps}
                                data={(data.monthlyUptimeTrend ?? []).map((d) => ({ value: d.uptime, label: d.name }))}
                                color="#3b82f6"
                                thickness={3}
                                curved
                                dataPointsColor="#2563eb"
                                dataPointsRadius={4}
                                startFillColor="rgba(59, 130, 246, 0.2)"
                                endFillColor="rgba(59, 130, 246, 0.01)"
                                startOpacity={0.9}
                                endOpacity={0.2}
                                areaChart
                            />
                        </ChartCard>

                        {/* Total Faults by Month */}
                        <ChartCard title="Total Faults by Month" subtitle="Number of recorded incidents">
                            <BarChart
                                {...commonChartProps}
                                data={(data.totalFaultsByMonth ?? []).map((d) => ({ value: d.count, label: d.name }))}
                                frontColor="#3b82f6"
                                barBorderRadius={6}
                                barWidth={28}
                            />
                        </ChartCard>

                        {/* MTTR Trend */}
                        <ChartCard title="MTTR Trend" subtitle="Mean Time To Recovery (Hours)">
                            <LineChart
                                {...commonChartProps}
                                data={(data.mttrTrend ?? []).map((d) => ({ value: d.mttr, label: d.name }))}
                                color="#f59e0b"
                                thickness={3}
                                curved
                                dataPointsColor="#d97706"
                                dataPointsRadius={4}
                            />
                        </ChartCard>

                        {/* Fault Category Distribution */}
                        <ChartCard title="Fault Category Distribution" subtitle="Breakdown of incident types">
                            <View className="items-center py-4">
                                <PieChart
                                    data={(data.faultCategoryDistribution ?? []).map((d, i) => ({
                                        value: d.value,
                                        color: ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'][i % 5],
                                    }))}
                                    donut
                                    radius={110}
                                    innerRadius={70}
                                    innerCircleColor="#ffffff"
                                    centerLabelComponent={() => {
                                        return (
                                            <View className="items-center justify-center">
                                                <Text className="text-slate-400 text-xs font-bold uppercase">Total</Text>
                                                <Text className="text-slate-900 text-2xl font-extrabold">
                                                    {data.faultCategoryDistribution?.reduce((acc, curr) => acc + curr.value, 0) || 0}
                                                </Text>
                                            </View>
                                        );
                                    }}
                                />
                            </View>

                            {/* Pie Chart Legend */}
                            <View className="flex-row flex-wrap justify-center gap-3 mt-4">
                                {(data.faultCategoryDistribution ?? []).map((d, i) => (
                                    <View key={d.name || i} className="flex-row items-center mr-3 mb-2">
                                        <View
                                            className="w-3 h-3 rounded-full mr-2"
                                            style={{ backgroundColor: ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'][i % 5] }}
                                        />
                                        <Text className="text-slate-600 text-xs font-medium">{d.name} ({d.value})</Text>
                                    </View>
                                ))}
                            </View>
                        </ChartCard>

                        {/* Fault Severity */}
                        {/* Fault Severity */}
                        <ChartCard title="Fault Severity Breakdown" subtitle="Incidents categorized by impact">
                            <BarChart
                                {...commonChartProps}
                                stackData={(data.faultSeverity ?? []).map((d) => ({
                                    label: d.name,
                                    stacks: [
                                        { value: d.Critical ?? 0, color: '#ef4444' },
                                        { value: d.Medium ?? 0, color: '#f59e0b' },
                                        { value: d.Low ?? 0, color: '#10b981' },
                                    ],
                                }))}
                                barWidth={28}
                                barBorderRadius={4}
                            />
                            {/* Stacked Chart Legend */}
                            <View className="flex-row justify-center gap-6 mt-6">
                                <View className="flex-row items-center"><View className="w-3 h-3 rounded-full bg-red-500 mr-2" /><Text className="text-slate-600 text-xs font-medium">Critical</Text></View>
                                <View className="flex-row items-center"><View className="w-3 h-3 rounded-full bg-amber-500 mr-2" /><Text className="text-slate-600 text-xs font-medium">Medium</Text></View>
                                <View className="flex-row items-center"><View className="w-3 h-3 rounded-full bg-emerald-500 mr-2" /><Text className="text-slate-600 text-xs font-medium">Low</Text></View>
                            </View>
                        </ChartCard>

                    </ScrollView>
                )}
            </View>
        </Modal>
    );
}