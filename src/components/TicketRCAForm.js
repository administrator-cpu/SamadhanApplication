// src/components/TicketRCAForm.js
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useUpdateRCA } from '../hooks/useTickets';
import { haptics } from '../utils/haptics';
import { FORM, T } from './ticketTheme';
import { LightboxContent } from './ImageLightbox';

const MAX_IMAGES = 10;
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export default function TicketRCAForm({ ticket, onDone }) {
  const [rcaText, setRcaText] = useState(ticket?.rca || '');
  const [existingImages, setExistingImages] = useState(ticket?.rca_images || []);
  const [newImages, setNewImages] = useState([]); // { uri, fileName, mimeType }
  const { mutate, isPending, error } = useUpdateRCA(ticket?.id);
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const totalImageCount = existingImages.length + newImages.length;

  const pickImages = async () => {
    if (totalImageCount >= MAX_IMAGES) {
      Alert.alert('Limit reached', `You can attach up to ${MAX_IMAGES} images total.`);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - totalImageCount,
      quality: 0.7,
    });

    if (result.canceled) return;

    const tooLarge = result.assets.filter((a) => a.fileSize && a.fileSize > MAX_SIZE_BYTES);
    if (tooLarge.length > 0) {
      Alert.alert('File too large', 'Each image must be under 5MB.');
      return;
    }

    setNewImages((prev) => [...prev, ...result.assets]);
  };

  const removeExisting = (url) => {
    setExistingImages((prev) => prev.filter((u) => u !== url));
  };

  const removeNew = (uri) => {
    setNewImages((prev) => prev.filter((img) => img.uri !== uri));
  };

  const handleSave = () => {
    if (!rcaText.trim()) {
      Alert.alert('RCA required', 'Please enter a root cause description.');
      return;
    }

    const formData = new FormData();
    formData.append('rca', rcaText.trim());
    formData.append('existingImages', JSON.stringify(existingImages));

    newImages.forEach((img, index) => {
      const fileName = img.fileName || `rca-${Date.now()}-${index}.jpg`;
      const mimeType = img.mimeType || 'image/jpeg';

      formData.append('files', {
        uri: img.uri,
        name: fileName,
        type: mimeType,
      });
    });

    mutate(formData, {
      onSuccess: () => {
        haptics.success();
        onDone?.();
      },
      onError: () => haptics.error(),
    });
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 34 }}>
      {error ? (
        <Text style={FORM.errorText}>{error.message || 'That did not save. Please try again.'}</Text>
      ) : null}

      <View style={styles.intro}>
        <View style={[styles.introChip, { backgroundColor: T.greenTint }]}>
          <Feather name="search" size={16} color={T.green} />
        </View>
        <Text style={styles.introText}>
          Write this for the customer — what went wrong, and what you did about it.
        </Text>
      </View>

      <Text style={[FORM.label, { marginTop: 20 }]}>Cause and fix</Text>
      <TextInput
        value={rcaText}
        onChangeText={setRcaText}
        placeholder="A fibre cable was cut during roadwork. We re-joined it and tested the line end to end."
        placeholderTextColor={T.hint}
        multiline
        style={FORM.textArea}
      />

      <Text style={[FORM.label, { marginTop: 20 }]}>
        Photos {totalImageCount > 0 ? `· ${totalImageCount} of ${MAX_IMAGES}` : '(optional)'}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        {existingImages.map((url) => (
          <View key={url} style={{ position: 'relative' }}>
             <TouchableOpacity activeOpacity={0.85} onPress={() => setLightboxUrl(url)}>
              <Image source={{ uri: url }} style={styles.thumb} />
            </TouchableOpacity>
            <Pressable style={styles.removeBadge} onPress={() => removeExisting(url)} hitSlop={8}>
              <Feather name="x" size={11} color="#FFFFFF" />
            </Pressable>
          </View>
        ))}
        {newImages.map((img) => (
          <View key={img.uri} style={{ position: 'relative' }}>
            <TouchableOpacity activeOpacity={0.85} onPress={() => setLightboxUrl(img.uri)}>
              <Image source={{ uri: img.uri }} style={styles.thumb} />
            </TouchableOpacity>
            <Pressable style={styles.removeBadge} onPress={() => removeNew(img.uri)} hitSlop={8}>
              <Feather name="x" size={11} color="#FFFFFF" />
            </Pressable>
          </View>
        ))}
        <Pressable style={styles.addTile} onPress={pickImages}>
          <Feather name="plus" size={20} color={T.blue} />
          <Text style={styles.addTileText}>Add</Text>
        </Pressable>
      </ScrollView>

      <Pressable onPress={handleSave} disabled={isPending} style={[FORM.primary, { marginTop: 24 }, isPending && FORM.disabled]}>
        {isPending ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Feather name="check" size={16} color="#FFFFFF" />
            <Text style={FORM.primaryText}>{ticket?.rca ? 'Update root cause' : 'Publish root cause'}</Text>
          </>
        )}
      </Pressable>

      <Text style={styles.footNote}>The customer sees this in the chat as soon as you publish.</Text>
       <Modal visible={!!lightboxUrl} transparent={false} animationType="fade" onRequestClose={() => setLightboxUrl(null)}>
        <LightboxContent url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  intro: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.field, borderRadius: 18, padding: 14 },
  introChip: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  introText: { flex: 1, fontSize: 12.5, lineHeight: 18, color: T.body },

  thumb: { width: 68, height: 68, borderRadius: 18, backgroundColor: T.field },
  removeBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: T.ink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  addTile: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: T.blueTint,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  addTileText: { fontSize: 10.5, fontWeight: '600', color: T.blueInk },

  footNote: { fontSize: 11.5, lineHeight: 17, color: T.soft, textAlign: 'center', marginTop: 12 },
});
