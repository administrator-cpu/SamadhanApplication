// src/components/ProfileScreen.js
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert, StyleSheet,
} from 'react-native';
import Screen, { ScreenScrollView, StickyFooter } from './layout/Screen';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../store/authStore';
import { useUpdateMyProfile, useUploadProfileImage, useRemoveProfileImage } from '../hooks/useCustomers';
import CallerTuneCard from './calls/CallerTuneCard';

const STAFF_ROLES = ['SUPPORT_AGENT', 'ADMIN', 'SALES'];
const ROLE_LABELS = {
  USER: 'Customer',
  SUPPORT_AGENT: 'Support Agent',
  ADMIN: 'Administrator',
  SALES: 'Sales',
};

/* ── palette (matches designs 7a / 7b) ─────────────────────── */
const C = {
  bg: '#fffcfb',
  card: '#ffffff',
  ink: '#04002a',
  sub: '#6d6a96',
  muted: '#9d9ac0',
  rule: '#eeecf9',
  field: '#f2f2f2',
  violet: '#6c5ce7',
  violetDeep: '#17006a',
  violetSoft: '#ebe8ff',
  violetDim: '#d8d5f0',
  mint: '#ccf7e4',
  mintInk: '#0f7a56',
  dangerBg: '#fee7ea',
  dangerBgPress: '#fdd9de',
  dangerInk: '#b0233f',
  dangerBd: '#f0a8b6',
};

const CARD = 'bg-[#ffffff] rounded-[26px] p-[18px]';

// Save bar (56) + gap, so the last card clears it in edit mode.
const SAVE_BAR_SPACE = 56 + 12 + 24;

