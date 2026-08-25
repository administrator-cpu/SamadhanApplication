// // app/(customer)/index.js
// import { useMemo, useRef } from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   TouchableWithoutFeedback,
//   Animated,
//   ActivityIndicator,
//   RefreshControl,
// } from 'react-native';
// // import { LinearGradient } from 'expo-linear-gradient';
// import { useRouter } from 'expo-router';
// import { Feather } from '@expo/vector-icons';
// import { useAuthStore } from '../../src/store/authStore';
// import { useTickets } from '../../src/hooks/useTickets';
// import { useMyConnections } from '../../src/hooks/useCustomers';
// import { statusLabel } from '../../src/utils/ticketStatus';
// import TicketCard from '../../src/components/TicketCard';
// import LoadingState from '../../src/components/ui/LoadingState';
// import ErrorState from '../../src/components/ui/ErrorState';
// import StatCard from '../../src/components/ui/StatCard';

// const STATUS_THEME = {
//   OPEN: { icon: 'circle', iconBg: 'bg-info-bg', iconColor: '#0E8074', chipText: 'text-info-text' },
//   IN_PROGRESS: { icon: 'loader', iconBg: 'bg-primary-50', iconColor: '#FF5A36', chipText: 'text-primary-700' },
//   ESCALATED: { icon: 'alert-triangle', iconBg: 'bg-warning-bg', iconColor: '#D68A00', chipText: 'text-warning-text' },
//   RESOLVED: { icon: 'check-circle', iconBg: 'bg-success-bg', iconColor: '#0F9D58', chipText: 'text-success-text' },
//   CLOSED: { icon: 'archive', iconBg: 'bg-bg-subtle', iconColor: '#948A7C', chipText: 'text-text-tertiary' },
//   REOPENED: { icon: 'refresh-ccw', iconBg: 'bg-warning-bg', iconColor: '#D68A00', chipText: 'text-warning-text' },
// };

// function getGreeting() {
//   const hour = new Date().getHours();
//   if (hour < 12) return 'Good morning';
//   if (hour < 17) return 'Good afternoon';
//   return 'Good evening';
// }

// function firstName(fullName) {
//   if (!fullName) return 'there';
//   return fullName.trim().split(' ')[0];
// }

// /* ---------------------------------------------------------------- */
// /* AnimatedCard — unchanged                                          */
// /* ---------------------------------------------------------------- */

// function AnimatedCard({ onPress, className = '', style, children, disabled = false }) {
//   const scale = useRef(new Animated.Value(1)).current;

//   const animateTo = (toValue) => {
//     Animated.spring(scale, {
//       toValue,
//       useNativeDriver: true,
//       speed: 50,
//       bounciness: 6,
//     }).start();
//   };

//   return (
//     <TouchableWithoutFeedback
//       onPress={onPress}
//       onPressIn={() => animateTo(0.96)}
//       onPressOut={() => animateTo(1)}
//       disabled={disabled}
//     >
//       <Animated.View className={className} style={[{ transform: [{ scale }] }, style]}>
//         {children}
//       </Animated.View>
//     </TouchableWithoutFeedback>
//   );
// }


// function DashboardHeader({ name }) {
//   return (
//     <View
//       className="pt-14 pb-16 px-6 rounded-b-2xl"
//       style={{ backgroundColor: '#161412' }}
//     >
//       <Text className="font-sans-semibold text-primary-200 text-xs uppercase tracking-widest mb-1.5">
//         {getGreeting()}
//       </Text>
//       <Text className="font-sans-semibold text-text-on-brand text-2xl leading-8" numberOfLines={2}>
//         Hi {firstName(name)}, how can we help you today?
//       </Text>
//     </View>
//   );
// }
// /* ---------------------------------------------------------------- */
// /* Metric panel — ONE floating white surface, halves divided by a    */
// /* thin vertical rule, each half centered internally                 */
// /* ---------------------------------------------------------------- */

