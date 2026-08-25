// src/components/RaiseTicketForm.js
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useConnectionsByEmail, useMyConnections } from '../hooks/useCustomers';
import { useCategories, useCreateTicket } from '../hooks/useTickets';
import { haptics } from '../utils/haptics';
import ConnectionPicker from './ConnectionPicker';

const MAX_IMAGES = 10;
const MAX_ALTERNATE_EMAILS = 3;
const MAX_MESSAGE = 600;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ── palette (matches design 9a) ───────────────────────────── */
const C = {
  bg: '#f3f2fd',
  card: '#ffffff',
  ink: '#151233',
  inkSoft: '#3a3670',
  sub: '#6d6a96',
  muted: '#9d9ac0',
  rule: '#eeecf9',
  field: '#f7f6ff',
  violet: '#6c5ce7',
  violetDeep: '#4a34c7',
  violetSoft: '#ebe8ff',
  violetDim: '#d8d5f0',
  mint: '#12b886',
  idle: '#c3c0e2',
  dangerBg: '#fee7ea',
  dangerInk: '#b0233f',
};

const MONO = 'ui-monospace';

const SHADOW_SM = {
  shadowColor: '#151233',
  shadowOpacity: 0.06,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
};

const SHADOW_LG = {
  shadowColor: '#151233',
  shadowOpacity: 0.14,
  shadowRadius: 22,
  shadowOffset: { width: 0, height: 10 },
  elevation: 6,
};

function iconForCategory(cat) {
  const key = `${cat?.code || ''} ${cat?.name || ''}`.toLowerCase();
  if (key.includes('bgp')) return 'server';
  if (key.includes('bts')) return 'radio';
  if (key.includes('latency')) return 'activity';
  if (key.includes('link fluctuating')) return 'activity';
  if (key.includes('link down')) return 'link-2';
  if (key.includes('packet')) return 'box';
  if (key.includes('slow')) return 'loader';
  if (key.includes('website')) return 'globe';
  return 'more-horizontal';
}

function formatBandwidth(bandwidth) {
  const n = Number(bandwidth);
  if (!bandwidth || Number.isNaN(n)) return '';
  if (n >= 1000) return `${+(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)} Gbps`;
  return `${n} Mbps`;
}

function SectionLabel({ children, required, meta }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: meta ? 'space-between' : 'flex-start',
        gap: 7,
        paddingHorizontal: 4,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 7 }}>
        <Text
          className="font-sans-semibold"
          style={{ fontSize: 10.5, letterSpacing: 1.4, textTransform: 'uppercase', color: C.sub }}
        >
          {children}
        </Text>
        {required ? (
          <Text className="font-sans-semibold" style={{ fontSize: 10.5, color: C.violet }}>
            Required
          </Text>
        ) : null}
      </View>
      {meta ? (
        <Text style={{ fontFamily: MONO, fontSize: 10.5, color: C.muted }}>{meta}</Text>
      ) : null}
    </View>
  );
}

function ErrorBanner({ children }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 9,
        backgroundColor: C.dangerBg,
        borderRadius: 18,
        padding: 14,
      }}
    >
      <Feather name="alert-circle" size={17} color={C.dangerInk} style={{ marginTop: 1 }} />
      <Text className="font-sans-medium" style={{ flex: 1, fontSize: 13, lineHeight: 19, color: C.dangerInk }}>
        {children}
      </Text>
    </View>
  );
}

