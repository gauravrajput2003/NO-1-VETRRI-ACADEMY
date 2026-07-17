import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet,
  TouchableOpacity, Animated, Easing, Platform, Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, RadialGradient, LinearGradient as SvgLinearGradient, Stop, Rect } from 'react-native-svg';
import { useResponsive } from '../../utils/responsive';

const useWebNativeDriver = Platform.OS !== 'web';

// ---------------------------------------------------------------------------
// SINGLE SOURCE OF TRUTH FOR BACKGROUND COLOR
// This must exactly match the flat background baked into assets/welcome.png.
// If you ever re-export that PNG with a different (or transparent) background,
// update ONLY this value — every surface below (root, SVG fill, image wrapper)
// reads from it, so they can never drift apart again.
// ---------------------------------------------------------------------------
const C = {
  bg: '#07171C',
  gold: '#F0B429',
  pink: '#EC1E79',
  teal: '#14C7B4',
  white: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.68)',
};

const hexToRgba = (hex, a) => {
  const h = hex.replace('#', '');
  return `rgba(${parseInt(h.substring(0, 2), 16)},${parseInt(h.substring(2, 4), 16)},${parseInt(h.substring(4, 6), 16)},${a})`;
};

const glow = (hex, opacity = 0.4) =>
  Platform.OS === 'web'
    ? { boxShadow: `0px 12px 30px ${hexToRgba(hex, opacity)}` }
    : { shadowColor: hex, shadowOffset: { width: 0, height: 8 }, shadowOpacity: opacity, shadowRadius: 20, elevation: 10 };

function FloatingView({ children, style, amplitude = 8, duration = 4000, delay = 0 }) {
  const translateY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, { toValue: -amplitude, duration, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: useWebNativeDriver }),
        Animated.timing(translateY, { toValue: amplitude, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: useWebNativeDriver }),
      ])
    ).start();
  }, [amplitude, delay, duration, translateY]);
  return <Animated.View style={[style, { transform: [{ translateY }] }]}>{children}</Animated.View>;
}

function LayeredBackground({ width, height }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="pinkGlow" cx="12%" cy="4%" r="35%">
            <Stop offset="0%" stopColor={C.pink} stopOpacity={0.1} />
            <Stop offset="100%" stopColor={C.pink} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="tealGlow" cx="50%" cy="100%" r="45%">
            <Stop offset="0%" stopColor={C.teal} stopOpacity={0.08} />
            <Stop offset="100%" stopColor={C.teal} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        {/* Rect fill uses C.bg — same variable as root + image wrapper below */}
        <Rect x="0" y="0" width={width} height={height} fill={C.bg} />
        <Rect x="0" y="0" width={width} height={height} fill="url(#pinkGlow)" />
        <Rect x="0" y="0" width={width} height={height} fill="url(#tealGlow)" />
      </Svg>
    </View>
  );
}

function TrustBadge({ iconName, label }) {
  return (
    <View style={st.trustBadge}>
      <Ionicons name={iconName} size={16} color={C.gold} />
      <Text style={st.trustBadgeText}>{label}</Text>
    </View>
  );
}

