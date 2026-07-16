import React, { useState, forwardRef } from 'react';
import { View, Text, TextInput as RNTextInput, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

const CustomInput = forwardRef(({
  label,
  error,
  password = false,
  leftIcon,
  containerClassName = '',
  inputClassName = '',
  labelClassName = '',
  ...props 
}, ref) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className={` ${containerClassName}`}>
      
      {label && (
        <Text className={`text-zinc-500 m text-sm font-medium  ${labelClassName}`}>
          {label}
        </Text>
      )}

      <View
        className={`flex-row items-center  border-b border-gray-400  ${error ? 'border-red-500' : ''}`}
      >
        {/* {leftIcon && (
          <View className="mr-3">
            {leftIcon}
          </View>
        )} */}

        <RNTextInput
          ref={ref}
          className={`flex-1 py-4 outline-none ${inputClassName}`}
          placeholderTextColor="#9ca3af"
          secureTextEntry={password && !isPasswordVisible}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />

        {password && (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            className="p-2 ml-2"
          >
            <Feather
              name={isPasswordVisible ? 'eye' : 'eye-off'}
              size={20}
              color="#9ca3af"
            />
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <Text className="text-red-500 text-xs mt-1 ml-1">
          {error}
        </Text>
      )}
    </View>
  );
});

export default CustomInput;