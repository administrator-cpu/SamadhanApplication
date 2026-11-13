// src/components/ConfirmDialog.js
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Sheet from './layout/Sheet';

// Supported accent colours → NativeWind classes (tint = 10% alpha).
const ACCENTS = {
  '#3b82f6': { tint: 'bg-[#3b82f61A]', solid: 'bg-[#3b82f6]' },
  '#ea580c': { tint: 'bg-[#ea580c1A]', solid: 'bg-[#ea580c]' },
  '#16a34a': { tint: 'bg-[#16a34a1A]', solid: 'bg-[#16a34a]' },
  '#dc2626': { tint: 'bg-[#dc26261A]', solid: 'bg-[#dc2626]' },
  '#7c3aed': { tint: 'bg-[#7c3aed1A]', solid: 'bg-[#7c3aed]' },
  '#b3261e': { tint: 'bg-[#b3261e1A]', solid: 'bg-[#b3261e]' },
};

export default function ConfirmDialog({
  visible,
  title = 'Confirm',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  icon = 'help-circle',
  accentColor = '#3b82f6',
  destructive = false,
  showInput = false,
  inputValue = '',
  onInputChange,
  inputPlaceholder = 'Add details (optional)',
  onConfirm,
  onCancel,
}) {
  const accent = ACCENTS[String(accentColor).toLowerCase()] ?? ACCENTS['#3b82f6'];
  const iconColor = ACCENTS[String(accentColor).toLowerCase()] ? accentColor : '#3b82f6';

  return (
    <Sheet
      visible={visible}
      onClose={onCancel}
      variant="center"
      animationType="fade"
      dismissOnBackdrop={false}
      keyboard={showInput}
      backdropClassName="bg-[rgba(15,23,42,0.5)]"
      className="items-center"
    >
      <View className="w-full max-w-[340px] bg-white rounded-[20px] p-[24px] items-center" style={styles.card}>
        <View className={`w-[52px] h-[52px] rounded-[26px] items-center justify-center mb-[14px] ${accent.tint}`}>
          <Feather name={icon} size={22} color={iconColor} />
        </View>

        <Text className="text-[17px] font-bold text-[#0f172a] mb-[6px]">{title}</Text>
        <Text className="text-sm text-[#64748b] text-center leading-[20px] mb-[22px]">{message}</Text>

        {showInput && (
          <TextInput
            value={inputValue}
            onChangeText={onInputChange}
            placeholder={inputPlaceholder}
            placeholderTextColor="#94a3b8"
            multiline
            textAlignVertical="top"
            className="w-full min-h-[72px] border border-[#e2e8f0] rounded-[12px] bg-[#f8fafc] p-[12px] text-sm text-[#0f172a] mt-[-8px] mb-[22px]"
          />
        )}

        <View className="flex-row gap-[10px] w-full">
          <Pressable className="flex-1 py-[12px] min-h-[44px] rounded-[12px] items-center justify-center bg-[#f1f5f9]" onPress={onCancel}>
            <Text className="text-sm font-semibold text-[#475569]">{cancelLabel}</Text>
          </Pressable>
          <Pressable
            className={`flex-1 py-[12px] min-h-[44px] rounded-[12px] items-center justify-center ${destructive ? 'bg-[#dc2626]' : accent.solid}`}
            onPress={onConfirm}
          >
            <Text className="text-sm font-semibold text-white">{confirmLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  card: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
});
