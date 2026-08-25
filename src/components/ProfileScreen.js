// src/components/ProfileScreen.js
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
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

const CARD = {
  backgroundColor: C.card,
  borderRadius: 26,
  padding: 18,
  shadowColor: '#151233',
  shadowOpacity: 0.06,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
};

function Field({ label, hint, hintColor, icon, focused, invalid, children }) {
  return (
    <View>
      <Text
        className="font-sans-semibold"
        style={{ fontSize: 11, letterSpacing: 0.7, textTransform: 'uppercase', color: C.sub, marginBottom: 8 }}
      >
        {label}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 11,
          backgroundColor: C.field,
          borderRadius: 18,
          borderWidth: 1.5,
          borderColor: invalid ? C.dangerBd : focused ? C.violet : 'transparent',
          paddingHorizontal: 14,
          minHeight: 54,
        }}
      >
        <Feather name={icon} size={17} color={C.muted} />
        {children}
      </View>
      {hint ? (
        <Text
          className="font-sans"
          style={{ fontSize: 11.5, color: hintColor || C.muted, marginTop: 7, paddingLeft: 4 }}
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
  const avatarSize = isEditing ? 88 : 76;

  const Avatar = (
    <TouchableOpacity
      onPress={handlePickImage}
      disabled={imageUploading}
      activeOpacity={0.85}
      style={{ width: avatarSize, height: avatarSize }}
    >
      {imageUploading ? (
        <View
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
            backgroundColor: C.violetSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator color={C.violet} size="large" />
        </View>
      ) : user?.profile_image ? (
        <Image
          source={{ uri: user.profile_image }}
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
            backgroundColor: C.violetSoft,
          }}
          contentFit="cover"
          transition={150}
          cachePolicy="disk"
        />
      ) : (
        <View
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
            backgroundColor: C.violetSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            className="font-sans-semibold"
            style={{ fontSize: isEditing ? 34 : 30, color: C.violetDeep }}
          >
            {initial}
          </Text>
        </View>
      )}
      <View
        style={{
          position: 'absolute',
          right: -2,
          bottom: -2,
          width: isEditing ? 32 : 30,
          height: isEditing ? 32 : 30,
          borderRadius: 16,
          backgroundColor: C.violet,
          borderWidth: 3,
          borderColor: C.card,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Feather name="camera" size={13} color="#ffffff" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 28,
          paddingBottom: isEditing ? 130 : 120,
          gap: 14,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── HEADER ─────────────────────────────────────────── */}
        {isEditing ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
            <TouchableOpacity
              onPress={handleCancelEdit}
              activeOpacity={0.8}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: C.card,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Feather name="chevron-left" size={18} color={C.ink} />
            </TouchableOpacity>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                className="font-sans-semibold"
                style={{ fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: C.violetDeep }}
              >
                Account
              </Text>
              <Text className="font-sans-semibold" style={{ fontSize: 20, color: C.ink, marginTop: 2 }}>
                Edit profile
              </Text>
            </View>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
            <View style={{ minWidth: 0 }}>
              <Text
                className="font-sans-semibold"
                style={{ fontSize: 10.5, letterSpacing: 1.4, textTransform: 'uppercase', color: C.violetDeep }}
              >
                Account
              </Text>
              <Text className="font-sans-semibold" style={{ fontSize: 31, color: C.ink, marginTop: 3 }}>
                Profile
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsEditing(true)}
              activeOpacity={0.8}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: C.card,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Feather name="settings" size={18} color={C.ink} />
            </TouchableOpacity>
          </View>
        )}

        {saveError ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 9,
              backgroundColor: C.dangerBg,
              borderRadius: 18,
              padding: 14,
            }}
          >
            <Feather name="alert-circle" size={17} color={C.dangerInk} />
            <Text className="font-sans-medium" style={{ flex: 1, fontSize: 13, color: C.dangerInk }}>
              {saveError.message || 'Failed to save changes.'}
            </Text>
          </View>
        ) : null}

        {/* ── IDENTITY / PHOTO CARD ──────────────────────────── */}
        {isEditing ? (
          <View style={{ ...CARD, paddingVertical: 20, alignItems: 'center', gap: 14 }}>
            {Avatar}
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity
                onPress={handlePickImage}
                disabled={imageUploading}
                activeOpacity={0.85}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                  backgroundColor: C.field,
                  borderRadius: 999,
                  minHeight: 44,
                }}
              >
                <Feather name="upload" size={14} color={C.violetDeep} />
                <Text className="font-sans-semibold" style={{ fontSize: 12.5, color: C.violetDeep }}>
                  Change photo
                </Text>
              </TouchableOpacity>
              {user?.profile_image ? (
                <TouchableOpacity
                  onPress={handleRemoveImage}
                  activeOpacity={0.85}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 7,
                    backgroundColor: C.dangerBg,
                    borderRadius: 999,
                    minHeight: 44,
                    paddingHorizontal: 16,
                  }}
                >
                  <Feather name="trash-2" size={14} color={C.dangerInk} />
                  <Text className="font-sans-semibold" style={{ fontSize: 12.5, color: C.dangerInk }}>
                    Remove
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <Text className="font-sans" style={{ fontSize: 11, color: C.muted, textAlign: 'center' }}>
              Square image, under 5 MB
            </Text>
          </View>
        ) : (
          <View style={{ ...CARD, gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
              {Avatar}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text className="font-sans-semibold" style={{ fontSize: 19, lineHeight: 23, color: C.ink }}>
                  {user?.name || 'Customer'}
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    alignSelf: 'flex-start',
                    backgroundColor: C.violetSoft,
                    borderRadius: 999,
                    paddingHorizontal: 11,
                    paddingVertical: 6,
                    marginTop: 8,
                  }}
                >
                  <Feather name="shield" size={11} color={C.violetDeep} />
                  <Text
                    className="font-sans-semibold"
                    style={{ fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: C.violetDeep }}
                  >
                    {ROLE_LABELS[user?.role] || user?.role || 'CUSTOMER'}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setIsEditing(true)}
              activeOpacity={0.85}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: C.field,
                borderRadius: 999,
                minHeight: 46,
              }}
            >
              <Feather name="edit-2" size={15} color={C.violetDeep} />
              <Text className="font-sans-semibold" style={{ fontSize: 13.5, color: C.violetDeep }}>
                Edit profile
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── YOUR SERVICES (customer-only) ──────────────────── */}
        {!isEditing && !isStaff && (
          <View style={{ gap: 10 }}>
            <Text
              className="font-sans-semibold"
              style={{ fontSize: 10.5, letterSpacing: 1.4, textTransform: 'uppercase', color: C.sub, paddingLeft: 4 }}
            >
              Your services
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push('/(customer)/connections')}
                style={{ ...CARD, flex: 1, padding: 16, gap: 11 }}
              >
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 16,
                    backgroundColor: C.mint,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Feather name="wifi" size={19} color={C.mintInk} />
                </View>
                <View>
                  <Text className="font-sans-semibold" style={{ fontSize: 14, color: C.ink }}>
                    My connection
                  </Text>
                  <Text className="font-sans" style={{ fontSize: 11.5, color: C.sub, marginTop: 2 }}>
                    View services
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push('/(customer)/analytics')}
                style={{ ...CARD, flex: 1, padding: 16, gap: 11 }}
              >
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 16,
                    backgroundColor: C.violetSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Feather name="bar-chart-2" size={19} color={C.violetDeep} />
                </View>
                <View>
                  <Text className="font-sans-semibold" style={{ fontSize: 14, color: C.ink }}>
                    Analytics
                  </Text>
                  <Text className="font-sans" style={{ fontSize: 11.5, color: C.sub, marginTop: 2 }}>
                    Uptime &amp; faults
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── DETAILS / EDIT FIELDS ──────────────────────────── */}
        {isEditing ? (
          <View style={{ ...CARD, gap: 16 }}>
            <Field
              label="Account name"
              icon="user"
              focused={nameFocused}
              invalid={!nameValid}
              hint={nameValid ? 'Appears on your tickets and invoices' : 'Name must be at least 2 characters'}
              hintColor={nameValid ? C.muted : C.dangerInk}
            >
              <TextInput
                value={name}
                onChangeText={setName}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                placeholder="Enter your full name"
                placeholderTextColor={C.muted}
                className="font-sans-semibold"
                style={{ flex: 1, minWidth: 0, fontSize: 14, color: C.ink, paddingVertical: 14 }}
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
                className="font-sans-semibold"
                style={{ flex: 1, minWidth: 0, fontSize: 14, color: C.ink, paddingVertical: 14 }}
              />
            </Field>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 11,
                backgroundColor: C.bg,
                borderRadius: 18,
                paddingHorizontal: 14,
                paddingVertical: 13,
              }}
            >
              <Feather name="lock" size={16} color={C.muted} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  className="font-sans-medium"
                  style={{ fontSize: 10.5, letterSpacing: 0.9, textTransform: 'uppercase', color: C.muted }}
                >
                  Email address
                </Text>
                <Text
                  className="font-sans-semibold"
                  style={{ fontSize: 13, color: C.sub, marginTop: 3 }}
                  numberOfLines={1}
                >
                  {user?.email || 'Not provided'}
                </Text>
              </View>
              <Text className="font-sans-medium" style={{ fontSize: 11, color: C.muted }}>
                Ask support
              </Text>
            </View>
          </View>
        ) : (
          <View style={{ ...CARD, gap: 14 }}>
            <Text className="font-sans-semibold" style={{ fontSize: 15, color: C.ink }}>
              Contact details
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 14,
                  backgroundColor: C.field,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Feather name="mail" size={17} color={C.sub} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  className="font-sans-medium"
                  style={{ fontSize: 10.5, letterSpacing: 0.9, textTransform: 'uppercase', color: C.muted }}
                >
                  Email address
                </Text>
                <Text
                  className="font-sans-semibold"
                  style={{ fontSize: 13.5, color: C.ink, marginTop: 3 }}
                  numberOfLines={1}
                >
                  {user?.email || 'Not provided'}
                </Text>
              </View>
              <Text
                className="font-sans-medium"
                style={{ fontSize: 10, letterSpacing: 0.9, textTransform: 'uppercase', color: C.muted }}
              >
                Locked
              </Text>
            </View>

            <View style={{ height: 1, backgroundColor: C.rule }} />

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 14,
                  backgroundColor: C.field,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Feather name="phone" size={17} color={C.sub} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  className="font-sans-medium"
                  style={{ fontSize: 10.5, letterSpacing: 0.9, textTransform: 'uppercase', color: C.muted }}
                >
                  Phone number
                </Text>
                {user?.phone ? (
                  <Text className="font-sans-semibold" style={{ fontSize: 13.5, color: C.ink, marginTop: 3 }}>
                    {user.phone}
                  </Text>
                ) : (
                  <Text className="font-sans" style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>
                    Not on file — we use it for outage calls
                  </Text>
                )}
              </View>
              {!user?.phone && (
                <TouchableOpacity
                  onPress={() => setIsEditing(true)}
                  activeOpacity={0.85}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    backgroundColor: C.mint,
                    borderRadius: 999,
                    paddingHorizontal: 13,
                    paddingVertical: 9,
                  }}
                >
                  <Feather name="plus" size={12} color={C.mintInk} />
                  <Text className="font-sans-semibold" style={{ fontSize: 11.5, color: C.mintInk }}>
                    Add
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* ── LOG OUT ────────────────────────────────────────── */}
        {!isEditing && (
          <TouchableOpacity
            onPress={logout}
            activeOpacity={0.85}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 9,
              backgroundColor: C.dangerBg,
              borderRadius: 999,
              minHeight: 54,
            }}
          >
            <Feather name="log-out" size={17} color={C.dangerInk} />
            <Text className="font-sans-semibold" style={{ fontSize: 14.5, color: C.dangerInk }}>
              Log out
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ── STICKY SAVE BAR (edit state) ─────────────────────── */}
      {isEditing && (
        <View
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: 24,
            flexDirection: 'row',
            gap: 10,
          }}
        >
          <TouchableOpacity
            onPress={handleCancelEdit}
            activeOpacity={0.85}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: C.card,
              borderRadius: 999,
              minHeight: 56,
              shadowColor: '#151233',
              shadowOpacity: 0.1,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 4,
            }}
          >
            <Text className="font-sans-semibold" style={{ fontSize: 14.5, color: C.sub }}>
              Cancel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving || !nameValid}
            activeOpacity={0.85}
            style={{
              flex: 2,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: nameValid ? C.violet : C.violetDim,
              borderRadius: 999,
              minHeight: 56,
              shadowColor: '#151233',
              shadowOpacity: 0.12,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 4,
            }}
          >
            {isSaving ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Feather name="check" size={16} color={nameValid ? '#ffffff' : C.muted} />
                <Text
                  className="font-sans-semibold"
                  style={{ fontSize: 14.5, color: nameValid ? '#ffffff' : C.muted }}
                >
                  Save changes
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}