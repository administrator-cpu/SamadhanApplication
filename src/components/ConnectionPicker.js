// src/components/ConnectionPicker.js
import { Modal, View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function ConnectionPicker({ visible, connections, selectedId, onSelect, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Circuit ID</Text>
            <Pressable onPress={onClose}>
              <Feather name="x" size={22} color="#0f172a" />
            </Pressable>
          </View>

          <FlatList
            data={connections || []}
            keyExtractor={(item, index) => item?.fabCircuitId || String(index)}
            style={{ maxHeight: 400 }}
            renderItem={({ item }) => {
              console.log('Rendering item:', item); // Debugging line
              const isSelected = item.fabCircuitId === selectedId;
              return (
                <Pressable
                  style={[styles.row, isSelected && styles.rowSelected]}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                >
                  <View>
                    <Text style={[styles.rowText, isSelected && styles.rowTextSelected]}>
                      {item.fabCircuitId}
                    </Text>
                    {item.serviceType && (
                      <Text style={styles.subText}>{item.serviceType} . {item.bEndBtsId === "N/A" ? item.aEndBtsId : item.bEndBtsId}</Text>
                    )}
                  </View>
                  {isSelected && <Feather name="check" size={18} color="#2563eb" />}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No connections available.</Text>
            }
          />
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
  subText: { fontSize: 12, color: '#64748b', marginTop: 4 },
  emptyText: { textAlign: 'center', color: '#64748b', paddingVertical: 24, fontSize: 15 },
});