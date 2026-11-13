import { Modal, Pressable, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView, useKeyboardState } from 'react-native-keyboard-controller';

const SHEET_TOP_GAP = 24;

/**
 * Single base for bottom sheets, centred dialogs and full-screen modals.
 *
 * variant:
 *   'bottom'  panel anchored to the bottom edge; pads the bottom inset and
 *             never grows past the top inset.
 *   'center'  centred dialog kept inside the safe area.
 *   'full'    full-screen panel padded on both safe edges.
 *
 * maxHeightRatio caps a bottom sheet at a fraction of the window height.
 *
 * Draws behind translucent status / navigation bars on Android and lifts
 * its panel above the keyboard.
 */
export default function Sheet({
  visible,
  onClose,
  variant = 'bottom',
  children,
  className = '',
  backdropClassName = 'bg-black/40',
  animationType,
  dismissOnBackdrop = true,
  keyboard = true,
  edges,
  maxHeightRatio = 1,
  onShow,
  onDismiss,
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const keyboardVisible = useKeyboardState((s) => s.isVisible);

  const anim = animationType ?? (variant === 'bottom' ? 'slide' : variant === 'full' ? 'slide' : 'fade');
  const padEdges = edges ?? (variant === 'full' ? ['top', 'bottom'] : variant === 'bottom' ? ['bottom'] : ['top', 'bottom']);
  // The keyboard covers the home indicator, so drop the bottom inset while it is up.
  const bottomPad = padEdges.includes('bottom') && !(keyboard && keyboardVisible) ? insets.bottom : 0;
  const topPad = padEdges.includes('top') ? insets.top : 0;
  const sheetMaxHeight = Math.min(height * maxHeightRatio, height - insets.top - SHEET_TOP_GAP);

  const backdrop = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Close"
      className={`absolute inset-0 ${backdropClassName}`}
      onPress={dismissOnBackdrop ? onClose : undefined}
    />
  );

  let body;
  if (variant === 'full') {
    body = (
      <View className={`flex-1 ${className}`} style={[{ paddingTop: topPad, paddingBottom: bottomPad }]}>
        {children}
      </View>
    );
  } else if (variant === 'center') {
    body = (
      <View className="flex-1 items-center justify-center px-5" style={[{ paddingTop: topPad, paddingBottom: bottomPad }]}>
        {backdrop}
        <View className={`w-full ${className}`} style={[{ maxHeight: height - insets.top - insets.bottom - SHEET_TOP_GAP * 2 }]}>
          {children}
        </View>
      </View>
    );
  } else {
    body = (
      <View className="flex-1 justify-end">
        {backdrop}
        <View
          className={className}
          style={[{ paddingBottom: bottomPad, maxHeight: sheetMaxHeight }]}
        >
          {children}
        </View>
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType={anim}
      onRequestClose={onClose}
      onShow={onShow}
      onDismiss={onDismiss}
    >
      {keyboard ? (
        <KeyboardAvoidingView behavior="padding" className="flex-1">
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </Modal>
  );
}
