// src/components/ConfirmDialog.js
import { Modal, View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

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
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: `${accentColor}1A` }]}>
            <Feather name={icon} size={22} color={accentColor} />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {showInput && (
            <TextInput
              value={inputValue}
              onChangeText={onInputChange}
              placeholder={inputPlaceholder}
              placeholderTextColor="#94a3b8"
              multiline
              style={styles.input}
            />
          )}

          <View style={styles.buttonRow}>
            <Pressable style={[styles.button, styles.cancelButton]} onPress={onCancel}>
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              style={[
                styles.button,
                styles.confirmButton,
                { backgroundColor: destructive ? '#dc2626' : accentColor },
              ]}
              onPress={onConfirm}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  message: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
  },
  input: {
    width: '100%',
    minHeight: 72,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    padding: 12,
    fontSize: 14,
    color: '#0f172a',
    textAlignVertical: 'top',
    marginTop: -8,
    marginBottom: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  confirmButton: {},
  confirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});