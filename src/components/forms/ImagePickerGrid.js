// src/components/forms/ImagePickerGrid.js
import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';

export default function ImagePickerGrid({
  label = 'Attachments',
  images,
  max,
  onAdd,
  onRemove,
  sizeClass = 'w-[80px] h-[80px]',
}) {
  return (
    <View className="gap-[8px]">
      {label ? (
        <Text className="font-sans-semibold text-text-primary text-sm ml-1">
          {label}{' '}
          <Text className="font-sans text-text-tertiary">
            ({images.length}/{max})
          </Text>
        </Text>
      ) : null}

      <View className="flex-row flex-wrap gap-[12px]">
        {images.map((img) => (
          <View key={img.uri} className="relative">
            <Image
              source={{ uri: img.uri }}
              className={`rounded-2xl bg-bg-subtle border border-border ${sizeClass}`}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
            <Pressable
              onPress={() => onRemove(img.uri)}
              className="absolute -top-2 -right-2 bg-surface rounded-full p-1 shadow-sm border border-border"
            >
              <View className="bg-error-text rounded-full p-1">
                <Feather name="x" size={12} color="#FFFFFF" />
              </View>
            </Pressable>
          </View>
        ))}

        {images.length < max && (
          <Pressable
            onPress={onAdd}
            className={`${sizeClass} rounded-2xl border-2 border-dashed border-border-strong bg-bg-subtle items-center justify-center`}
          >
            <Feather name="image" size={22} color="#948A7C" />
            <Text className="font-sans-semibold text-[10px] text-text-tertiary mt-1.5 uppercase tracking-wide">
              Add
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}