function Field({ label, hint, hintError, icon, focused, invalid, children }) {
  return (
    <View>
      <Text
        className="font-sans-semibold text-[11px] tracking-[0.7px] uppercase text-[#6d6a96] mb-[8px]"
      >
        {label}
      </Text>
      <View
        className={`flex-row items-center gap-[11px] bg-[#f2f2f2] rounded-[18px] border-[1.5px] px-[14px] min-h-[54px] ${invalid ? 'border-[#f0a8b6]' : focused ? 'border-[#6c5ce7]' : 'border-transparent'}`}
      >
        <Feather name={icon} size={17} color={C.muted} />
        {children}
      </View>
      {hint ? (
        <Text
          className={`font-sans text-[11.5px] mt-[7px] pl-[4px] ${hintError ? 'text-[#b0233f]' : 'text-[#9d9ac0]'}`}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

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

  const initial = (name || user?.name || '').trim()[0]?.toUpperCase() || '?';
  const nameValid = name.trim().length >= 2;
  const avatarBox = isEditing ? 'w-[88px] h-[88px]' : 'w-[76px] h-[76px]';
  const avatarRound = isEditing ? 'rounded-[44px]' : 'rounded-[38px]';

  const Avatar = (
    <TouchableOpacity
      onPress={handlePickImage}
      disabled={imageUploading}
      activeOpacity={0.85}
      className={avatarBox}
    >
      {imageUploading ? (
        <View className={`bg-[#ebe8ff] items-center justify-center ${avatarBox} ${avatarRound}`}>
          <ActivityIndicator color={C.violet} size="large" />
        </View>
      ) : user?.profile_image ? (
        <Image
          source={{ uri: user.profile_image }}
          className={`bg-[#ebe8ff] ${avatarBox} ${avatarRound}`}
          contentFit="cover"
          transition={150}
          cachePolicy="disk"
        />
      ) : (
        <View className={`bg-[#ebe8ff] items-center justify-center ${avatarBox} ${avatarRound}`}>
          <Text
            className={`font-sans-semibold text-[#17006a] ${isEditing ? 'text-[34px]' : 'text-[30px]'}`}
          >
            {initial}
          </Text>
        </View>
      )}
      <View
        className={`absolute right-[-2px] bottom-[-2px] rounded-[16px] bg-[#6c5ce7] border-[3px] border-[#ffffff] items-center justify-center ${isEditing ? 'w-[32px] h-[32px]' : 'w-[30px] h-[30px]'}`}
      >
        <Feather name="camera" size={13} color="#ffffff" />
      </View>
    </TouchableOpacity>
  );

  return (
    <Screen className="bg-[#fffcfb]">
      <ScreenScrollView
        className="flex-1"
        keyboard
        keyboardOffset={isEditing ? SAVE_BAR_SPACE : 24}
        endSpace={isEditing ? SAVE_BAR_SPACE : 24}
        contentContainerClassName="px-[12px] std:px-[16px] pt-[16px] gap-[14px]"
      >
        {/* ── HEADER ─────────────────────────────────────────── */}
        {isEditing ? (
          <View className="flex-row items-center gap-[11px]">
            <TouchableOpacity
              onPress={handleCancelEdit}
              activeOpacity={0.8}
              className="w-[40px] h-[40px] rounded-[20px] bg-[#ffffff] items-center justify-center"
            >
              <Feather name="chevron-left" size={18} color={C.ink} />
            </TouchableOpacity>
            <View className="flex-1 min-w-0">
              <Text
                className="font-sans-semibold text-[10px] tracking-[1.4px] uppercase text-[#17006a]"
              >
                Account
              </Text>
              <Text className="font-sans-semibold text-[20px] text-[#04002a] mt-[2px]">
                Edit profile
              </Text>
            </View>
          </View>
        ) : (
          <View className="flex-row items-end justify-between gap-[10px]">
            <View className="min-w-0">
              <Text
                className="font-sans-semibold text-[10.5px] tracking-[1.4px] uppercase text-[#17006a]"
              >
                Account
              </Text>
              <Text className="font-sans-semibold text-[31px] text-[#04002a] mt-[3px]">
                Profile
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsEditing(true)}
              activeOpacity={0.8}
              className="w-[44px] h-[44px] rounded-[22px] bg-[#ffffff] items-center justify-center"
            >
              <Feather name="settings" size={18} color={C.ink} />
            </TouchableOpacity>
          </View>
        )}

        {saveError ? (
          <View
            className="flex-row items-center gap-[9px] bg-[#fee7ea] rounded-[18px] p-[14px]"
          >
            <Feather name="alert-circle" size={17} color={C.dangerInk} />
            <Text className="font-sans-medium flex-1 text-[13px] text-[#b0233f]">
              {saveError.message || 'Failed to save changes.'}
            </Text>
          </View>
        ) : null}

        {/* ── IDENTITY / PHOTO CARD ──────────────────────────── */}
        {isEditing ? (
          <View className={`${CARD} py-[20px] items-center gap-[14px]`} style={sx.card}>
            {Avatar}
            <View className="flex-row gap-[10px] w-full">
              <TouchableOpacity
                onPress={handlePickImage}
                disabled={imageUploading}
                activeOpacity={0.85}
                className="flex-1 flex-row items-center justify-center gap-[7px] bg-[#f2f2f2] rounded-[999px] min-h-[44px]"
              >
                <Feather name="upload" size={14} color={C.violetDeep} />
                <Text className="font-sans-semibold text-[12.5px] text-[#17006a]">
                  Change photo
                </Text>
              </TouchableOpacity>
              {user?.profile_image ? (
                <TouchableOpacity
                  onPress={handleRemoveImage}
                  activeOpacity={0.85}
                  className="flex-row items-center justify-center gap-[7px] bg-[#fee7ea] rounded-[999px] min-h-[44px] px-[12px] std:px-[16px]"
                >
                  <Feather name="trash-2" size={14} color={C.dangerInk} />
                  <Text className="font-sans-semibold text-[12.5px] text-[#b0233f]">
                    Remove
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <Text className="font-sans text-[11px] text-[#9d9ac0] text-center">
              Square image, under 5 MB
            </Text>
          </View>
        ) : (
          <View className={`${CARD} gap-[16px]`} style={sx.card}>
            <View className="flex-row items-center gap-[15px]">
              {Avatar}
              <View className="flex-1 min-w-0">
                <Text className="font-sans-semibold text-[19px] leading-[23px] text-[#04002a]">
                  {user?.name || 'Customer'}
                </Text>
                <View
                  className="flex-row items-center gap-[6px] self-start bg-[#ebe8ff] rounded-[999px] px-[11px] py-[6px] mt-[8px]"
                >
                  <Feather name="shield" size={11} color={C.violetDeep} />
                  <Text
                    className="font-sans-semibold text-[10px] tracking-[1.2px] uppercase text-[#17006a]"
                  >
                    {ROLE_LABELS[user?.role] || user?.role || 'CUSTOMER'}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setIsEditing(true)}
              activeOpacity={0.85}
              className="flex-row items-center justify-center gap-[8px] bg-[#f2f2f2] rounded-[999px] min-h-[46px]"
            >
              <Feather name="edit-2" size={15} color={C.violetDeep} />
              <Text className="font-sans-semibold text-[13.5px] text-[#17006a]">
                Edit profile
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── YOUR SERVICES (customer-only) ──────────────────── */}
        {!isEditing && !isStaff && (
          <View className="gap-[10px]">
            <Text
              className="font-sans-semibold text-[10.5px] tracking-[1.4px] uppercase text-[#6d6a96] pl-[4px]"
            >
              Your services
            </Text>
            <View className="flex-row gap-[12px]">
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push('/(customer)/connections')}
                className={`${CARD} flex-1 p-[12px] std:p-[16px] gap-[11px]`}
                style={sx.card}
              >
                <View
                  className="w-[42px] h-[42px] rounded-[16px] bg-[#ccf7e4] items-center justify-center"
                >
                  <Feather name="wifi" size={19} color={C.mintInk} />
                </View>
                <View>
                  <Text className="font-sans-semibold text-[14px] text-[#04002a]">
                    My connection
                  </Text>
                  <Text className="font-sans text-[11.5px] text-[#6d6a96] mt-[2px]">
                    View services
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push('/(customer)/analytics')}
                className={`${CARD} flex-1 p-[12px] std:p-[16px] gap-[11px]`}
                style={sx.card}
              >
                <View
                  className="w-[42px] h-[42px] rounded-[16px] bg-[#ebe8ff] items-center justify-center"
                >
                  <Feather name="bar-chart-2" size={19} color={C.violetDeep} />
                </View>
                <View>
                  <Text className="font-sans-semibold text-[14px] text-[#04002a]">
                    Analytics
                  </Text>
                  <Text className="font-sans text-[11.5px] text-[#6d6a96] mt-[2px]">
                    Uptime &amp; faults
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── DETAILS / EDIT FIELDS ──────────────────────────── */}
        {isEditing ? (
          <View className={`${CARD} gap-[16px]`} style={sx.card}>
            <Field
              label="Account name"
              icon="user"
              focused={nameFocused}
              invalid={!nameValid}
              hint={nameValid ? 'Appears on your tickets and invoices' : 'Name must be at least 2 characters'}
              hintError={!nameValid}
            >
              <TextInput
                value={name}
                onChangeText={setName}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                placeholder="Enter your full name"
                placeholderTextColor={C.muted}
                className="font-sans-semibold flex-1 min-w-0 text-[14px] text-[#04002a] py-[14px]"
              />
            </Field>

            <Field
              label="Phone number"
              icon="phone"
              focused={phoneFocused}
              hint="Optional. Used only for outage and escalation calls."
            >
              <TextInput
                value={phone}
                onChangeText={setPhone}
                onFocus={() => setPhoneFocused(true)}
                onBlur={() => setPhoneFocused(false)}
                keyboardType="phone-pad"
                placeholder="e.g. +91 98200 00000"
                placeholderTextColor={C.muted}
                className="font-sans-semibold flex-1 min-w-0 text-[14px] text-[#04002a] py-[14px]"
              />
            </Field>

            <View
              className="flex-row items-center gap-[11px] bg-[#fffcfb] rounded-[18px] px-[14px] py-[13px]"
            >
              <Feather name="lock" size={16} color={C.muted} />
              <View className="flex-1 min-w-0">
                <Text
                  className="font-sans-medium text-[10.5px] tracking-[0.9px] uppercase text-[#9d9ac0]"
                >
                  Email address
                </Text>
                <Text
                  className="font-sans-semibold text-[13px] text-[#6d6a96] mt-[3px]"
                  numberOfLines={1}
                >
                  {user?.email || 'Not provided'}
                </Text>
              </View>
              <Text className="font-sans-medium text-[11px] text-[#9d9ac0]">
                Ask support
              </Text>
            </View>
          </View>
        ) : (
          <View className={`${CARD} gap-[14px]`} style={sx.card}>
            <Text className="font-sans-semibold text-[15px] text-[#04002a]">
              Contact details
            </Text>

            <View className="flex-row items-center gap-[13px]">
              <View
                className="w-[40px] h-[40px] rounded-[14px] bg-[#f2f2f2] items-center justify-center"
              >
                <Feather name="mail" size={17} color={C.sub} />
              </View>
              <View className="flex-1 min-w-0">
                <Text
                  className="font-sans-medium text-[10.5px] tracking-[0.9px] uppercase text-[#9d9ac0]"
                >
                  Email address
                </Text>
                <Text
                  className="font-sans-semibold text-[13.5px] text-[#04002a] mt-[3px]"
                  numberOfLines={1}
                >
                  {user?.email || 'Not provided'}
                </Text>
              </View>
              <Text
                className="font-sans-medium text-[10px] tracking-[0.9px] uppercase text-[#9d9ac0]"
              >
                Locked
              </Text>
            </View>

            <View className="h-[1px] bg-[#eeecf9]" />

            <View className="flex-row items-center gap-[13px]">
              <View
                className="w-[40px] h-[40px] rounded-[14px] bg-[#f2f2f2] items-center justify-center"
              >
                <Feather name="phone" size={17} color={C.sub} />
              </View>
              <View className="flex-1 min-w-0">
                <Text
                  className="font-sans-medium text-[10.5px] tracking-[0.9px] uppercase text-[#9d9ac0]"
                >
                  Phone number
                </Text>
                {user?.phone ? (
                  <Text className="font-sans-semibold text-[13.5px] text-[#04002a] mt-[3px]">
                    {user.phone}
                  </Text>
                ) : (
                  <Text className="font-sans text-[12.5px] text-[#9d9ac0] mt-[3px]">
                    Not on file — we use it for outage calls
                  </Text>
                )}
              </View>
              {!user?.phone && (
                <TouchableOpacity
                  onPress={() => setIsEditing(true)}
                  activeOpacity={0.85}
                  className="flex-row items-center gap-[5px] bg-[#ccf7e4] rounded-[999px] px-[13px] py-[9px]"
                >
                  <Feather name="plus" size={12} color={C.mintInk} />
                  <Text className="font-sans-semibold text-[11.5px] text-[#0f7a56]">
                    Add
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {!isEditing && <CallerTuneCard />}

        {/* ── LOG OUT ────────────────────────────────────────── */}
        {!isEditing && (
          <TouchableOpacity
            onPress={logout}
            activeOpacity={0.85}
            className="flex-row items-center justify-center gap-[9px] bg-[#fee7ea] rounded-[999px] min-h-[54px]"
          >
            <Feather name="log-out" size={17} color={C.dangerInk} />
            <Text className="font-sans-semibold text-[14.5px] text-[#b0233f]">
              Log out
            </Text>
          </TouchableOpacity>
        )}
      </ScreenScrollView>

      {/* ── STICKY SAVE BAR (edit state) ─────────────────────── */}
      {isEditing && (
        <StickyFooter className="px-[12px] std:px-[16px] flex-row gap-[10px]">
          <TouchableOpacity
            onPress={handleCancelEdit}
            activeOpacity={0.85}
            className="flex-1 items-center justify-center bg-[#ffffff] rounded-[999px] min-h-[56px]" style={sx.shadow1}
          >
            <Text className="font-sans-semibold text-[14.5px] text-[#6d6a96]">
              Cancel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving || !nameValid}
            activeOpacity={0.85}
            className={`flex-[2] flex-row items-center justify-center gap-[8px] rounded-[999px] min-h-[56px] ${nameValid ? 'bg-[#6c5ce7]' : 'bg-[#d8d5f0]'}`} style={sx.shadow2}
          >
            {isSaving ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Feather name="check" size={16} color={nameValid ? '#ffffff' : C.muted} />
                <Text
                  className={`font-sans-semibold text-[14.5px] ${nameValid ? 'text-[#ffffff]' : 'text-[#9d9ac0]'}`}
                >
                  Save changes
                </Text>
              </>
            )}
          </TouchableOpacity>
        </StickyFooter>
      )}
    </Screen>
  );
}

const sx = StyleSheet.create({
  card: { shadowColor: '#151233', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  shadow1: { shadowColor: '#151233', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  shadow2: { shadowColor: '#151233', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
});