// function MetricHalf({ icon, iconColor, iconBg, label, value, showDivider }) {
//   return (
//     <View
//       className={`flex-1 items-center justify-center py-5 ${showDivider ? 'border-r border-border/40' : ''}`}
//     >
//       <View className={`w-9 h-9 rounded-full ${iconBg} items-center justify-center mb-2`}>
//         <Feather name={icon} size={15} color={iconColor} />
//       </View>
//       <Text className="font-sans-semibold text-text-primary text-xl mb-0.5" numberOfLines={1}>
//         {value}
//       </Text>
//       <Text className="font-sans text-text-tertiary text-xs" numberOfLines={1}>
//         {label}
//       </Text>
//     </View>
//   );
// }

// function MetricPanel({ activeCount, resolvedCount, totalCount }) {
//   const hasAnyTickets = totalCount > 0;
//   if (!hasAnyTickets) return null;

//   // Build the visible metric list dynamically so the divider only ever
//   // appears between two *rendered* halves, never dangling on an empty slot.
//   const metrics = [
//     activeCount > 0 && { key: 'active', icon: 'activity', iconColor: '#FF5A36', iconBg: 'bg-primary-50', label: 'Active', value: activeCount },
//     resolvedCount > 0 && { key: 'resolved', icon: 'check-circle', iconColor: '#0F9D58', iconBg: 'bg-success-bg', label: 'Resolved', value: resolvedCount },
//     { key: 'total', icon: 'folder', iconColor: '#0E8074', iconBg: 'bg-info-bg', label: 'All Tickets', value: totalCount },
//   ].filter(Boolean);

//   return (
//     <View className="-mt-9 px-5">
//       <View className="bg-surface rounded-xl shadow-lg border border-border/40 flex-row overflow-hidden">
//         {metrics.map(({ key, ...metricProps }, index) => (
//   <MetricHalf key={key} {...metricProps} showDivider={index < metrics.length - 1} />
// ))}
//       </View>
//     </View>
//   );
// }

// /* ---------------------------------------------------------------- */
// /* Network status                                                     */
// /* ---------------------------------------------------------------- */

// function NetworkStatusStrip({ serviceType }) {
//   return (
//     <View className="mx-5 mt-4 flex-row items-center bg-success-bg rounded-xl px-4 py-2.5 border border-success-text/10">
//       <View className="w-2 h-2 rounded-full bg-success-text shrink-0 mr-3" />
//       <Text className="flex-1 font-sans text-success-text text-xs" numberOfLines={1}>
//         {serviceType || 'Fiber Connection'} is online and stable
//       </Text>
//       <Feather name="wifi" size={14} color="#0F9D58" />
//     </View>
//   );
// }

// /* ---------------------------------------------------------------- */
// /* Raise Ticket                                                       */
// /* ---------------------------------------------------------------- */

// function RaiseTicketCard({ onPress }) {
//   return (
//     <AnimatedCard
//       onPress={onPress}
//       className="w-[48%] aspect-square rounded-2xl p-4 bg-primary-50 border border-primary-200/50 overflow-hidden"
//     >
//       <View className="absolute -top-6 -right-8 w-24 h-24 rounded-full bg-primary-100" />

//       <View className="flex-1 justify-between">
//         <View className="w-[40px] h-[40px] rounded-full bg-surface items-center justify-center shrink-0">
//           <Feather name="plus" size={18} color="#FF5A36" />
//         </View>

//         <Text className="font-sans-semibold text-text-primary text-sm" numberOfLines={2}>
//           Facing an issue?
//         </Text>

//         <View className="bg-primary-500 rounded-full px-3.5 py-2 flex-row items-center self-start shadow-sm">
//           <Text className="font-sans-semibold text-text-on-brand text-xs mr-1.5">Raise Ticket</Text>
//           <Feather name="arrow-up-right" size={12} color="#FFFFFF" />
//         </View>
//       </View>
//     </AnimatedCard>
//   );
// }

