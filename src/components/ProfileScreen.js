// src/components/ProfileScreen.js
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../store/authStore';
import { useUpdateMyProfile, useUploadProfileImage, useRemoveProfileImage } from '../hooks/useCustomers';

const STAFF_ROLES = ['SUPPORT_AGENT', 'ADMIN', 'SALES'];
const ROLE_LABELS = {
  USER: 'Customer',
  SUPPORT_AGENT: 'Support Agent',
  ADMIN: 'Administrator',
  SALES: 'Sales',
};

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  const isStaff = STAFF_ROLES.includes(user?.role);

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [imageUploading, setImageUploading] = useState(false);

  const { mutate: updateProfile, isPending: isSaving, error: saveError } = useUpdateMyProfile();
  const { mutate: uploadImage } = useUploadProfileImage();
  const { mutate: removeImage } = useRemoveProfileImage();

  const handleSave = () => {
    if (name.trim().length < 2) {
      Alert.alert('Invalid name', 'Name must be at least 2 characters.');
      return;
    }
    updateProfile(
      { name: name.trim(), phone: phone.trim() || undefined },
      {
        onSuccess: (data) => {
          setUser(data.user || { ...user, name: name.trim(), phone: phone.trim() });
          setIsEditing(false);
        },
      }
    );
  };

  const handleCancelEdit = () => {
    setName(user?.name || '');
    setPhone(user?.phone || '');
    setIsEditing(false);
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], // Updated for newer expo-image-picker API
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    
    if (result.canceled) return;

    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
      Alert.alert('File too large', 'Profile image must be under 5MB.');
      return;
    }

    const formData = new FormData();
    formData.append('images', {
      uri: asset.uri,
      name: asset.fileName || `profile-${Date.now()}.jpg`,
      type: asset.mimeType || 'image/jpeg',
    });

    setImageUploading(true);
    uploadImage(formData, {
      onSuccess: (data) => {
        setUser(data.user || { ...user, profile_image: data.user?.profile_image });
      },
      onError: (err) => Alert.alert('Upload failed', err.message || 'Please try again.'),
      onSettled: () => setImageUploading(false),
    });
  };

  const handleRemoveImage = () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            removeImage(undefined, {
              onSuccess: (data) => {
                setUser(data.user || { ...user, profile_image: null });
              },
            });
          }
        }
      ]
    );
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Identity Card */}
      <View style={styles.card}>
        <View style={styles.avatarSection}>
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={handlePickImage} 
            disabled={imageUploading}
            style={styles.avatarContainer}
          >
            {imageUploading ? (
              <View style={styles.avatarPlaceholder}>
                <ActivityIndicator color="#3b82f6" size="large" />
              </View>
            ) : user?.profile_image ? (
              <Image source={{ uri: user.profile_image }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{user?.name?.[0]?.toUpperCase() || '?'}</Text>
              </View>
            )}
            <View style={styles.cameraOverlay}>
              <Feather name="camera" size={16} color="#ffffff" />
            </View>
          </TouchableOpacity>

          {user?.profile_image && (
            <TouchableOpacity onPress={handleRemoveImage} style={styles.removePhotoBtn}>
              <Text style={styles.removePhotoText}>Remove photo</Text>
            </TouchableOpacity>
          )}
        </View>

        {!isEditing && (
          <View style={styles.identityTextContainer}>
            <Text style={styles.name}>{user?.name}</Text>
            <View style={styles.roleBadge}>
              <Feather name="shield" size={12} color="#2563eb" />
              <Text style={styles.roleBadgeText}>{ROLE_LABELS[user?.role] || user?.role}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Details / Edit Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{isEditing ? 'Edit Profile' : 'Contact Details'}</Text>
          {isStaff && !isEditing && (
            <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editIconBtn}>
              <Feather name="edit-2" size={18} color="#2563eb" />
            </TouchableOpacity>
          )}
        </View>

        {saveError ? (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={16} color="#ef4444" />
            <Text style={styles.errorText}>{saveError.message || 'Failed to save changes.'}</Text>
          </View>
        ) : null}

        {isEditing ? (
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputWrapper}>
                <Feather name="user" size={18} color="#94a3b8" style={styles.inputIcon} />
                <TextInput 
                  value={name} 
                  onChangeText={setName} 
                  style={styles.input} 
                  placeholder="Enter your full name"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.inputWrapper}>
                <Feather name="phone" size={18} color="#94a3b8" style={styles.inputIcon} />
                <TextInput 
                  value={phone} 
                  onChangeText={setPhone} 
                  keyboardType="phone-pad" 
                  style={styles.input} 
                  placeholder="Enter your phone number"
                />
              </View>
            </View>

            <View style={styles.editButtonsRow}>
              <TouchableOpacity onPress={handleCancelEdit} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} disabled={isSaving} style={styles.saveButton}>
                {isSaving ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <View style={styles.detailIconWrap}>
                <Feather name="mail" size={18} color="#64748b" />
              </View>
              <View style={styles.detailTextWrap}>
                <Text style={styles.detailLabel}>Email Address</Text>
                <Text style={styles.detailValue}>{user?.email}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <View style={styles.detailIconWrap}>
                <Feather name="phone" size={18} color="#64748b" />
              </View>
              <View style={styles.detailTextWrap}>
                <Text style={styles.detailLabel}>Phone Number</Text>
                <Text style={styles.detailValue}>
                  {user?.phone ? user.phone : <Text style={styles.placeholderText}>Not provided</Text>}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Actions */}
      <TouchableOpacity onPress={logout} style={styles.logoutButton} activeOpacity={0.8}>
        <Feather name="log-out" size={18} color="#ef4444" />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8fafc' 
  },
  contentContainer: { 
    padding: 20, 
    paddingTop:50,
    paddingBottom: 40,
    gap: 16,
  },

  /* Card Styles */
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    ...Platform.select({
      ios: {
        shadowColor: '#94a3b8',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },

  /* Avatar Section */
  avatarSection: { 
    alignItems: 'center', 
    marginBottom: 16 
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImage: { 
    width: 104, 
    height: 104, 
    borderRadius: 52, 
    backgroundColor: '#f1f5f9' 
  },
  avatarPlaceholder: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#dbeafe',
  },
  avatarInitial: { 
    fontSize: 36, 
    fontWeight: '800', 
    color: '#2563eb' 
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  removePhotoBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
  },
  removePhotoText: { 
    color: '#ef4444', 
    fontSize: 13, 
    fontWeight: '700' 
  },

  /* Identity Text */
  identityTextContainer: {
    alignItems: 'center',
  },
  name: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: '#0f172a',
    marginBottom: 8,
  },
  roleBadge: { 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 99, 
  },
  roleBadgeText: { 
    fontSize: 12, 
    fontWeight: '700', 
    color: '#2563eb', 
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  /* Read-Only Details */
  detailsContainer: {
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  detailIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTextWrap: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '600',
  },
  placeholderText: {
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginLeft: 60, // Aligns with the text, skipping the icon
  },

  /* Edit Form */
  formContainer: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: '#475569', 
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    borderRadius: 12, 
    backgroundColor: '#f8fafc',
  },
  inputIcon: {
    paddingLeft: 14,
  },
  input: { 
    flex: 1,
    padding: 14, 
    fontSize: 15, 
    color: '#0f172a',
  },
  editButtonsRow: { 
    flexDirection: 'row', 
    gap: 12, 
    marginTop: 8,
  },
  cancelButton: { 
    flex: 1, 
    paddingVertical: 14, 
    borderRadius: 12, 
    backgroundColor: '#f1f5f9', 
    alignItems: 'center' 
  },
  cancelButtonText: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: '#475569' 
  },
  saveButton: { 
    flex: 2, 
    paddingVertical: 14, 
    borderRadius: 12, 
    backgroundColor: '#2563eb', 
    alignItems: 'center' 
  },
  saveButtonText: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: '#ffffff' 
  },

  /* Misc */
  editIconBtn: {
    padding: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
  },
  errorBox: { 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: { 
    color: '#ef4444', 
    fontSize: 13, 
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 8,
  },
  logoutText: { 
    color: '#ef4444', 
    fontWeight: '700', 
    fontSize: 16 
  },
});