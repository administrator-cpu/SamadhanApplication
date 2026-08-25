// app/(admin)/staff/create.js
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

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

const MONO = 'ui-monospace';

const SHADOW = {
  shadowColor: C.ink,
  shadowOpacity: 0.06,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
};

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
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 140, gap: 20 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text className="font-sans-semibold" style={{ fontSize: 10.5, letterSpacing: 1.2, color: C.violetDeep }}>
            TEAM
          </Text>
          <Text
            className="font-sans-bold"
            style={{ fontSize: 29, lineHeight: 33, letterSpacing: -0.7, color: C.ink, marginTop: 4 }}
          >
            Add staff
          </Text>
          <Text className="font-sans" style={{ fontSize: 12.5, lineHeight: 19, color: C.sub, marginTop: 7 }}>
            They get an email with a link to set their own password.
          </Text>
        </View>

        {error ? (
          <View style={{ backgroundColor: C.dangerBg, borderRadius: 16, padding: 13 }}>
            <Text className="font-sans-semibold" style={{ fontSize: 12, lineHeight: 17, color: C.dangerDeep }}>
              {error.message || 'Failed to create staff account.'}
            </Text>
          </View>
        ) : null}

        {/* role first — it decides whether categories exist at all */}
        <View style={{ gap: 9 }}>
          <Text
            className="font-sans-bold"
            style={{ fontSize: 13.5, letterSpacing: -0.3, color: C.ink, paddingHorizontal: 4 }}
          >
            Role
          </Text>
          {ROLES.map((r) => {
            const on = role === r.value;
            return (
              <Pressable key={r.value} onPress={() => setRole(r.value)}>
                <View
                  style={[
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      backgroundColor: on ? C.ink : C.card,
                      borderRadius: 18,
                      paddingHorizontal: 15,
                      paddingVertical: 14,
                    },
                    SHADOW,
                  ]}
                >
                  <Feather name="check-circle" size={20} color={on ? C.violet : C.off} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      className="font-sans-bold"
                      style={{ fontSize: 13.5, letterSpacing: -0.3, color: on ? C.bg : C.ink }}
                    >
                      {r.title}
                    </Text>
                    <Text
                      className="font-sans"
                      style={{ fontSize: 11.5, color: on ? C.headMuted : C.sub, marginTop: 2 }}
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
        <View style={[{ backgroundColor: C.card, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 6 }, SHADOW]}>
          <View style={{ paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.hair }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <Text
                className="font-sans-semibold"
                style={{ fontSize: 10, letterSpacing: 1.2, color: focused === 'name' ? C.violet : C.muted }}
              >
                FULL NAME
              </Text>
              {showNameError && (
                <Text className="font-sans-semibold" style={{ fontSize: 10, color: C.dangerInk }}>
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
              className="font-sans-semibold"
              style={{ marginTop: 4, fontSize: 15, letterSpacing: -0.2, color: C.ink, paddingVertical: 0 }}
            />
          </View>

          <View style={{ paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.hair }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <Text
                className="font-sans-semibold"
                style={{ fontSize: 10, letterSpacing: 1.2, color: focused === 'email' ? C.violet : C.muted }}
              >
                EMAIL
              </Text>
              {showEmailError && (
                <Text className="font-sans-semibold" style={{ fontSize: 10, color: C.dangerInk }}>
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
              className="font-sans"
              style={{ marginTop: 4, fontSize: 15, color: C.ink, paddingVertical: 0 }}
            />
          </View>

          <View style={{ paddingVertical: 13 }}>
            <Text
              className="font-sans-semibold"
              style={{ fontSize: 10, letterSpacing: 1.2, color: focused === 'phone' ? C.violet : C.muted }}
            >
              PHONE <Text className="font-sans" style={{ letterSpacing: 0, fontSize: 10 }}>— optional</Text>
            </Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              onFocus={() => setFocused('phone')}
              onBlur={() => setFocused(null)}
              placeholder="Not set"
              placeholderTextColor={C.muted}
              keyboardType="phone-pad"
              style={{ marginTop: 4, fontFamily: MONO, fontSize: 15, color: C.ink, paddingVertical: 0 }}
            />
          </View>
        </View>

        {/* categories = routing, agents only */}
        {isAgent && (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 4 }}>
              <Text className="font-sans-bold" style={{ fontSize: 13.5, letterSpacing: -0.3, color: C.ink }}>
                Ticket categories
              </Text>
              <Text style={{ fontFamily: MONO, fontSize: 11, color: C.sub }}>
                {selectedCategories.length} of {(categories || []).length}
              </Text>
            </View>

            <Text className="font-sans" style={{ paddingHorizontal: 4, fontSize: 11.5, lineHeight: 17, color: C.sub }}>
              Pick at least one — an agent with no category never receives a ticket.
            </Text>

            <View style={{ gap: 7 }}>
              {(categories || []).map((cat) => {
                const on = selectedCategories.includes(cat.name);
                return (
                  <Pressable key={cat.id} onPress={() => toggleCategory(cat.name)}>
                    <View
                      style={[
                        {
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 11,
                          backgroundColor: on ? C.ink : C.card,
                          borderRadius: 16,
                          paddingHorizontal: 14,
                          paddingVertical: 13,
                        },
                        SHADOW,
                      ]}
                    >
                      <Feather name="check-circle" size={19} color={on ? C.violet : C.off} />
                      <Text
                        className="font-sans-semibold"
                        style={{ flex: 1, fontSize: 13.5, letterSpacing: -0.15, color: on ? C.bg : C.inkSoft }}
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
      </ScrollView>

      {/* what is still missing */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28, backgroundColor: C.bg }}>
        <Pressable onPress={handleSubmit} disabled={!ready || isPending}>
          <View
            style={{
              backgroundColor: ready ? C.ink : C.idle,
              borderRadius: 999,
              minHeight: 52,
              paddingHorizontal: 20,
              paddingVertical: 12,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: C.ink,
              shadowOpacity: ready ? 0.14 : 0,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 6 },
              elevation: ready ? 3 : 0,
            }}
          >
            {isPending ? (
              <ActivityIndicator color={C.bg} />
            ) : (
              <Text
                className="font-sans-bold"
                numberOfLines={2}
                style={{ fontSize: 14, lineHeight: 19, letterSpacing: -0.15, textAlign: 'center', color: ready ? C.bg : C.muted }}
              >
                {ready ? 'Create account & send invite' : `Still needs ${missingLabel}`}
              </Text>
            )}
          </View>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
