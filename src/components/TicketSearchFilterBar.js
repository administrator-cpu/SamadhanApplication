// src/components/TicketSearchFilterBar.js
import { useState } from 'react';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Keyboard, Modal, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { C } from './TicketCard';
import { statusLabel } from '../utils/ticketStatus';

// Reusable across any ticket list: pass in whichever statuses matter for
// that screen (agent list gets all 5, customer list can pass a subset).
export const DEFAULT_STATUS_OPTIONS = ['OPEN', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED'];

/**
 * @param {string} searchValue
 * @param {function} onChangeSearch
 * @param {string} placeholder
 * @param {string[]} selectedStatuses - currently active status filters (empty = "All")
 * @param {function} onChangeStatuses - (string[]) => void
 * @param {string[]} [statusOptions] - defaults to DEFAULT_STATUS_OPTIONS
 */
export default function TicketSearchFilterBar({
  searchValue,
  onChangeSearch,
  placeholder = 'Search by ticket no. or keyword',
  selectedStatuses = [],
  onChangeStatuses,
  statusOptions = DEFAULT_STATUS_OPTIONS,
}) {
  const [menuVisible, setMenuVisible] = useState(false);
  const hasActiveFilter = selectedStatuses.length > 0;

  const toggleStatus = (status) => {
    if (selectedStatuses.includes(status)) {
      onChangeStatuses(selectedStatuses.filter((s) => s !== status));
    } else {
      onChangeStatuses([...selectedStatuses, status]);
    }
  };

  return (
    <>
      <View
        className="flex-row items-center shadow-sm"
        style={{ backgroundColor: '#FFFFFF', borderRadius: 999, height: 56, paddingLeft: 16, paddingRight: 8, gap: 10 }}
      >
        <Feather name="search" size={17} color={C.inkFaint} />
        <TextInput
          value={searchValue}
          onChangeText={onChangeSearch}
          placeholder={placeholder}
          placeholderTextColor={C.inkFaint}
          className="font-sans"
          style={{ flex: 1, minWidth: 0, height: '100%', fontSize: 14, color: C.ink }}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={() => Keyboard.dismiss()}
        />
        {searchValue.length > 0 && (
          <Pressable onPress={() => onChangeSearch('')} hitSlop={8}>
            <Feather name="x-circle" size={17} color={C.inkFaint} />
          </Pressable>
        )}
        <TouchableOpacity
          onPress={() => setMenuVisible(true)}
          className="items-center justify-center"
          style={{
            width: 34,
            height: 34,
            borderRadius: 999,
            backgroundColor: hasActiveFilter ? C.violet : C.ink,
          }}
        >
          <Ionicons name="filter" size={15} color={C.bg} />
          {hasActiveFilter && (
            <View
              style={{
                position: 'absolute',
                top: -2,
                right: -2,
                width: 14,
                height: 14,
                borderRadius: 999,
                backgroundColor: C.coral,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1.5,
                borderColor: '#FFFFFF',
              }}
            >
              <Text style={{ fontSize: 8, color: '#FFFFFF', fontWeight: '700' }}>{selectedStatuses.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Status picker menu */}
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(21,18,51,0.45)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{
              backgroundColor: C.bg,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingTop: 10,
              paddingBottom: 32,
              paddingHorizontal: 20,
            }}
          >
            <View
              style={{ width: 40, height: 4, borderRadius: 999, backgroundColor: C.track, alignSelf: 'center', marginBottom: 16 }}
            />
            <Text className="font-sans-semibold" style={{ fontSize: 17, color: C.ink, marginBottom: 4 }}>
              Filter by status
            </Text>
            <Text className="font-sans" style={{ fontSize: 12, color: C.inkMuted, marginBottom: 16 }}>
              Select one or more — leave empty to show all
            </Text>

            {statusOptions.map((status) => {
              const checked = selectedStatuses.includes(status);
              return (
                <TouchableOpacity
                  key={status}
                  onPress={() => toggleStatus(status)}
                  activeOpacity={0.8}
                  className="flex-row items-center justify-between"
                  style={{
                    backgroundColor: checked ? C.violetTint : C.card,
                    borderRadius: 14,
                    paddingHorizontal: 14,
                    paddingVertical: 13,
                    marginBottom: 8,
                  }}
                >
                  <Text
                    className="font-sans-medium"
                    style={{ fontSize: 14, color: checked ? C.violetInk : C.ink }}
                  >
                    {statusLabel(status)}
                  </Text>
                  {checked && <Feather name="check" size={16} color={C.violetInk} />}
                </TouchableOpacity>
              );
            })}

            <View className="flex-row" style={{ gap: 10, marginTop: 8 }}>
              <TouchableOpacity
                onPress={() => {
                  onChangeStatuses([]);
                  setMenuVisible(false);
                }}
                activeOpacity={0.85}
                className="flex-1 items-center justify-center"
                style={{ backgroundColor: C.card, borderRadius: 14, height: 46 }}
              >
                <Text className="font-sans-semibold" style={{ fontSize: 13, color: C.inkMuted }}>
                  Clear
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setMenuVisible(false)}
                activeOpacity={0.85}
                className="flex-1 items-center justify-center"
                style={{ backgroundColor: C.violet, borderRadius: 14, height: 46 }}
              >
                <Text className="font-sans-semibold" style={{ fontSize: 13, color: '#FFFFFF' }}>
                  Apply
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}