// src/components/forms/FormField.js
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

export default function FormField({
  label,
  required,
  error,
  hint,
  value,
  onChangeText,
  onSubmitEditing,
  multiline = false,
  ...inputProps
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ gap: 8 }}>
      {label ? (
        <Text className="font-sans-semibold text-text-primary text-sm ml-1">
          {label} {required && <Text className="text-primary-500">*</Text>}
        </Text>
      ) : null}

      <View
        className={`bg-surface rounded-2xl border shadow-sm ${
          error ? 'border-error-text' : focused ? 'border-text-secondary' : 'border-border'
        }`}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          placeholderTextColor="#948A7C"
          className={`font-sans text-text-primary text-base px-5 ${
            multiline ? 'p-4 min-h-[140px]' : 'h-14'
          }`}
          {...inputProps}
        />
      </View>

      {error ? (
        <Text className="font-sans text-error-text text-xs ml-1">{error}</Text>
      ) : hint ? (
        <Text className="font-sans text-text-tertiary text-xs ml-1">{hint}</Text>
      ) : null}
    </View>
  );
}