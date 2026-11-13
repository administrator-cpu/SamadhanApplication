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
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View, StyleSheet,
} from 'react-native';
import Screen, { ScreenScrollView, StickyFooter } from './layout/Screen';
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

// Sticky submit bar height (~76) + its gap, so focused inputs clear it.
const SUBMIT_BAR_SPACE = 110;

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
      className={`flex-row items-baseline gap-[7px] px-[4px] ${meta ? 'justify-between' : 'justify-start'}`}
    >
      <View className="flex-row items-baseline gap-[7px]">
        <Text
          className="font-sans-semibold text-[10.5px] tracking-[1.4px] uppercase text-[#6d6a96]"
        >
          {children}
        </Text>
        {required ? (
          <Text className="font-sans-semibold text-[10.5px] text-[#6c5ce7]">
            Required
          </Text>
        ) : null}
      </View>
      {meta ? (
        <Text className="font-[ui-monospace] text-[10.5px] text-[#9d9ac0]">{meta}</Text>
      ) : null}
    </View>
  );
}

function ErrorBanner({ children }) {
  return (
    <View
      className="flex-row items-start gap-[9px] bg-[#fee7ea] rounded-[18px] p-[14px]"
    >
      <View className="mt-[1px]">
        <Feather name="alert-circle" size={17} color={C.dangerInk} />
      </View>
      <Text className="font-sans-medium flex-1 text-[13px] leading-[19px] text-[#b0233f]">
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
      selectedCircuit.installationCode || (selectedCircuit.bEndBtsId === "N/A" ? selectedCircuit.aEndBtsId : selectedCircuit.bEndBtsId),
    ]
      .filter(Boolean)
      .join(' · ')
    : 'Required';

  return (
    <Screen className="bg-[#f3f2fd]">
      {/* Conversational header */}
      <View className="pt-[10px] pb-[6px] px-[16px] std:px-[20px]">
        <Text
          className="font-sans-semibold text-[10.5px] tracking-[1.4px] uppercase text-[#4a34c7]"
        >
          New ticket
        </Text>
        <Text
          className="font-sans-semibold text-[29px] leading-[34px] text-[#151233] mt-[4px]"
        >
          {headerTitle}
        </Text>
        <Text className="font-sans text-[13px] leading-[19px] text-[#6d6a96] mt-[6px]">
          {headerSubtitle}
        </Text>
      </View>

      <ScreenScrollView
        className="flex-1"
        keyboard
        keyboardOffset={isVerified ? SUBMIT_BAR_SPACE : 24}
        endSpace={isVerified ? SUBMIT_BAR_SPACE : 24}
        contentContainerClassName="px-[12px] std:px-[16px] pt-[18px] gap-[18px]"
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

            <View className="gap-[10px]">
              <SectionLabel required>Customer email</SectionLabel>
              <View
                className={`flex-row items-center gap-[10px] bg-[#ffffff] rounded-[999px] border-[1.5px] px-[12px] std:px-[16px] min-h-[54px] ${emailFocused ? 'border-[#6c5ce7]' : 'border-transparent'}`}
                style={sx.shadowSm}
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
                  className="font-sans flex-1 min-w-0 text-[14px] text-[#151233] py-[14px]"
                />
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.88}
              onPress={handleVerify}
              disabled={verifyMutation.isPending}
              className={`flex-row items-center justify-center gap-[8px] min-h-[54px] rounded-[999px] ${verifyMutation.isPending ? 'bg-[#d8d5f0]' : 'bg-[#6c5ce7]'}`}
              style={verifyMutation.isPending ? undefined : sx.shadowLg}
            >
              {verifyMutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Text className="font-sans-semibold text-[14.5px] text-[#ffffff]">
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
              <View className="flex-row items-center justify-between gap-[12px] bg-[#ebe8ff] rounded-[20px] px-[12px] std:px-[16px] py-[14px]">
                <View className="flex-row items-center gap-[9px] flex-1 min-w-0">
                  <Feather name="check-circle" size={16} color={C.violetDeep} />
                  <View className="flex-1 min-w-0">
                    <Text
                      className="font-sans-semibold text-[10px] tracking-[1.2px] uppercase text-[#4a34c7]"
                    >
                      Verified customer
                    </Text>
                    <Text
                      className="font-sans-semibold text-[13px] text-[#151233] mt-[2px]"
                      numberOfLines={1}
                    >
                      {verifiedEmail}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={handleResetVerification} activeOpacity={0.7}>
                  <Text className="font-sans-semibold text-[13px] text-[#4a34c7]">
                    Change
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Category — full grid, nothing hidden off-screen */}
            <View className="gap-[10px]">
              <SectionLabel required>Category</SectionLabel>

              {categoriesLoading ? (
                <View className="h-[56px] items-center justify-center">
                  <ActivityIndicator color={C.violet} />
                </View>
              ) : (
                <View className="flex-row flex-wrap gap-[9px]">
                  {(categories || []).map((cat) => {
                    const isSelected = category?.id === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        activeOpacity={0.85}
                        onPress={() => setCategory(cat)}
                        className={`w-[48.4%] flex-row items-center gap-[9px] min-h-[52px] p-[12px] rounded-[18px] border-[1.5px] ${isSelected ? 'border-[#151233] bg-[#151233]' : 'border-[#eeecf9] bg-[#ffffff]'}`}
                      >
                        <Feather
                          name={iconForCategory(cat)}
                          size={17}
                          color={isSelected ? C.idle : C.sub}
                        />
                        <Text
                          className={`font-sans-semibold flex-1 min-w-0 text-[12.5px] leading-[15px] ${isSelected ? 'text-[#ffffff]' : 'text-[#151233]'}`}
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
            <View className="gap-[10px]">
              <SectionLabel required>Affected circuit</SectionLabel>
              <Pressable
                onPress={() => setCircuitPickerOpen(true)}

                style={sx.shadowSm}
                className="flex-row items-center gap-[12px] bg-[#ffffff] rounded-[20px] p-[14px] min-h-[64px] active:opacity-90"
              >
                <View
                  className="w-[38px] h-[38px] rounded-[13px] bg-[#ebe8ff] items-center justify-center"

                >
                  <Feather name="server" size={17} color={C.violetDeep} />
                </View>
                <View className="flex-1 min-w-0" >
                  <Text
                    className={`font-[ui-monospace] font-bold text-[14px] tracking-[-0.3px] ${selectedCircuit ? 'text-[#151233]' : 'text-[#9d9ac0]'}`}
                    numberOfLines={1}
                  >
                    {selectedCircuit ? selectedCircuit.fabCircuitId : 'Choose the affected circuit'}
                  </Text>
                  <Text
                    className="font-sans-medium text-[11px] text-[#9d9ac0] mt-[3px]"
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
            <View className="gap-[10px]">
              <SectionLabel meta={`${message.length}/${MAX_MESSAGE}`}>What is happening</SectionLabel>
              <View
                className={`bg-[#ffffff] rounded-[20px] border-[1.5px] p-[14px] ${messageFocused ? 'border-[#6c5ce7]' : 'border-transparent'}`}
                style={sx.shadowSm}
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
                  className="font-sans min-h-[104px] text-[13.5px] leading-[20px] text-[#151233]"
                />
              </View>
            </View>

            {/* CC emails */}
            <View className="gap-[10px]">
              <SectionLabel meta={`${alternateEmails.length}/${MAX_ALTERNATE_EMAILS}`}>
                Keep in the loop
              </SectionLabel>
              <View className="flex-row gap-[10px]">
                <View
                  className={`flex-1 flex-row items-center gap-[10px] bg-[#ffffff] rounded-[999px] border-[1.5px] px-[12px] std:px-[16px] min-h-[52px] ${ccFocused ? 'border-[#6c5ce7]' : 'border-transparent'}`}
                  style={sx.shadowSm}
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
                    className="font-sans flex-1 min-w-0 text-[13.5px] text-[#151233] py-[13px]"
                  />
                </View>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={addAlternateEmail}
                  className="w-[52px] h-[52px] rounded-[26px] bg-[#151233] items-center justify-center"
                >
                  <Feather name="plus" size={18} color={C.bg} />
                </TouchableOpacity>
              </View>

              {alternateEmails.length > 0 && (
                <View className="flex-row flex-wrap gap-[8px]">
                  {alternateEmails.map((email) => (
                    <View
                      key={email}
                      className="flex-row items-center gap-[8px] bg-[#ffffff] rounded-[999px] pl-[14px] pr-[10px] py-[8px]"
                      style={sx.shadowSm}
                    >
                      <Text className="font-sans-medium text-[12px] text-[#3a3670]">
                        {email}
                      </Text>
                      <Pressable
                        onPress={() => removeAlternateEmail(email)}
                        className="w-[22px] h-[22px] rounded-[11px] bg-[#f3f2fd] items-center justify-center"
                      >
                        <Feather name="x" size={12} color={C.sub} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Attachments */}
            <View className="gap-[10px]">
              <SectionLabel meta={`${images.length}/${MAX_IMAGES}`}>Screenshots</SectionLabel>

              {images.length > 0 && (
                <View className="flex-row flex-wrap gap-[12px]">
                  {images.map((img) => (
                    <View key={img.uri} className="w-[80px] h-[80px]">
                      <Image
                        source={{ uri: img.uri }}
                        className="w-[80px] h-[80px] rounded-[16px] bg-[#ebe8ff]"
                        contentFit="cover"
                        cachePolicy="memory-disk"
                      />
                      <Pressable
                        onPress={() => removeImage(img.uri)}
                        className="absolute top-[-6px] right-[-6px] w-[24px] h-[24px] rounded-[12px] bg-[#b0233f] border-[2.5px] border-[#f3f2fd] items-center justify-center"
                      >
                        <Feather name="x" size={11} color="#ffffff" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              {images.length < MAX_IMAGES && (
                <View className="flex-row gap-[10px]">

                  <Pressable
                    onPress={pickImages}
                    className="flex-1 flex-row items-center justify-center gap-[8px] min-h-[58px] rounded-[18px] border-[1.5px] border-dashed border-[#d8d5f0] bg-[#ffffff] active:bg-[#f7f6ff]"
                  >
                    <Feather name="image" size={17} color={C.violetDeep} />
                    <Text className="font-sans-semibold text-[12.5px] text-[#4a34c7]">
                      Gallery
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={captureImage}
                    className="flex-1 flex-row items-center justify-center gap-[8px] min-h-[58px] rounded-[18px] border-[1.5px] border-dashed border-[#d8d5f0] bg-[#ffffff] active:bg-[#f7f6ff]"
                  >
                    <Feather name="camera" size={17} color={C.violetDeep} />
                    <Text className="font-sans-semibold text-[12.5px] text-[#4a34c7]">
                      Camera
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </>
        )}
      </ScreenScrollView>

      {/* Sticky submit bar — states what is still missing instead of a dead button */}
      {isVerified && (
        <StickyFooter className="px-[14px]">
        <View
          className="flex-row items-center gap-[12px] bg-[#ffffff] rounded-[28px] p-[12px] pl-[18px]"
          style={sx.shadowLg}
        >
          <View className="flex-1 min-w-0">
            <Text
              className="font-sans-semibold text-[10px] tracking-[1.4px] uppercase text-[#9d9ac0]"
            >
              Ticket
            </Text>
            <Text
              className="font-sans-semibold text-[12px] text-[#3a3670] mt-[3px]"
              numberOfLines={1}
            >
              {submitLine}
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleSubmit}
            disabled={isPending}
            className={`flex-row items-center justify-center gap-[8px] min-h-[52px] px-[16px] std:px-[20px] rounded-[999px] ${ready && !isPending ? 'bg-[#6c5ce7]' : 'bg-[#d8d5f0]'}`}
          >
            {isPending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Text
                  className={`font-sans-semibold text-[14px] ${ready ? 'text-[#ffffff]' : 'text-[#9d9ac0]'}`}
                >
                  Submit
                </Text>
                <Feather name="arrow-up-right" size={15} color={ready ? '#ffffff' : C.muted} />
              </>
            )}
          </TouchableOpacity>
        </View>
        </StickyFooter>
      )}
    </Screen>
  );
}

const sx = StyleSheet.create({
  shadowSm: {
    shadowColor: '#151233',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  shadowLg: {
    shadowColor: '#151233',
    shadowOpacity: 0.14,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
});