// /* ---------------------------------------------------------------- */
// /* Action grid                                                        */
// /* ---------------------------------------------------------------- */

// function ActionTile({ icon, iconBg, iconColor, label, subtitle, onPress }) {
//   return (
//     <AnimatedCard
//       onPress={onPress}
//       className="w-[48%] aspect-square rounded-2xl p-4 bg-surface shadow-sm border border-border/40"
//     >
//       <View className="flex-1 justify-between">
//         <View className={`w-[40px] h-[40px] rounded-full ${iconBg} items-center justify-center shrink-0`}>
//           <Feather name={icon} size={16} color={iconColor} />
//         </View>

//         <View>
//           <View className="flex-row items-center mb-0.5">
//             <Text className="font-sans-semibold text-text-primary text-sm flex-1" numberOfLines={1}>
//               {label}
//             </Text>
//             <Feather name="arrow-up-right" size={14} color="#948A7C" />
//           </View>
//           <Text className="font-sans text-text-tertiary text-xs" numberOfLines={1}>
//             {subtitle}
//           </Text>
//         </View>
//       </View>
//     </AnimatedCard>
//   );
// }

// function ActionGrid({ onRaiseTicket, onMyTickets, onGuidelines, onAnalytics }) {
//   return (
//     <View className="px-5 mt-6 flex-row flex-wrap justify-between" style={{ rowGap: 12 }}>
//       <RaiseTicketCard onPress={onRaiseTicket} />
//       <ActionTile
//         icon="file-text"
//         iconBg="bg-info-bg"
//         iconColor="#0E8074"
//         label="My Tickets"
//         subtitle="View history"
//         onPress={onMyTickets}
//       />
//       <ActionTile
//         icon="book-open"
//         iconBg="bg-secondary-50"
//         iconColor="#D6900A"
//         label="Guidelines"
//         subtitle="SLAs & FAQs"
//         onPress={onGuidelines}
//       />
//       <ActionTile
//         icon="bar-chart-2"
//         iconBg="bg-success-bg"
//         iconColor="#0F9D58"
//         label="Analytics"
//         subtitle="Network insights"
//         onPress={onAnalytics}
//       />
//     </View>
//   );
// }

// /* ---------------------------------------------------------------- */
// /* Ticket card                                                        */
// /* ---------------------------------------------------------------- */

// // function TicketCard({ ticket, onPress }) {
// //   const theme = STATUS_THEME[ticket.status] || STATUS_THEME.CLOSED;
// //   return (
// //     <AnimatedCard
// //       onPress={onPress}
// //       className="bg-surface rounded-2xl mb-3 p-4 shadow-sm border border-border/40 flex-row items-center"
// //     >
// //       <View className={`w-[44px] h-[44px] rounded-full ${theme.iconBg} items-center justify-center shrink-0 mr-3`}>
// //         <Feather name={theme.icon} size={18} color={theme.iconColor} />
// //       </View>

// //       <View className="flex-1 shrink mr-2">
// //         <View className="flex-row items-center justify-between mb-1">
// //           <Text className="font-mono text-mono-sm text-text-primary shrink" numberOfLines={1}>
// //             {ticket.ticket_no}
// //           </Text>
// //           <Text className={`font-sans-semibold text-xs uppercase tracking-wide shrink-0 ml-2 ${theme.chipText}`}>
// //             {statusLabel(ticket.status)}
// //           </Text>
// //         </View>
// //         <Text className="font-sans text-sm text-text-secondary" numberOfLines={1}>
// //           {ticket.circuit_description || 'General support request'}
// //         </Text>
// //       </View>

// //       <Feather name="chevron-right" size={18} color="#E0C4A0" />
// //     </AnimatedCard>
// //   );
// // }

