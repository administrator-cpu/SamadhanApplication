// src/components/CustomerSettingsSheet.js
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(21,18,51,0.45)', justifyContent: 'flex-end' }}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={{
            backgroundColor: C.bg,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingTop: 10,
            paddingBottom: 32,
            maxHeight: '85%',
          }}
        >
          <View
            style={{ width: 40, height: 4, borderRadius: 999, backgroundColor: C.track, alignSelf: 'center', marginBottom: 16 }}
          />

          {/* Account summary */}
          <View style={{ paddingHorizontal: 20, marginBottom: 18 }}>
            <View className="flex-row items-center" style={{ gap: 12 }}>
              <View
                className="items-center justify-center"
                style={{ width: 48, height: 48, borderRadius: 999, backgroundColor: C.mint }}
              >
                <Feather name="user" size={20} color={C.mintInk2} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text className="font-sans-semibold" style={{ fontSize: 17, color: C.ink }} numberOfLines={1}>
                  {user?.name || 'Customer'}
                </Text>
                <Text className="font-sans" style={{ fontSize: 12, color: C.inkMuted, marginTop: 1 }} numberOfLines={1}>
                  {user?.email || user?.phone || ''}
                </Text>
              </View>
            </View>

            {/* Outstanding balance — only renders if a real number was passed in */}
            {outstandingAmount !== undefined && outstandingAmount !== null && (
              <View
                className="flex-row items-center justify-between"
                style={{
                  marginTop: 16,
                  backgroundColor: outstandingAmount > 0 ? C.marigold : C.mint,
                  borderRadius: 18,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                }}
              >
                <View>
                  <Text
                    className="font-sans-semibold"
                    style={{
                      fontSize: 10,
                      letterSpacing: 1,
                      textTransform: 'uppercase',
                      color: outstandingAmount > 0 ? C.marigoldInk2 : C.mintInk2,
                    }}
                  >
                    {outstandingLabel}
                  </Text>
                  <Text
                    className="font-sans-semibold"
                    style={{ fontSize: 22, marginTop: 3, color: outstandingAmount > 0 ? C.marigoldInk : C.mintInk }}
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
          <View style={{ paddingHorizontal: 20, gap: 4 }}>
            {NAV_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.key}
                onPress={() => goTo(item.path)}
                activeOpacity={0.8}
                className="flex-row items-center"
                style={{
                  backgroundColor: C.card,
                  borderRadius: 16,
                  paddingVertical: 13,
                  paddingHorizontal: 14,
                  gap: 12,
                  marginBottom: 6,
                }}
              >
                <View
                  className="items-center justify-center"
                  style={{ width: 34, height: 34, borderRadius: 999, backgroundColor: C.violetTint }}
                >
                  <NavIcon item={item} color={C.violetInk} size={16} />
                </View>
                <Text className="font-sans-medium" style={{ flex: 1, fontSize: 14, color: C.ink }}>
                  {item.label}
                </Text>
                <Feather name="chevron-right" size={16} color={C.inkFaint} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Logout */}
          <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
            <TouchableOpacity
              onPress={handleLogout}
              activeOpacity={0.85}
              className="flex-row items-center justify-center"
              style={{ backgroundColor: C.coral, borderRadius: 16, height: 48, gap: 8 }}
            >
              <Feather name="log-out" size={16} color="#FFFFFF" />
              <Text className="font-sans-semibold" style={{ fontSize: 14, color: '#FFFFFF' }}>
                Log Out
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}