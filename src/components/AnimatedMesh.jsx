import React, { useEffect } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Canvas, Circle, BlurMask } from '@shopify/react-native-skia';
import { useSharedValue, withRepeat, withTiming, Easing, useDerivedValue } from 'react-native-reanimated';

export default function AnimatedMesh() {
  const { width, height } = useWindowDimensions();

  // Shared values to track the rotation angles
  const progress1 = useSharedValue(0);
  const progress2 = useSharedValue(0);
  const progress3 = useSharedValue(0);

  useEffect(() => {
    // Animate in a continuous, slow loop (12-18 seconds per rotation)
    progress1.value = withRepeat(withTiming(2 * Math.PI, { duration: 15000, easing: Easing.linear }), -1, false);
    progress2.value = withRepeat(withTiming(2 * Math.PI, { duration: 12000, easing: Easing.linear }), -1, false);
    progress3.value = withRepeat(withTiming(2 * Math.PI, { duration: 18000, easing: Easing.linear }), -1, false);
  }, []);

  // Calculate moving X and Y coordinates based on the circular progress
  const cx1 = useDerivedValue(() => (width / 2) + Math.cos(progress1.value) * 150);
  const cy1 = useDerivedValue(() => (height / 2) + Math.sin(progress1.value) * 150);

  const cx2 = useDerivedValue(() => (width / 2) + Math.cos(progress2.value) * -120);
  const cy2 = useDerivedValue(() => (height / 2) + Math.sin(progress2.value) * -120);

  const cx3 = useDerivedValue(() => (width / 2) + Math.cos(progress3.value) * 100);
  const cy3 = useDerivedValue(() => (height / 2) + Math.sin(progress3.value) * 180);

  return (
    // Canvas acts as our painting area
    <Canvas style={StyleSheet.absoluteFill}>
      {/* Soft Yellow */}
      <Circle cx={cx1} cy={cy1} r={width * 0.8} color="#FFFACD">
        <BlurMask blur={80} style="normal" />
      </Circle>
      {/* Peach / Orange */}
      <Circle cx={cx2} cy={cy2} r={width * 0.7} color="#FFA07A">
        <BlurMask blur={80} style="normal" />
      </Circle>
      {/* Light Cream */}
      <Circle cx={cx3} cy={cy3} r={width * 0.9} color="#FFFFF0">
        <BlurMask blur={80} style="normal" />
      </Circle>
    </Canvas>
  );
}