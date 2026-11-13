// app/(admin)/staff/create.js
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Screen, { ScreenScrollView, StickyFooter } from '../../../src/components/layout/Screen';

import { useCreateEmployee } from '../../../src/hooks/useCustomers';
import { useCategories } from '../../../src/hooks/useTickets';

const C = {
  bg: '#f3f2fd',
  card: '#ffffff',
  ink: '#151233',
  inkSoft: '#3a3670',
  sub: '#6d6a96',
  muted: '#9d9ac0',
  hair: '#f0eefb',
  violet: '#8f7bff',
  violetDeep: '#4a34c7',
  headMuted: '#a09cd8',
  off: '#dedbf5',
  idle: '#e6e3f7',
  dangerBg: '#ffe1e1',
  dangerInk: '#b3261e',
  dangerDeep: '#7a1c16',
};

// Submit bar (52 + 24 padding) + breathing room.
const SUBMIT_BAR_SPACE = 100;

const ROLES = [
  { value: 'SUPPORT_AGENT', title: 'Support agent', note: 'Receives and resolves tickets' },
  { value: 'ADMIN', title: 'Admin', note: 'Full access, no ticket queue' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CreateStaff() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('SUPPORT_AGENT');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [focused, setFocused] = useState(null);
  const [touched, setTouched] = useState({});

  const { mutate, isPending, error } = useCreateEmployee();
  const { data: categories } = useCategories();

  const isAgent = role === 'SUPPORT_AGENT';
  const nameOk = name.trim().length >= 2;
  const emailOk = EMAIL_RE.test(email.trim());

  // the bar names what is missing instead of sitting bright and dead
  const missing = useMemo(() => {
    const list = [];
    if (!nameOk) list.push('a name');
    if (!emailOk) list.push('a valid email');
    if (isAgent && selectedCategories.length === 0) list.push('at least one category');
    return list;
  }, [nameOk, emailOk, isAgent, selectedCategories.length]);

  const ready = missing.length === 0;

  const missingLabel =
    missing.length <= 1
      ? missing[0]
      : `${missing.slice(0, -1).join(', ')} and ${missing[missing.length - 1]}`;

  const toggleCategory = (catName) => {
    setSelectedCategories((prev) =>
      prev.includes(catName) ? prev.filter((c) => c !== catName) : [...prev, catName]
    );
  };

  const handleSubmit = () => {
    if (!ready) return;
    mutate(
      {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        role,
        issueCategories: isAgent ? selectedCategories : undefined,
      },
      {
        onSuccess: () => {
          Alert.alert('Success', 'Staff account created. A welcome email has been sent.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
        },
      }
    );
  };

  const showNameError = touched.name && name.length > 0 && !nameOk;
  const showEmailError = touched.email && email.length > 0 && !emailOk;

  return (
    <Screen className="bg-[#f3f2fd]">
      <ScreenScrollView
        className="flex-1"
        keyboard
        keyboardOffset={SUBMIT_BAR_SPACE}
        endSpace={SUBMIT_BAR_SPACE}
        contentContainerClassName="px-[12px] std:px-[16px] pt-[12px] gap-[20px]"
      >
        <View>
          <Text className="font-sans-semibold text-[10.5px] tracking-[1.2px] text-[#4a34c7]">
            TEAM
          </Text>
          <Text
            className="font-sans-bold text-[29px] leading-[33px] tracking-[-0.7px] text-[#151233] mt-[4px]"
          >
            Add staff
          </Text>
          <Text className="font-sans text-[12.5px] leading-[19px] text-[#6d6a96] mt-[7px]">
            They get an email with a link to set their own password.
          </Text>
        </View>

        {error ? (
          <View className="bg-[#ffe1e1] rounded-[16px] p-[13px]">
            <Text className="font-sans-semibold text-[12px] leading-[17px] text-[#7a1c16]">
              {error.message || 'Failed to create staff account.'}
            </Text>
          </View>
        ) : null}

        {/* role first — it decides whether categories exist at all */}
        <View className="gap-[9px]">
          <Text
            className="font-sans-bold text-[13.5px] tracking-[-0.3px] text-[#151233] px-[4px]"
          >
            Role
          </Text>
          {ROLES.map((r) => {
            const on = role === r.value;
            return (
              <Pressable key={r.value} onPress={() => setRole(r.value)}>
                <View
                  className={`flex-row items-center gap-[12px] rounded-[18px] px-[15px] py-[14px] ${on ? 'bg-[#151233]' : 'bg-[#ffffff]'}`}
                  style={styles.shadow}
                >
                  <Feather name="check-circle" size={20} color={on ? C.violet : C.off} />
                  <View className="flex-1 min-w-0">
                    <Text
                      className={`font-sans-bold text-[13.5px] tracking-[-0.3px] ${on ? 'text-[#f3f2fd]' : 'text-[#151233]'}`}
                    >
                      {r.title}
                    </Text>
                    <Text
                      className={`font-sans text-[11.5px] mt-[2px] ${on ? 'text-[#a09cd8]' : 'text-[#6d6a96]'}`}
                    >
                      {r.note}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* details */}
        <View className="bg-[#ffffff] rounded-[24px] px-[12px] std:px-[16px] py-[6px]" style={styles.shadow}>
          <View className="py-[13px] border-b border-b-[#f0eefb]">
            <View className="flex-row items-baseline justify-between">
              <Text
                className={`font-sans-semibold text-[10px] tracking-[1.2px] ${focused === 'name' ? 'text-[#8f7bff]' : 'text-[#9d9ac0]'}`}
              >
                FULL NAME
              </Text>
              {showNameError && (
                <Text className="font-sans-semibold text-[10px] text-[#b3261e]">
                  Too short
                </Text>
              )}
            </View>
            <TextInput
              value={name}
              onChangeText={setName}
              onFocus={() => setFocused('name')}
              onBlur={() => {
                setFocused(null);
                setTouched((t) => ({ ...t, name: true }));
              }}
              placeholder="Agent name"
              placeholderTextColor={C.muted}
              className="font-sans-semibold mt-[4px] text-[15px] tracking-[-0.2px] text-[#151233] py-0"
            />
          </View>

          <View className="py-[13px] border-b border-b-[#f0eefb]">
            <View className="flex-row items-baseline justify-between">
              <Text
                className={`font-sans-semibold text-[10px] tracking-[1.2px] ${focused === 'email' ? 'text-[#8f7bff]' : 'text-[#9d9ac0]'}`}
              >
                EMAIL
              </Text>
              {showEmailError && (
                <Text className="font-sans-semibold text-[10px] text-[#b3261e]">
                  Not a valid email
                </Text>
              )}
            </View>
            <TextInput
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocused('email')}
              onBlur={() => {
                setFocused(null);
                setTouched((t) => ({ ...t, email: true }));
              }}
              placeholder="name@fab5network.com"
              placeholderTextColor={C.muted}
              autoCapitalize="none"
              keyboardType="email-address"
              className="font-sans mt-[4px] text-[15px] text-[#151233] py-0"
            />
          </View>

          <View className="py-[13px]">
            <Text
              className={`font-sans-semibold text-[10px] tracking-[1.2px] ${focused === 'phone' ? 'text-[#8f7bff]' : 'text-[#9d9ac0]'}`}
            >
              PHONE <Text className="font-sans tracking-[0px] text-[10px]">— optional</Text>
            </Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              onFocus={() => setFocused('phone')}
              onBlur={() => setFocused(null)}
              placeholder="Not set"
              placeholderTextColor={C.muted}
              keyboardType="phone-pad"
              className="mt-[4px] font-[ui-monospace] text-[15px] text-[#151233] py-0"
            />
          </View>
        </View>

        {/* categories = routing, agents only */}
        {isAgent && (
          <View className="gap-[10px]">
            <View className="flex-row items-baseline justify-between px-[4px]">
              <Text className="font-sans-bold text-[13.5px] tracking-[-0.3px] text-[#151233]">
                Ticket categories
              </Text>
              <Text className="font-[ui-monospace] text-[11px] text-[#6d6a96]">
                {selectedCategories.length} of {(categories || []).length}
              </Text>
            </View>

            <Text className="font-sans px-[4px] text-[11.5px] leading-[17px] text-[#6d6a96]">
              Pick at least one — an agent with no category never receives a ticket.
            </Text>

            <View className="gap-[7px]">
              {(categories || []).map((cat) => {
                const on = selectedCategories.includes(cat.name);
                return (
                  <Pressable key={cat.id} onPress={() => toggleCategory(cat.name)}>
                    <View
                      className={`flex-row items-center gap-[11px] rounded-[16px] px-[14px] py-[13px] ${on ? 'bg-[#151233]' : 'bg-[#ffffff]'}`}
                      style={styles.shadow}
                    >
                      <Feather name="check-circle" size={19} color={on ? C.violet : C.off} />
                      <Text
                        className={`font-sans-semibold flex-1 text-[13.5px] tracking-[-0.15px] ${on ? 'text-[#f3f2fd]' : 'text-[#3a3670]'}`}
                      >
                        {cat.name}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </ScreenScrollView>

      {/* what is still missing */}
      <StickyFooter gap={0} className="px-[12px] std:px-[16px] pt-[12px] pb-[12px] bg-[#f3f2fd]">
        <Pressable onPress={handleSubmit} disabled={!ready || isPending}>
          <View
            className={`rounded-[999px] min-h-[52px] px-[16px] std:px-[20px] py-[12px] items-center justify-center ${ready ? 'bg-[#151233]' : 'bg-[#e6e3f7]'}`}
            style={ready ? styles.submitShadow : undefined}
          >
            {isPending ? (
              <ActivityIndicator color={C.bg} />
            ) : (
              <Text
                className={`font-sans-bold text-[14px] leading-[19px] tracking-[-0.15px] text-center ${ready ? 'text-[#f3f2fd]' : 'text-[#9d9ac0]'}`}
                numberOfLines={2}
              >
                {ready ? 'Create account & send invite' : `Still needs ${missingLabel}`}
              </Text>
            )}
          </View>
        </Pressable>
      </StickyFooter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: C.ink,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  submitShadow: {
    shadowColor: C.ink,
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
});
