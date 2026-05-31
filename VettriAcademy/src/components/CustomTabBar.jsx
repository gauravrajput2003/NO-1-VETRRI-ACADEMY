import React from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarAnimation } from '../context/TabBarVisibilityContext';
import ParticleWrapper from './effects/ParticleWrapper';

const PINK = '#FF4FA3';
const TAB_BAR_HEIGHT = 64;
const TAB_COLORS = {
  Home: ['#FFD700', '#FFC300', '#FFEC8B'],
  Classes: ['#008B8B', '#20B2AA', '#00CED1'],
  Downloads: ['#FF1493', '#FF69B4', '#FFB6D9'],
  Scores: ['#2196F3', '#64B5F6', '#BBDEFB'],
  Profile: ['#9C27B0', '#CE93D8', '#E1BEE7'],
};

/**
 * CustomTabBar — Premium glassmorphism floating tab bar with auto-hide animation.
 *
 * Drop-in replacement for React Navigation's default tabBar.
 * Reads animated translateY/opacity from TabBarVisibilityContext.
 *
 * Usage in Tab.Navigator:
 *   <Tab.Navigator tabBar={(props) => <CustomTabBar {...props} />}>
 */
export default function CustomTabBar({ state, descriptors, navigation, iconConfig }) {
  const insets = useSafeAreaInsets();
  const safeBottom = Math.max(insets.bottom, 12);
  const { translateY, opacity } = useTabBarAnimation();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: safeBottom,
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.barWrapper}>
        {/* Blur background */}
        <View style={styles.blurContainer}>
          <BlurView tint="dark" intensity={80} style={styles.blur} />
          {/* Top glare line */}
          <View style={styles.glareLine} />
          {/* Border ring */}
          <View style={styles.borderRing} />
        </View>

        {/* Tab buttons */}
        <View style={styles.tabRow}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            const onLongPress = () => {
              navigation.emit({ type: 'tabLongPress', target: route.key });
            };

            // Get icon from iconConfig or from options
            let iconName = 'ellipse';
            if (iconConfig && iconConfig[route.name]) {
              iconName = isFocused
                ? iconConfig[route.name].active
                : iconConfig[route.name].inactive;
            }

            // Get icon color
            const iconColor = isFocused ? '#FFF' : 'rgba(255,255,255,0.4)';

            return (
              <ParticleWrapper
                key={route.key}
                particleCount={16}
                durationMs={800}
                size="small"
                colors={TAB_COLORS[route.name] || TAB_COLORS.Home}
              >
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={options.tabBarAccessibilityLabel}
                  testID={options.tabBarTestID}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  style={styles.tabButton}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconWrap, isFocused && styles.iconActive]}>
                    <Ionicons name={iconName} size={22} color={iconColor} />
                  </View>
                </TouchableOpacity>
              </ParticleWrapper>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: TAB_BAR_HEIGHT,
    zIndex: 999,
  },
  barWrapper: {
    flex: 1,
    borderRadius: 32,
    overflow: 'hidden',
  },
  blurContainer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
    overflow: 'hidden',
  },
  blur: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  glareLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  borderRing: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  tabRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'android' ? 4 : 0,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  iconActive: {
    backgroundColor: PINK,
    borderRadius: 23,
    shadowColor: PINK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
});
