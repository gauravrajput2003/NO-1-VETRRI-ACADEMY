import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  StatusBar, KeyboardAvoidingView, Platform,
  ActivityIndicator, Dimensions, Animated, Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { loginUser, clearError } from '../../redux/slices/authSlice';

const { width: SW, height: SH } = Dimensions.get('window');

// Bright teal + pink palette (light, airy — no dark glass panels)
const C = {
  tealDeep: '#0AACA0',
  teal: '#1FD1C4',
  tealLight: '#7BEDE1',
  pink: '#FF3D8E',
  pinkSoft: '#FF7EB0',
  gold: '#FFC93C',
  white: '#FFFFFF',
  ink: '#0E2A2C',
  textMuted: 'rgba(14,42,44,0.55)',
  inputBg: '#F3FBFA',
  border: 'rgba(14,42,44,0.08)',
};

export default function LoginScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((s) => s.auth);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  const canSubmit = identifier.trim().length > 0 && password.trim().length >= 6;

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
    const result = await dispatch(loginUser({ identifier: identifier.trim(), password }));
    if (loginUser.fulfilled.match(result)) {
      Toast.show({ type: 'success', text1: 'Welcome! 🎉', text2: 'Logged in successfully' });
    } else {
      Toast.show({ type: 'error', text1: 'Login Failed', text2: result.payload || 'Invalid credentials.' });
    }
  };

  const cardAnim = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(cardAnim, { toValue: 1, duration: 450, delay: 150, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }).start();
  }, []);

  const cardStyle = {
    opacity: cardAnim,
    transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }],
  };
  const onBtnPressIn = () => Animated.spring(btnScale, { toValue: 0.95, useNativeDriver: true }).start();
  const onBtnPressOut = () => Animated.spring(btnScale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <View style={st.root}>
      <StatusBar barStyle="light-content" />

      {/* Bright teal → pink gradient backdrop */}
      <LinearGradient
        colors={[C.tealDeep, C.teal, C.pinkSoft]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Soft decorative blobs for depth */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[st.blob, { width: 260, height: 260, top: -100, left: -90, backgroundColor: C.gold, opacity: 0.18 }]} />
        <View style={[st.blob, { width: 220, height: 220, bottom: -80, right: -70, backgroundColor: C.pink, opacity: 0.25 }]} />
        <View style={[st.blob, { width: 140, height: 140, top: SH * 0.35, right: -50, backgroundColor: C.tealLight, opacity: 0.2 }]} />
      </View>

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={st.inner}>

            <TouchableOpacity style={st.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={20} color={C.white} />
            </TouchableOpacity>

            <View style={st.hero}>
              <View style={st.logoWrap}>
                <Svg width={70} height={70} viewBox="0 0 24 24">
                  <Defs>
                    <SvgLinearGradient id="capGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <Stop offset="0%" stopColor={C.gold} />
                      <Stop offset="100%" stopColor={C.pink} />
                    </SvgLinearGradient>
                  </Defs>
                  <Path d="M2 8L12 3L22 8L12 13L2 8Z" fill="url(#capGrad)" />
                  <Circle cx="20.5" cy="14" r="1.4" fill={C.gold} />
                </Svg>
              </View>
              <Text style={st.heroTitle}>Welcome Back</Text>
              <Text style={st.heroSub}>Sign in to continue your learning journey</Text>
            </View>

            {/* Bright white card instead of dark glass panel */}
            <Animated.View style={[st.card, cardStyle]}>

              <View style={[st.inputWrap, focusedField === 'id' && st.inputFocused]}>
                <View style={st.inputIcon}>
                  <Ionicons name="person-outline" size={17} color={focusedField === 'id' ? C.pink : C.textMuted} />
                </View>
                <TextInput
                  style={st.input}
                  placeholder="Mobile or Email"
                  placeholderTextColor="rgba(14,42,44,0.35)"
                  value={identifier}
                  onChangeText={(text) => {
                    setIdentifier(text);
                    if (error) dispatch(clearError());
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  onFocus={() => setFocusedField('id')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              <View style={[st.inputWrap, focusedField === 'pw' && st.inputFocused]}>
                <View style={st.inputIcon}>
                  <Ionicons name="lock-closed-outline" size={17} color={focusedField === 'pw' ? C.pink : C.textMuted} />
                </View>
                <TextInput
                  style={[st.input, { flex: 1 }]}
                  placeholder="Password"
                  placeholderTextColor="rgba(14,42,44,0.35)"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (error) dispatch(clearError());
                  }}
                  secureTextEntry={!showPassword}
                  onFocus={() => setFocusedField('pw')}
                  onBlur={() => setFocusedField(null)}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 12 }}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.textMuted} />
                </TouchableOpacity>
              </View>

              {error ? (
                <View style={st.errorBox}>
                  <Ionicons name="alert-circle" size={14} color="#E0335A" />
                  <Text style={st.errorText}>{error}</Text>
                </View>
              ) : null}

              <Animated.View style={{ transform: [{ scale: btnScale }], marginTop: error ? 8 : 16 }}>
                <TouchableOpacity
                  onPress={handleLogin}
                  onPressIn={onBtnPressIn}
                  onPressOut={onBtnPressOut}
                  disabled={loading || !canSubmit}
                  activeOpacity={0.9}
                  style={[st.btnTouch, (!canSubmit || loading) && { opacity: 0.6 }]}
                >
                  <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
                    <Defs>
                      <SvgLinearGradient id="btnGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <Stop offset="0%" stopColor={C.teal} />
                        <Stop offset="100%" stopColor={C.pink} />
                      </SvgLinearGradient>
                    </Defs>
                    <Path d="M0,28 A28,28 0 0 1 28,0 L972,0 A28,28 0 0 1 1000,28 L1000,28 A28,28 0 0 1 972,56 L28,56 A28,28 0 0 1 0,28 Z" fill="url(#btnGrad)" />
                  </Svg>
                  {loading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <>
                      <Text style={st.btnText}>Sign In</Text>
                      <View style={st.btnArrow}>
                        <Ionicons name="arrow-forward" size={16} color={C.pink} />
                      </View>
                    </>
                  )}
                </TouchableOpacity>
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
  root: { flex: 1, backgroundColor: C.tealDeep },
  blob: { position: 'absolute', borderRadius: 999 },
  inner: { flex: 1, paddingHorizontal: 20, paddingBottom: 10 },

  backBtn: {
    marginTop: 8, width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.20)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center', alignItems: 'center',
  },

  hero: { alignItems: 'center', paddingVertical: SH < 700 ? 12 : 18 },
  logoWrap: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: C.white,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
  },
  heroTitle: { fontSize: 24, fontWeight: '800', color: C.white, marginBottom: 4 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },

  // Bright white card with soft shadow, replacing the dark glass panel
  card: {
    backgroundColor: C.white, borderRadius: 28, padding: 22,
    shadowColor: '#0AACA0', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 10,
  },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.inputBg, borderRadius: 14, borderWidth: 1.5, borderColor: C.border,
    marginBottom: 12,
  },
  inputFocused: { borderColor: C.pink, backgroundColor: '#FFF0F6' },
  inputIcon: { width: 42, height: 48, justifyContent: 'center', alignItems: 'center' },
  input: { flex: 1, color: C.ink, fontSize: 14, paddingVertical: 14, paddingRight: 12 },

  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFE7ED', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#FFC2D3', marginBottom: 4 },
  errorText: { color: '#E0335A', fontSize: 12, flex: 1 },

  btnTouch: {
    height: 56, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', gap: 10,
    shadowColor: C.pink, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  btnText: { fontSize: 17, fontWeight: '800', color: '#FFF', letterSpacing: 0.3 },
  btnArrow: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  tagline: { textAlign: 'center', fontSize: 11, color: C.textMuted, fontWeight: '600', marginTop: 16, letterSpacing: 0.4 },
});