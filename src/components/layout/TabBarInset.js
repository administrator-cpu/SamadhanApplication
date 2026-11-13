import { createContext, useContext, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Published by the shared tab bar: rendered bar height + gap + bottom inset.
// 0 when the current navigator has no visible tab bar.
const TabBarInsetContext = createContext({ inset: 0, setInset: () => {} });

export function TabBarInsetProvider({ children }) {
  const [inset, setInset] = useState(0);
  const value = useMemo(() => ({ inset, setInset }), [inset]);
  return <TabBarInsetContext.Provider value={value}>{children}</TabBarInsetContext.Provider>;
}

export function useTabBarInset() {
  return useContext(TabBarInsetContext).inset;
}

export function useSetTabBarInset() {
  return useContext(TabBarInsetContext).setInset;
}

// Space scroll content must leave at the bottom: the tab bar when one is
// visible, otherwise the bottom safe-area inset.
export function useBottomSpace({ safeArea = true } = {}) {
  const tab = useTabBarInset();
  const insets = useSafeAreaInsets();
  if (tab > 0) return tab;
  return safeArea ? insets.bottom : 0;
}
