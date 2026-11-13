import { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSetTabBarInset } from './TabBarInset';
import { DENSE_FONT_SCALE, TAB_BAR_GAP, useLayoutTier } from './tokens';

/**
 * Shared floating tab bar for Admin, Agent and Sales.
 *
 * Sits TAB_BAR_GAP above the bottom safe-area inset, measures itself and
 * publishes (height + gap + inset) through TabBarInsetContext so scroll
 * content can clear it. Role differences are configuration:
 *
 * items:   { [routeName]: { icon, label } } — routes not listed are not shown.
 * theme:   'pill' | 'minimal' | 'dock'
 * action:  optional { label, icon, onPress } pill rendered beside the bar.
 * hidden:  render nothing and publish 0.
 */
const THEMES = {
  // Admin — white pill, label shown on the focused tab.
  pill: {
    bar: 'flex-1 flex-row items-center justify-between rounded-full bg-white border border-slate-100 px-4 py-3',
    shadow: 'pill',
    item: 'flex-row items-center justify-center rounded-full min-h-[44px] min-w-[44px] px-2.5',
    itemActive: 'flex-row items-center justify-center rounded-full min-h-[44px] min-w-[44px] bg-primary-50 px-3',
    iconActive: '#C0703A',
    iconIdle: '#94A3B8',
    label: 'font-sans-semibold text-primary-500 text-xs ml-1.5',
    showLabel: 'focused',
    iconSize: 20,
  },
  // Agent — white capsule, icons only.
  minimal: {
    bar: 'flex-1 flex-row items-center justify-around rounded-[30px] bg-white py-1',
    shadow: 'minimal',
    item: 'flex-1 items-center justify-center min-h-[48px]',
    itemActive: 'flex-1 items-center justify-center min-h-[48px]',
    iconActive: '#FF5A36',
    iconIdle: '#94A3B8',
    label: '',
    showLabel: 'never',
    iconSize: 20,
  },
  // Sales — ink capsule + violet action pill.
  dock: {
    bar: 'flex-row items-center gap-[2px] rounded-full bg-[#151233] p-[6px]',
    shadow: 'dock',
    item: 'flex-row items-center justify-center gap-[7px] h-[44px] w-[44px] rounded-full',
    itemActive: 'flex-row items-center justify-center gap-[7px] h-[44px] px-[15px] rounded-full bg-[#6C5CE7]',
    iconActive: '#FFFFFF',
    iconIdle: '#8F8BC0',
    label: 'text-[13px] font-bold text-white',
    showLabel: 'focused',
    iconSize: 18,
    action: 'grow shrink basis-0 min-w-[120px] h-[52px] flex-row items-center justify-center gap-2 rounded-full bg-[#6C5CE7] overflow-hidden',
    actionShadow: 'dockAction',
    actionText: 'text-sm font-bold text-white',
  },
};

export default function AppTabBar({ state, descriptors, navigation, items, theme = 'pill', action, hidden = false }) {
  const insets = useSafeAreaInsets();
  const setInset = useSetTabBarInset();
  const { gutter } = useLayoutTier();
  const t = THEMES[theme];
  const bottom = insets.bottom + TAB_BAR_GAP;

  useEffect(() => {
    if (hidden) setInset(0);
  }, [hidden, setInset]);

  useEffect(() => () => setInset(0), [setInset]);

  if (hidden) return null;

  const onLayout = (e) => setInset(Math.ceil(e.nativeEvent.layout.height) + bottom);

  const routes = state.routes.filter((r) => items[r.name]);

  return (
    <View
      pointerEvents="box-none"
      onLayout={onLayout}
      className={`absolute left-0 right-0 flex-row items-center gap-[10px] ${gutter}`}
      style={[{ bottom }]}
    >
      <View className={t.bar} style={styles[t.shadow]}>
        {routes.map((route) => {
          const cfg = items[route.name];
          const isFocused = state.routes[state.index]?.key === route.key;
          const label = cfg.label ?? descriptors[route.key]?.options.title ?? route.name;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
          };
          const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

          return (
            <TouchableOpacity
              key={route.key}
              activeOpacity={0.75}
              onPress={onPress}
              onLongPress={onLongPress}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={isFocused ? { selected: true } : {}}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
              className={isFocused ? t.itemActive : t.item}
            >
              <Feather name={cfg.icon} size={t.iconSize} color={isFocused ? t.iconActive : t.iconIdle} />
              {t.showLabel === 'focused' && isFocused && (
                <Text numberOfLines={1} maxFontSizeMultiplier={DENSE_FONT_SCALE} className={t.label}>
                  {label}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {action && (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={action.onPress}
          accessibilityRole="button"
          accessibilityLabel={action.accessibilityLabel ?? action.label}
          className={t.action}
          style={styles[t.actionShadow]}
        >
          <Feather name={action.icon} size={17} color="#FFFFFF" />
          <Text maxFontSizeMultiplier={DENSE_FONT_SCALE} className={t.actionText}>
            {action.label}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.1,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  minimal: {
    shadowColor: '#a8a29e',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  dock: {
    shadowColor: '#151233',
    shadowOpacity: 0.22,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  dockAction: {
    shadowColor: '#6C5CE7',
    shadowOpacity: 0.34,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
});
