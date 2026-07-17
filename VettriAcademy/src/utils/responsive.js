import { useWindowDimensions } from 'react-native';

// Base design width (what you designed against — your original SW ~375-400)
const BASE_WIDTH = 390;

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  // Clamp scale so huge tablets/desktops don't make everything giant,
  // and tiny old phones don't make everything unreadably small.
  const rawScale = width / BASE_WIDTH;
  const scale = Math.min(Math.max(rawScale, 0.85), 1.35);

  const isTablet = width >= 768;
  const isSmall = width < 360;

  // Content max-width so it doesn't stretch edge-to-edge on tablets/web
  const contentMaxWidth = 480;
  const contentWidth = Math.min(width, contentMaxWidth);

  const s = (size) => Math.round(size * scale);       // scale a px value
  const vs = (size) => Math.round(size * (height / 844) * 0.9 + size * 0.1); // gentle vertical scale

  return { width, height, scale, s, vs, isTablet, isSmall, contentWidth };
}