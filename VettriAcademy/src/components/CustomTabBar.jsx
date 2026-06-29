import React from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarAnimation } from '../context/TabBarVisibilityContext';
import ParticleWrapper from './effects/ParticleWrapper';

const PINK = '#FF4D8D';
const PINK_LIGHT = '#FF7EB3';
const TAB_BAR_HEIGHT = 64;
const TAB_COLORS = {
  Home: ['#FFD700', '#FFC300', '#FFEC8B'],
  Classes: ['#008B8B', '#20B2AA', '#00CED1'],
  Downloads: ['#FF1493', '#FF69B4', '#FFB6D9'],
  Discussion: ['#2196F3', '#64B5F6', '#BBDEFB'],
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
          bottom: Math.max(insets.bottom, 16),
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.barWrapper}>
        {/* Blur background */}
        <View style={styles.blurContainer}>
          <BlurView tint="light" intensity={90} style={styles.blur} />
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
                  <View style={styles.iconWrap}>
                    {isFocused ? (
                      <LinearGradient
                        colors={[PINK, PINK_LIGHT]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.iconActive}
                      >
                        <Ionicons name={iconName} size={22} color="#FFF" />
                      </LinearGradient>
                    ) : (
                      <Ionicons name={iconName} size={22} color="#9CA3AF" />
                    )}
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
    borderRadius: 35,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: 'rgba(255,77,141,0.35)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 25,
    elevation: 12,
  },
  blurContainer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 35,
    overflow: 'hidden',
  },
  blur: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.96)',
  },
  borderRing: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 35,
    borderWidth: 1,
    borderColor: 'rgba(255,77,141,0.10)',
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
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: PINK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
});
