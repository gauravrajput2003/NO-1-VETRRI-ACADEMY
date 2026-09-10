import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  StatusBar, KeyboardAvoidingView, Platform,
  ActivityIndicator, Animated, Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { forgotPasswordAPI, forgotPasswordPublicAPI } from '../../services/api';

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

export default function ForgotPasswordScreen({ navigation, route }) {
  const standalone = !!route?.params?.standalone; // true = opened from Login (not authenticated)

  const [identifier, setIdentifier] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hideNew, setHideNew] = useState(false);
  const [hideConfirm, setHideConfirm] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [loading, setLoading] = useState(false);

  const cardAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(cardAnim, { toValue: 1, duration: 450, delay: 150, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }).start();
  }, []);
  const cardStyle = {
    opacity: cardAnim,
    transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
  };

  const canSubmit =
    (!standalone || identifier.trim().length > 0) &&
    newPassword.length >= 6 &&
    confirmPassword.length >= 6;

  const handleReset = async () => {
    if (standalone && !identifier.trim()) {
      Toast.show({ type: 'error', text1: 'Enter your mobile or email' });
      return;
    }
    if (newPassword.length < 6) {
      Toast.show({ type: 'error', text1: 'Password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      Toast.show({ type: 'error', text1: 'Passwords do not match.' });
      return;
    }

    try {
      setLoading(true);
      if (standalone) {
        await forgotPasswordPublicAPI(identifier.trim(), newPassword);
      } else {
        await forgotPasswordAPI(newPassword);
      }
      Toast.show({ type: 'success', text1: 'Password reset successfully 🎉' });
      navigation.goBack();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Reset failed',
        text2: error.response?.data?.message || 'Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={st.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[C.tealDeep, C.teal, C.pinkSoft]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[st.blob, { width: 240, height: 240, top: -90, left: -80, backgroundColor: C.gold, opacity: 0.18 }]} />
        <View style={[st.blob, { width: 200, height: 200, bottom: -70, right: -60, backgroundColor: C.pink, opacity: 0.22 }]} />
      </View>

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={st.inner}>
            <TouchableOpacity style={st.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={20} color={C.white} />
            </TouchableOpacity>

            <View style={st.hero}>
              <View style={st.logoWrap}>
                <Ionicons name="key" size={34} color={C.pink} />
              </View>
              <Text style={st.heroTitle}>Reset Password</Text>
              <Text style={st.heroSub}>
                {standalone
                  ? 'Enter your account details to set a new password'
                  : 'Choose a new password for your account'}
              </Text>
            </View>

            <Animated.View style={[st.card, cardStyle]}>
              {standalone && (
                <View style={[st.inputWrap, focusedField === 'id' && st.inputFocused]}>
                  <View style={st.inputIcon}>
                    <Ionicons name="person-outline" size={17} color={focusedField === 'id' ? C.pink : C.textMuted} />
                  </View>
                  <TextInput
                    style={st.input}
                    placeholder="Mobile or Email"
                    placeholderTextColor="rgba(14,42,44,0.35)"
                    value={identifier}
                    onChangeText={setIdentifier}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    onFocus={() => setFocusedField('id')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              )}

              <View style={[st.inputWrap, focusedField === 'new' && st.inputFocused]}>
                <View style={st.inputIcon}>
                  <Ionicons name="lock-closed-outline" size={17} color={focusedField === 'new' ? C.pink : C.textMuted} />
                </View>
                <TextInput
                  style={[st.input, { flex: 1 }]}
                  placeholder="New Password"
                  placeholderTextColor="rgba(14,42,44,0.35)"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={hideNew}
                  onFocus={() => setFocusedField('new')}
                  onBlur={() => setFocusedField(null)}
                />
                <TouchableOpacity onPress={() => setHideNew(!hideNew)} style={{ padding: 12 }}>
                  <Ionicons name={hideNew ? 'eye-outline' : 'eye-off-outline'} size={18} color={C.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={[st.inputWrap, focusedField === 'confirm' && st.inputFocused]}>
                <View style={st.inputIcon}>
                  <Ionicons name="checkmark-circle-outline" size={17} color={focusedField === 'confirm' ? C.pink : C.textMuted} />
                </View>
                <TextInput
                  style={[st.input, { flex: 1 }]}
                  placeholder="Confirm New Password"
                  placeholderTextColor="rgba(14,42,44,0.35)"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={hideConfirm}
                  onFocus={() => setFocusedField('confirm')}
                  onBlur={() => setFocusedField(null)}
                />
                <TouchableOpacity onPress={() => setHideConfirm(!hideConfirm)} style={{ padding: 12 }}>
                  <Ionicons name={hideConfirm ? 'eye-outline' : 'eye-off-outline'} size={18} color={C.textMuted} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={handleReset}
                disabled={loading || !canSubmit}
                activeOpacity={0.9}
                style={[st.btnTouch, (!canSubmit || loading) && { opacity: 0.6 }]}
              >
                <LinearGradient
                  colors={[C.teal, C.pink]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
                {loading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Text style={st.btnText}>Reset Password</Text>
                    <View style={st.btnArrow}>
                      <Ionicons name="arrow-forward" size={16} color={C.pink} />
                    </View>
                  </>
                )}
              </TouchableOpacity>

              <Text style={st.tagline}>🔒 Simple · 🎓 Quick · ⚡ No OTP needed</Text>
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
  hero: { alignItems: 'center', paddingVertical: 18 },
  logoWrap: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: C.white,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
  },
  heroTitle: { fontSize: 22, fontWeight: '800', color: C.white, marginBottom: 4 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'center', paddingHorizontal: 20 },
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
  btnTouch: {
    height: 56, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', gap: 10, marginTop: 4,
    shadowColor: C.pink, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  btnText: { fontSize: 17, fontWeight: '800', color: '#FFF', letterSpacing: 0.3 },
  btnArrow: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  tagline: { textAlign: 'center', fontSize: 11, color: C.textMuted, fontWeight: '600', marginTop: 16, letterSpacing: 0.4 },
});