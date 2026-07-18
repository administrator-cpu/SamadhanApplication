// app/(agent)/index.js
import React from 'react';
import { View, Text, ActivityIndicator, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useAgentStats } from '../../src/hooks/useAgentStats';

// Helper to determine badge colors based on ticket status
const getStatusStyle = (status = '') => {
  const s = status.toUpperCase();
  if (s.includes('RESOLVED') || s.includes('CLOSED')) return { bg: 'bg-emerald-100', text: 'text-emerald-700' };
  if (s.includes('ACTIVE') || s.includes('OPEN')) return { bg: 'bg-blue-100', text: 'text-blue-700' };
  if (s.includes('ESCALATED')) return { bg: 'bg-red-100', text: 'text-red-700' };
  if (s.includes('PENDING')) return { bg: 'bg-orange-100', text: 'text-orange-700' };
  return { bg: 'bg-gray-100', text: 'text-gray-600' }; // Default
};

// Helper to map dynamic stat keys to icons and colors
const getStatUI = (key) => {
  const k = key.toLowerCase();
  if (k.includes('total')) return { icon: 'layers', theme: 'blue' };
  if (k.includes('active') || k.includes('open') || k.includes('assigned')) return { icon: 'inbox', theme: 'orange' };
  if (k.includes('resolv') || k.includes('clos')) return { icon: 'check-circle', theme: 'green' };
  if (k.includes('escalat')) return { icon: 'alert-triangle', theme: 'red' };
  if (k.includes('today')) return { icon: 'calendar', theme: 'purple' };
  return { icon: 'bar-chart-2', theme: 'gray' };
};

export default function AgentDashboard() {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const { data: stats, isLoading, isError, error, refetch, isRefetching } = useAgentStats();

  // Extract data safely
  const summary = stats?.summary || {};
  const recentTickets = stats?.recentTickets || [];
  
  // Generate initials for avatar
  const userInitials = user?.name ? user.name.charAt(0).toUpperCase() : 'A';

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-gray-500 mt-4 font-medium">Loading Workspace...</Text>
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
          <Text className="text-3xl font-extrabold text-gray-900 tracking-tight">Workspace</Text>
          <Text className="text-gray-500 font-medium mt-1">
            Hello, {user?.name?.split(' ')[0] || 'Agent'}
          </Text>
        </View>
        <View className="w-12 h-12 rounded-full bg-blue-100 border-2 border-blue-200 items-center justify-center">
          <Text className="text-blue-700 font-bold text-lg">{userInitials}</Text>
        </View>
      </View>

      {/* Dynamic Summary Stats Grid */}
      <View className="flex-row flex-wrap justify-between gap-y-4 mb-8">
        {Object.entries(summary).map(([key, value]) => {
          const ui = getStatUI(key);
          const formattedLabel = key
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase()); // Title Case

          return (
            <StatCard
              key={key}
              label={formattedLabel}
              value={String(value)}
              icon={ui.icon}
              colorTheme={ui.theme}
            />
          );
        })}
      </View>

      {/* Recent Tickets Section */}
      <View className="flex-row items-center justify-between mb-4 mt-2">
        <Text className="text-lg font-bold text-gray-900">Recent Assignments</Text>
        <TouchableOpacity onPress={() => router.push('/(agent)/tickets')} className="py-1 px-2">
          <Text className="text-blue-600 font-medium text-sm">View All</Text>
        </TouchableOpacity>
      </View>

      <View className="gap-y-3">
        {recentTickets.length === 0 ? (
          <View className="bg-white rounded-2xl p-8 items-center justify-center border border-gray-100 shadow-sm">
            <View className="w-16 h-16 bg-gray-50 rounded-full items-center justify-center mb-4">
              <Feather name="check-circle" size={32} color="#9ca3af" />
            </View>
            <Text className="text-gray-900 font-bold text-lg mb-1">You're all caught up!</Text>
            <Text className="text-gray-500 text-center">No recent tickets assigned to you.</Text>
          </View>
        ) : (
          recentTickets.map((ticket) => {
            const statusStyle = getStatusStyle(ticket.status);
            
            return (
              <TouchableOpacity
                key={ticket.id}
                onPress={() => router.push(`/(agent)/tickets/${ticket.id}`)}
                activeOpacity={0.7}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex-row items-center justify-between"
              >
                <View className="flex-1 mr-3">
                  <View className="flex-row items-center gap-x-2 mb-1">
                    <Text className="text-gray-900 font-bold text-base">
                      #{ticket.ticket_no}
                    </Text>
                    {/* Status Pill */}
                    <View className={`px-2 py-0.5 rounded-md ${statusStyle.bg}`}>
                      <Text className={`text-[10px] font-bold uppercase tracking-wider ${statusStyle.text}`}>
                        {ticket.status}
                      </Text>
                    </View>
                  </View>
                  <Text 
                    className="text-gray-500 text-sm" 
                    numberOfLines={1} 
                    ellipsizeMode="tail"
                  >
                    {ticket.circuit_description || 'No description provided'}
                  </Text>
                </View>
                
                <View className="w-8 h-8 rounded-full bg-gray-50 items-center justify-center">
                  <Feather name="chevron-right" size={18} color="#9ca3af" />
                </View>
              </TouchableOpacity>
            );
          })
        )}
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
        <Text className="text-gray-500 text-xs font-medium" numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
}