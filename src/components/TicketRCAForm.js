// src/components/TicketRCAForm.js
import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, Image, ScrollView, StyleSheet, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useUpdateRCA } from '../hooks/useTickets';

const MAX_IMAGES = 10;
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export default function TicketRCAForm({ ticket, onDone }) {
    const [rcaText, setRcaText] = useState(ticket?.rca || '');
    const [existingImages, setExistingImages] = useState(ticket?.rca_images || []);
    const [newImages, setNewImages] = useState([]); // { uri, fileName, mimeType }
    const { mutate, isPending, error } = useUpdateRCA(ticket?.id);

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

        mutate(formData, { onSuccess: () => onDone?.() });
    };



    return (
        <View style={styles.container}>
            {error ? (
                <Text style={{ color: '#dc2626', fontSize: 13, marginBottom: 8 }}>
                    {error.message || 'Failed to save RCA. Please try again.'}
                </Text>
            ) : null}
            <Text style={styles.label}>Root Cause Analysis</Text>
            <TextInput
                value={rcaText}
                onChangeText={setRcaText}
                placeholder="Describe the root cause and resolution..."
                placeholderTextColor="#9ca3af"
                multiline
                style={styles.textArea}
            />

            <Text style={styles.label}>Images ({totalImageCount}/{MAX_IMAGES})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {existingImages.map((url) => (
                    <View key={url} style={styles.thumbWrap}>
                        <Image source={{ uri: url }} style={styles.thumb} />
                        <Pressable style={styles.removeBadge} onPress={() => removeExisting(url)}>
                            <Feather name="x" size={12} color="#ffffff" />
                        </Pressable>
                    </View>
                ))}
                {newImages.map((img) => (
                    <View key={img.uri} style={styles.thumbWrap}>
                        <Image source={{ uri: img.uri }} style={styles.thumb} />
                        <Pressable style={styles.removeBadge} onPress={() => removeNew(img.uri)}>
                            <Feather name="x" size={12} color="#ffffff" />
                        </Pressable>
                    </View>
                ))}
                <Pressable style={styles.addImageButton} onPress={pickImages}>
                    <Feather name="plus" size={20} color="#64748b" />
                </Pressable>
            </ScrollView>

            <Pressable onPress={handleSave} disabled={isPending} style={styles.saveButton}>
                {isPending ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                    <>
                        <Feather name="file-text" size={15} color="#ffffff" />
                        <Text style={styles.saveText}>{ticket?.rca ? 'Update RCA' : 'Submit RCA'}</Text>
                    </>
                )}
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { padding: 4 },
    label: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 6, marginTop: 10 },
    textArea: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 10,
        padding: 12,
        fontSize: 14,
        minHeight: 90,
        textAlignVertical: 'top',
        backgroundColor: '#f8fafc',
    },
    thumbWrap: { marginRight: 10, position: 'relative' },
    thumb: { width: 64, height: 64, borderRadius: 10, backgroundColor: '#e2e8f0' },
    removeBadge: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: '#ef4444',
        borderRadius: 10,
        width: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addImageButton: {
        width: 64,
        height: 64,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButton: {
        flexDirection: 'row',
        gap: 6,
        backgroundColor: '#16a34a',
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
    },
    saveText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
});