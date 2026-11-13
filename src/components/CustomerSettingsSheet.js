// src/components/CustomerSettingsSheet.js
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Sheet from './layout/Sheet';
import { C } from './TicketCard';
import { useAuthStore } from '../store/authStore';
import { userService } from '../api/userService';
import { useEffect, useState } from 'react';

// One central place listing every customer-facing destination — add a
// new screen to the customer folder, add one entry here, and it shows
// up in the sheet automatically instead of needing a new nav affordance
// hunted down elsewhere in the app.
const NAV_ITEMS = [
  { key: 'profile', label: 'My Profile', icon: 'user', path: '/(customer)/profile', iconSet: 'Feather' },
  { key: 'tickets', label: 'My Tickets', icon: 'file-text', path: '/(customer)/tickets', iconSet: 'Feather' },
  { key: 'raise-ticket', label: 'Raise a Request', icon: 'plus-circle', path: '/(customer)/raise-ticket', iconSet: 'Feather' },
  { key: 'connections', label: 'My Connections', icon: 'wifi-outline', path: '/(customer)/connections', iconSet: 'Ionicons' },
  { key: 'analytics', label: 'Usage & Analytics', icon: 'bar-chart-outline', path: '/(customer)/analytics', iconSet: 'Ionicons' },
  { key: 'support-guidelines', label: 'Support Guidelines', icon: 'book-open', path: '/(customer)/support-guidelines', iconSet: 'Feather' },
];

function NavIcon({ item, color = C.ink, size = 18 }) {
  if (item.iconSet === 'Ionicons') return <Ionicons name={item.icon} size={size} color={color} />;
  return <Feather name={item.icon} size={size} color={color} />;
}

/**
 * @param {boolean} visible
 * @param {function} onClose
 * @param {number} [outstandingAmount] 
 * @param {string} [outstandingLabel] - e.g. "Outstanding Balance" — only
 */
export default function CustomerSettingsSheet({
  visible,
  onClose,
  outstandingLabel = 'Outstanding Balance',
}) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [outstandingAmount,setOutstandingAmount]=useState("")
  const isCustomer=user?.role=="USER"
  
  const fatchOutstandingAmount= async ()=>{
    try{
       const outstanding= await userService.getOutstandingAmount()
       setOutstandingAmount(outstanding?.outstandingBalance)
    }catch(err){
        setOutstandingAmount(null)
    }
  }

  useEffect(()=>{
    fatchOutstandingAmount()
  },[user])

  const goTo = (path) => {
    onClose();
    router.push(path);
  };

  const handleLogout = () => {
    onClose();
    logout();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      animationType="fade"
      keyboard={false}
      backdropClassName="bg-[rgba(21,18,51,0.45)]"
      className="rounded-tl-[28px] rounded-tr-[28px] pt-[10px] bg-[#F3F2FD]"
    >
          <View
            className="w-[40px] h-[4px] rounded-[999px] self-center mb-[16px] bg-[#EBE8FF]"
          />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-[20px]">

          {/* Account summary */}
          <View className="px-[16px] std:px-[20px] mb-[18px]">
            <View className="flex-row items-center gap-[12px]">
              <View
                className="items-center justify-center w-[48px] h-[48px] rounded-[999px] bg-[#CCF7E4]"
              >
                <Feather name="user" size={20} color={C.mintInk2} />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="font-sans-semibold text-[17px] text-[#151233]" numberOfLines={1}>
                  {user?.name || 'Customer'}
                </Text>
                <Text className="font-sans text-[12px] mt-[1px] text-[#6D6A96]" numberOfLines={1}>
                  {user?.email || user?.phone || ''}
                </Text>
              </View>
            </View>

            {/* Outstanding balance — only renders if a real number was passed in */}
            {outstandingAmount !== undefined && outstandingAmount !== null && (
              <View
                className={`flex-row items-center justify-between mt-[16px] rounded-[18px] px-[12px] std:px-[16px] py-[14px] ${outstandingAmount > 0 ? 'bg-[#FFD166]' : 'bg-[#CCF7E4]'}`}
              >
                <View>
                  <Text
                    className={`font-sans-semibold text-[10px] tracking-[1px] uppercase ${outstandingAmount > 0 ? 'text-[#7A5200]' : 'text-[#0F7A56]'}`}
                  >
                    {outstandingLabel}
                  </Text>
                  <Text
                    className={`font-sans-semibold text-[22px] mt-[3px] ${outstandingAmount > 0 ? 'text-[#6B4800]' : 'text-[#0D6B4B]'}`}
                  >
                    ₹{Number(outstandingAmount).toLocaleString('en-IN')}
                  </Text>
                </View>
                {outstandingAmount > 0 && (
                  <Feather name="alert-circle" size={20} color={C.marigoldInk} />
                )}
              </View>
            )}
          </View>

          {/* Navigation list */}
          <View className="px-[16px] std:px-[20px] gap-[4px]">
            {NAV_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.key}
                onPress={() => goTo(item.path)}
                activeOpacity={0.8}
                className="flex-row items-center rounded-[16px] py-[13px] px-[14px] gap-[12px] mb-[6px] bg-[#FFFFFF]"
              >
                <View
                  className="items-center justify-center w-[34px] h-[34px] rounded-[999px] bg-[#EBE8FF]"
                >
                  <NavIcon item={item} color={C.violetInk} size={16} />
                </View>
                <Text className="font-sans-medium flex-1 text-[14px] text-[#151233]">
                  {item.label}
                </Text>
                <Feather name="chevron-right" size={16} color={C.inkFaint} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Logout */}
          <View className="px-[16px] std:px-[20px] mt-[10px]">
            <TouchableOpacity
              onPress={handleLogout}
              activeOpacity={0.85}
              className="flex-row items-center justify-center rounded-[16px] h-[48px] gap-[8px] bg-[#C2410C]"
            >
              <Feather name="log-out" size={16} color="#FFFFFF" />
              <Text className="font-sans-semibold text-[14px] text-[#FFFFFF]">
                Log Out
              </Text>
            </TouchableOpacity>
          </View>
          </ScrollView>
    </Sheet>
  );
}