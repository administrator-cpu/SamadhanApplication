// app/(admin)/staff/[id].js
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import ConfirmDialog from '../../../src/components/ConfirmDialog';
import { useDeleteEmployee, useEmployees, useUpdateEmployee } from '../../../src/hooks/useCustomers';
import { useCategories } from '../../../src/hooks/useTickets';

const C = {
  bg: '#f3f2fd',
  card: '#ffffff',
  ink: '#151233',
  inkSoft: '#3a3670',
  sub: '#6d6a96',
  muted: '#9d9ac0',
  hair: '#f0eefb',
  headSurface: '#2b2359',
  headChip: '#3a2f7a',
  headInk: '#c9bfff',
  headMuted: '#7c78b8',
  violet: '#8f7bff',
  violetPale: '#b6a9ff',
  idle: '#e6e3f7',
  dangerBg: '#ffe1e1',
  dangerInk: '#b3261e',
  dangerDeep: '#7a1c16',
  coralSoft: '#ff9d8f',
};

const MONO = 'ui-monospace';

const ROLE_LABELS = {
  SUPPORT_AGENT: 'Support agent',
  SALES: 'Sales',
  ADMIN: 'Admin',
  SUPER_ADMIN: 'Admin',
};

const getInitials = (name) =>
  (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('') || '?';

const joinedLabel = (iso) => {
  if (!iso) return '';
  const d = new Date(String(iso).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return '';
  return `Joined ${d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`;
};

const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

export default function EditStaff() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const navigation = useNavigation();

  const { data } = useEmployees({ page: 1, limit: 100 });
  const employee = (data?.employees || []).find((e) => String(e.employee_row_id) === String(id));

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [focused, setFocused] = useState(null);

  const { data: categories } = useCategories();
  const { mutate: updateEmployee, isPending: isUpdating, error: updateError } = useUpdateEmployee(id);
  const { mutate: deleteEmployee, isPending: isDeleting } = useDeleteEmployee();

  useEffect(() => {
    if (employee) {
      setName(employee.name || '');
      setEmail(employee.email || '');
      setPhone(employee.phone || '');
      setSelectedCategories((employee.categories || []).map((c) => c.name));
    }
  }, [employee]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: employee?.name || 'Staff',
      headerShadowVisible: false,
      headerStyle: { backgroundColor: C.ink },
      headerTintColor: C.bg,
      headerTitleStyle: { color: C.bg, fontSize: 16 },
    });
  }, [employee?.name, navigation]);

  const isAgent = employee?.role === 'SUPPORT_AGENT';

  // what actually changed — the save button says it out loud
  const changes = useMemo(() => {
    if (!employee) return [];
    const list = [];
    if (name.trim() !== (employee.name || '')) list.push('name');
    if (email.trim().toLowerCase() !== (employee.email || '').toLowerCase()) list.push('email');
    if (phone.trim() !== (employee.phone || '')) list.push('phone');
    if (isAgent && !sameSet(selectedCategories, (employee.categories || []).map((c) => c.name))) {
      list.push('categories');
    }
    return list;
  }, [employee, name, email, phone, selectedCategories, isAgent]);

  const dirty = changes.length > 0;
  const noCategories = isAgent && selectedCategories.length === 0;

  if (!employee) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#4a34c7" />
      </View>
    );
  }

  const toggleCategory = (catName) => {
    setSelectedCategories((prev) =>
      prev.includes(catName) ? prev.filter((c) => c !== catName) : [...prev, catName]
    );
  };

  const handleSave = () => {
    updateEmployee(
      {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        issueCategories: isAgent ? selectedCategories : undefined,
      },
      {
        onSuccess: () => {
          Alert.alert('Saved', 'Staff details updated successfully.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
        },
      }
    );
  };

  const handleDelete = () => {
    setDeleteDialogOpen(false);
    deleteEmployee(id, {
      onSuccess: () => router.back(),
      onError: (err) => Alert.alert('Error', err.message || 'Failed to delete staff member.'),
    });
  };

  const Field = ({ label, value, onChangeText, keyboardType, autoCapitalize, mono, placeholder, last, fieldKey }) => (
    <View style={{ paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: C.hair }}>
      <Text
        className="font-sans-semibold"
        style={{ fontSize: 10, letterSpacing: 1.2, color: focused === fieldKey ? C.violet : C.muted }}
      >
        {label.toUpperCase()}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(fieldKey)}
        onBlur={() => setFocused(null)}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        className={mono ? undefined : 'font-sans-semibold'}
        style={{
          marginTop: 4,
          fontSize: 15,
          color: C.ink,
          paddingVertical: 0,
          letterSpacing: -0.2,
          ...(mono ? { fontFamily: MONO } : null),
        }}
      />
    </View>
  );

  const saveLabel = isUpdating
    ? null
    : !dirty
    ? 'No changes yet'
    : `Save ${changes.join(', ')}`;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 140 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* identity */}
        <View
          style={{
            backgroundColor: C.ink,
            paddingHorizontal: 20,
            paddingTop: 58,
            paddingBottom: 22,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View
              style={{
                width: 62,
                height: 62,
                borderRadius: 22,
                backgroundColor: C.headSurface,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {employee.profile_image ? (
                <Image source={{ uri: employee.profile_image }} style={{ width: 62, height: 62 }} />
              ) : (
                <Text className="font-sans-bold" style={{ fontSize: 24, letterSpacing: -0.5, color: C.violetPale }}>
                  {getInitials(employee.name)}
                </Text>
              )}
            </View>

            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                className="font-sans-bold"
                numberOfLines={1}
                style={{ fontSize: 22, letterSpacing: -0.7, color: C.bg }}
              >
                {name || employee.name}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <View style={{ backgroundColor: C.headChip, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
                  <Text className="font-sans-bold" style={{ fontSize: 10, letterSpacing: 0.4, color: C.headInk }}>
                    {ROLE_LABELS[employee.role] || employee.role}
                  </Text>
                </View>
                <Text style={{ fontFamily: MONO, fontSize: 10.5, color: C.headMuted }}>
                  {employee.employee_id}
                </Text>
              </View>
            </View>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 18,
              paddingTop: 14,
              borderTopWidth: 1,
              borderTopColor: 'rgba(255,255,255,0.09)',
            }}
          >
            <Text
              className="font-sans-semibold"
              style={{ flex: 1, fontSize: 11.5, color: noCategories ? C.coralSoft : C.headMuted }}
            >
              {isAgent
                ? noCategories
                  ? 'No tickets can route to this agent'
                  : `Receives tickets in ${selectedCategories.length} ${
                      selectedCategories.length === 1 ? 'category' : 'categories'
                    }`
                : 'Sales — not in the ticket routing pool'}
            </Text>
            <Text className="font-sans" style={{ fontSize: 11, color: C.headMuted }}>
              {joinedLabel(employee.joined_at)}
            </Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 18, gap: 18 }}>
          {updateError ? (
            <View style={{ backgroundColor: C.dangerBg, borderRadius: 16, padding: 13 }}>
              <Text className="font-sans-semibold" style={{ fontSize: 12, lineHeight: 17, color: C.dangerDeep }}>
                {updateError.message || 'Failed to save changes.'}
              </Text>
            </View>
          ) : null}

          {/* details */}
          <View
            style={{
              backgroundColor: C.card,
              borderRadius: 24,
              paddingHorizontal: 16,
              paddingVertical: 6,
              shadowColor: C.ink,
              shadowOpacity: 0.06,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 6 },
              elevation: 2,
            }}
          >
            <Field fieldKey="name" label="Full name" value={name} onChangeText={setName} />
            <Field
              fieldKey="email"
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Field
              fieldKey="phone"
              label="Phone"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="Not set"
              mono
              last
            />
          </View>

          {/* categories = routing */}
          {isAgent && (
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 4 }}>
                <Text className="font-sans-bold" style={{ fontSize: 14, letterSpacing: -0.3, color: C.ink }}>
                  Ticket categories
                </Text>
                <Text style={{ fontFamily: MONO, fontSize: 11, color: C.sub }}>
                  {selectedCategories.length} of {(categories || []).length}
                </Text>
              </View>

              <Text
                className="font-sans"
                style={{ paddingHorizontal: 4, fontSize: 11.5, lineHeight: 17, color: C.sub }}
              >
                Tickets in a selected category can be assigned to this agent. Unselected categories never reach them.
              </Text>

              {noCategories && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    backgroundColor: C.dangerBg,
                    borderRadius: 18,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                  }}
                >
                  <Feather name="alert-triangle" size={16} color={C.dangerInk} />
                  <Text className="font-sans-bold" style={{ flex: 1, fontSize: 11.5, lineHeight: 16, color: C.dangerDeep }}>
                    With none selected this agent is invisible to routing.
                  </Text>
                </View>
              )}

              <View style={{ gap: 7 }}>
                {(categories || []).map((cat) => {
                  const on = selectedCategories.includes(cat.name);
                  return (
                    <Pressable key={cat.id} onPress={() => toggleCategory(cat.name)}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 11,
                          backgroundColor: on ? C.ink : C.card,
                          borderRadius: 16,
                          paddingHorizontal: 14,
                          paddingVertical: 13,
                          shadowColor: C.ink,
                          shadowOpacity: 0.06,
                          shadowRadius: 12,
                          shadowOffset: { width: 0, height: 5 },
                          elevation: 1,
                        }}
                      >
                        <Feather name="check-circle" size={19} color={on ? C.violet : '#dedbf5'} />
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

          {/* remove */}
          <Pressable onPress={() => setDeleteDialogOpen(true)} disabled={isDeleting}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: 14,
                opacity: isDeleting ? 0.5 : 1,
              }}
            >
              {isDeleting ? (
                <ActivityIndicator color={C.dangerInk} />
              ) : (
                <>
                  <Feather name="trash-2" size={15} color={C.dangerInk} />
                  <Text className="font-sans-bold" style={{ fontSize: 12.5, color: C.dangerInk }}>
                    Remove from team
                  </Text>
                </>
              )}
            </View>
          </Pressable>
        </View>
      </ScrollView>

      {/* save bar */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28, backgroundColor: C.bg }}>
        <Pressable onPress={handleSave} disabled={!dirty || isUpdating}>
          <View
            style={{
              backgroundColor: dirty ? C.ink : C.idle,
              borderRadius: 999,
              minHeight: 52,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: C.ink,
              shadowOpacity: dirty ? 0.14 : 0,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 6 },
              elevation: dirty ? 3 : 0,
            }}
          >
            {isUpdating ? (
              <ActivityIndicator color={C.bg} />
            ) : (
              <Text
                className="font-sans-bold"
                numberOfLines={1}
                style={{ fontSize: 14, letterSpacing: -0.15, color: dirty ? C.bg : C.muted }}
              >
                {saveLabel}
              </Text>
            )}
          </View>
        </Pressable>
      </View>

      <ConfirmDialog
        visible={deleteDialogOpen}
        title="Delete Staff Member"
        message={`This will permanently delete ${employee.name}'s account. This cannot be undone.`}
        icon="trash-2"
        accentColor={C.dangerInk}
        destructive
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </KeyboardAvoidingView>
  );
}
