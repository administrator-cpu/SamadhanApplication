// app/(admin)/customers/[id].js
import { useState, useEffect, useLayoutEffect } from 'react';
import {
  View, Text, TextInput, Pressable, ActivityIndicator, Alert,
  ScrollView, StyleSheet, Platform, KeyboardAvoidingView
} from 'react-native';
import { Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useCustomers, useUpdateCustomer, useDeleteCustomer } from '../../../../src/hooks/useCustomers';
import ConfirmDialog from '../../../../src/components/ConfirmDialog';
import { useAuthStore } from '../../../../src/store/authStore';
import CustomerMetricsModal from '../../../../src/components/CustomerMetricsModal';

export default function EditCustomer() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const navigation = useNavigation();
  const user = useAuthStore((state) => state.user);

  const [metricsCustomer, setMetricsCustomer] = useState(null);
  const [focusedInput, setFocusedInput] = useState(null);

  const { data } = useCustomers({ page: 1, limit: 100 });
  const customer = (data?.customers || []).find((c) => String(c.customer_row_id) === String(id));

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { mutate: updateCustomer, isPending: isUpdating, error: updateError } = useUpdateCustomer(id);
  const { mutate: deleteCustomer, isPending: isDeleting } = useDeleteCustomer();


  useEffect(() => {
    if (customer) {
      setName(customer.name || '');
      setEmail(customer.email || '');
      setPhone(customer.phone || '');
    }
  }, [customer]);

  useLayoutEffect(() => {
    if (customer?.customer_id) {
      navigation.setOptions({
        title: 'Profile',
        headerBackTitle: 'Back',
        headerShadowVisible: false,
      });
    }
  }, [customer?.customer_id, navigation]);

  if (!customer) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const hasChanges =
    name.trim() !== (customer.name || '') ||
    email.trim().toLowerCase() !== (customer.email || '') ||
    phone.trim() !== (customer.phone || '');

  const handleSave = () => {
    if (!hasChanges) return;

    updateCustomer(
      { name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim() || undefined },
      {
        onSuccess: () => {
          Alert.alert('Success', 'Profile updated smoothly.', [
            { text: 'Awesome', onPress: () => router.back() },
          ]);
        },
      }
    );
  };

  const handleDelete = () => {
    setDeleteDialogOpen(false);
    setTimeout(() => {
      deleteCustomer(id, {
        onSuccess: () => router.back(),
        onError: (err) => Alert.alert('Error', err.message || 'Failed to delete customer.'),
      });
    }, 300);
  };

  const initials = name ? name.charAt(0).toUpperCase() : '?';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
       <Stack.Screen
        options={{
          title: 'Profile',
          headerBackTitle: 'Back',
          headerShadowVisible: false,
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >

        {updateError && (
          <View style={styles.errorBanner}>
            <Feather name="alert-circle" size={16} color="#dc2626" />
            <Text style={styles.errorText}>{updateError.message || 'Failed to save changes.'}</Text>
          </View>
        )}

        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.profileName}>{name || 'Unknown Customer'}</Text>
          <View style={styles.badge}>
            <Feather name="hash" size={12} color="#64748b" />
            <Text style={styles.badgeText}>{customer.customer_id}</Text>
          </View>
        </View>

        {/* Outstanding Balance Banner */}
        {customer.outstanding !== null && customer.outstanding !== undefined && user.email !== "abhishek@fab5network.com" && (
          <View style={[styles.outstandingCard, customer.outstanding > 0 ? styles.outstandingDanger : styles.outstandingSuccess]}>
            <View style={[styles.iconCircle, customer.outstanding > 0 ? styles.iconDanger : styles.iconSuccess]}>
              <Feather name="credit-card" size={18} color={customer.outstanding > 0 ? '#dc2626' : '#16a34a'} />
            </View>
            <View style={styles.outstandingTextContainer}>
              <Text style={styles.outstandingLabel}>Current Balance</Text>
              <Text style={[styles.outstandingAmount, { color: customer.outstanding > 0 ? '#dc2626' : '#16a34a' }]}>
                ₹{customer.outstanding}
              </Text>
            </View>
          </View>
        )}

        {/* Personal Details Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Personal Details</Text>

          <View style={[styles.inputWrapper, focusedInput === 'name' && styles.inputWrapperFocused]}>
            <Feather name="user" size={18} color={focusedInput === 'name' ? '#3b82f6' : '#94a3b8'} style={styles.inputIcon} />
            <TextInput
              value={name}
              onChangeText={setName}
              onFocus={() => setFocusedInput('name')}
              onBlur={() => setFocusedInput(null)}
              placeholder="Full Name"
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />
          </View>

          <View style={[styles.inputWrapper, focusedInput === 'email' && styles.inputWrapperFocused]}>
            <Feather name="mail" size={18} color={focusedInput === 'email' ? '#3b82f6' : '#94a3b8'} style={styles.inputIcon} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocusedInput('email')}
              onBlur={() => setFocusedInput(null)}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="Email Address"
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />
          </View>

          <View style={[styles.inputWrapper, focusedInput === 'phone' && styles.inputWrapperFocused, { marginBottom: 0 }]}>
            <Feather name="phone" size={18} color={focusedInput === 'phone' ? '#3b82f6' : '#94a3b8'} style={styles.inputIcon} />
            <TextInput
              value={phone}
              onChangeText={setPhone}
              onFocus={() => setFocusedInput('phone')}
              onBlur={() => setFocusedInput(null)}
              keyboardType="phone-pad"
              placeholder="Phone Number"
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />
          </View>
        </View>

        {/* Actions Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Insights & Network</Text>

          <Pressable
            style={styles.actionRow}
            onPress={() => router.push(`/(admin)/customers/${customer.customer_row_id}/connections`)}
          >
            <View style={[styles.actionIconBg, { backgroundColor: '#eff6ff' }]}>
              <Feather name="wifi" size={18} color="#3b82f6" />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>CRM Connections</Text>
              <Text style={styles.actionSubtitle}>Manage network & devices</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#cbd5e1" />
          </Pressable>

          <View style={styles.divider} />



          <Pressable
            style={styles.actionRow}
            onPress={() => {
              setMetricsCustomer(customer);
            }}
          >
            <View style={[styles.actionIconBg, { backgroundColor: '#f5f3ff' }]}>
              <Feather name="bar-chart-2" size={18} color="#8b5cf6" />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Customer Metrics</Text>
              <Text style={styles.actionSubtitle}>View usage and analytics</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#cbd5e1" />
          </Pressable>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Pressable
            onPress={handleSave}
            disabled={isUpdating || !hasChanges}
            style={[
              styles.saveButton,
              (!hasChanges || isUpdating) && styles.saveButtonDisabled
            ]}
          >
            {isUpdating ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.saveText}>Save Changes</Text>}
          </Pressable>

          <Pressable
            onPress={() => setDeleteDialogOpen(true)}
            disabled={isDeleting}
            style={styles.deleteButton}
          >
            {isDeleting ? (
              <ActivityIndicator color="#dc2626" />
            ) : (
              <>
                <Feather name="trash-2" size={18} color="#dc2626" />
                <Text style={styles.deleteText}>Delete Customer</Text>
              </>
            )}
          </Pressable>
        </View>

        <ConfirmDialog
          visible={deleteDialogOpen}
          title="Delete Customer"
          message={`This will permanently delete ${customer.name}'s account and all associated data. This cannot be undone.`}
          icon="trash-2"
          accentColor="#dc2626"
          destructive
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteDialogOpen(false)}
        />

        <CustomerMetricsModal
          visible={!!metricsCustomer}
          onClose={() => setMetricsCustomer(null)}
          customerId={metricsCustomer?.customer_row_id}
          connections={metricsCustomer?.connections ?? []}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { padding: 16, paddingBottom: 60 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },

  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fef2f2', padding: 14, borderRadius: 12, marginBottom: 16 },
  errorText: { color: '#dc2626', fontSize: 14, fontWeight: '500', flex: 1 },

  // Profile Header
  profileHeader: { alignItems: 'center', marginVertical: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center', marginBottom: 14, ...Platform.select({ ios: { shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10 }, android: { elevation: 8 } }) },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#ffffff' },
  profileName: { fontSize: 24, fontWeight: '700', color: '#0f172a', marginBottom: 8, letterSpacing: -0.5 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#e2e8f0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  badgeText: { fontSize: 13, color: '#475569', fontWeight: '600' },

  // Outstanding Card
  outstandingCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 20, marginBottom: 20 },
  outstandingDanger: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  outstandingSuccess: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  iconDanger: { backgroundColor: '#fee2e2' },
  iconSuccess: { backgroundColor: '#dcfce7' },
  outstandingTextContainer: { flex: 1 },
  outstandingLabel: { fontSize: 13, color: '#64748b', marginBottom: 2, fontWeight: '500' },
  outstandingAmount: { fontWeight: '700', fontSize: 19, letterSpacing: -0.5 },

  // Cards & Inputs
  card: { backgroundColor: '#ffffff', borderRadius: 24, padding: 20, marginBottom: 20, ...Platform.select({ ios: { shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 }, android: { elevation: 3 } }) },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 16, letterSpacing: -0.3 },

  // Interactive Inputs
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 16, marginBottom: 14, paddingHorizontal: 16, borderWidth: 1.5, borderColor: '#f1f5f9' },
  inputWrapperFocused: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, paddingVertical: 16, fontSize: 16, color: '#0f172a', fontWeight: '500' },

  // Action Menu
  actionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  actionIconBg: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  actionTextContainer: { flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 3 },
  actionSubtitle: { fontSize: 13, color: '#64748b' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 6, marginLeft: 58 },

  // Buttons
  buttonContainer: { marginTop: 4 },
  saveButton: { backgroundColor: '#3b82f6', borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginBottom: 14, ...Platform.select({ ios: { shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 }, android: { elevation: 5 } }) },
  saveButtonDisabled: { backgroundColor: '#94a3b8', shadowOpacity: 0, elevation: 0 },
  saveText: { color: '#ffffff', fontWeight: '700', fontSize: 16, letterSpacing: 0.3 },

  deleteButton: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef2f2', borderRadius: 16, paddingVertical: 16 },
  deleteText: { color: '#dc2626', fontWeight: '700', fontSize: 16 },
});