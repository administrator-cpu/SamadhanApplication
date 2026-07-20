// src/components/CategoryPicker.js
import { Modal, View, Text, Pressable, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useCategories } from '../hooks/useTickets';

export default function CategoryPicker({ visible, selectedId, onSelect, onClose }) {
  const { data: categories, isLoading } = useCategories();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Issue Category</Text>
            <Pressable onPress={onClose}>
              <Feather name="x" size={22} color="#0f172a" />
            </Pressable>
          </View>

          {isLoading ? (
            <ActivityIndicator color="#3b82f6" style={{ marginVertical: 24 }} />
          ) : (
            <FlatList
              data={categories || []}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 400 }}
              renderItem={({ item }) => {
                const isSelected = item.id === selectedId;
                return (
                  <Pressable
                    style={[styles.row, isSelected && styles.rowSelected]}
                    onPress={() => {
                      onSelect(item);
                      onClose();
                    }}
                  >
                    <Text style={[styles.rowText, isSelected && styles.rowTextSelected]}>{item.name}</Text>
                    {isSelected && <Feather name="check" size={18} color="#2563eb" />}
                  </Pressable>
                );
              }}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  rowSelected: { backgroundColor: '#eff6ff' },
  rowText: { fontSize: 15, color: '#334155' },
  rowTextSelected: { color: '#2563eb', fontWeight: '600' },
});