// src/components/CategoryPicker.js
import { View, Text, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useCategories } from '../hooks/useTickets';
import Sheet from './layout/Sheet';

export default function CategoryPicker({ visible, selectedId, onSelect, onClose }) {
  const { data: categories, isLoading } = useCategories();

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      keyboard={false}
      backdropClassName="bg-[rgba(15,23,42,0.5)]"
      className="bg-white rounded-tl-[20px] rounded-tr-[20px] p-4"
    >
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-base font-bold text-[#0f172a]">Select Issue Category</Text>
        <Pressable onPress={onClose} hitSlop={12} className="min-w-[44px] min-h-[44px] items-end justify-center">
          <Feather name="x" size={22} color="#0f172a" />
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#3b82f6" className="my-[24px]" />
      ) : (
        <FlatList
          data={categories || []}
          keyExtractor={(item) => item.id}
          className="max-h-[400px]"
          renderItem={({ item }) => {
            const isSelected = item.id === selectedId;
            return (
              <Pressable
                className={`flex-row justify-between items-center py-[14px] px-[10px] border-b border-b-[#f1f5f9] ${isSelected ? 'bg-[#eff6ff]' : ''}`}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <Text className={`text-[15px] ${isSelected ? 'text-[#2563eb] font-semibold' : 'text-[#334155]'}`}>
                  {item.name}
                </Text>
                {isSelected && <Feather name="check" size={18} color="#2563eb" />}
              </Pressable>
            );
          }}
        />
      )}
    </Sheet>
  );
}
