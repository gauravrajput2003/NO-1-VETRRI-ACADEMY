import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const DEFAULT_COLORS = ['#FFD700', '#FF6B35', '#FF1493', '#00E5FF', '#76FF03', '#E040FB', '#FFEB3B', '#FF4081', '#FFFFFF'];
const SHAPES = [
  'star', 'star', 'star', 'star',
  'circle', 'circle', 'circle',
  'diamond', 'diamond',
  'sparkle',
];

const sizeMap = {
  small: { min: 12, max: 18, starMin: 20, starMax: 24, velocityMin: 200, velocityMax: 320, durationMin: 1400, durationMax: 1550, gravity: 260 },
  medium: { min: 12, max: 20, starMin: 20, starMax: 26, velocityMin: 220, velocityMax: 350, durationMin: 1450, durationMax: 1580, gravity: 300 },
  large: { min: 12, max: 22, starMin: 20, starMax: 28, velocityMin: 240, velocityMax: 380, durationMin: 1500, durationMax: 1600, gravity: 340 },
};

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

const Particle = memo(function Particle({ particle, onDone }) {
  const progress = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    const t = progress.value;
    return {
      opacity: t < 0.08 ? t / 0.08 : t < 0.6 ? 1 : Math.max(0, 1 - (t - 0.6) / 0.4),
      transform: [
        { translateX: particle.dx * t + particle.wind * t * t },
        { translateY: particle.dy * t + particle.gravity * t * t },
        { scale: t < 0.2 ? 0.7 + 1.2 * (t / 0.2) : t < 0.65 ? 1.9 - 0.5 * ((t - 0.2) / 0.45) : 1.4 - 1.1 * ((t - 0.65) / 0.35) },
      ],
    };
  });

  React.useEffect(() => {
    progress.value = withDelay(
      particle.delay,
      withTiming(
        1,
        { duration: particle.duration, easing: Easing.out(Easing.exp) },
        (finished) => {
          'worklet';
          if (finished) {
            runOnJS(onDone)();
          }
        }
      )
    );
    return () => {
      cancelAnimation(progress);
    };
  }, [onDone, particle.delay, particle.duration, progress]);

  if (particle.shape === 'star') {
    return (
      <Animated.View style={[styles.particleBase, animatedStyle, styles.glowBase, { shadowColor: particle.color }]}>
        <Text style={[styles.star, { color: particle.color, fontSize: particle.size }]}>★</Text>
      </Animated.View>
    );
  }

  if (particle.shape === 'diamond') {
    return (
      <Animated.View
        style={[
          styles.particleBase,
          animatedStyle,
          {
            width: particle.size,
            height: particle.size,
            borderRadius: 2,
            shadowColor: particle.color,
            shadowOpacity: 0.8,
            shadowRadius: 6,
            elevation: 6,
          },
        ]}
      >
        <View style={[styles.diamondFill, { backgroundColor: particle.color }]} />
      </Animated.View>
    );
  }

  if (particle.shape === 'sparkle') {
    return (
      <Animated.View style={[styles.particleBase, animatedStyle, styles.glowBase, { shadowColor: particle.color }]}>
        <Text style={[styles.star, { color: particle.color, fontSize: particle.size }]}>✦</Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.particleBase,
        animatedStyle,
        {
          width: particle.size,
          height: particle.size,
          borderRadius: particle.size / 2,
          backgroundColor: particle.color,
          shadowColor: particle.color,
          shadowOpacity: 0.8,
          shadowRadius: 6,
          elevation: 6,
        },
      ]}
    />
  );
});

function ParticleEffect({ id, x, y, count = 22, colors = DEFAULT_COLORS, size = 'medium', durationMs, onComplete }) {
  const particles = useMemo(() => {
    const bounds = sizeMap[size] || sizeMap.medium;
    const effectiveCount = Math.max(22, count || 22);
    const velocityMin = Math.max(180, bounds.velocityMin);
    const durationMin = Math.max(1400, bounds.durationMin);
    return Array.from({ length: effectiveCount }, (_, index) => {
      const angle = rand(0, Math.PI * 2);
      const velocity = rand(velocityMin, bounds.velocityMax);
      const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      const particleSize =
        shape === 'star' || shape === 'sparkle'
          ? rand(Math.max(20, bounds.starMin), bounds.starMax)
          : rand(bounds.min, bounds.max);
      return {
        id: `${id}-${index}`,
        delay: rand(0, 30),
        duration: typeof durationMs === 'number'
          ? rand(Math.max(1400, durationMs - 80), Math.max(1480, durationMs + 80))
          : rand(durationMin, bounds.durationMax),
        dx: Math.cos(angle) * velocity,
        dy: Math.sin(angle) * velocity,
        wind: rand(-70, 70),
        gravity: bounds.gravity,
        size: particleSize,
        color: colors[Math.floor(Math.random() * colors.length)] || DEFAULT_COLORS[0],
        shape,
      };
    });
  }, [colors, count, durationMs, id, size]);

  const doneCountRef = React.useRef(0);

  const handleDone = React.useCallback(() => {
    doneCountRef.current += 1;
    if (doneCountRef.current >= particles.length) {
      onComplete(id);
    }
  }, [id, onComplete, particles.length]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View pointerEvents="none" style={[styles.origin, { left: x, top: y }]}>
        {particles.map((particle) => (
          <Particle key={particle.id} particle={particle} onDone={handleDone} />
        ))}
      </View>
    </View>
  );
}

export default memo(ParticleEffect);

const styles = StyleSheet.create({
  origin: {
    position: 'absolute',
    width: 0,
    height: 0,
    zIndex: 9999,
  },
  particleBase: {
    position: 'absolute',
    left: -4,
    top: -4,
  },
  star: {
    fontWeight: '700',
  },
  glowBase: {
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 6,
  },
  diamondFill: {
    width: '100%',
    height: '100%',
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
  },
});
