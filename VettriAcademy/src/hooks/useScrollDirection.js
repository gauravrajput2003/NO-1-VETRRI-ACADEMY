import { useRef, useCallback } from 'react';
import { Animated } from 'react-native';

/**
 * useScrollDirection — LinkedIn-style scroll-aware tab bar hook
 *
 * Returns:
 *  - onScroll: attach to FlatList/ScrollView's onScroll prop
 *  - scrollHandler: attach to FlatList/ScrollView's onScroll prop (Animated.event version)
 *  - translateY: Animated.Value for tab bar slide animation
 *  - opacity: Animated.Value for tab bar fade animation
 *
 * Usage:
 *   const { onScroll, translateY, opacity } = useScrollDirection();
 *   <FlatList onScroll={onScroll} scrollEventThrottle={16} />
 */

const SCROLL_THRESHOLD = 12; // px — ignore micro-scrolls to prevent flicker
const ANIMATION_DURATION = 250;

export function useScrollDirection({ tabBarHeight = 100 } = {}) {
  const lastOffsetY = useRef(0);
  const isHidden = useRef(false);
  const accumulatedDelta = useRef(0);

  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

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
        toValue: tabBarHeight + 40, // slide below screen + extra clearance
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

      // At top of content — always show
      if (currentY <= 0) {
        lastOffsetY.current = currentY;
        accumulatedDelta.current = 0;
        show();
        return;
      }

      // Accumulate small deltas in the same direction
      if ((delta > 0 && accumulatedDelta.current >= 0) || (delta < 0 && accumulatedDelta.current <= 0)) {
        accumulatedDelta.current += delta;
      } else {
        // Direction changed — reset accumulator
        accumulatedDelta.current = delta;
      }

      lastOffsetY.current = currentY;

      // Only trigger after threshold met — prevents flicker on small bounces
      if (accumulatedDelta.current > SCROLL_THRESHOLD) {
        // Scrolling DOWN → hide
        hide();
      } else if (accumulatedDelta.current < -SCROLL_THRESHOLD) {
        // Scrolling UP → show
        show();
      }
    },
    [show, hide]
  );

  return {
    onScroll,
    translateY,
    opacity,
    show,
    hide,
  };
}

export default useScrollDirection;
