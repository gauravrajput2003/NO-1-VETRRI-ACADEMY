import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, Rect, G, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

// ─────────────────────────────────────────────────────────────────────────────
// Small white-line icons used INSIDE the circular gradient badges.
// Each takes `size` (px) and `color` (stroke color, default white).
// ─────────────────────────────────────────────────────────────────────────────

export function CalendarCheckIcon({ size = 22, color = '#FFFFFF' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="5" width="18" height="16" rx="3" stroke={color} strokeWidth={2} />
      <Path d="M3 9.5H21" stroke={color} strokeWidth={2} />
      <Path d="M7.5 3V6.5" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M16.5 3V6.5" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M9 14.2L11 16.2L15.5 11.7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function DocCheckIcon({ size = 22, color = '#FFFFFF' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 3.5H14L19 8.5V20.5H6V3.5Z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M14 3.5V8.5H19" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M9 14L11 16L15.5 11.5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function StarBadgeIcon({ size = 22, color = '#FFFFFF' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2.5L14.9 8.4L21.4 9.35L16.7 13.93L17.8 20.4L12 17.35L6.2 20.4L7.3 13.93L2.6 9.35L9.1 8.4L12 2.5Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function TrophyIcon({ size = 56 }) {
  // Two-tone gold trophy, matches reference closely
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Defs>
        <SvgLinearGradient id="trophyGold" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFE27A" />
          <Stop offset="1" stopColor="#F5A623" />
        </SvgLinearGradient>
      </Defs>
      {/* base */}
      <Rect x="22" y="52" width="20" height="6" rx="2" fill="#C97B2E" />
      <Rect x="27" y="46" width="10" height="8" fill="#E0973A" />
      {/* stem */}
      <Rect x="29" y="38" width="6" height="10" fill="#F5A623" />
      {/* cup */}
      <Path
        d="M18 14H46V24C46 32.8366 38.8366 40 30 40H34C25.1634 40 18 32.8366 18 24V14Z"
        fill="url(#trophyGold)"
      />
      {/* handles */}
      <Path d="M18 16C12 16 10 22 14 26C16.5 28.5 19 28 19 28" stroke="#F5A623" strokeWidth={3} strokeLinecap="round" />
      <Path d="M46 16C52 16 54 22 50 26C47.5 28.5 45 28 45 28" stroke="#F5A623" strokeWidth={3} strokeLinecap="round" />
      {/* star on cup */}
      <Path
        d="M32 18L33.8 21.7L38 22.3L35 25.2L35.7 29.4L32 27.4L28.3 29.4L29 25.2L26 22.3L30.2 21.7L32 18Z"
        fill="#FFFFFF"
        opacity={0.9}
      />
    </Svg>
  );
}

// Decorative sparkle (4-point star), used scattered around hero/cards.
// Accepts an optional `style` (e.g. position:'absolute', top, left) applied to a wrapping View.
export function Sparkle({ size = 14, color = '#FFFFFF', opacity = 0.9, style }) {
  return (
    <View style={style} pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" opacity={opacity}>
        <Path
          d="M12 2C12 7 13 9 18 9C13 9 12 11 12 16C12 11 11 9 6 9C11 9 12 7 12 2Z"
          fill={color}
        />
      </Svg>
    </View>
  );
}

// Decorative leaf cluster (bottom-right of level card in reference)
export function LeafCluster({ width = 70, height = 60 }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 70 60" fill="none">
      <Path d="M50 55C50 40 60 30 68 28C68 43 60 53 50 55Z" fill="#FF8FB3" opacity={0.55} />
      <Path d="M30 58C30 42 38 30 48 26C50 42 42 54 30 58Z" fill="#5FE0D6" opacity={0.6} />
      <Path d="M12 58C14 46 22 38 32 36C32 48 24 56 12 58Z" fill="#FFB55C" opacity={0.55} />
    </Svg>
  );
}

// Sun illustration with face — empty state ("All clear today!")
export function SunCharacter({ size = 70 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <Defs>
        <SvgLinearGradient id="sunGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFD96B" />
          <Stop offset="1" stopColor="#FFB23E" />
        </SvgLinearGradient>
      </Defs>
      {/* rays */}
      <G opacity={0.9}>
        <Rect x="37" y="2" width="6" height="12" rx="3" fill="#FFC857" />
        <Rect x="37" y="66" width="6" height="12" rx="3" fill="#FFC857" />
        <Rect x="2" y="37" width="12" height="6" rx="3" fill="#FFC857" />
        <Rect x="66" y="37" width="12" height="6" rx="3" fill="#FFC857" />
        <Rect x="13" y="13" width="6" height="12" rx="3" fill="#FFC857" transform="rotate(-45 16 19)" />
        <Rect x="61" y="13" width="6" height="12" rx="3" fill="#FFC857" transform="rotate(45 64 19)" />
        <Rect x="13" y="55" width="6" height="12" rx="3" fill="#FFC857" transform="rotate(45 16 61)" />
        <Rect x="61" y="55" width="6" height="12" rx="3" fill="#FFC857" transform="rotate(-45 64 61)" />
      </G>
      {/* face circle */}
      <Circle cx="40" cy="40" r="22" fill="url(#sunGrad)" />
      {/* cheeks */}
      <Circle cx="29" cy="44" r="3.4" fill="#FF8FA3" opacity={0.6} />
      <Circle cx="51" cy="44" r="3.4" fill="#FF8FA3" opacity={0.6} />
      {/* eyes */}
      <Circle cx="32" cy="37" r="2.4" fill="#5A3A1B" />
      <Circle cx="48" cy="37" r="2.4" fill="#5A3A1B" />
      {/* smile */}
      <Path d="M31 45C33 49 47 49 49 45" stroke="#5A3A1B" strokeWidth={2.4} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

// Paper airplane (decorative, bottom-right of "All clear" card)
export function PaperPlane({ size = 30, color = '#3FB8AE' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 3L3 10.5L10.5 13.5L13.5 21L21 3Z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
        fill={color}
        fillOpacity={0.12}
      />
      <Path d="M10.5 13.5L21 3" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
    </Svg>
  );
}

// Dotted flight path (decorative, behind paper plane)
export function DottedPath({ width = 90, height = 24, color = '#3FB8AE' }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 90 24" fill="none">
      <Path
        d="M2 20C20 22 30 4 50 6C65 7.5 70 18 88 14"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray="1 7"
        fill="none"
      />
    </Svg>
  );
}