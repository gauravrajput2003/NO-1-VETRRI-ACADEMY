/**
 * LoginScreen.jsx — Compact single-screen layout, no scroll
 * Uses ONLY React Native built-in Animated. Auth logic unchanged.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  StatusBar, KeyboardAvoidingView, Platform,
  ActivityIndicator, Dimensions, Animated, Easing, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loginUser, clearError } from '../../redux/slices/authSlice';
import ParticleWrapper from '../../components/effects/ParticleWrapper';

const { width: SW, height: SH } = Dimensions.get('window');

const C = {
  bg1: '#EEE8FF', bg2: '#D9CCFF',
  purple: '#7B61FF', purpleD: '#5B3FD9',
  pink: '#FF4FA3', dark: '#1E1B4B',
  gray: '#6B7280', white: '#FFFFFF',
  inputBg: '#F8F6FF', border: '#E8E0FF',
};

const ROLE_COLORS  = { student: C.purple, teacher: '#00ACC1', admin: '#FF4D8D' };
const ROLE_ICONS   = { student: 'school', teacher: 'people', admin: 'shield-checkmark' };
const ROLE_LABELS  = { student: 'Student', teacher: 'Teacher', admin: 'Admin' };
const ROLE_EMOJIS  = { student: '🎓', teacher: '👨‍🏫', admin: '🛡️' };

export default function LoginScreen({ route, navigation }) {
  // ── UNCHANGED auth logic ─────────────────────────────────────────────────────
  const { role }   = route.params;
  const dispatch   = useDispatch();
  const { loading, error } = useSelector((s) => s.auth);

  const [identifier,    setIdentifier]   = useState('');
  const [password,      setPassword]     = useState('');
  const [showPassword,  setShowPassword] = useState(false);
  const [focusedField,  setFocusedField] = useState(null);

  const canSubmit   = identifier.trim().length > 0 && password.trim().length >= 6;
  const accentColor = ROLE_COLORS[role] || C.purple;
  const roleParticleColors = {
    student: ['#FFD700', '#FF1493', '#FFB6D9', '#FFFFFF', '#FFC300'],
    teacher: ['#FFD700', '#008B8B', '#20B2AA', '#FFFFFF', '#FFC300'],
    admin: ['#FFD700', '#9C27B0', '#CE93D8', '#FFFFFF', '#FFC300'],
  };
  const activeColors = roleParticleColors[role] || roleParticleColors.student;

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      Toast.show({ type: 'error', text1: 'Missing Fields', text2: 'Please enter mobile/email and password.' });
      return;
    }
    if (password.length < 6) {
      Toast.show({ type: 'error', text1: 'Invalid Password', text2: 'Password must be at least 6 characters.' });
      return;
    }
    dispatch(clearError());
    const result = await dispatch(loginUser({ role, identifier: identifier.trim(), password }));
    if (loginUser.fulfilled.match(result)) {
      Toast.show({ type: 'success', text1: 'Welcome! 🎉', text2: `Logged in as ${ROLE_LABELS[role]}` });
    } else {
      Toast.show({ type: 'error', text1: 'Login Failed', text2: result.payload || 'Invalid credentials.' });
    }
  };

  // ── Entrance animations ──────────────────────────────────────────────────────
  const logoAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const logoSpin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(logoAnim, { toValue: 1, friction: 7, tension: 100, useNativeDriver: true }).start();
    Animated.timing(cardAnim, { toValue: 1, duration: 450, delay: 200, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.timing(logoSpin, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, [logoSpin]);

  const logoStyle = {
    opacity: logoAnim,
    transform: [{ scale: logoAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
  };
  const spin = logoSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const cardStyle = {
    opacity: cardAnim,
    transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }],
  };
  const onBtnPressIn  = () => Animated.spring(btnScale, { toValue: 0.95, useNativeDriver: true }).start();
  const onBtnPressOut = () => Animated.spring(btnScale, { toValue: 1,    useNativeDriver: true }).start();

  return (
    <View style={st.root}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient colors={[C.bg1, C.bg2]} style={StyleSheet.absoluteFill} />

      {/* Decorative circles */}
      <View style={[st.blob, { width: 220, height: 220, top: -80, left: -80, backgroundColor: '#C4B5FD', opacity: 0.3 }]} />
      <View style={[st.blob, { width: 150, height: 150, top: 40, right: -50, backgroundColor: '#FFB3D9', opacity: 0.25 }]} />

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={st.inner}>

            {/* ── Back button ───────────────────────────────────────────── */}
            <ParticleWrapper particleCount={20} size="small" colors={['#FFD700', '#FFEC8B', '#FFC300']}>
              <TouchableOpacity style={st.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
                <Ionicons name="arrow-back" size={20} color={C.dark} />
              </TouchableOpacity>
            </ParticleWrapper>

            {/* ── Hero illustration ─────────────────────────────────────── */}
            <Animated.View style={[st.hero, logoStyle]}>
              <View style={st.logoWrap}>
                <Animated.View style={[st.logoRing, { transform: [{ rotate: spin }] }]} />
                <Image
                  source={require('../../../assets/Picsart_ client.png')}
                  style={st.logoImg}
                  resizeMode="contain"
                />
              </View>
              <Text style={st.heroTitle}>Welcome Back!</Text>
              <Text style={st.heroSub}>Continue your learning journey</Text>
            </Animated.View>

            {/* ── Login Card ───────────────────────────────────────────── */}
            <Animated.View style={[st.card, cardStyle]}>

              {/* Role badge */}
              <View style={[st.roleBadge, { borderColor: accentColor, backgroundColor: accentColor + '15' }]}>
                <Ionicons name={ROLE_ICONS[role]} size={14} color={accentColor} />
                <Text style={[st.roleBadgeText, { color: accentColor }]}>{ROLE_LABELS[role]} Login</Text>
              </View>

              {/* Identifier */}
              <View style={[st.inputWrap, focusedField === 'id' && { borderColor: C.purple, backgroundColor: '#fff' }]}>
                <View style={st.inputIcon}>
                  <Ionicons name="person-outline" size={17} color={focusedField === 'id' ? C.purple : '#AAA'} />
                </View>
                <TextInput
                  style={st.input}
                  placeholder="Mobile or Email"
                  placeholderTextColor="#BBBBCC"
                  value={identifier}
                  onChangeText={setIdentifier}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  onFocus={() => setFocusedField('id')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              {/* Password */}
              <View style={[st.inputWrap, focusedField === 'pw' && { borderColor: C.purple, backgroundColor: '#fff' }]}>
                <View style={st.inputIcon}>
                  <Ionicons name="lock-closed-outline" size={17} color={focusedField === 'pw' ? C.purple : '#AAA'} />
                </View>
                <TextInput
                  style={[st.input, { flex: 1 }]}
                  placeholder="Password"
                  placeholderTextColor="#BBBBCC"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  onFocus={() => setFocusedField('pw')}
                  onBlur={() => setFocusedField(null)}
                />
                <ParticleWrapper particleCount={20} size="small" colors={['#008B8B', '#20B2AA', '#FFFFFF']}>
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 12 }}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#AAA" />
                  </TouchableOpacity>
                </ParticleWrapper>
              </View>

              {/* Error */}
              {error ? (
                <View style={st.errorBox}>
                  <Ionicons name="alert-circle" size={14} color="#E53935" />
                  <Text style={st.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Sign In button */}
              <Animated.View style={{ transform: [{ scale: btnScale }], marginTop: error ? 8 : 14 }}>
                <ParticleWrapper particleCount={24} size="large" colors={activeColors}>
                  <TouchableOpacity
                    onPress={handleLogin}
                    onPressIn={onBtnPressIn}
                    onPressOut={onBtnPressOut}
                    disabled={loading || !canSubmit}
                    activeOpacity={0.9}
                    style={[{ borderRadius: 28, overflow: 'hidden' }, (!canSubmit || loading) && { opacity: 0.65 }]}
                  >
                    <LinearGradient
                      colors={[C.purple, C.pink]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={st.btnGrad}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFF" size="small" />
                      ) : (
                        <>
                          <Text style={st.btnText}>Sign In</Text>
                          <View style={st.btnArrow}>
                            <Ionicons name="arrow-forward" size={16} color={C.purple} />
                          </View>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </ParticleWrapper>
              </Animated.View>

              <Text style={st.tagline}>🔒 Secure · 🎓 Trusted · ⚡ Fast</Text>
            </Animated.View>

          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const st = StyleSheet.create({
  root:  { flex: 1 },
  blob:  { position: 'absolute', borderRadius: 999 },
  inner: { flex: 1, paddingHorizontal: 20, paddingBottom: 10 },

  backBtn: {
    marginTop: 8, width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10, shadowRadius: 6, elevation: 3,
  },

  // Hero
  hero:        { alignItems: 'center', paddingVertical: SH < 700 ? 12 : 18, zIndex: 5 },
  logoWrap:    { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  logoRing:    { position: 'absolute', width: 104, height: 104, borderRadius: 52, borderWidth: 4, borderColor: '#111' },
  logoImg:     { width: 88, height: 88 },
  heroTitle:   { fontSize: 22, fontWeight: '800', color: '#1E1B4B', marginBottom: 3 },
  heroSub:     { fontSize: 13, color: '#6B7280', textAlign: 'center' },

  // Card
  card: {
    backgroundColor: 'rgba(255,255,255,0.93)', borderRadius: 24, padding: 20,
    shadowColor: '#7B61FF', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.13, shadowRadius: 24, elevation: 10,
    borderWidth: 1, borderColor: 'rgba(123,97,255,0.07)',
  },
  roleBadge:     { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1.5, marginBottom: 14 },
  roleBadgeText: { fontSize: 12, fontWeight: '700' },

  // Inputs
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8F6FF', borderRadius: 14, borderWidth: 1.5, borderColor: '#E8E0FF',
    marginBottom: 12,
  },
  inputIcon: { width: 42, height: 48, justifyContent: 'center', alignItems: 'center' },
  input:     { flex: 1, color: '#1E1B4B', fontSize: 14, paddingVertical: 14, paddingRight: 12 },

  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF0F0', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#FFD0D0', marginBottom: 4 },
  errorText: { color: '#E53935', fontSize: 12, flex: 1 },

  // Button
  btnGrad:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, borderRadius: 28, gap: 10 },
  btnText:  { fontSize: 17, fontWeight: '800', color: '#FFF', letterSpacing: 0.3 },
  btnArrow: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  tagline:  { textAlign: 'center', fontSize: 11, color: '#AAA', fontWeight: '600', marginTop: 14, letterSpacing: 0.4 },
});
