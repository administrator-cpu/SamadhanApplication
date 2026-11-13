// app/(admin)/staff/[id].js
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  Text,
  TextInput,
  View, StyleSheet,
} from 'react-native';

import ConfirmDialog from '../../../src/components/ConfirmDialog';
import Screen, { ScreenScrollView, StickyFooter, TopInset } from '../../../src/components/layout/Screen';

// Save bar (52 + 24 padding) + breathing room.
const SAVE_BAR_SPACE = 100;
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
      <View className="flex-1 bg-[#f3f2fd] items-center justify-center">
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
    <View className={`py-[12px] border-b-[#f0eefb] ${last ? 'border-b-0' : 'border-b'}`}>
      <Text
        className={`font-sans-semibold text-[10px] tracking-[1.2px] ${focused === fieldKey ? 'text-[#8f7bff]' : 'text-[#9d9ac0]'}`}
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
        className={`mt-[4px] text-[15px] text-[#151233] py-0 tracking-[-0.2px] ${mono ? 'font-[ui-monospace]' : 'font-sans-semibold'}`}
      />
    </View>
  );

  const saveLabel = isUpdating
    ? null
    : !dirty
    ? 'No changes yet'
    : `Save ${changes.join(', ')}`;

  return (
    <Screen edges={[]} statusBarStyle="light" className="bg-[#f3f2fd]">
      <ScreenScrollView
        className="flex-1"
        keyboard
        keyboardOffset={SAVE_BAR_SPACE}
        endSpace={SAVE_BAR_SPACE}
      >
        {/* identity — dark header runs under the status bar */}
        <TopInset
          extra={16}
          className="bg-[#151233] px-[16px] std:px-[20px] pb-[22px] rounded-bl-[32px] rounded-br-[32px]"
        >
          <View className="flex-row items-center gap-[14px]">
            <View
              className="w-[62px] h-[62px] rounded-[22px] bg-[#2b2359] items-center justify-center overflow-hidden"
            >
              {employee.profile_image ? (
                <Image source={{ uri: employee.profile_image }} className="w-[62px] h-[62px]" />
              ) : (
                <Text className="font-sans-bold text-[24px] tracking-[-0.5px] text-[#b6a9ff]">
                  {getInitials(employee.name)}
                </Text>
              )}
            </View>

            <View className="flex-1 min-w-0">
              <Text
                className="font-sans-bold text-[22px] tracking-[-0.7px] text-[#f3f2fd]"
                numberOfLines={1}
              >
                {name || employee.name}
              </Text>
              <View className="flex-row items-center gap-[8px] mt-[6px]">
                <View className="bg-[#3a2f7a] rounded-[999px] px-[9px] py-[3px]">
                  <Text className="font-sans-bold text-[10px] tracking-[0.4px] text-[#c9bfff]">
                    {ROLE_LABELS[employee.role] || employee.role}
                  </Text>
                </View>
                <Text className="font-[ui-monospace] text-[10.5px] text-[#7c78b8]">
                  {employee.employee_id}
                </Text>
              </View>
            </View>
          </View>

          <View
            className="flex-row items-center justify-between mt-[18px] pt-[14px] border-t border-t-[rgba(255,255,255,0.09)]"
          >
            <Text
              className={`font-sans-semibold flex-1 text-[11.5px] ${noCategories ? 'text-[#ff9d8f]' : 'text-[#7c78b8]'}`}
            >
              {isAgent
                ? noCategories
                  ? 'No tickets can route to this agent'
                  : `Receives tickets in ${selectedCategories.length} ${
                      selectedCategories.length === 1 ? 'category' : 'categories'
                    }`
                : 'Sales — not in the ticket routing pool'}
            </Text>
            <Text className="font-sans text-[11px] text-[#7c78b8]">
              {joinedLabel(employee.joined_at)}
            </Text>
          </View>
        </TopInset>

        <View className="px-[12px] std:px-[16px] pt-[18px] gap-[18px]">
          {updateError ? (
            <View className="bg-[#ffe1e1] rounded-[16px] p-[13px]">
              <Text className="font-sans-semibold text-[12px] leading-[17px] text-[#7a1c16]">
                {updateError.message || 'Failed to save changes.'}
              </Text>
            </View>
          ) : null}

          {/* details */}
          <View
            className="bg-[#ffffff] rounded-[24px] px-[12px] std:px-[16px] py-[6px]" style={sx.shadow1}
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
            <View className="gap-[10px]">
              <View className="flex-row items-baseline justify-between px-[4px]">
                <Text className="font-sans-bold text-[14px] tracking-[-0.3px] text-[#151233]">
                  Ticket categories
                </Text>
                <Text className="font-[ui-monospace] text-[11px] text-[#6d6a96]">
                  {selectedCategories.length} of {(categories || []).length}
                </Text>
              </View>

              <Text
                className="font-sans px-[4px] text-[11.5px] leading-[17px] text-[#6d6a96]"
              >
                Tickets in a selected category can be assigned to this agent. Unselected categories never reach them.
              </Text>

              {noCategories && (
                <View
                  className="flex-row items-center gap-[10px] bg-[#ffe1e1] rounded-[18px] px-[14px] py-[12px]"
                >
                  <Feather name="alert-triangle" size={16} color={C.dangerInk} />
                  <Text className="font-sans-bold flex-1 text-[11.5px] leading-[16px] text-[#7a1c16]">
                    With none selected this agent is invisible to routing.
                  </Text>
                </View>
              )}

              <View className="gap-[7px]">
                {(categories || []).map((cat) => {
                  const on = selectedCategories.includes(cat.name);
                  return (
                    <Pressable key={cat.id} onPress={() => toggleCategory(cat.name)}>
                      <View
                        className={`flex-row items-center gap-[11px] rounded-[16px] px-[14px] py-[13px] ${on ? 'bg-[#151233]' : 'bg-[#ffffff]'}`} style={sx.shadow2}
                      >
                        <Feather name="check-circle" size={19} color={on ? C.violet : '#dedbf5'} />
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

          {/* remove */}
          <Pressable onPress={() => setDeleteDialogOpen(true)} disabled={isDeleting}>
            <View
              className={`flex-row items-center justify-center gap-[8px] py-[14px] ${isDeleting ? 'opacity-[0.5]' : 'opacity-100'}`}
            >
              {isDeleting ? (
                <ActivityIndicator color={C.dangerInk} />
              ) : (
                <>
                  <Feather name="trash-2" size={15} color={C.dangerInk} />
                  <Text className="font-sans-bold text-[12.5px] text-[#b3261e]">
                    Remove from team
                  </Text>
                </>
              )}
            </View>
          </Pressable>
        </View>
      </ScreenScrollView>

      {/* save bar */}
      <StickyFooter gap={0} className="px-[12px] std:px-[16px] pt-[12px] pb-[12px] bg-[#f3f2fd]">
        <Pressable onPress={handleSave} disabled={!dirty || isUpdating}>
          <View
            className={`rounded-[999px] min-h-[52px] items-center justify-center ${dirty ? 'bg-[#151233]' : 'bg-[#e6e3f7]'}`}
            style={dirty ? sx.submitShadow : undefined}
          >
            {isUpdating ? (
              <ActivityIndicator color={C.bg} />
            ) : (
              <Text
                className={`font-sans-bold text-[14px] tracking-[-0.15px] ${dirty ? 'text-[#f3f2fd]' : 'text-[#9d9ac0]'}`}
                numberOfLines={1}
              >
                {saveLabel}
              </Text>
            )}
          </View>
        </Pressable>
      </StickyFooter>

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
    </Screen>
  );
}

const sx = StyleSheet.create({
  shadow1: { shadowColor: C.ink, shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  shadow2: { shadowColor: C.ink, shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 1 },
  submitShadow: { shadowColor: C.ink, shadowOpacity: 0.14, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
});
