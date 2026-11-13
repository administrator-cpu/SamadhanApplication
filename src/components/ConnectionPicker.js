// src/components/ConnectionPicker.js
import { View, Text, Pressable, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Sheet from './layout/Sheet';

export default function ConnectionPicker({ visible, connections, selectedId, onSelect, onClose }) {
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      keyboard={false}
      backdropClassName="bg-[rgba(15,23,42,0.5)]"
      className="bg-white rounded-tl-[20px] rounded-tr-[20px] p-4"
    >
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-base font-bold text-[#0f172a]">Select Circuit ID</Text>
        <Pressable onPress={onClose} hitSlop={12} className="min-w-[44px] min-h-[44px] items-end justify-center">
          <Feather name="x" size={22} color="#0f172a" />
        </Pressable>
      </View>

      <FlatList
        data={connections || []}
        keyExtractor={(item, index) => item?.fabCircuitId || String(index)}
        className="max-h-[400px]"
        renderItem={({ item }) => {
          const isSelected = item.fabCircuitId === selectedId;
          return (
            <Pressable
              className={`flex-row justify-between items-center py-[14px] px-[10px] border-b border-b-[#f1f5f9] ${isSelected ? 'bg-[#eff6ff]' : ''}`}
              onPress={() => {
                onSelect(item);
                onClose();
              }}
            >
              <View className="flex-1 min-w-0">
                <Text className={`text-[15px] ${isSelected ? 'text-[#2563eb] font-semibold' : 'text-[#334155]'}`}>
                  {item.fabCircuitId}
                </Text>
                {item.serviceType && (
                  <Text className="text-xs text-[#64748b] mt-1">
                    {item.serviceType} . {item.bEndBtsId === 'N/A' ? item.aEndBtsId : item.bEndBtsId}
                  </Text>
                )}
              </View>
              {isSelected && <Feather name="check" size={18} color="#2563eb" />}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Text className="text-center text-[#64748b] py-[24px] text-[15px]">No connections available.</Text>
        }
      />
    </Sheet>
  );
}
