// app/(admin)/index.js
import React, { useMemo } from 'react';
import { View, Text, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useAdminStats } from '../../src/hooks/useAdminStats';

export default function AdminDashboard() {
  const user = useAuthStore((state) => state.user);
  const { data: stats, isLoading, isError, error, refetch, isRefetching } = useAdminStats();

  // 1. ALL HOOKS MUST GO BEFORE ANY EARLY RETURNS
  const categories = stats?.categories || [];
  
  const maxCategoryCount = useMemo(() => {
    return Math.max(...categories.map((c) => Number(c.count) || 0), 1);
  }, [categories]);

  // 2. NOW WE CAN SAFELY RETURN EARLY
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-gray-500 mt-4 font-medium">Loading Dashboard...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6">
        <Feather name="alert-circle" size={48} color="#ef4444" className="mb-4" />
        <Text className="text-red-600 text-center font-medium text-lg mb-2">Oops! Something went wrong.</Text>
        <Text className="text-gray-500 text-center text-sm">
          {error?.message || 'Failed to load dashboard stats.'}
        </Text>
      </View>
    );
  }

  // 3. Extract the rest of the data
  const summary = stats?.summary || {};
  const agents = stats?.agents || [];

  // Generate initials for avatar
  const userInitials = user?.name ? user.name.charAt(0).toUpperCase() : 'A';

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerClassName="p-5 pb-10"
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#3b82f6" />}
    >
      {/* Header Section */}
      <View className="flex-row justify-between items-center mb-8 mt-2">
        <View>
          <Text className="text-3xl font-extrabold text-gray-900 tracking-tight">Dashboard</Text>
          <Text className="text-gray-500 font-medium mt-1">
            Welcome back, {user?.name?.split(' ')[0] || 'Admin'}
          </Text>
        </View>
        <View className="w-12 h-12 rounded-full bg-blue-100 border-2 border-blue-200 items-center justify-center">
          <Text className="text-blue-700 font-bold text-lg">{userInitials}</Text>
        </View>
      </View>

      {/* Primary Stats Grid */}
      <View className="flex-row flex-wrap justify-between gap-y-4 mb-8">
        <StatCard 
          label="Total Tickets" 
          value={summary.total_tickets} 
          icon="layers" 
          colorTheme="blue" 
        />
        <StatCard 
          label="Active Issues" 
          value={summary.active_tickets} 
          icon="alert-circle" 
          colorTheme="orange" 
        />
        <StatCard 
          label="Resolved Today" 
          value={summary.resolved_today} 
          icon="check-circle" 
          colorTheme="green" 
        />
        <StatCard 
          label="Escalated" 
          value={summary.escalated_tickets} 
          icon="trending-up" 
          colorTheme="red" 
        />
        <StatCard 
          label="Agents Online" 
          value={`${summary.active_agents}/${summary.total_agents}`} 
          icon="users" 
          colorTheme="purple" 
        />
        <StatCard 
          label="Last 24 Hours" 
          value={summary.tickets_last_24h} 
          icon="clock" 
          colorTheme="gray" 
        />
      </View>

      {/* Top Issue Categories (Visualized) */}
      <View className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-8">
        <View className="flex-row items-center justify-between mb-4 border-b border-gray-100 pb-3">
          <Text className="text-lg font-bold text-gray-900">Top Issue Categories</Text>
          <Feather name="bar-chart-2" size={20} color="#9ca3af" />
        </View>
        <View className="gap-y-4">
          {categories.slice(0, 5).map((cat, index) => {
            const percentage = (Number(cat.count) / maxCategoryCount) * 100;
            return (
              <View key={cat.name || index}>
                <View className="flex-row justify-between mb-1.5">
                  <Text className="text-gray-700 font-medium text-sm">{cat.name}</Text>
                  <Text className="text-gray-900 font-bold text-sm">{cat.count}</Text>
                </View>
                <View className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <View 
                    className="h-full rounded-full bg-blue-500" 
                    style={{ width: `${percentage}%` }} 
                  />
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Agent Workload */}
      <View className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <View className="flex-row items-center justify-between mb-4 border-b border-gray-100 pb-3">
          <Text className="text-lg font-bold text-gray-900">Agent Workload</Text>
          <Feather name="briefcase" size={20} color="#9ca3af" />
        </View>
        <View className="gap-y-3">
          {agents.map((agent, index) => {
            const activeAssigned = Number(agent.active_assigned) || 0;
            const initials = agent.name ? agent.name.substring(0, 2).toUpperCase() : 'AG';
            
            return (
              <View 
                key={agent.employee_id || index} 
                className="flex-row items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100"
              >
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center mr-3">
                    <Text className="font-bold text-gray-600 text-xs">{initials}</Text>
                  </View>
                  <View>
                    <Text className="text-gray-900 font-semibold">{agent.name.trim()}</Text>
                    <Text className="text-gray-500 text-xs capitalize mt-0.5">
                      {agent.role.replace('_', ' ').toLowerCase()}
                    </Text>
                  </View>
                </View>
                
                <View className="flex-col items-end gap-y-1">
                  {activeAssigned > 0 ? (
                    <View className="bg-blue-100 border border-blue-200 rounded-full px-2.5 py-0.5 flex-row items-center">
                      <View className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5" />
                      <Text className="text-blue-700 text-xs font-semibold">{activeAssigned} Active</Text>
                    </View>
                  ) : (
                    <View className="bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5">
                      <Text className="text-gray-500 text-xs font-medium">Available</Text>
                    </View>
                  )}
                  <Text className="text-gray-400 text-[10px] font-medium uppercase">
                    {agent.total_assigned} Total Assigned
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

// Reusable Stat Card Component
function StatCard({ label, value, icon, colorTheme }) {
  const themes = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-500', text: 'text-blue-600', hex: '#3b82f6' },
    orange: { bg: 'bg-orange-50', icon: 'text-orange-500', text: 'text-orange-600', hex: '#f97316' },
    green: { bg: 'bg-emerald-50', icon: 'text-emerald-500', text: 'text-emerald-600', hex: '#10b981' },
    red: { bg: 'bg-red-50', icon: 'text-red-500', text: 'text-red-600', hex: '#ef4444' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-500', text: 'text-purple-600', hex: '#8b5cf6' },
    gray: { bg: 'bg-gray-100', icon: 'text-gray-500', text: 'text-gray-700', hex: '#6b7280' },
  };

  const theme = themes[colorTheme] || themes.gray;

  return (
    <View className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 w-[48%]">
      <View className="flex-row justify-between items-start mb-3">
        <View className={`p-2 rounded-xl ${theme.bg}`}>
          <Feather name={icon} size={18} color={theme.hex} />
        </View>
      </View>
      <View>
        <Text className={`text-2xl font-black ${theme.text} mb-0.5`}>
          {value ?? '0'}
        </Text>
        <Text className="text-gray-500 text-xs font-medium">{label}</Text>
      </View>
    </View>
  );
}