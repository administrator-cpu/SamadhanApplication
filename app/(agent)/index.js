// app/(agent)/index.js
import React from 'react';
import { View, Text, ActivityIndicator, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useAgentStats } from '../../src/hooks/useAgentStats';

const getStatusStyle = (status = '') => {
  const s = status.toUpperCase();
  if (s.includes('RESOLVED') || s.includes('CLOSED')) return { bg: 'bg-emerald-100', text: 'text-emerald-700' };
  if (s.includes('ACTIVE') || s.includes('OPEN')) return { bg: 'bg-orange-50', text: 'text-orange-700' };
  if (s.includes('ESCALATED')) return { bg: 'bg-rose-100', text: 'text-rose-700' };
  if (s.includes('PENDING')) return { bg: 'bg-amber-100', text: 'text-amber-700' };
  return { bg: 'bg-slate-100', text: 'text-slate-600' };
};

// Pulls one value out of the dynamic `summary` object by keyword match —
// each of the 4 fixed grid slots below is populated independently, no loop.
function pickStat(summary, keywords) {
  const entries = Object.entries(summary);
  const match = entries.find(([key]) => {
    const k = key.toLowerCase();
    return keywords.some((word) => k.includes(word));
  });
  return match ? match[1] : null;
}

export default function AgentDashboard() {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const { data: stats, isLoading, isError, error, refetch, isRefetching } = useAgentStats();

  const summary = stats?.summary || {};
  const recentTickets = stats?.recentTickets || [];

  const userInitials = user?.name ? user.name.charAt(0).toUpperCase() : 'A';

  const activeCount = pickStat(summary, ['active', 'open', 'assigned']);
  const escalatedCount = pickStat(summary, ['escalat']);
  const resolvedCount = pickStat(summary, ['resolv', 'clos']);
  const totalCount = pickStat(summary, ['total']);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#FF5A36" />
        <Text className="font-sans-medium text-slate-500 mt-4">Loading Workspace...</Text>
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
          <Text className="text-2xl font-extrabold text-slate-800 tracking-tight">Workspace</Text>
          <Text className="font-sans-medium text-slate-500 mt-1 text-sm">
            Hello, {user?.name?.split(' ')[0] || 'Agent'}
          </Text>
        </View>
        <View className="w-11 h-11 rounded-full bg-primary-50 items-center justify-center border border-primary-200">
          <Text className="font-sans-semibold text-primary-700 text-base">{userInitials}</Text>
        </View>
      </View>

      <View className="flex-row flex-wrap justify-between mb-6">
        <StatCard
          icon="inbox"
          iconBg="bg-orange-50"
          iconColor="#EA580C"
          value={activeCount ?? '0'}
          label="Active / Open"
        />

        <StatCard
          icon="alert-triangle"
          iconBg="bg-rose-50"
          iconColor="#E11D48"
          value={escalatedCount ?? '0'}
          label="Escalated"
        />

        <StatCard
          icon="check-circle"
          iconBg="bg-emerald-50"
          iconColor="#059669"
          value={resolvedCount ?? '0'}
          label="Resolved"
        />

        <StatCard
          icon="layers"
          iconBg="bg-slate-100"
          iconColor="#64748B"
          value={totalCount ?? '0'}
          label="Total Tickets"
        />
      </View>

      {/* --- RECENT ASSIGNMENTS (compact) --- */}
      <View className="flex-row items-center justify-between mb-3">
        <Text className="font-sans-semibold text-slate-900 text-lg">Recent Assignments</Text>
        <TouchableOpacity onPress={() => router.push('/(agent)/tickets')} className="py-1 px-2">
          <Text className="font-sans-semibold text-primary-500 text-sm">View All</Text>
        </TouchableOpacity>
      </View>

      <View className="gap-y-2.5">
        {recentTickets.length === 0 ? (
          <View className="bg-white rounded-2xl p-8 items-center justify-center border border-slate-200 shadow-sm">
            <View className="w-16 h-16 bg-slate-50 rounded-full items-center justify-center mb-4">
              <Feather name="check-circle" size={32} color="#94A3B8" />
            </View>
            <Text className="font-sans-semibold text-slate-900 text-lg mb-1">You're all caught up!</Text>
            <Text className="font-sans text-slate-500 text-center">No recent tickets assigned to you.</Text>
          </View>
        ) : (
          recentTickets.map((ticket) => {
            const statusStyle = getStatusStyle(ticket.status);
            return (
              <TouchableOpacity
                key={ticket.id}
                onPress={() => router.push(`/(agent)/tickets/${ticket.id}`)}
                activeOpacity={0.8}
                className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm flex-row items-center justify-between"
              >
                <View className="flex-1 mr-3">
                  <View className="flex-row items-center mb-1" style={{ gap: 8 }}>
                    <Text className="font-mono text-xs text-slate-400" numberOfLines={1}>
                      #{ticket.ticket_no}
                    </Text>
                    <View className={`px-1.5 py-0.5 rounded ${statusStyle.bg}`}>
                      <Text className={`font-sans-semibold text-[9px] uppercase tracking-wider ${statusStyle.text}`}>
                        {ticket.status}
                      </Text>
                    </View>
                  </View>
                  <Text
                    className="font-sans-semibold text-slate-800 text-sm"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {ticket.circuit_description || 'No description provided'}
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color="#94A3B8" />
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

/* ---------------------------------------------------------------- */
/* Dense stat card — horizontal internal layout, pure white, subtle  */
/* semantic icon tint. No solid color fills anywhere.                */
/* ---------------------------------------------------------------- */

function StatCard({ icon, iconBg, iconColor, value, label }) {
  return (
    <View className="bg-white rounded-2xl p-4 flex-row items-center shadow-sm border border-slate-200 w-[48%] mb-4">
      {/* Icon container — flex-none prevents it from stretching */}
      <View className={` rounded-xl items-center justify-center flex-none ${iconBg}`}>
        <Feather name={icon} size={20} color={iconColor} />
      </View>

      {/* Data container — flex-1 takes up the remaining space */}
      <View className="flex-1 ml-3">
        <Text className="text-2xl font-black text-slate-800 leading-none" numberOfLines={1}>
          {value ?? '0'}
        </Text>
        <Text
          className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1"
          numberOfLines={2}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}