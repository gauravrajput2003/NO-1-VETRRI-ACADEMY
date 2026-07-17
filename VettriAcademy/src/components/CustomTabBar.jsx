import React, { useRef, useEffect } from 'react';
import { View, Pressable, StyleSheet, Animated, Platform, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarAnimation } from '../context/TabBarVisibilityContext';
import ParticleWrapper from './effects/ParticleWrapper';

const PINK = '#FF4F8B';
const PINK_LIGHT = '#FF6AA5';
const INACTIVE_COLOR = '#FFFFFF';
const TAB_BAR_HEIGHT = 78;
const TAB_COLORS = {
  Home: ['#FFD700', '#FFC300', '#FFEC8B'],
  Classes: ['#008B8B', '#20B2AA', '#00CED1'],
  Downloads: ['#FF1493', '#FF69B4', '#FFB6D9'],
  Discussion: ['#2196F3', '#64B5F6', '#BBDEFB'],
  Profile: ['#9C27B0', '#CE93D8', '#E1BEE7'],
};

const TabButton = ({ isFocused, onPress, onLongPress, iconName, label, options, colors }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={options.tabBarAccessibilityLabel}
      testID={options.tabBarTestID}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.tabButton}
    >
      <ParticleWrapper
        particleCount={16}
        durationMs={800}
        size="small"
        colors={colors}
        style={styles.particleWrap}
      >
        <View>
          <Animated.View style={[styles.animContainer, { transform: [{ scale }] }]}>
            <View style={isFocused ? styles.activeIconWrap : styles.inactiveIconWrap}>
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
                <Ionicons name={iconName} size={24} color={INACTIVE_COLOR} />
              )}
            </View>
          </Animated.View>
        </View>
      </ParticleWrapper>
    </Pressable>
  );
};

export default function CustomTabBar({ state, descriptors, navigation, iconConfig }) {
  const insets = useSafeAreaInsets();
  const { translateY, opacity } = useTabBarAnimation();

  return (
    <Animated.View
      style={[
        styles.outerWrapper,
        {
          bottom: Math.max(insets.bottom, 18),
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.container}>
        {/* Colorful Gradient Background */}
        <View style={styles.bgContainer}>
          <LinearGradient
            colors={['#2DD4BF', '#F472B6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
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

            let iconName = 'ellipse';
            if (iconConfig && iconConfig[route.name]) {
              iconName = isFocused
                ? iconConfig[route.name].active
                : iconConfig[route.name].inactive;
            }

            const label = options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
                ? options.title
                : route.name;

            return (
              <TabButton
                key={route.key}
                isFocused={isFocused}
                onPress={onPress}
                onLongPress={onLongPress}
                iconName={iconName}
                label={label}
                options={options}
                colors={TAB_COLORS[route.name] || TAB_COLORS.Home}
              />
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 999,
  },
  container: {
    height: TAB_BAR_HEIGHT,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 18,
  },
  bgContainer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 34,
    overflow: 'hidden',
  },
  tabRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  particleWrap: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  animContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveIconWrap: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  activeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: PINK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  iconActive: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
});