export default function RaiseTicketForm({ role, listPath }) {
  const router = useRouter();
  const isSales = role === 'SALES';

  // --- Sales verification state ---
  const [customerEmail, setCustomerEmail] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState(null);
  const [noResultsForEmail, setNoResultsForEmail] = useState(false);

  const verifyMutation = useConnectionsByEmail();
  const isVerified = isSales ? !!verifiedEmail : true;

  // --- Ticket form state ---
  const [category, setCategory] = useState(null);
  const [alternateEmailInput, setAlternateEmailInput] = useState('');
  const [alternateEmails, setAlternateEmails] = useState([]);
  const [message, setMessage] = useState('');
  const [messageFocused, setMessageFocused] = useState(false);
  const [ccFocused, setCcFocused] = useState(false);
  const [images, setImages] = useState([]);

  const { mutate, isPending, error } = useCreateTicket();
  const { data: categories, isLoading: categoriesLoading } = useCategories();

  const { circuitId: prefilledCircuitId } = useLocalSearchParams();

  // Customers load their own connections. Sales agents load the verified
  // customer's connections instead — this query stays disabled until then.
  const { data: myConnectionsData } = useMyConnections({ enabled: !isSales });

  const connections = isSales
    ? verifyMutation.data?.connections || []
    : myConnectionsData?.connections || [];

  const [selectedCircuit, setSelectedCircuit] = useState(null);
  const [circuitPickerOpen, setCircuitPickerOpen] = useState(false);

  useEffect(() => {
    if (prefilledCircuitId && connections.length > 0) {
      const match = connections.find((c) => c.fabCircuitId === prefilledCircuitId);
      if (match) setSelectedCircuit(match);
    }
  }, [prefilledCircuitId, connections]);

  const handleVerify = () => {
    const email = customerEmail.trim().toLowerCase();
    if (!email || !EMAIL_REGEX.test(email)) {
      Alert.alert('Invalid', 'Please enter a valid customer email.');
      return;
    }
    setNoResultsForEmail(false);
    verifyMutation.mutate(email, {
      onSuccess: (data) => {
        const circuits = data?.connections || [];
        if (circuits.length === 0) {
          setNoResultsForEmail(true);
          return;
        }
        setVerifiedEmail(email);
      },
    });
  };

  const handleResetVerification = () => {
    setVerifiedEmail(null);
    setNoResultsForEmail(false);
    setSelectedCircuit(null);
    verifyMutation.reset();
  };

  const addAlternateEmail = () => {
    const email = alternateEmailInput.trim();
    if (!email) return;
    if (!EMAIL_REGEX.test(email)) {
      Alert.alert('Invalid', 'Please enter a valid email.');
      return;
    }
    if (alternateEmails.length >= MAX_ALTERNATE_EMAILS) {
      Alert.alert('Limit reached', `Up to ${MAX_ALTERNATE_EMAILS} alternate emails allowed.`);
      return;
    }
    setAlternateEmails((prev) => [...prev, email]);
    setAlternateEmailInput('');
  };

  const removeAlternateEmail = (email) => {
    setAlternateEmails((prev) => prev.filter((e) => e !== email));
  };

  const pickImages = async () => {
    if (images.length >= MAX_IMAGES) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - images.length,
      quality: 0.7,
    });
    if (result.canceled) return;

    const compressed = await Promise.all(
      result.assets.map(async (asset) => {
        const manipulated = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 1280 } }],
          { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
        );
        haptics.light();
        return { ...asset, uri: manipulated.uri };
      })
    );
    setImages((prev) => [...prev, ...compressed]);
  };

  const captureImage = async () => {
    if (images.length >= MAX_IMAGES) return;

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Camera permission needed',
        'Enable camera access in your device settings to take a photo.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (result.canceled) return;

    const manipulated = await ImageManipulator.manipulateAsync(
      result.assets[0].uri,
      [{ resize: { width: 1280 } }],
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
    );

    setImages((prev) => [...prev, { ...result.assets[0], uri: manipulated.uri }]);
  };

  const removeImage = (uri) => {
    setImages((prev) => prev.filter((img) => img.uri !== uri));
  };

  const validate = () => {
    if (isSales && !verifiedEmail) return 'Please verify a customer email first.';
    if (!category) return 'Please select a category.';
    if (!selectedCircuit) return 'Please select a circuit.';
    return null;
  };

  const handleSubmit = () => {
    const validationError = validate();

    if (validationError) {
      Alert.alert('Hold up', validationError);
      return;
    }

    const formData = new FormData();

    // Explicitly cast IDs and other fields to Strings
    if (isSales) formData.append('customerEmail', String(verifiedEmail));
    formData.append('issueCategoryId', String(category.id));
    formData.append('circuitDescription', String(selectedCircuit.fabCircuitId));

    if (message.trim()) formData.append('message', message.trim());

    if (alternateEmails.length === 1) {
      formData.append('alternateEmail', String(alternateEmails[0]));
    } else {
      alternateEmails.forEach((email) => formData.append('alternateEmail', String(email)));
    }

    images.forEach((img, index) => {
      formData.append('files', {
        uri: img.uri,
        name: img.fileName || `ticket-${Date.now()}-${index}.jpg`,
        type: img.mimeType || 'image/jpeg',
      });
    });


    mutate(formData, {
      onSuccess: () => {
        haptics.success();
        router.replace(listPath);
      },
      onError: (err) => {
        haptics.error();
        Alert.alert(
          'Server Error',
          err?.response?.data?.details
            ? err.response.data.details.map((d) => `${d.path}: ${d.message}`).join('\n')
            : JSON.stringify(err?.response?.data || err.message)
        );
      },
    });
  };

  const headerTitle =
    isSales && !isVerified ? 'Who is this ticket for?' : 'What seems to be the problem?';
  const headerSubtitle =
    isSales && !isVerified
      ? "Enter the customer's email to pull up their circuits."
      : 'Pick a category and tell us a bit more — we route it from there.';

  const ready = !validate();
  const submitLine = ready
    ? `${category?.name} · ${selectedCircuit?.fabCircuitId}`
    : validate();

  const circuitMeta = selectedCircuit
    ? [
      selectedCircuit.serviceType,
      formatBandwidth(selectedCircuit.bandwidth),
      selectedCircuit.installationCode || selectedCircuit.aEndBtsId,
    ]
      .filter(Boolean)
      .join(' · ')
    : 'Required';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Conversational header */}
      <View style={{ paddingTop: 34, paddingBottom: 6, paddingHorizontal: 20 }}>
        <Text
          className="font-sans-semibold"
          style={{ fontSize: 10.5, letterSpacing: 1.4, textTransform: 'uppercase', color: C.violetDeep }}
        >
          New ticket
        </Text>
        <Text
          className="font-sans-semibold"
          style={{ fontSize: 29, lineHeight: 34, color: C.ink, marginTop: 4 }}
        >
          {headerTitle}
        </Text>
        <Text className="font-sans" style={{ fontSize: 13, lineHeight: 19, color: C.sub, marginTop: 6 }}>
          {headerSubtitle}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 170, gap: 18 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ---------------- SALES: STEP 1 — VERIFICATION ---------------- */}
        {isSales && !isVerified && (
          <>
            {verifyMutation.isError && (
              <ErrorBanner>
                {verifyMutation.error?.message || 'Something went wrong looking up this customer.'}
              </ErrorBanner>
            )}

            {noResultsForEmail && (
              <ErrorBanner>
                No connections found for this email. Double-check the address and try again.
              </ErrorBanner>
            )}

            <View style={{ gap: 10 }}>
              <SectionLabel required>Customer email</SectionLabel>
              <View
                style={[
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    backgroundColor: C.card,
                    borderRadius: 999,
                    borderWidth: 1.5,
                    borderColor: emailFocused ? C.violet : 'transparent',
                    paddingHorizontal: 16,
                    minHeight: 54,
                  },
                  SHADOW_SM,
                ]}
              >
                <Feather name="mail" size={16} color={C.muted} />
                <TextInput
                  value={customerEmail}
                  onChangeText={(v) => {
                    setCustomerEmail(v);
                    if (noResultsForEmail) setNoResultsForEmail(false);
                  }}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  onSubmitEditing={handleVerify}
                  placeholder="name@customer.com"
                  placeholderTextColor={C.muted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!verifyMutation.isPending}
                  className="font-sans"
                  style={{ flex: 1, minWidth: 0, fontSize: 14, color: C.ink, paddingVertical: 14 }}
                />
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.88}
              onPress={handleVerify}
              disabled={verifyMutation.isPending}
              style={[
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  minHeight: 54,
                  borderRadius: 999,
                  backgroundColor: verifyMutation.isPending ? C.violetDim : C.violet,
                },
                verifyMutation.isPending ? null : SHADOW_LG,
              ]}
            >
              {verifyMutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Text className="font-sans-semibold" style={{ fontSize: 14.5, color: '#ffffff' }}>
                    Verify customer
                  </Text>
                  <Feather name="arrow-up-right" size={15} color="#ffffff" />
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* ---------------- SALES: STEP 2 / CUSTOMER FLOW — FULL FORM ---------------- */}
        {isVerified && (
          <>
            {error && (
              <ErrorBanner>
                {error?.response?.data?.details?.length
                  ? error.response.data.details.map((d) => `${d.path}: ${d.message}`).join('  •  ')
                  : error?.response?.data?.message || error.message || 'Something went wrong.'}
              </ErrorBanner>
            )}

            {isSales && (
              <View
                style={[
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    backgroundColor: C.violetSoft,
                    borderRadius: 20,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1, minWidth: 0 }}>
                  <Feather name="check-circle" size={16} color={C.violetDeep} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      className="font-sans-semibold"
                      style={{ fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: C.violetDeep }}
                    >
                      Verified customer
                    </Text>
                    <Text
                      className="font-sans-semibold"
                      style={{ fontSize: 13, color: C.ink, marginTop: 2 }}
                      numberOfLines={1}
                    >
                      {verifiedEmail}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={handleResetVerification} activeOpacity={0.7}>
                  <Text className="font-sans-semibold" style={{ fontSize: 13, color: C.violetDeep }}>
                    Change
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Category — full grid, nothing hidden off-screen */}
            <View style={{ gap: 10 }}>
              <SectionLabel required>Category</SectionLabel>

              {categoriesLoading ? (
                <View style={{ height: 56, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator color={C.violet} />
                </View>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
                  {(categories || []).map((cat) => {
                    const isSelected = category?.id === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        activeOpacity={0.85}
                        onPress={() => setCategory(cat)}
                        style={{
                          width: '48.4%',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 9,
                          minHeight: 52,
                          padding: 12,
                          borderRadius: 18,
                          borderWidth: 1.5,
                          borderColor: isSelected ? C.ink : C.rule,
                          backgroundColor: isSelected ? C.ink : C.card,
                        }}
                      >
                        <Feather
                          name={iconForCategory(cat)}
                          size={17}
                          color={isSelected ? C.idle : C.sub}
                        />
                        <Text
                          className="font-sans-semibold"
                          style={{
                            flex: 1,
                            minWidth: 0,
                            fontSize: 12.5,
                            lineHeight: 15,
                            color: isSelected ? '#ffffff' : C.ink,
                          }}
                        >
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Affected circuit */}
            <View style={{ gap: 10 }}>
              <SectionLabel required>Affected circuit</SectionLabel>
              <Pressable
                onPress={() => setCircuitPickerOpen(true)}

                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    backgroundColor: C.card,
                    borderRadius: 20,
                    padding: 14,
                    minHeight: 64,
                    opacity: pressed ? 0.9 : 1,
                  },
                  SHADOW_SM,
                ]}
                className={`flex-row gap-[12px] p-[14px] rounded-[12px] min-h-[64px] bg-white`}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 13,
                    backgroundColor: C.violetSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}

                >
                  <Feather name="server" size={17} color={C.violetDeep} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }} >
                  <Text
                    style={{
                      fontFamily: MONO,
                      fontWeight: '700',
                      fontSize: 14,
                      letterSpacing: -0.3,
                      color: selectedCircuit ? C.ink : C.muted,
                    }}
                    numberOfLines={1}
                  >
                    {selectedCircuit ? selectedCircuit.fabCircuitId : 'Choose the affected circuit'}
                  </Text>
                  <Text
                    className="font-sans-medium"
                    style={{ fontSize: 11, color: C.muted, marginTop: 3 }}
                    numberOfLines={1}
                  >
                    {circuitMeta}
                  </Text>
                </View>
                <Feather name="chevron-down" size={17} color={C.muted} />
              </Pressable>

              <ConnectionPicker
                visible={circuitPickerOpen}
                connections={connections}
                selectedId={selectedCircuit?.fabCircuitId}
                onSelect={setSelectedCircuit}
                onClose={() => setCircuitPickerOpen(false)}
              />
            </View>

            {/* Description */}
            <View style={{ gap: 10 }}>
              <SectionLabel meta={`${message.length}/${MAX_MESSAGE}`}>What is happening</SectionLabel>
              <View
                style={[
                  {
                    backgroundColor: C.card,
                    borderRadius: 20,
                    borderWidth: 1.5,
                    borderColor: messageFocused ? C.violet : 'transparent',
                    padding: 14,
                  },
                  SHADOW_SM,
                ]}
              >
                <TextInput
                  value={message}
                  onChangeText={setMessage}
                  onFocus={() => setMessageFocused(true)}
                  onBlur={() => setMessageFocused(false)}
                  maxLength={MAX_MESSAGE}
                  placeholder="Since when, which sites are affected, anything you already tried…"
                  placeholderTextColor={C.muted}
                  multiline
                  textAlignVertical="top"
                  className="font-sans"
                  style={{ minHeight: 104, fontSize: 13.5, lineHeight: 20, color: C.ink }}
                />
              </View>
            </View>

            {/* CC emails */}
            <View style={{ gap: 10 }}>
              <SectionLabel meta={`${alternateEmails.length}/${MAX_ALTERNATE_EMAILS}`}>
                Keep in the loop
              </SectionLabel>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View
                  style={[
                    {
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      backgroundColor: C.card,
                      borderRadius: 999,
                      borderWidth: 1.5,
                      borderColor: ccFocused ? C.violet : 'transparent',
                      paddingHorizontal: 16,
                      minHeight: 52,
                    },
                    SHADOW_SM,
                  ]}
                >
                  <Feather name="mail" size={16} color={C.muted} />
                  <TextInput
                    value={alternateEmailInput}
                    onChangeText={setAlternateEmailInput}
                    onFocus={() => setCcFocused(true)}
                    onBlur={() => setCcFocused(false)}
                    placeholder="team@company.com"
                    placeholderTextColor={C.muted}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    onSubmitEditing={addAlternateEmail}
                    className="font-sans"
                    style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: C.ink, paddingVertical: 13 }}
                  />
                </View>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={addAlternateEmail}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    backgroundColor: C.ink,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Feather name="plus" size={18} color={C.bg} />
                </TouchableOpacity>
              </View>

              {alternateEmails.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {alternateEmails.map((email) => (
                    <View
                      key={email}
                      style={[
                        {
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                          backgroundColor: C.card,
                          borderRadius: 999,
                          paddingLeft: 14,
                          paddingRight: 10,
                          paddingVertical: 8,
                        },
                        SHADOW_SM,
                      ]}
                    >
                      <Text className="font-sans-medium" style={{ fontSize: 12, color: C.inkSoft }}>
                        {email}
                      </Text>
                      <Pressable
                        onPress={() => removeAlternateEmail(email)}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          backgroundColor: C.bg,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Feather name="x" size={12} color={C.sub} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Attachments */}
            <View style={{ gap: 10 }}>
              <SectionLabel meta={`${images.length}/${MAX_IMAGES}`}>Screenshots</SectionLabel>

              {images.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                  {images.map((img) => (
                    <View key={img.uri} style={{ width: 80, height: 80 }}>
                      <Image
                        source={{ uri: img.uri }}
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: 16,
                          backgroundColor: C.violetSoft,
                        }}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                      />
                      <Pressable
                        onPress={() => removeImage(img.uri)}
                        style={{
                          position: 'absolute',
                          top: -6,
                          right: -6,
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: C.dangerInk,
                          borderWidth: 2.5,
                          borderColor: C.bg,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Feather name="x" size={11} color="#ffffff" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              {images.length < MAX_IMAGES && (
                <View style={{ flexDirection: 'row', gap: 10 }}>

                  <Pressable
                    onPress={pickImages}
                    style={({ pressed }) => ({
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      minHeight: 58,
                      borderRadius: 18,
                      borderWidth: 1.5,
                      borderStyle: 'dashed',
                      borderColor: C.violetDim,
                      backgroundColor: pressed ? C.field : C.card,
                    })}
                    className='flex-row items-center justify-center gap-2 min-h-[58px] rounded-[18px] border-dashed border bg-white flex-1 border-[#d8d5f0]'
                  >
                    <Feather name="image" size={17} color={C.violetDeep} />
                    <Text className="font-sans-semibold" style={{ fontSize: 12.5, color: C.violetDeep }}>
                      Gallery
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={captureImage}
                    style={({ pressed }) => ({
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      minHeight: 58,
                      borderRadius: 18,
                      borderWidth: 1.5,
                      borderStyle: 'dashed',
                      borderColor: C.violetDim,
                      backgroundColor: pressed ? C.field : C.card,
                    })}
                    className='flex-row items-center justify-center gap-2 min-h-[58px] rounded-[18px] border-dashed border bg-white flex-1 border-[#d8d5f0]'
                  >
                    <Feather name="camera" size={17} color={C.violetDeep} />
                    <Text className="font-sans-semibold" style={{ fontSize: 12.5, color: C.violetDeep }}>
                      Camera
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Sticky submit bar — states what is still missing instead of a dead button */}
      {isVerified && (
        <View
          style={[
            {
              position: 'absolute',
              left: 14,
              right: 14,
              bottom: 24,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              backgroundColor: C.card,
              borderRadius: 28,
              paddingLeft: 18,
              padding: 12,
            },
            SHADOW_LG,
          ]}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              className="font-sans-semibold"
              style={{ fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: C.muted }}
            >
              Ticket
            </Text>
            <Text
              className="font-sans-semibold"
              style={{ fontSize: 12, color: C.inkSoft, marginTop: 3 }}
              numberOfLines={1}
            >
              {submitLine}
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleSubmit}
            disabled={isPending}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              minHeight: 52,
              paddingHorizontal: 20,
              borderRadius: 999,
              backgroundColor: ready && !isPending ? C.violet : C.violetDim,
            }}
          >
            {isPending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Text
                  className="font-sans-semibold"
                  style={{ fontSize: 14, color: ready ? '#ffffff' : C.muted }}
                >
                  Submit
                </Text>
                <Feather name="arrow-up-right" size={15} color={ready ? '#ffffff' : C.muted} />
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}