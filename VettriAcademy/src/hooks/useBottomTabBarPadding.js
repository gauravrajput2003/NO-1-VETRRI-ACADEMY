import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const TAB_BAR_HEIGHT = 64;

export function useBottomTabBarPadding() {
  const insets = useSafeAreaInsets();
  
  // The bottom inset from safe area, with a minimum padding of 12px for devices without bottom gestures
  const bottomOffset = Math.max(insets.bottom, 12);
  
  // Total vertical space the floating tab bar occupies
  const totalBarSpace = TAB_BAR_HEIGHT + bottomOffset;
  
  // Add 32px of extra breathing room above the floating navbar
  return totalBarSpace + 32;
}

export default useBottomTabBarPadding;
