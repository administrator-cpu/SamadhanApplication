// app/(admin)/index.js
import React, { useMemo } from 'react';
import { View, Text, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useAdminStats } from '../../src/hooks/useAdminStats';

export default function AdminDashboard() {
  const user = useAuthStore((state) => state.user);

  const { data: stats, isLoading, isError, error, refetch, isRefetching } = useAdminStats();

  const categories = stats?.categories || [];

  const maxCategoryCount = useMemo(() => {
    return Math.max(...categories.map((c) => Number(c.count) || 0), 1);
  }, [categories]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#FF5A36" />
        <Text className="font-sans-medium text-slate-500 mt-4">Loading Dashboard...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 px-6">
        <Feather name="alert-circle" size={48} color="#E11D48" style={{ marginBottom: 16 }} />
        <Text className="font-sans-semibold text-rose-600 text-center text-lg mb-2">
          Oops! Something went wrong.
        </Text>
        <Text className="font-sans text-slate-500 text-center text-sm">
          {error?.message || 'Failed to load dashboard stats.'}
        </Text>
      </View>
    );
  }

  const summary = stats?.summary || {};
  const agents = stats?.agents || [];

  const userInitials = user?.name ? user.name.charAt(0).toUpperCase() : 'A';

  const topCategory = categories[0];
  const otherCategories = categories.slice(1, 4);

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerStyle={{ padding: 20, paddingBottom: 160 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#FF5A36" />}
    >
      {/* --- HEADER --- */}
      <View className="flex-row justify-between items-center mb-6 mt-9">
        <View>
          <Text className="font-sans-semibold text-slate-900 text-3xl tracking-tight">Dashboard</Text>
          <Text className="font-sans-medium text-slate-500 mt-1">
            Welcome back, {user?.name?.split(' ')[0] || 'Admin'}
          </Text>
        </View>
        <View className="w-10 h-10 rounded-full bg-primary-50 border-2 border-primary-200 items-center justify-center">
          <Text className="font-sans-semibold text-primary-700 text-sm">{userInitials}</Text>
        </View>
      </View>

      {/* --- PLATFORM HEALTH HERO CARD --- */}
      <View className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-200 mb-6">
        <View className="flex-row items-center">
          <View className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
          <Text className="font-sans-semibold text-slate-500 text-xs uppercase tracking-widest">
            Live System Status
          </Text>
        </View>

        <View className="flex-row mt-4 items-start">
          {/* Left: Active Issues */}
          <View className="flex-1">
            <Text className="font-sans-semibold text-slate-800 text-4xl">
              {summary.active_tickets ?? '0'}
            </Text>
            <View className="flex-row items-center  rounded-lg mt-1 self-start">
              <Feather name="alert-circle" size={12} color="#EA580C" style={{ marginRight: 5 }} />
              <Text className="font-sans-semibold text-primary-600 text-xs">Active Issues</Text>
            </View>
          </View>

          {/* Divider — balanced horizontal margins */}
          <View className="w-px bg-slate-100 self-stretch mx-6" />

          {/* Right: Total Tickets */}
          <View className="flex-1">
            <Text className="font-sans-semibold text-slate-800 text-4xl">
              {summary.total_tickets ?? '0'}
            </Text>
            <Text className="font-sans-medium text-slate-500 mt-1 text-sm">Total Tickets</Text>
          </View>
        </View>
      </View>

      {/* --- HORIZONTAL INSIGHT ROW --- */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 8 }}
      >
        <InsightChip
          icon="trending-up"
          iconColor="#E11D48"
          iconBg="bg-rose-50"
          value={summary.escalated_tickets}
          label="Escalated"
        />
        <InsightChip
          icon="check-circle"
          iconColor="#059669"
          iconBg="bg-emerald-50"
          value={summary.resolved_today}
          label="Resolved Today"
        />
        <InsightChip
          icon="users"
          iconColor="#8b5cf6"
          iconBg="bg-purple-50"
          value={`${summary.active_agents ?? 0}/${summary.total_agents ?? 0}`}
          label="Agents Online"
        />
        <InsightChip
          icon="clock"
          iconColor="#64748B"
          iconBg="bg-slate-100"
          value={summary.tickets_last_24h}
          label="Last 24 Hours"
        />
      </ScrollView>

      {/* --- PRIORITY FOCUS CATEGORIES --- */}
      <View className="bg-white rounded-[24px] p-5 shadow-sm border border-slate-200 mb-6 mt-6">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="font-sans-semibold text-slate-900 text-lg">Priority Focus</Text>
          <Feather name="bar-chart-2" size={20} color="#94A3B8" />
        </View>

        {topCategory && (
          <View className="bg-primary-50 rounded-xl p-4 mb-4 border border-primary-100 flex-row items-center">
            <View className="w-10 h-10 bg-white rounded-full items-center justify-center mr-3 shadow-sm">
              <Feather name="alert-triangle" size={16} color="#EA580C" />
            </View>
            <View className="flex-1 pr-2">
              <Text className="font-sans-semibold text-primary-700 text-[10px] uppercase tracking-widest mb-0.5">
                Top Issue Category
              </Text>
              <Text className="font-sans-semibold text-slate-900 text-lg" numberOfLines={1}>
                {topCategory.name}
              </Text>
            </View>
            <Text className="font-sans-semibold text-primary-600 text-3xl">
              {topCategory.count}
            </Text>
          </View>
        )}

        {otherCategories.map((cat, index) => {
          const isLast = index === otherCategories.length - 1;
          return (
            <View
              key={cat.name || index}
              className={`flex-row justify-between items-center py-3 ${
                isLast ? '' : 'border-b border-slate-100'
              }`}
            >
              <Text className="font-sans-semibold text-slate-700 text-sm">{cat.name}</Text>
              <Text className="font-sans-semibold text-slate-900 text-sm bg-slate-50 px-2 py-1 rounded-md">
                {cat.count}
              </Text>
            </View>
          );
        })}
      </View>

      {/* --- LIVE ROSTER (AGENT WORKLOAD) --- */}
      <View className="bg-white rounded-[24px] shadow-sm border border-slate-200 overflow-hidden">
        <View className="p-5 border-b border-slate-100">
          <Text className="font-sans-semibold text-slate-900 text-lg">Live Roster</Text>
        </View>

        {agents.map((agent, index) => {
          const activeAssigned = Number(agent.active_assigned) || 0;
          const initials = agent.name ? agent.name.substring(0, 2).toUpperCase() : 'AG';

          const capacityColor =
            activeAssigned > 5 ? '#E11D48' : activeAssigned === 0 ? '#059669' : '#EA580C';

          const isLast = index === agents.length - 1;

          return (
            <View
              key={agent.employee_id || index}
              className={`flex-row items-center justify-between p-4 ${
                isLast ? '' : 'border-b border-slate-50'
              }`}
            >
              <View className="flex-row items-center flex-1 pr-3">
                <View className="w-10 h-10 bg-slate-100 rounded-full items-center justify-center mr-3">
                  <Text className="font-sans-semibold text-slate-600 text-xs">{initials}</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-sans-semibold text-slate-900 text-sm" numberOfLines={1}>
                    {agent.name.trim()}
                  </Text>
                  <Text className="font-sans-medium text-slate-500 text-xs mt-0.5 capitalize">
                    {agent.role.replace('_', ' ').toLowerCase()}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center bg-white border border-slate-200 shadow-sm px-3 py-1 rounded-full">
                <View
                  className="w-2 h-2 rounded-full mr-2"
                  style={{ backgroundColor: capacityColor }}
                />
                <Text className="font-sans-semibold text-slate-700 text-xs">
                  {activeAssigned} / {agent.total_assigned}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

/* ---------------------------------------------------------------- */
/* Insight Chip — tightened padding, smaller icon circle, tighter    */
/* vertical rhythm between icon → number → label.                    */
/* ---------------------------------------------------------------- */

function InsightChip({ icon, iconColor, iconBg, value, label }) {
  return (
    <View
      className="bg-white px-4 py-3 rounded-2xl mr-3 shadow-sm border border-slate-200"
      style={{ minWidth: 130 }}
    >
      <View className={`w-9 h-9 rounded-full items-center justify-center mb-2 ${iconBg}`}>
        <Feather name={icon} size={15} color={iconColor} />
      </View>
      <Text className="font-sans-semibold text-slate-800 text-2xl mt-1">{value ?? '0'}</Text>
      <Text className="font-sans-semibold text-slate-400 text-[10px] mt-0" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}