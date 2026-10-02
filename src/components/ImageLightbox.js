// src/components/ImageLightbox.js
import { Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library/legacy';
import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Text, TouchableOpacity, View } from 'react-native';
import {
  GestureHandlerRootView,
  PanGestureHandler,
  PinchGestureHandler,
  State,
  TapGestureHandler,
} from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function getAttachmentFileName(url) {
  if (!url) return 'Attachment';
  const clean = url.split('?')[0].split('#')[0];
  const segments = clean.split('/');
  return decodeURIComponent(segments[segments.length - 1] || 'Attachment');
}

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;

function ZoomableImage({ uri, onSingleTap }) {
  const pinchRef = useRef(null);
  const panRef = useRef(null);
  const doubleTapRef = useRef(null);
  const singleTapRef = useRef(null);

  const baseScale = useRef(new Animated.Value(1)).current;
  const pinchScale = useRef(new Animated.Value(1)).current;
  const scale = useRef(Animated.multiply(baseScale, pinchScale)).current;
  const lastScale = useRef(1);

  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const lastOffset = useRef({ x: 0, y: 0 });

  const [isZoomed, setIsZoomed] = useState(false);

  const resetTransform = () => {
    lastScale.current = 1;
    lastOffset.current = { x: 0, y: 0 };
    setIsZoomed(false);
    Animated.parallel([
      Animated.spring(baseScale, { toValue: 1, useNativeDriver: true }),
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
    ]).start(() => {
      translateX.setOffset(0);
      translateX.setValue(0);
      translateY.setOffset(0);
      translateY.setValue(0);
    });
  };

  const onPinchGestureEvent = Animated.event([{ nativeEvent: { scale: pinchScale } }], { useNativeDriver: true });

  const onPinchHandlerStateChange = (event) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const nextScale = Math.min(Math.max(lastScale.current * event.nativeEvent.scale, MIN_SCALE), MAX_SCALE);
      lastScale.current = nextScale;
      pinchScale.setValue(1);
      baseScale.setValue(nextScale);
      if (nextScale <= MIN_SCALE) resetTransform();
      else setIsZoomed(true);
    }
  };

  const onPanGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
    { useNativeDriver: true }
  );

  const onPanHandlerStateChange = (event) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      lastOffset.current.x += event.nativeEvent.translationX;
      lastOffset.current.y += event.nativeEvent.translationY;
      translateX.setOffset(lastOffset.current.x);
      translateX.setValue(0);
      translateY.setOffset(lastOffset.current.y);
      translateY.setValue(0);
    }
  };

  const onDoubleTapStateChange = (event) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      if (lastScale.current > MIN_SCALE) {
        resetTransform();
      } else {
        lastScale.current = DOUBLE_TAP_SCALE;
        setIsZoomed(true);
        Animated.spring(baseScale, { toValue: DOUBLE_TAP_SCALE, useNativeDriver: true }).start();
      }
    }
  };

  const onSingleTapStateChange = (event) => {
    if (event.nativeEvent.state === State.ACTIVE) onSingleTap?.();
  };

  return (
    <TapGestureHandler ref={singleTapRef} numberOfTaps={1} waitFor={doubleTapRef} onHandlerStateChange={onSingleTapStateChange}>
      <Animated.View className="flex-1">
        <TapGestureHandler ref={doubleTapRef} numberOfTaps={2} onHandlerStateChange={onDoubleTapStateChange}>
          <Animated.View className="flex-1">
            <PanGestureHandler
              ref={panRef}
              enabled={isZoomed}
              simultaneousHandlers={pinchRef}
              onGestureEvent={onPanGestureEvent}
              onHandlerStateChange={onPanHandlerStateChange}
            >
              <Animated.View className="flex-1">
                <PinchGestureHandler
                  ref={pinchRef}
                  simultaneousHandlers={panRef}
                  onGestureEvent={onPinchGestureEvent}
                  onHandlerStateChange={onPinchHandlerStateChange}
                >
                  <Animated.View className="flex-1 items-center justify-center">
                    <Animated.Image
                      source={{ uri }}
                      resizeMode="contain"
                      className="w-full h-full"
                      style={{ transform: [{ translateX }, { translateY }, { scale }] }}
                    />
                  </Animated.View>
                </PinchGestureHandler>
              </Animated.View>
            </PanGestureHandler>
          </Animated.View>
        </TapGestureHandler>
      </Animated.View>
    </TapGestureHandler>
  );
}

export function LightboxContent({ url, onClose }) {
  const insets = useSafeAreaInsets();
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionState, setActionState] = useState(null);

  const downloadImageForAction = async (imageUrl) => {
    const baseName = getAttachmentFileName(imageUrl) || 'image.jpg';
    const localUri = `${FileSystem.cacheDirectory}${Date.now()}-${baseName}`;
    const result = await FileSystem.downloadAsync(imageUrl, localUri);
    if (!result?.uri) throw new Error('Download did not return a local file URI.');
    return result.uri;
  };

  const handleShare = async () => {
    if (!url || isProcessing) return;
    setIsProcessing(true);
    setActionState('sharing');
    try {
      const localUri = await downloadImageForAction(url);
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Sharing unavailable', 'Sharing is not supported on this device.');
        return;
      }
      await Sharing.shareAsync(localUri);
    } catch (err) {
      Alert.alert('Share failed', err?.message || 'This image could not be shared. Please try again.');
    } finally {
      setIsProcessing(false);
      setActionState(null);
    }
  };

  const handleSave = async () => {
    if (!url || isProcessing) return;
    setIsProcessing(true);
    setActionState('saving');
    try {
      const localUri = await downloadImageForAction(url);
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow photo library access in your device settings to save images.');
        return;
      }
      await MediaLibrary.saveToLibraryAsync(localUri);
      Alert.alert('Saved', 'Image saved to your gallery.');
    } catch (err) {
      Alert.alert('Save failed', err?.message || 'This image could not be saved. Please try again.');
    } finally {
      setIsProcessing(false);
      setActionState(null);
    }
  };

  if (!url) return null;

  return (
    <GestureHandlerRootView className="flex-1">
      <View className="flex-1 bg-black">
        <ZoomableImage uri={url} onSingleTap={() => setToolbarVisible((prev) => !prev)} />

        {toolbarVisible ? (
          <View className="absolute top-0 left-0 right-0 z-20" pointerEvents="box-none">
            <LinearGradient
              colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0)']}
              style={{ paddingTop: insets.top + 10, paddingBottom: 28, paddingHorizontal: 16 }}
            >
              <View className="flex-row items-center justify-between">
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={onClose}
                  className="w-11 h-11 rounded-full bg-white/15 items-center justify-center"
                >
                  <Feather name="x" size={20} color="#FFFFFF" />
                </TouchableOpacity>

                {isProcessing ? (
                  <View className="flex-row items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-full">
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text className="font-sans-semibold text-xs text-white">
                      {actionState === 'saving' ? 'Saving…' : 'Sharing…'}
                    </Text>
                  </View>
                ) : null}

                <View className="flex-row gap-2.5">
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleShare}
                    disabled={isProcessing}
                    className={`w-11 h-11 rounded-full bg-white/15 items-center justify-center ${isProcessing ? 'opacity-50' : 'opacity-100'}`}
                  >
                    <Feather name="share" size={18} color="#FFFFFF" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleSave}
                    disabled={isProcessing}
                    className={`w-11 h-11 rounded-full bg-white/15 items-center justify-center ${isProcessing ? 'opacity-50' : 'opacity-100'}`}
                  >
                    <Feather name="download" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          </View>
        ) : null}
      </View>
    </GestureHandlerRootView>
  );
}