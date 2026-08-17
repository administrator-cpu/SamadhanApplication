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
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  const isStaff = STAFF_ROLES.includes(user?.role);

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [imageUploading, setImageUploading] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);

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
      mediaTypes: ['images'],
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
    formData.append('profile_image', {
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
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerStyle={{ padding: 20, paddingTop: 32, paddingBottom: 160 }}
      showsVerticalScrollIndicator={false}
    >
      {/* --- HERO IDENTITY CARD --- */}
      <View className="bg-surface rounded-2xl p-6 mb-4 shadow-sm relative">
        {!isEditing && (
          <TouchableOpacity
            onPress={() => setIsEditing(true)}
            activeOpacity={0.7}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-bg-subtle items-center justify-center"
          >
            <Feather name="settings" size={20} color="#5C5348" />
          </TouchableOpacity>
        )}

        <View className="items-center mt-2 mb-4">
          <TouchableOpacity
            onPress={handlePickImage}
            disabled={imageUploading}
            activeOpacity={0.85}
            className="relative mb-4"
          >
            {imageUploading ? (
              <View className="w-28 h-28 rounded-full bg-primary-50 items-center justify-center">
                <ActivityIndicator color="#FF5A36" size="large" />
              </View>
            ) : user?.profile_image ? (
              <Image
                source={{ uri: user.profile_image }}
                className="w-28 h-28 rounded-full bg-bg-subtle"
              />
            ) : (
              <View className="w-28 h-28 rounded-full bg-primary-50 items-center justify-center border-2 border-primary-200">
                <Text className="font-sans-semibold text-4xl text-primary-500">
                  {user?.name?.[0]?.toUpperCase() || '?'}
                </Text>
              </View>
            )}
            <View className="absolute bottom-0.5 right-0.5 w-9 h-9 rounded-full bg-primary-500 items-center justify-center border-[3px] border-surface">
              <Feather name="camera" size={15} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {user?.profile_image && (
            <TouchableOpacity
              onPress={handleRemoveImage}
              activeOpacity={0.7}
              className="px-4 py-2 bg-error-bg rounded-lg"
            >
              <Text className="font-sans-semibold text-error-text text-xs">Remove photo</Text>
            </TouchableOpacity>
          )}
        </View>

        {!isEditing && (
          <View className="items-center">
            <Text className="font-sans-semibold text-text-primary text-2xl mb-2.5">
              {user?.name || 'Customer'}
            </Text>
            <View className="flex-row items-center bg-primary-50 px-3.5 py-1.5 rounded-full">
              <Feather name="shield" size={12} color="#764222" style={{ marginRight: 6 }} />
              <Text className="font-sans-semibold text-primary-700 text-xs uppercase tracking-widest">
                {ROLE_LABELS[user?.role] || user?.role || 'CUSTOMER'}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* --- COMMAND CENTER (Customer-only) --- */}
      {!isEditing && !isStaff && (
        <View className="mb-4">
          <Text className="font-sans-semibold text-text-primary text-base mb-3 ml-1">
            Features
          </Text>
          <View className="flex-row" style={{ gap: 12 }}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push('/(customer)/connections')}
              className="flex-1 bg-surface rounded-2xl p-4 shadow-sm"
            >
              <View className="w-11 h-11 rounded-full bg-info-bg items-center justify-center mb-3">
                <Feather name="wifi" size={18} color="#0E8074" />
              </View>
              <Text className="font-sans-semibold text-text-primary text-sm mb-0.5">
                My Connection
              </Text>
              <Text className="font-sans text-text-tertiary text-xs">View services</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push('/(customer)/analytics')}
              className="flex-1 bg-surface rounded-2xl p-4 shadow-sm"
            >
              <View className="w-11 h-11 rounded-full bg-success-bg items-center justify-center mb-3">
                <Feather name="bar-chart-2" size={18} color="#0F9D58" />
              </View>
              <Text className="font-sans-semibold text-text-primary text-sm mb-0.5">
                Analytics
              </Text>
              <Text className="font-sans text-text-tertiary text-xs">Network insights</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* --- DETAILS / EDIT CARD --- */}
      <View className="bg-surface rounded-2xl p-6 mb-4 shadow-sm">
        <Text className="font-sans-semibold text-text-primary text-lg mb-5">
          {isEditing ? 'Edit Profile' : 'Contact Details'}
        </Text>

        {saveError ? (
          <View className="flex-row items-center bg-error-bg p-3.5 rounded-xl mb-5">
            <Feather name="alert-circle" size={18} color="#9C4A3C" style={{ marginRight: 8 }} />
            <Text className="font-sans-medium text-error-text text-sm flex-1">
              {saveError.message || 'Failed to save changes.'}
            </Text>
          </View>
        ) : null}

        {isEditing ? (
          <View>
            <View className="mb-4">
              <Text className="font-sans-semibold text-text-secondary text-xs ml-0.5 mb-2">
                Full Name
              </Text>
              <View
                className={`flex-row items-center rounded-2xl bg-bg-subtle border ${
                  nameFocused ? 'border-text-secondary' : 'border-border'
                }`}
              >
                <Feather name="user" size={18} color="#948A7C" style={{ paddingLeft: 16 }} />
                <TextInput
                  value={name}
                  onChangeText={setName}
                  onFocus={() => setNameFocused(true)}
                  onBlur={() => setNameFocused(false)}
                  placeholder="Enter your full name"
                  placeholderTextColor="#948A7C"
                  className="flex-1 p-4 font-sans-medium text-text-primary text-sm"
                />
              </View>
            </View>

            <View className="mb-2">
              <Text className="font-sans-semibold text-text-secondary text-xs ml-0.5 mb-2">
                Phone Number
              </Text>
              <View
                className={`flex-row items-center rounded-2xl bg-bg-subtle border ${
                  phoneFocused ? 'border-text-secondary' : 'border-border'
                }`}
              >
                <Feather name="phone" size={18} color="#948A7C" style={{ paddingLeft: 16 }} />
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  onFocus={() => setPhoneFocused(true)}
                  onBlur={() => setPhoneFocused(false)}
                  keyboardType="phone-pad"
                  placeholder="Enter your phone number"
                  placeholderTextColor="#948A7C"
                  className="flex-1 p-4 font-sans-medium text-text-primary text-sm"
                />
              </View>
            </View>

            <View className="flex-row mt-3" style={{ gap: 12 }}>
              <TouchableOpacity
                onPress={handleCancelEdit}
                activeOpacity={0.85}
                className="flex-1 py-4 rounded-2xl bg-bg-subtle items-center"
              >
                <Text className="font-sans-semibold text-text-secondary text-sm">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSave}
                disabled={isSaving}
                activeOpacity={0.85}
                className="flex-[2] py-4 rounded-2xl bg-primary-500 items-center shadow-sm"
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text className="font-sans-semibold text-white text-sm">Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View>
            <View className="flex-row items-center">
              <View className="w-11 h-11 rounded-2xl bg-bg-subtle items-center justify-center mr-4">
                <Feather name="mail" size={18} color="#5C5348" />
              </View>
              <View className="flex-1">
                <Text className="font-sans-semibold text-text-tertiary text-xs mb-0.5">
                  Email Address
                </Text>
                <Text className="font-sans-semibold text-text-primary text-sm">
                  {user?.email || 'Not provided'}
                </Text>
              </View>
            </View>

            <View className="h-px bg-border ml-[60px] my-4" />

            <View className="flex-row items-center">
              <View className="w-11 h-11 rounded-2xl bg-bg-subtle items-center justify-center mr-4">
                <Feather name="phone" size={18} color="#5C5348" />
              </View>
              <View className="flex-1">
                <Text className="font-sans-semibold text-text-tertiary text-xs mb-0.5">
                  Phone Number
                </Text>
                {user?.phone ? (
                  <Text className="font-sans-semibold text-text-primary text-sm">{user.phone}</Text>
                ) : (
                  <Text className="font-sans text-text-tertiary text-sm italic">Not provided</Text>
                )}
              </View>
            </View>
          </View>
        )}
      </View>

      {/* --- PREMIUM LOGOUT --- */}
      <TouchableOpacity
        onPress={logout}
        activeOpacity={0.85}
        className="flex-row items-center justify-center bg-error-bg rounded-2xl h-14"
      >
        <Feather name="log-out" size={18} color="#9C4A3C" />
        <Text className="font-sans-semibold text-error-text text-base ml-2.5">Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}