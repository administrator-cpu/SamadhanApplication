import { Animated } from 'react-native';
import { cssInterop } from 'nativewind';
import {
  KeyboardAvoidingView,
  KeyboardAwareScrollView,
  KeyboardStickyView,
} from 'react-native-keyboard-controller';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';

cssInterop(KeyboardAwareScrollView, {
  className: 'style',
  contentContainerClassName: 'contentContainerStyle',
});
cssInterop(KeyboardAvoidingView, { className: 'style' });
cssInterop(KeyboardStickyView, { className: 'style' });
cssInterop(LinearGradient, { className: 'style' });
cssInterop(ExpoImage, { className: 'style' });
// Animated components forward props to an un-interop'd host view, so register
// them explicitly; animated values keep flowing through `style`.
cssInterop(Animated.View, { className: 'style' });
cssInterop(Animated.Text, { className: 'style' });
cssInterop(Animated.Image, { className: 'style' });
