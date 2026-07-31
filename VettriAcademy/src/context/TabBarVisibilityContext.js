import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { Animated } from 'react-native';

const TabBarVisibilityContext = createContext();

export const useTabBarVisibility = () => useContext(TabBarVisibilityContext);

export const TabBarVisibilityProvider = ({ children }) => {
  const [isPermanentlyHidden, setIsPermanentlyHidden] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);

  const hidePermanently = useCallback(() => {
    setIsPermanentlyHidden(true);
  }, []);

  const showPermanently = useCallback(() => {
    setIsPermanentlyHidden(false);
  }, []);

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;
        lastScrollY.current = currentScrollY;
      },
    }
  );

  const value = {
    scrollY,
    onScroll,
    isPermanentlyHidden,
    hidePermanently,
    showPermanently,
  };

  return (
    <TabBarVisibilityContext.Provider value={value}>
      {children}
    </TabBarVisibilityContext.Provider>
  );
};

export const useTabBarAnimation = () => {
  const { scrollY } = useTabBarVisibility();
  const diffClamp = Animated.diffClamp(scrollY, 0, 78);
  const translateY = diffClamp.interpolate({
    inputRange: [0, 78],
    outputRange: [0, 100],
    extrapolate: 'clamp',
  });
  const opacity = translateY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  return { translateY, opacity };
};

export const useTabBarScroll = () => {
  const { onScroll } = useTabBarVisibility();
  return { onScroll };
};