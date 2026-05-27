import React, { createContext, useContext, useRef, useCallback } from 'react';
import { Animated } from 'react-native';

/**
 * TabBarVisibility Context
 *
 * Provides a shared animated visibility state for the bottom tab bar.
 * Screens use `useTabBarScroll()` to get an onScroll handler.
 * The CustomTabBar reads translateY/opacity to animate in/out.
 *
 * This decouples scroll detection from the tab bar component,
 * allowing ANY scrollable screen to control tab bar visibility.
 */

const SCROLL_THRESHOLD = 12;
const ANIMATION_DURATION = 250;

const TabBarVisibilityContext = createContext(null);

export function TabBarVisibilityProvider({ children, tabBarHeight = 100 }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const isHidden = useRef(false);
  const lastOffsetY = useRef(0);
  const accumulatedDelta = useRef(0);

  const show = useCallback(() => {
    if (!isHidden.current) return;
    isHidden.current = false;
    accumulatedDelta.current = 0;

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateY, opacity]);

  const hide = useCallback(() => {
    if (isHidden.current) return;
    isHidden.current = true;
    accumulatedDelta.current = 0;

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: tabBarHeight + 40,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateY, opacity, tabBarHeight]);

  const onScroll = useCallback(
    (event) => {
      const currentY = event.nativeEvent.contentOffset.y;
      const delta = currentY - lastOffsetY.current;

      if (currentY <= 0) {
        lastOffsetY.current = currentY;
        accumulatedDelta.current = 0;
        show();
        return;
      }

      if ((delta > 0 && accumulatedDelta.current >= 0) || (delta < 0 && accumulatedDelta.current <= 0)) {
        accumulatedDelta.current += delta;
      } else {
        accumulatedDelta.current = delta;
      }

      lastOffsetY.current = currentY;

      if (accumulatedDelta.current > SCROLL_THRESHOLD) {
        hide();
      } else if (accumulatedDelta.current < -SCROLL_THRESHOLD) {
        show();
      }
    },
    [show, hide]
  );

  return (
    <TabBarVisibilityContext.Provider value={{ translateY, opacity, onScroll, show, hide }}>
      {children}
    </TabBarVisibilityContext.Provider>
  );
}

/**
 * useTabBarScroll — returns onScroll handler for FlatList/ScrollView
 *
 * Usage in any screen:
 *   const { onScroll } = useTabBarScroll();
 *   <FlatList onScroll={onScroll} scrollEventThrottle={16} />
 */
export function useTabBarScroll() {
  const ctx = useContext(TabBarVisibilityContext);
  if (!ctx) {
    // Fallback if not wrapped in provider (e.g. screens outside tab navigator)
    return { onScroll: undefined, show: () => {}, hide: () => {} };
  }
  return { onScroll: ctx.onScroll, show: ctx.show, hide: ctx.hide };
}

/**
 * useTabBarAnimation — returns animated values for CustomTabBar
 */
export function useTabBarAnimation() {
  const ctx = useContext(TabBarVisibilityContext);
  if (!ctx) {
    return {
      translateY: new Animated.Value(0),
      opacity: new Animated.Value(1),
    };
  }
  return { translateY: ctx.translateY, opacity: ctx.opacity };
}

export default TabBarVisibilityContext;
