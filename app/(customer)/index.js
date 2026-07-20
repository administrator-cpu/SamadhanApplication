// app/(customer)/index.js
import { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useTickets } from '../../src/hooks/useTickets';
import { useMyConnections } from '../../src/hooks/useCustomers';
import { statusLabel } from '../../src/utils/ticketStatus';

// Minimalist status colors (used for left-borders and text accents)
const STATUS_THEME = {
  OPEN: { border: 'border-blue-500', bg: 'bg-blue-50', text: 'text-blue-600' },
  IN_PROGRESS: { border: 'border-amber-500', bg: 'bg-amber-50', text: 'text-amber-600' },
  ESCALATED: { border: 'border-red-500', bg: 'bg-red-50', text: 'text-red-600' },
  RESOLVED: { border: 'border-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-600' },
  CLOSED: { border: 'border-slate-300', bg: 'bg-slate-100', text: 'text-slate-500' },
  REOPENED: { border: 'border-purple-500', bg: 'bg-purple-50', text: 'text-purple-600' },
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function CustomerDashboard() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const { data, isLoading, isError, refetch, isRefetching } = useTickets({ statusGroup: undefined });
  const { data: connections } = useMyConnections();

  const allTickets = useMemo(() => data?.pages.flatMap((p) => p.tickets) ?? [], [data]);
  const activeTickets = allTickets.filter((t) => ['OPEN', 'IN_PROGRESS', 'ESCALATED'].includes(t.status));
  const recentTickets = allTickets.slice(0, 4);

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#0f172a" />
      </View>
    );
  }

  // Sleek, minimal ticket row with a colored left border
  const TicketRow = ({ ticket }) => {
    const theme = STATUS_THEME[ticket.status] || STATUS_THEME.CLOSED;
    return (
      <Pressable
        onPress={() => router.push(`/(customer)/tickets/${ticket.id}`)}
        className={`bg-white rounded-2xl mb-3 p-4 border-l-4 ${theme.border} shadow-sm active:bg-slate-50 flex-row items-center`}
      >
        <View className="flex-1 mr-3">
          <View className="flex-row items-center mb-1">
            <Text className="text-sm font-extrabold text-slate-900 mr-2">{ticket.ticket_no}</Text>
            <View className={`${theme.bg} px-2 py-0.5 rounded-md`}>
              <Text className={`${theme.text} text-[10px] font-bold uppercase`}>
                {statusLabel(ticket.status)}
              </Text>
            </View>
          </View>
          <Text className="text-xs text-slate-500 font-medium" numberOfLines={1}>
            {ticket.circuit_description || 'General support request'}
          </Text>
        </View>
        <Feather name="chevron-right" size={20} color="#cbd5e1" />
      </Pressable>
    );
  };

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      showsVerticalScrollIndicator={false}
      // Using standard style to prevent NativeWind ScrollView crash
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#ffffff" />}
    >
      {/* --- Dark Premium Header --- */}
      <View className="bg-brand-navy pt-16 pb-24 px-6 rounded-b-[40px]">
        <Text className="text-slate-400 text-sm font-medium uppercase tracking-widest mb-1">
          {getGreeting()}
        </Text>
        <Text className="text-white text-3xl font-bold tracking-tight">
          {user?.name?.split(' ')[0] || 'Customer'}
        </Text>
      </View>

      {/* --- Floating Network Status Card --- */}
      <View className="-mt-12 mx-5 bg-white p-5 rounded-3xl shadow-md border border-slate-100 flex-row items-center">
        <View className="w-12 h-12 rounded-full bg-emerald-50 items-center justify-center mr-4">
          <Feather name="globe" size={24} color="#10b981" />
        </View>
        <View className="flex-1">
          <Text className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">
            Network Status
          </Text>
          <Text className="text-base font-extrabold text-slate-900">
            {connections?.connections?.[0]?.serviceType || 'Fiber Connection'}
          </Text>
        </View>
        <View className="flex-row items-center bg-emerald-50 px-3 py-1.5 rounded-full">
          <View className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
          <Text className="text-xs font-bold text-emerald-700">Online</Text>
        </View>
      </View>

      {/* --- Big Action Banner --- */}
      <Pressable
        onPress={() => router.push('/(customer)/raise-ticket')}
        className="mx-5 mt-6 bg-blue-600 rounded-3xl p-6 overflow-hidden active:bg-blue-700 shadow-sm"
      >
        {/* Background decorative icon */}
        <Feather 
          name="life-buoy" 
          size={120} 
          color="rgba(255,255,255,0.07)" 
          style={{ position: 'absolute', right: -20, top: -20, transform: [{ rotate: '-15deg' }] }} 
        />
        <View className="flex-row items-center justify-between z-10">
          <View className="flex-1 pr-4">
            <Text className="text-white text-xl font-bold mb-1">Need assistance?</Text>
            <Text className="text-blue-100 text-sm leading-relaxed">
              Report an outage, speed issue, or general inquiry instantly.
            </Text>
          </View>
          <View className="w-12 h-12 bg-white rounded-full items-center justify-center shadow-sm">
            <Feather name="arrow-right" size={24} color="#2563eb" />
          </View>
        </View>
      </Pressable>

      {/* --- Active/Recent Tickets Section --- */}
      <View className="px-5 mt-8">
        <View className="flex-row justify-between items-end mb-4">
          <Text className="text-lg font-bold text-slate-900">
            {activeTickets.length > 0 ? 'Action Required' : 'Recent Support'}
          </Text>
          {(activeTickets.length > 0 || recentTickets.length > 0) && (
            <Pressable onPress={() => router.push('/(customer)/tickets')}>
              <Text className="text-sm font-bold text-slate-400">View All</Text>
            </Pressable>
          )}
        </View>

        {activeTickets.length > 0 ? (
          activeTickets.slice(0, 3).map((ticket) => (
            <TicketRow key={`active-${ticket.id}`} ticket={ticket} />
          ))
        ) : recentTickets.length > 0 ? (
          recentTickets.map((ticket) => (
            <TicketRow key={`recent-${ticket.id}`} ticket={ticket} />
          ))
        ) : (
          /* Empty State */
          <View className="bg-slate-100 rounded-3xl p-8 items-center border border-slate-200 border-dashed mt-2">
            <Feather name="check-circle" size={40} color="#94a3b8" className="mb-3" />
            <Text className="text-slate-900 font-bold text-base mb-1">You're all caught up</Text>
            <Text className="text-slate-500 text-sm text-center">
              No active support requests. Enjoy your seamless connection!
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}