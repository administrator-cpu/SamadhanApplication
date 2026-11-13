import { useWindowDimensions } from 'react-native';

// Phones only. ≤360dp wide is the small-phone tier.
export const SMALL_PHONE_MAX_WIDTH = 360;

// Max font scale for dense UI (stat cards, chips, badges, tab labels).
// Body copy is left uncapped.
export const DENSE_FONT_SCALE = 1.2;

// Gap between the floating tab bar and the bottom safe-area edge.
export const TAB_BAR_GAP = 12;

// Breathing room added below the last item of a scrolling screen.
export const SCROLL_END_SPACE = 24;

export function useLayoutTier() {
  const { width, height, fontScale } = useWindowDimensions();
  const small = width <= SMALL_PHONE_MAX_WIDTH;
  return {
    width,
    height,
    fontScale,
    small,
    gutter: small ? 'px-3' : 'px-4',
    gap: small ? 'gap-3' : 'gap-4',
  };
}