export default function WelcomeScreen({ navigation }) {
  const { width, height, s, isSmall } = useResponsive();

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: useWebNativeDriver }),
      Animated.timing(slideUp, { toValue: 0, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: useWebNativeDriver }),
    ]).start();
  }, [fadeIn, slideUp]);

  const onBtnPressIn = () => Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: useWebNativeDriver }).start();
  const onBtnPressOut = () => Animated.spring(btnScale, { toValue: 1, useNativeDriver: useWebNativeDriver }).start();

  // ---------------------------------------------------------------------
  // RESPONSIVE SIZING
  // Works off the shorter screen dimension so tiny Android phones (320dp
  // width budget devices), tall phones, and tablets (both portrait AND
  // landscape) all get sane, proportional sizing instead of fixed caps.
  // ---------------------------------------------------------------------
  const isLandscape = width > height;
  const horizontalPadding = isSmall ? 10 : 18;
  const contentWidth = Math.min(width - horizontalPadding * 2, 430);

  // Hero image: scale relative to available space, clamp between sane
  // min/max so it never disappears on small phones or over-balloons on tablets.
  const heroWidth = Math.min(contentWidth, isLandscape ? width * 0.48 : 400);
  const heroHeightRaw = isLandscape ? height * 0.7 : height * 0.5;
  const heroHeight = Math.max(260, Math.min(heroHeightRaw, isLandscape ? 460 : 560));

  // Vignette band width — how much of the image edge gets faded into C.bg.
  // Scales with image size so it looks proportional on small and large screens.
  const edge = Math.max(28, Math.min(heroWidth, heroHeight) * 0.16);

  return (
    <View style={st.root}>
      <LayeredBackground width={width} height={height} />

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[
            st.page,
            {
              paddingHorizontal: horizontalPadding,
              flexGrow: 1,
              justifyContent: 'center',
              minHeight: height,
            },
          ]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Animated.View
            style={{
              opacity: fadeIn,
              transform: [{ translateY: slideUp }],
              width: contentWidth,
              alignSelf: 'center',
              flexDirection: isLandscape ? 'row' : 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <View style={{ flex: isLandscape ? 1 : undefined, alignItems: 'center' }}>
              <View style={{ alignItems: 'center', marginTop: s(4) }}>
                <View style={st.no1Badge}>
                  <Ionicons name="star" size={22} color={C.gold} />
                  <Text style={st.no1Text}>NO. 1</Text>
                </View>

                <Text style={[st.brandWhite, { fontSize: s(36) }]}>VETTRI</Text>
                <Text style={[st.brandSub, { fontSize: s(18) }]}>ACADEMY</Text>

                <View style={st.taglineRow}>
                  <View style={st.taglineDash} />
                  <Text style={[st.brandTagline, { fontSize: s(13) }]}>Learning Elevated</Text>
                  <View style={st.taglineDash} />
                </View>
              </View>

              <View style={{ alignItems: 'center', marginTop: s(10) }}>
                {/*
                  This wrapper's backgroundColor is C.bg — the SAME constant
                  used for the root screen and the SVG Rect fill above.
                  Even if the PNG has hard edges or isn't perfectly
                  transparent, the area immediately behind/around it will
                  always be identical to the screen background, so there's
                  no visible seam regardless of device size or pixel density.
                */}
                <FloatingView amplitude={8} duration={4500}>
                  <View style={{ backgroundColor: C.bg, width: heroWidth, height: heroHeight }}>
                    <Image
                      source={require('../../../assets/welcome.png')}
                      style={{ width: heroWidth, height: heroHeight }}
                      resizeMode="cover"
                    />
                    {/*
                      VIGNETTE OVERLAY — this is what hides the "imported PNG"
                      rectangle. Each edge gradient goes from fully transparent
                      (center) to fully opaque C.bg (outer edge), so the hard
                      border of the source image dissolves into the screen
                      background instead of showing a visible box. This is a
                      visual patch, not a real fix — the clean, permanent fix
                      is re-exporting the asset with a transparent background
                      (see the image-generation prompt provided separately).
                    */}
                    <Svg width={heroWidth} height={heroHeight} style={StyleSheet.absoluteFill} pointerEvents="none">
                      <Defs>
                        <SvgLinearGradient id="fadeTop" x1="0" y1="0" x2="0" y2="1">
                          <Stop offset="0%" stopColor={C.bg} stopOpacity={1} />
                          <Stop offset="100%" stopColor={C.bg} stopOpacity={0} />
                        </SvgLinearGradient>
                        <SvgLinearGradient id="fadeBottom" x1="0" y1="1" x2="0" y2="0">
                          <Stop offset="0%" stopColor={C.bg} stopOpacity={1} />
                          <Stop offset="100%" stopColor={C.bg} stopOpacity={0} />
                        </SvgLinearGradient>
                        <SvgLinearGradient id="fadeLeft" x1="0" y1="0" x2="1" y2="0">
                          <Stop offset="0%" stopColor={C.bg} stopOpacity={1} />
                          <Stop offset="100%" stopColor={C.bg} stopOpacity={0} />
                        </SvgLinearGradient>
                        <SvgLinearGradient id="fadeRight" x1="1" y1="0" x2="0" y2="0">
                          <Stop offset="0%" stopColor={C.bg} stopOpacity={1} />
                          <Stop offset="100%" stopColor={C.bg} stopOpacity={0} />
                        </SvgLinearGradient>
                      </Defs>
                      <Rect x="0" y="0" width={heroWidth} height={edge} fill="url(#fadeTop)" />
                      <Rect x="0" y={heroHeight - edge} width={heroWidth} height={edge} fill="url(#fadeBottom)" />
                      <Rect x="0" y="0" width={edge} height={heroHeight} fill="url(#fadeLeft)" />
                      <Rect x={heroWidth - edge} y="0" width={edge} height={heroHeight} fill="url(#fadeRight)" />
                    </Svg>
                  </View>
                </FloatingView>
              </View>
            </View>

            <View style={{ marginTop: isLandscape ? 0 : s(22), width: isLandscape ? contentWidth * 0.5 : '100%' }}>
              <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Login')}
                  onPressIn={onBtnPressIn}
                  onPressOut={onBtnPressOut}
                  activeOpacity={0.9}
                  style={[glow(C.pink, 0.5), st.loginBtn, { height: s(60), borderRadius: s(30) }]}
                >
                  <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
                    <Defs>
                      <SvgLinearGradient id="btnGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <Stop offset="0%" stopColor={C.pink} />
                        <Stop offset="100%" stopColor={C.gold} />
                      </SvgLinearGradient>
                    </Defs>
                    <Rect x="0" y="0" width="100%" height="100%" rx={s(30)} fill="url(#btnGrad)" />
                  </Svg>
                  <Text style={[st.loginBtnText, { fontSize: s(18) }]}>Login / Get Started</Text>
                  <Ionicons name="arrow-forward" size={s(18)} color="#FFF" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              </Animated.View>

              <View style={st.trustRow}>
                <TrustBadge iconName="shield-checkmark" label="Secure" />
                <TrustBadge iconName="people" label="Trusted by Students" />
                <TrustBadge iconName="ribbon" label="Quality Education" />
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  page: { paddingTop: 12, paddingBottom: 12 },

  softCircle: { position: 'absolute', borderRadius: 999 },

  no1Badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: hexToRgba(C.gold, 0.6),
    backgroundColor: hexToRgba(C.gold, 0.14),
    marginBottom: 10,
  },
  no1Text: { color: C.gold, fontWeight: '900', fontSize: 22, letterSpacing: 2 },

  brandWhite: { fontWeight: '900', color: C.white, letterSpacing: 3 },
  brandSub: { color: C.pink, fontWeight: '800', letterSpacing: 4, marginTop: 4 },
  brandTagline: { color: C.textMuted, fontWeight: '600', letterSpacing: 1 },

  taglineRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  taglineDash: { width: 18, height: 1, backgroundColor: 'rgba(255,255,255,0.25)' },

  loginBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  loginBtnText: { color: '#FFF', fontWeight: '800', letterSpacing: 0.5 },

  trustRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 2,
    paddingHorizontal: 4,
  },
  trustBadge: { alignItems: 'center', flex: 1, gap: 4 },
  trustBadgeText: { color: 'rgba(255,255,255,0.6)', fontWeight: '600', fontSize: 10, textAlign: 'center' },
});