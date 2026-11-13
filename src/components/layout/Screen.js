import { forwardRef, useCallback } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView, KeyboardStickyView, useKeyboardState } from 'react-native-keyboard-controller';
import { useBottomSpace, useTabBarInset } from './TabBarInset';
import { SCROLL_END_SPACE } from './tokens';

const KEYBOARD_BOTTOM_OFFSET = 24;

function useStatusBar(style) {
  useFocusEffect(
    useCallback(() => {
      if (style) setStatusBarStyle(style, true);
    }, [style]),
  );
}

/**
 * Screen root. Owns the top inset, the bottom inset (when the screen has no
 * tab bar), the status bar style and the background colour.
 *
 * edges:     which safe edges to pad — any of 'top' | 'bottom'. [] for none.
 * scroll:    render children in a scroll view whose bottom padding clears
 *            the tab bar / home indicator automatically.
 * keyboard:  with `scroll`, keep the focused input above the keyboard.
 */
const Screen = forwardRef(function Screen(
  {
    children,
    edges = ['top'],
    scroll = false,
    keyboard = false,
    statusBarStyle = 'dark',
    className = 'bg-bg-base',
    contentContainerClassName = '',
    endSpace = SCROLL_END_SPACE,
    contentContainerStyle,
    ...scrollProps
  },
  ref,
) {
  const insets = useSafeAreaInsets();
  const bottomSpace = useBottomSpace({ safeArea: edges.includes('bottom') || scroll });
  useStatusBar(statusBarStyle);

  const top = edges.includes('top') ? insets.top : 0;

  if (!scroll) {
    const bottom = edges.includes('bottom') ? insets.bottom : 0;
    return (
      <View ref={ref} className={`flex-1 ${className}`} style={[{ paddingTop: top, paddingBottom: bottom }]}>
        {children}
      </View>
    );
  }

  const Scroller = keyboard ? KeyboardAwareScrollView : ScrollView;
  const keyboardProps = keyboard
    ? { bottomOffset: KEYBOARD_BOTTOM_OFFSET, keyboardShouldPersistTaps: 'handled' }
    : null;

  return (
    <View className={`flex-1 ${className}`} style={[{ paddingTop: top }]}>
      <Scroller
        ref={ref}
        className="flex-1"
        contentContainerClassName={contentContainerClassName}
        contentContainerStyle={[contentContainerStyle, { paddingBottom: bottomSpace + endSpace }]}
        showsVerticalScrollIndicator={false}
        {...keyboardProps}
        {...scrollProps}
      >
        {children}
      </Scroller>
    </View>
  );
});

export default Screen;

/** ScrollView that pads its content to clear the tab bar / home indicator. */
export const ScreenScrollView = forwardRef(function ScreenScrollView(
  {
    endSpace = SCROLL_END_SPACE,
    keyboard = false,
    keyboardOffset = KEYBOARD_BOTTOM_OFFSET,
    contentContainerStyle,
    safeArea = true,
    ...props
  },
  ref,
) {
  const bottomSpace = useBottomSpace({ safeArea });
  const Scroller = keyboard ? KeyboardAwareScrollView : ScrollView;
  const keyboardProps = keyboard
    ? { bottomOffset: keyboardOffset, keyboardShouldPersistTaps: 'handled' }
    : null;
  return (
    <Scroller
      ref={ref}
      showsVerticalScrollIndicator={false}
      {...keyboardProps}
      {...props}
      contentContainerStyle={[contentContainerStyle, { paddingBottom: bottomSpace + endSpace }]}
    />
  );
});

/** FlatList that pads its content to clear the tab bar / home indicator. */
export const ScreenFlatList = forwardRef(function ScreenFlatList(
  { endSpace = SCROLL_END_SPACE, contentContainerStyle, safeArea = true, ...props },
  ref,
) {
  const bottomSpace = useBottomSpace({ safeArea });
  return (
    <FlatList
      ref={ref}
      showsVerticalScrollIndicator={false}
      {...props}
      contentContainerStyle={[contentContainerStyle, { paddingBottom: bottomSpace + endSpace }]}
    />
  );
});

/** Padding equal to the top safe-area inset, for custom headers. */
export function TopInset({ className = '', extra = 0, children }) {
  const insets = useSafeAreaInsets();
  return (
    <View className={className} style={[{ paddingTop: insets.top + extra }]}>
      {children}
    </View>
  );
}

/**
 * Padding equal to the bottom safe-area inset, for in-flow footers.
 * keyboardAware: drop the inset while the keyboard covers the home indicator.
 */
export function BottomInset({ className = '', extra = 0, keyboardAware = false, children }) {
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardState((state) => state.isVisible);
  const inset = keyboardAware && keyboardVisible ? 0 : insets.bottom;
  return (
    <View className={className} style={[{ paddingBottom: inset + extra }]}>
      {children}
    </View>
  );
}

/**
 * Footer pinned to the bottom of the screen: clears the home indicator /
 * navigation bar and rides above the keyboard.
 *
 * floating: absolutely positioned `gap` above the tab bar / bottom inset.
 *           Otherwise it sits in-flow at the end of a flex column.
 */
export function StickyFooter({ className = '', floating = true, gap = 12, children }) {
  const insets = useSafeAreaInsets();
  const tabInset = useTabBarInset();
  if (floating) {
    // Above the tab bar when one is visible, otherwise above the home indicator.
    const base = tabInset > 0 ? tabInset : insets.bottom;
    return (
      <KeyboardStickyView
        offset={{ closed: 0, opened: base }}
        className={`absolute left-0 right-0 ${className}`}
        style={[{ bottom: base + gap }]}
      >
        {children}
      </KeyboardStickyView>
    );
  }
  return (
    <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
      <View className={className} style={[{ paddingBottom: insets.bottom + gap }]}>
        {children}
      </View>
    </KeyboardStickyView>
  );
}
