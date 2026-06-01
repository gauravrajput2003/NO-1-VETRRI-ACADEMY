import React, { memo, useCallback, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import ParticleEffect from './ParticleEffect';
import useParticleEffect from '../../hooks/useParticleEffect';

const SCRATCH_COLORS = ['#FFD700', '#FF6B35', '#FF1493', '#00E5FF', '#76FF03', '#E040FB', '#FFEB3B', '#FF4081', '#FFFFFF'];

function ParticleWrapper({
  children,
  particleCount = 20,
  colors = SCRATCH_COLORS,
  disabled = false,
  size = 'large',
  durationMs,
  style,
}) {
  const { bursts, triggerParticles, removeParticles } = useParticleEffect();
  const lastTriggerRef = useRef(0);

  const triggerFromEvent = useCallback((event) => {
    if (disabled) {
      return;
    }
    const now = Date.now();
    if (now - lastTriggerRef.current < 80) {
      return;
    }
    lastTriggerRef.current = now;
    const { locationX: x, locationY: y } = event.nativeEvent || {};
    if (typeof x === 'number' && typeof y === 'number') {
      triggerParticles(x, y, { count: particleCount, colors, size, durationMs });
    }
  }, [colors, disabled, durationMs, particleCount, size, triggerParticles]);

  const child = React.Children.only(children);
  const wrappedChild = React.isValidElement(child)
    ? React.cloneElement(child, {
        onPress: (...args) => {
          const evt = args[0];
          if (evt?.nativeEvent) {
            triggerFromEvent(evt);
          }
          child.props?.onPress?.(...args);
        },
      })
    : child;

  let layoutStyle = {};
  if (React.isValidElement(child) && child.props?.style) {
    const childStyle = child.props.style;
    const flat = Array.isArray(childStyle) ? Object.assign({}, ...childStyle.filter(Boolean)) : childStyle;
    const layoutKeys = [
      'flex', 'flexGrow', 'flexShrink', 'flexBasis',
      'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight',
      'margin', 'marginHorizontal', 'marginVertical',
      'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
      'position', 'top', 'bottom', 'left', 'right',
      'alignSelf',
    ];
    layoutKeys.forEach((key) => {
      if (flat && flat[key] !== undefined) {
        layoutStyle[key] = flat[key];
      }
    });
  }

  return (
    <View style={[styles.wrap, layoutStyle, style]}>
      {wrappedChild}
      <View pointerEvents="none" style={styles.overlay}>
        {bursts.map((burst) => (
          <ParticleEffect
            key={burst.id}
            id={burst.id}
            x={burst.x}
            y={burst.y}
            count={burst.count}
            colors={burst.colors}
            size={burst.size}
            durationMs={burst.durationMs}
            onComplete={removeParticles}
          />
        ))}
      </View>
    </View>
  );
}

export default memo(ParticleWrapper);

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
});