// function EmptyTicketsState() {
//   return (
//     <View className="bg-surface rounded-2xl p-8 items-center shadow-sm border border-border/40 mt-2">
//       <View className="w-16 h-16 bg-secondary-50 rounded-full items-center justify-center mb-4">
//         <Feather name="coffee" size={26} color="#D6900A" />
//       </View>
//       <Text className="font-sans-semibold text-text-primary text-lg mb-1.5 text-center">
//         You're all caught up
//       </Text>
//       <Text className="font-sans text-text-secondary text-sm text-center leading-relaxed px-4">
//         No active support requests right now. Enjoy your seamless connection!
//       </Text>
//     </View>
//   );
// }

// /* ---------------------------------------------------------------- */
// /* Screen                                                             */
// /* ---------------------------------------------------------------- */

// export default function CustomerDashboard() {
//   const router = useRouter();
//   const user = useAuthStore((state) => state.user);

//   const { data, isLoading, isError, error, refetch, isRefetching } = useTickets({ statusGroup: undefined });
//   const { data: connections } = useMyConnections();

//   const allTickets = useMemo(() => data?.pages.flatMap((p) => p.tickets) ?? [], [data]);
//   const activeTickets = allTickets.filter((t) => ['OPEN', 'IN_PROGRESS', 'ESCALATED'].includes(t.status));
//   const resolvedTickets = allTickets.filter((t) => ['RESOLVED', 'CLOSED'].includes(t.status));
//   const recentTickets = allTickets.slice(0, 4);

//   if (isLoading) {
//     return <LoadingState label="Loading Dashboard..." />;
//   }

//   if (isError) {
//      return (
//       <ErrorState
//         title="Oops! Something went wrong."
//         message={error?.message || 'Failed to load dashboard stats.'}
//         onRetry={refetch}
//       />
//     );
//   }

//   const ticketsToShow = activeTickets.length > 0 ? activeTickets.slice(0, 3) : recentTickets;
//   const sectionTitle = activeTickets.length > 0 ? 'Action Required' : 'Recent Support';

//   return (
//     <ScrollView
//       className="flex-1 bg-bg-base"
//       showsVerticalScrollIndicator={false}
//       contentContainerStyle={{ paddingBottom: 60 }}
//       refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#FF5A36" />}
//     >
//       <DashboardHeader name={user?.name} />

//       <MetricPanel
//         activeCount={activeTickets.length}
//         resolvedCount={resolvedTickets.length}
//         totalCount={allTickets.length}
//       />

//       <NetworkStatusStrip serviceType={connections?.connections?.[0]?.serviceType} />

//       <ActionGrid
//         onRaiseTicket={() => router.push('/(customer)/raise-ticket')}
//         onMyTickets={() => router.push('/(customer)/tickets')}
//         onGuidelines={() => router.push('/(customer)/support-guidelines')}
//         onAnalytics={() => router.push('/(customer)/analytics')}
//       />

//       <View className="px-5 mt-8">
//         <View className="flex-row items-center justify-between mb-4">
//           <Text className="font-sans-semibold text-text-primary text-xl shrink" numberOfLines={1}>
//             {sectionTitle}
//           </Text>
//           {(activeTickets.length > 0 || recentTickets.length > 0) && (
//             <TouchableOpacity
//               activeOpacity={0.7}
//               onPress={() => router.push('/(customer)/tickets')}
//               className="px-2 py-1 shrink-0"
//             >
//               <Text className="font-sans-semibold text-primary-500 text-sm">View All</Text>
//             </TouchableOpacity>
//           )}
//         </View>

//         {ticketsToShow.length > 0 ? (
//           ticketsToShow.map((ticket) => (
//             <TicketCard
//               key={ticket.id}
//               ticket={ticket}
//               onPress={() => router.push(`/(customer)/tickets/${ticket.id}`)}
//               cutoutColor="#F8FAFC"
//             />
//           ))
//         ) : (
//           <EmptyTicketsState />
//         )}
//       </View>
//     </ScrollView>
//   );
// }

import { Stack } from 'expo-router';
import CustomerTicketListScreen from '../../src/components/CustomerTicketListScreen';

export default function CustomerDashboard() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <CustomerTicketListScreen/>
    </>
  );
}