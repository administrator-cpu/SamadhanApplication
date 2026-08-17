import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const LOADING_STATES = [
  "Initializing secure engine...",
  "Establishing connection...",
  "Authenticating credentials...",
  "Preparing your workspace..."
];

export default function InitializingScreen() {
  const insets = useSafeAreaInsets();
  const [loadingStep, setLoadingStep] = useState(0);

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const ripple1 = useRef(new Animated.Value(0)).current;
  const ripple2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Cycle through loading text every 2.5 seconds
    const textInterval = setInterval(() => {
      setLoadingStep((prev) => (prev < LOADING_STATES.length - 1 ? prev + 1 : prev));
    }, 2500);

    // 2. Gentle breathing animation for the logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.05, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // 3. Continuous radar/ripple effect
    const animateRipple = (animValue) => {
      animValue.setValue(0);
      Animated.timing(animValue, {
        toValue: 1,
        duration: 3000,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start(() => animateRipple(animValue));
    };

    animateRipple(ripple1);
    // Stagger the second ripple
    setTimeout(() => animateRipple(ripple2), 1500);

    return () => clearInterval(textInterval);
  }, []);

const getRippleStyle = (animValue) => ({
    transform: [{
      scale: animValue.interpolate({ inputRange: [0, 1], outputRange: [0.8, 3] })
    }],
    // Warm ripples against the cream background
    opacity: animValue.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 0.1, 0] })
  });

return (
    // Replaced bg-slate-50 with bg-orange-50 (or #FFFBEB for cream)
    <View className="flex-1 bg-orange-50 items-center justify-between overflow-hidden">
      <StatusBar style="dark" />

      {/* Top Spacer */}
      <View style={{ paddingTop: insets.top + 40 }} />

      {/* Center Content: Animated Logo & Ripples */}
      <View className="items-center justify-center relative w-full flex-1">
        
        {/* Warm Ripples */}
        <Animated.View style={getRippleStyle(ripple1)} className="absolute w-32 h-32 bg-orange-300 rounded-full" />
        <Animated.View style={getRippleStyle(ripple2)} className="absolute w-32 h-32 bg-orange-300 rounded-full" />

        {/* Central Logo */}
        <Animated.View 
          style={{ transform: [{ scale: scaleAnim }] }}
          // Softened shadow for warm light mode and used orange-600 background
          className="w-24 h-24 bg-orange-600 rounded-3xl items-center justify-center shadow-xl shadow-orange-600/20 z-10"
        >
          <Feather name="wifi" size={44} color="#ffffff" />
        </Animated.View>
      </View>

      {/* Bottom Content: Dynamic Status & Trust Badge */}
      <View style={{ paddingBottom: insets.bottom + 40 }} className="items-center w-full px-8">
        
        {/* Progress Indicator */}
        <View className="flex-row items-center mb-6">
          <View className="w-2 h-2 rounded-full bg-orange-500 mr-3 animate-pulse" />
          {/* Changed text from slate-800 to orange-950 for a dark warm tone */}
          <Text className="text-orange-950 text-base font-medium tracking-wide">
            {LOADING_STATES[loadingStep]}
          </Text>
        </View>

        {/* Security Badge */}
        {/* Clean white pill with a soft warm border */}
        <View className="flex-row items-center px-4 py-2 bg-white rounded-full border border-orange-100 shadow-sm shadow-orange-100/50">
          <MaterialCommunityIcons name="shield-lock-outline" size={14} color="#A16207" />
          {/* Changed text to a medium warm brown */}
          {/* <Text className="text-orange-800 text-xs font-semibold ml-2 uppercase tracking-widest">End-to-End Encrypted</Text> */}
        </View>
        
      </View>
    </View>
  );
}