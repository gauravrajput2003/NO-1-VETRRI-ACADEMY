import { useMemo } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ANDROID_MIN_BOTTOM_INSET = 12;
const BASE_TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 58 : 52;
const TAB_BAR_TOP_PADDING = 4;

export function useBottomTabBarStyle({
  backgroundColor,
  shadowStyle,
  borderTopColor,
}) {
  const insets = useSafeAreaInsets();

  return useMemo(() => {
    const bottomInset = Platform.OS === 'android'
      ? Math.max(insets.bottom, ANDROID_MIN_BOTTOM_INSET)
      : insets.bottom;

    return {
      tabBarStyle: {
        backgroundColor,
        borderTopColor,
        borderTopWidth: 0,
        height: BASE_TAB_BAR_HEIGHT + bottomInset,
        paddingTop: TAB_BAR_TOP_PADDING,
        paddingBottom: bottomInset,
        paddingHorizontal: 2,
        ...shadowStyle,
      },
      tabBarItemStyle: {
        paddingVertical: 2,
        minWidth: 0,
        flex: 1,
      },
      tabBarLabelStyle: {
        fontSize: 10,
        fontWeight: '600',
        paddingBottom: 2,
      },
    };
  }, [backgroundColor, borderTopColor, insets.bottom, shadowStyle]);
}