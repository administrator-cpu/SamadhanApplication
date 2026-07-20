// src/components/RaiseTicketForm.js
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import CategoryPicker from './CategoryPicker';
import { useCreateTicket } from '../hooks/useTickets';

const MAX_IMAGES = 10;
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_ALTERNATE_EMAILS = 3;

export default function RaiseTicketForm({ role, listPath }) {
  const router = useRouter();
  const isSales = role === 'SALES';

  const [customerEmail, setCustomerEmail] = useState('');
  const [circuitDescription, setCircuitDescription] = useState('');
  const [category, setCategory] = useState(null);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [alternateEmailInput, setAlternateEmailInput] = useState('');
  const [alternateEmails, setAlternateEmails] = useState([]);
  const [message, setMessage] = useState('');
  const [images, setImages] = useState([]);

  const { mutate, isPending, error } = useCreateTicket();

  const addAlternateEmail = () => {
    const email = alternateEmailInput.trim();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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
    if (isSales && !customerEmail.trim()) return 'Customer email is required.';
    if (isSales && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) return 'Invalid customer email.';
    if (!category) return 'Please select a category.';
    if (!circuitDescription.trim()) return 'Circuit description is required.';
    return null;
  };

  const handleSubmit = () => {
    const validationError = validate();
    if (validationError) {
      Alert.alert('Hold up', validationError);
      return;
    }

    const formData = new FormData();
    if (isSales) formData.append('customerEmail', customerEmail.trim().toLowerCase());
    formData.append('issueCategoryId', category.id);
    formData.append('circuitDescription', circuitDescription.trim());
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

  return (
    <KeyboardAvoidingView 
      className="flex-1 bg-white" 
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Sleek Header */}
      <View className=" p-10 pl-6 m-2 rounded-[40px] justify-center flex">
        <Text className="text-3xl font-bold text-slate-900 tracking-tight">New Ticket</Text>
        <Text className="text-slate-500 mt-1 text-base">Let's get this issue sorted out.</Text>
      </View>

      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 24, gap: 28 }}
      >
        {error && (
          <View className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl flex-row items-start">
            <Feather name="info" size={18} color="#ef4444" className="mt-0.5 mr-2" />
            <Text className="text-red-700 flex-1 leading-5">{error.message || 'Something went wrong.'}</Text>
          </View>
        )}

        {isSales && (
          <View className="gap-2">
            <Text className="text-sm font-semibold text-slate-900">Customer Email <Text className="text-red-500">*</Text></Text>
            <TextInput
              value={customerEmail}
              onChangeText={setCustomerEmail}
              placeholder="name@customer.com"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              keyboardType="email-address"
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 h-14 text-slate-900 text-base font-medium focus:border-blue-500 focus:bg-white"
            />
          </View>
        )}

        <View className="gap-2">
          <Text className="text-sm font-semibold text-slate-900">Issue Category <Text className="text-red-500">*</Text></Text>
          <Pressable 
            onPress={() => setCategoryPickerOpen(true)}
            className="flex-row items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 h-14"
          >
            <Text className={`text-base font-medium ${category ? 'text-slate-900' : 'text-slate-400'}`}>
              {category ? category.name : 'Select category...'}
            </Text>
            <Feather name="chevron-down" size={20} color="#64748b" />
          </Pressable>
        </View>

        <View className="gap-2">
          <Text className="text-sm font-semibold text-slate-900">Circuit Description <Text className="text-red-500">*</Text></Text>
          <TextInput
            value={circuitDescription}
            onChangeText={setCircuitDescription}
            placeholder="e.g., FAB-123 or location"
            placeholderTextColor="#94a3b8"
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 h-14 text-slate-900 text-base font-medium focus:border-blue-500 focus:bg-white"
          />
        </View>

        <View className="gap-2">
          <Text className="text-sm font-semibold text-slate-900">Description</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="What exactly is going wrong?"
            placeholderTextColor="#94a3b8"
            multiline
            textAlignVertical="top"
            className="bg-slate-50 border border-slate-200 rounded-xl p-4 min-h-[120px] text-slate-900 text-base font-medium focus:border-blue-500 focus:bg-white"
          />
        </View>

        <View className="gap-2">
          <Text className="text-sm font-semibold text-slate-900">CC Emails <Text className="text-slate-400 font-normal">({alternateEmails.length}/{MAX_ALTERNATE_EMAILS})</Text></Text>
          <View className="flex-row gap-3">
            <TextInput
              value={alternateEmailInput}
              onChangeText={setAlternateEmailInput}
              placeholder="team@company.com"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              keyboardType="email-address"
              onSubmitEditing={addAlternateEmail}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 h-14 text-slate-900 text-base font-medium focus:border-blue-500 focus:bg-white"
            />
            <Pressable 
              onPress={addAlternateEmail}
              className="bg-slate-900 w-14 h-14 rounded-xl items-center justify-center active:bg-slate-800"
            >
              <Feather name="plus" size={24} color="#ffffff" />
            </Pressable>
          </View>
          
          {alternateEmails.length > 0 && (
            <View className="flex-row flex-wrap gap-2 mt-2">
              {alternateEmails.map((email) => (
                <View key={email} className="flex-row items-center bg-slate-100 px-3 py-2 rounded-lg border border-slate-200">
                  <Text className="text-sm text-slate-700 mr-2">{email}</Text>
                  <Pressable onPress={() => removeAlternateEmail(email)} className="p-0.5">
                    <Feather name="x" size={14} color="#64748b" />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        <View className="gap-2 mb-4">
          <Text className="text-sm font-semibold text-slate-900">Attachments <Text className="text-slate-400 font-normal">({images.length}/{MAX_IMAGES})</Text></Text>
          <View className="flex-row flex-wrap gap-3 mt-1">
            {images.map((img) => (
              <View key={img.uri} className="relative">
                <Image source={{ uri: img.uri }} className="w-20 h-20 rounded-xl bg-slate-100 border border-slate-200" />
                <Pressable 
                  onPress={() => removeImage(img.uri)}
                  className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-sm border border-slate-100"
                >
                  <View className="bg-slate-900 rounded-full p-1">
                    <Feather name="x" size={12} color="#ffffff" />
                  </View>
                </Pressable>
              </View>
            ))}
            
            {images.length < MAX_IMAGES && (
              <Pressable 
                onPress={pickImages}
                className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 items-center justify-center active:bg-slate-100"
              >
                <Feather name="image" size={24} color="#94a3b8" />
                <Text className="text-[10px] text-slate-400 font-semibold mt-1 uppercase">Add</Text>
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Footer */}
      <View className="p-4 bg-white border-t border-slate-100 pb-8">
        <Pressable 
          onPress={handleSubmit} 
          disabled={isPending}
          className={`h-14 rounded-xl flex-row items-center justify-center ${
            isPending ? 'bg-slate-300' : 'bg-slate-900 active:bg-slate-800'
          }`}
        >
          {isPending ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text className="text-white font-bold text-lg tracking-wide">Submit Ticket</Text>
          )}
        </Pressable>
      </View>

      <CategoryPicker
        visible={categoryPickerOpen}
        selectedId={category?.id}
        onSelect={setCategory}
        onClose={() => setCategoryPickerOpen(false)}
      />
    </KeyboardAvoidingView>
  );
}