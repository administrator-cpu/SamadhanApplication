// src/components/RaiseTicketForm.js
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import ConnectionPicker from './ConnectionPicker';
import { useCreateTicket, useCategories } from '../hooks/useTickets';
import { useMyConnections, useConnectionsByEmail } from '../hooks/useCustomers';

const MAX_IMAGES = 10;
const MAX_ALTERNATE_EMAILS = 3;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    if (!result.canceled) {
      setImages((prev) => [...prev, ...result.assets]);
    }
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
    if (isSales) formData.append('customerEmail', verifiedEmail);
    formData.append('issueCategoryId', category.id);
    formData.append('circuitDescription', selectedCircuit.fabCircuitId);
    if (message.trim()) formData.append('message', message.trim());
    alternateEmails.forEach((email) => formData.append('alternateEmail', email));

    images.forEach((img, index) => {
      formData.append('files', {
        uri: img.uri,
        name: img.fileName || `ticket-${Date.now()}-${index}.jpg`,
        type: img.mimeType || 'image/jpeg',
      });
    });

    mutate(formData, {
      onSuccess: () => {
        router.replace(listPath);
      },
    });
  };

  const headerTitle =
    isSales && !isVerified ? 'Who is this ticket for?' : 'What seems to be the problem?';
  const headerSubtitle =
    isSales && !isVerified
      ? "Enter the customer's email to pull up their circuits."
      : "Pick a category and tell us a bit more — we'll route it to the right person.";

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg-base"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Conversational header */}
      <View className="pt-8 pb-2 px-6">
        <Text className="font-sans-semibold text-text-primary text-3xl leading-9">
          {headerTitle}
        </Text>
        <Text className="font-sans text-text-secondary mt-1.5 text-base">{headerSubtitle}</Text>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 24, gap: 24, paddingBottom: 160 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ---------------- SALES: STEP 1 — VERIFICATION ---------------- */}
        {isSales && !isVerified && (
          <>
            {verifyMutation.isError && (
              <View className="bg-error-bg rounded-2xl p-4 flex-row items-start">
                <Feather
                  name="alert-circle"
                  size={18}
                  color="#E0311F"
                  style={{ marginTop: 2, marginRight: 8 }}
                />
                <Text className="font-sans text-error-text flex-1 leading-5">
                  {verifyMutation.error?.message ||
                    'Something went wrong looking up this customer.'}
                </Text>
              </View>
            )}

            {noResultsForEmail && (
              <View className="bg-error-bg rounded-2xl p-4 flex-row items-start">
                <Feather
                  name="alert-circle"
                  size={18}
                  color="#E0311F"
                  style={{ marginTop: 2, marginRight: 8 }}
                />
                <Text className="font-sans text-error-text flex-1 leading-5">
                  No connections found for this email. Double-check the address and try again.
                </Text>
              </View>
            )}

            <View style={{ gap: 8 }}>
              <Text className="font-sans-semibold text-text-primary text-sm ml-1">
                Customer Email <Text className="text-primary-500">*</Text>
              </Text>
              <View
                className={`bg-surface rounded-2xl border shadow-sm ${
                  emailFocused ? 'border-text-secondary' : 'border-border'
                }`}
              >
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
                  placeholderTextColor="#948A7C"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!verifyMutation.isPending}
                  className="font-sans text-text-primary text-base px-5 h-14"
                />
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.88}
              onPress={handleVerify}
              disabled={verifyMutation.isPending}
              className={`h-14 rounded-full flex-row items-center justify-center ${
                verifyMutation.isPending ? 'bg-primary-200' : 'bg-primary-500 shadow-lg'
              }`}
            >
              {verifyMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text className="font-sans-semibold text-text-on-brand text-base mr-1.5">
                    Verify Customer
                  </Text>
                  <Feather name="arrow-up-right" size={16} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* ---------------- SALES: STEP 2 / CUSTOMER FLOW — FULL FORM ---------------- */}
        {isVerified && (
          <>
            {error && (
              <View className="bg-error-bg rounded-2xl p-4 flex-row items-start">
                <Feather
                  name="alert-circle"
                  size={18}
                  color="#E0311F"
                  style={{ marginTop: 2, marginRight: 8 }}
                />
                <Text className="font-sans text-error-text flex-1 leading-5">
                  {error.message || 'Something went wrong.'}
                </Text>
              </View>
            )}

            {isSales && (
              <View className="flex-row items-center justify-between bg-primary-50 rounded-2xl px-4 py-3.5 border border-primary-100">
                <View className="flex-row items-center flex-1 mr-3" style={{ gap: 8 }}>
                  <Feather name="check-circle" size={16} color="#FF5A36" />
                  <View className="flex-1">
                    <Text className="font-sans-semibold text-[10px] text-primary-600 uppercase tracking-wide">
                      Verified Customer
                    </Text>
                    <Text
                      className="font-sans-semibold text-text-primary text-sm"
                      numberOfLines={1}
                    >
                      {verifiedEmail}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={handleResetVerification} activeOpacity={0.7}>
                  <Text className="font-sans-semibold text-primary-600 text-sm">Change</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Tactile category chips — horizontal scroll */}
            <View style={{ gap: 8 }}>
              <Text className="font-sans-semibold text-text-primary text-sm ml-1">
                Issue Category <Text className="text-primary-500">*</Text>
              </Text>

              {categoriesLoading ? (
                <View className="h-14 items-center justify-center">
                  <ActivityIndicator color="#FF5A36" />
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingRight: 8, gap: 10 }}
                >
                  {(categories || []).map((cat) => {
                    const isSelected = category?.id === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        activeOpacity={0.85}
                        onPress={() => setCategory(cat)}
                        className={`flex-row items-center px-4 py-3 rounded-full border-2 ${
                          isSelected ? 'border-primary-500 bg-primary-50' : 'border-border bg-surface'
                        }`}
                      >
                        <Feather
                          name={iconForCategory(cat)}
                          size={15}
                          color={isSelected ? '#FF5A36' : '#5C5348'}
                          style={{ marginRight: 6 }}
                        />
                        <Text
                          className={`font-sans-semibold text-sm ${
                            isSelected ? 'text-primary-700' : 'text-text-primary'
                          }`}
                          numberOfLines={1}
                        >
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {/* Circuit selection */}
            <View style={{ gap: 8 }}>
              <Text className="font-sans-semibold text-text-primary text-sm ml-1">
                Circuit Description <Text className="text-primary-500">*</Text>
              </Text>
              <Pressable
                onPress={() => setCircuitPickerOpen(true)}
                className="flex-row items-center justify-between bg-surface border border-border rounded-2xl px-5 h-14 shadow-sm"
              >
                <Text
                  className={`font-sans text-base ${
                    selectedCircuit ? 'text-text-primary' : 'text-text-tertiary'
                  }`}
                >
                  {selectedCircuit ? selectedCircuit.fabCircuitId : 'Select Circuit ID'}
                </Text>
                <Feather name="chevron-down" size={20} color="#5C5348" />
              </Pressable>

              <ConnectionPicker
                visible={circuitPickerOpen}
                connections={connections}
                selectedId={selectedCircuit?.fabCircuitId}
                onSelect={setSelectedCircuit}
                onClose={() => setCircuitPickerOpen(false)}
              />
            </View>

            {/* Premium description input */}
            <View style={{ gap: 8 }}>
              <Text className="font-sans-semibold text-text-primary text-sm ml-1">
                Description
              </Text>
              <View
                className={`bg-surface rounded-2xl border shadow-sm ${
                  messageFocused ? 'border-text-secondary' : 'border-border'
                }`}
              >
                <TextInput
                  value={message}
                  onChangeText={setMessage}
                  onFocus={() => setMessageFocused(true)}
                  onBlur={() => setMessageFocused(false)}
                  placeholder="What exactly is going wrong?"
                  placeholderTextColor="#948A7C"
                  multiline
                  textAlignVertical="top"
                  className="font-sans text-text-primary text-base p-4 min-h-[140px]"
                />
              </View>
            </View>

            {/* CC emails */}
            <View style={{ gap: 8 }}>
              <Text className="font-sans-semibold text-text-primary text-sm ml-1">
                CC Emails{' '}
                <Text className="font-sans text-text-tertiary">
                  ({alternateEmails.length}/{MAX_ALTERNATE_EMAILS})
                </Text>
              </Text>
              <View className="flex-row" style={{ gap: 12 }}>
                <View className="flex-1 bg-surface border border-border rounded-2xl shadow-sm">
                  <TextInput
                    value={alternateEmailInput}
                    onChangeText={setAlternateEmailInput}
                    placeholder="team@company.com"
                    placeholderTextColor="#948A7C"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    onSubmitEditing={addAlternateEmail}
                    className="font-sans text-text-primary text-base px-5 h-14"
                  />
                </View>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={addAlternateEmail}
                  className="bg-text-primary w-14 h-14 rounded-2xl items-center justify-center shadow-sm"
                >
                  <Feather name="plus" size={22} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {alternateEmails.length > 0 && (
                <View className="flex-row flex-wrap" style={{ gap: 8, marginTop: 4 }}>
                  {alternateEmails.map((email) => (
                    <View
                      key={email}
                      className="flex-row items-center bg-surface px-3 py-2.5 rounded-full border border-border shadow-sm"
                    >
                      <Text className="font-sans text-sm text-text-secondary mr-2">{email}</Text>
                      <Pressable
                        onPress={() => removeAlternateEmail(email)}
                        className="p-0.5 bg-bg-subtle rounded-full"
                      >
                        <Feather name="x" size={13} color="#5C5348" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Attachments */}
            <View style={{ gap: 8 }}>
              <Text className="font-sans-semibold text-text-primary text-sm ml-1">
                Attachments{' '}
                <Text className="font-sans text-text-tertiary">
                  ({images.length}/{MAX_IMAGES})
                </Text>
              </Text>
              <View className="flex-row flex-wrap" style={{ gap: 12 }}>
                {images.map((img) => (
                  <View key={img.uri} className="relative">
                    <Image
                      source={{ uri: img.uri }}
                      className="w-20 h-20 rounded-2xl bg-bg-subtle border border-border"
                    />
                    <Pressable
                      onPress={() => removeImage(img.uri)}
                      className="absolute -top-2 -right-2 bg-surface rounded-full p-1 shadow-sm border border-border"
                    >
                      <View className="bg-error-text rounded-full p-1">
                        <Feather name="x" size={12} color="#FFFFFF" />
                      </View>
                    </Pressable>
                  </View>
                ))}

                {images.length < MAX_IMAGES && (
                  <Pressable
                    onPress={pickImages}
                    className="w-20 h-20 rounded-2xl border-2 border-dashed border-border-strong bg-bg-subtle items-center justify-center"
                  >
                    <Feather name="image" size={22} color="#948A7C" />
                    <Text className="font-sans-semibold text-[10px] text-text-tertiary mt-1.5 uppercase tracking-wide">
                      Add
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>

            {/* Submit — last element in the ScrollView, separated with mt-8,
                cleared from the floating tab bar via the container's
                paddingBottom: 160 above. */}
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={handleSubmit}
              disabled={isPending}
              className={`h-14 rounded-full flex-row items-center justify-center mt-8 ${
                isPending ? 'bg-primary-200' : 'bg-primary-500 shadow-lg'
              }`}
            >
              {isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text className="font-sans-semibold text-text-on-brand text-base mr-1.5">
                    Submit Ticket
                  </Text>
                  <Feather name="arrow-up-right" size={16} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}