// src/components/TicketSearchFilterBar.js
import { useState } from 'react';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Keyboard, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Sheet from './layout/Sheet';
import { DENSE_FONT_SCALE } from './layout/tokens';
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
        className="flex-row items-center shadow-sm bg-[#FFFFFF] rounded-[999px] h-[56px] pl-[16px] pr-[8px] gap-[10px]"
      >
        <Feather name="search" size={17} color={C.inkFaint} />
        <TextInput
          value={searchValue}
          onChangeText={onChangeSearch}
          placeholder={placeholder}
          placeholderTextColor={C.inkFaint}
          className="font-sans flex-1 min-w-0 h-full text-[14px] text-[#151233]"
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
          className={`items-center justify-center w-[34px] h-[34px] rounded-[999px] ${hasActiveFilter ? 'bg-[#6C5CE7]' : 'bg-[#151233]'}`}
        >
          <Ionicons name="filter" size={15} color={C.bg} />
          {hasActiveFilter && (
            <View
              className="absolute top-[-2px] right-[-2px] w-[14px] h-[14px] rounded-[999px] items-center justify-center border-[1.5px] border-[#FFFFFF] bg-[#C2410C]"
            >
              <Text maxFontSizeMultiplier={DENSE_FONT_SCALE} className="text-[8px] text-[#FFFFFF] font-bold">{selectedStatuses.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Status picker menu */}
      <Sheet
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        animationType="fade"
        keyboard={false}
        backdropClassName="bg-[rgba(21,18,51,0.45)]"
        className="rounded-tl-[28px] rounded-tr-[28px] pt-[10px] pb-[20px] px-[16px] std:px-[20px] bg-[#F3F2FD]"
      >
            <View
              className="w-[40px] h-[4px] rounded-[999px] self-center mb-[16px] bg-[#EBE8FF]"
            />
            <Text className="font-sans-semibold text-[17px] mb-[4px] text-[#151233]">
              Filter by status
            </Text>
            <Text className="font-sans text-[12px] mb-[16px] text-[#6D6A96]">
              Select one or more — leave empty to show all
            </Text>

            {statusOptions.map((status) => {
              const checked = selectedStatuses.includes(status);
              return (
                <TouchableOpacity
                  key={status}
                  onPress={() => toggleStatus(status)}
                  activeOpacity={0.8}
                  className={`flex-row items-center justify-between rounded-[14px] px-[14px] py-[13px] mb-[8px] ${checked ? 'bg-[#EBE8FF]' : 'bg-[#FFFFFF]'}`}
                >
                  <Text
                    className={`font-sans-medium text-[14px] ${checked ? 'text-[#4A34C7]' : 'text-[#151233]'}`}
                  >
                    {statusLabel(status)}
                  </Text>
                  {checked && <Feather name="check" size={16} color={C.violetInk} />}
                </TouchableOpacity>
              );
            })}

            <View className="flex-row gap-[10px] mt-[8px]">
              <TouchableOpacity
                onPress={() => {
                  onChangeStatuses([]);
                  setMenuVisible(false);
                }}
                activeOpacity={0.85}
                className="flex-1 items-center justify-center rounded-[14px] h-[46px] bg-[#FFFFFF]"
              >
                <Text className="font-sans-semibold text-[13px] text-[#6D6A96]">
                  Clear
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setMenuVisible(false)}
                activeOpacity={0.85}
                className="flex-1 items-center justify-center rounded-[14px] h-[46px] bg-[#6C5CE7]"
              >
                <Text className="font-sans-semibold text-[13px] text-[#FFFFFF]">
                  Apply
                </Text>
              </TouchableOpacity>
            </View>
      </Sheet>
    </>
  );
}