import React, { useEffect, useReducer, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, ScrollView, Platform, ActivityIndicator, Animated, LayoutAnimation, BackHandler, Vibration, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import Toast from 'react-native-toast-message';
import { requestTemporaryPasswordAPI, completePasswordRecoveryAPI, changePasswordAPI } from '../../services/api';
import { registerForPushNotifications } from '../../services/pushNotifications';
import { logoutUser } from '../../redux/slices/authSlice';
import { initialRecoveryState, recoveryReducer, validRecoveryIdentifier } from '../../utils/passwordRecoveryState';

const B = { teal: '#20C7C9', pink: '#FF4F8B', gold: '#F0B429', ink: '#0F0E2A' };
function Field({ label, icon, value, onChangeText, secret, disabled, error, change }) {
  const [hidden, setHidden] = useState(true);
  return <View style={s.field}>
    <View style={s.labelRow}><Text style={s.label}>{label}</Text>{change && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Change mobile or email" style={s.linkTouch} onPress={change}><Text style={s.link}>Change</Text></TouchableOpacity>}</View>
    <View style={[s.inputRow, error && { borderColor: '#BF1647' }, disabled && { backgroundColor: '#F3F4F6' }]}>
      <Ionicons name={icon} size={20} color={B.teal} accessible={false} />
      <TextInput accessibilityLabel={label} style={s.input} value={value} onChangeText={onChangeText} editable={!disabled}
        secureTextEntry={Boolean(secret && hidden)} autoCapitalize="none" autoCorrect={false} spellCheck={false}
        maxLength={secret ? 72 : 254} textContentType={secret ? 'none' : 'username'} autoComplete="off" importantForAutofill="no" />
      {secret && <TouchableOpacity accessibilityRole="button" accessibilityLabel={(hidden ? 'Show ' : 'Hide ') + label} style={s.eye} onPress={() => setHidden(!hidden)}><Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={22} color={B.ink} /></TouchableOpacity>}
    </View>
    {!!error && <Text accessibilityLiveRegion="polite" style={s.error}><Ionicons name="alert-circle" size={14} /> {error}</Text>}
  </View>;
}
function Primary({ title, busy, disabled, onPress }) {
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: Boolean(disabled || busy), busy }}
    disabled={Boolean(disabled || busy)} onPress={onPress} style={[s.primary, (disabled || busy) && { opacity: 0.5 }]}>
    <LinearGradient colors={[B.pink, B.teal]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.buttonFill}>
      {busy ? <ActivityIndicator color="#FFF" /> : <Text style={s.buttonText}>{title}</Text>}
    </LinearGradient>
  </TouchableOpacity>;
}
export default function ForgotPasswordScreen({ navigation, route }) {
  const forced = Boolean(route?.params?.forced), currentFlow = forced || Boolean(route?.params?.changeOwn);
  const [state, update] = useReducer(recoveryReducer, route?.params?.tempPassword ? route.params : null, initialRecoveryState);
  const [now, setNow] = useState(Date.now()), [touched, setTouched] = useState(false);
  const alive = useRef(true), finishTimer = useRef(null), fade = useRef(new Animated.Value(1)).current;
  const dispatch = useDispatch(), { width } = useWindowDimensions();
  const busy = ['requesting', 'submitting'].includes(state.phase);
  const requested = currentFlow || ['requested', 'submitting'].includes(state.phase) || Boolean(state.requestedAt);
  const cooldown = Math.min(60, Math.max(0, Math.ceil((state.requestedAt + 60000 - now) / 1000)));
  const identifierValid = validRecoveryIdentifier(state.identifier), mismatch = Boolean(state.confirmPassword && state.newPassword !== state.confirmPassword);
  const validPassword = state.newPassword.length >= 6 && state.newPassword !== state.tempPassword.trim();
  const strength = Math.min(3, Number(state.newPassword.length >= 6) + Number(state.newPassword.length >= 10) + Number(/[a-z]/.test(state.newPassword) && /[A-Z\d\W]/.test(state.newPassword)));
  useEffect(() => {
    alive.current = true;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    const blur = navigation?.addListener?.('blur', () => update({ type: 'CLEAR' }));
    const back = forced ? BackHandler.addEventListener('hardwareBackPress', () => true) : null;
    return () => { alive.current = false; clearInterval(timer); clearTimeout(finishTimer.current); blur?.(); back?.remove(); };
  }, [navigation, forced]);
  const field = (name, value) => update({ type: 'FIELD', field: name, value });
  const friendlyError = error => !error.response ? 'You appear to be offline. Check your connection and try again.'
    : error.response?.data?.message || 'Unable to reset your password. Ask your admin for a new temporary password.';
  async function request() {
    setTouched(true);
    if (!identifierValid || busy || (state.requestedAt && cooldown > 0)) return;
    update({ type: 'REQUEST' });
    try {
      // Expo device push is native-only. A permission/provider timeout must not
      // prevent the public request; existing verified devices can still receive it.
      let timeout;
      const token = Platform.OS === 'web' ? null : await Promise.race([
        registerForPushNotifications().catch(() => null),
        new Promise(resolve => { timeout = setTimeout(() => resolve(null), 8000); }),
      ]).finally(() => clearTimeout(timeout));
      await requestTemporaryPasswordAPI(state.identifier.trim(), token);
      if (!alive.current) return;
      if (Platform.OS !== 'web') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      update({ type: 'REQUESTED', now: Date.now() }); setTouched(false);
      fade.setValue(0); Animated.timing(fade, { toValue: 1, duration: 240, useNativeDriver: true }).start();
    } catch (error) { if (alive.current) update({ type: 'ERROR', message: friendlyError(error) }); }
  }
  async function submit() {
    setTouched(true);
    if (busy || !state.tempPassword.trim() || !validPassword || mismatch || !state.confirmPassword) return;
    update({ type: 'SUBMIT' });
    try {
      if (currentFlow) await changePasswordAPI(state.tempPassword, state.newPassword);
      else await completePasswordRecoveryAPI({ identifier: state.identifier.trim(), tempPassword: state.tempPassword.trim(), newPassword: state.newPassword, confirmPassword: state.confirmPassword });
      if (!alive.current) return;
      update({ type: 'SUCCESS' });
      navigation?.onSecretConsumed?.();
      if (Platform.OS !== 'web') Vibration.vibrate(20);
      finishTimer.current = setTimeout(async () => {
        await dispatch(logoutUser());
        Toast.show({ type: 'success', text1: 'Password updated. Please sign in.' });
        if (navigation?.onRecoveryClose) navigation.onRecoveryClose();
        else navigation?.navigate?.('Login');
      }, 900);
    } catch (error) { if (alive.current) update({ type: 'ERROR', message: friendlyError(error) }); }
  }
  const goBack = () => { update({ type: 'CLEAR' }); if (navigation?.onRecoveryClose) navigation.onRecoveryClose(); else navigation?.goBack?.(); };
  return <LinearGradient colors={['#099A96', B.teal, '#F4A0C5']} style={s.root}>
    <SafeAreaView style={s.root}><KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[s.scroll, width >= 600 && { padding: 32 }]}>
        <View style={s.content}>
          {!forced && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back to sign in" onPress={goBack} disabled={busy} style={s.back}><Ionicons name="arrow-back" size={24} color="#FFF" /></TouchableOpacity>}
          <View style={s.hero}><View style={s.key}><Ionicons name="key" size={36} color={B.pink} /></View></View>
          <View style={s.card}>
            {state.phase === 'success' ? <View accessibilityLiveRegion="polite" style={s.success}><Ionicons name="checkmark-circle" size={68} color="#138A55" /><Text style={s.title}>Password updated</Text><Text style={s.subtitle}>Please sign in with your new password.</Text></View> : <>
              <Text accessibilityRole="header" style={s.title}>{forced ? 'Set New Password' : currentFlow ? 'Change Password' : 'Reset Password'}</Text>
              <Text style={s.subtitle}>{currentFlow ? 'Choose a password only you know' : 'Enter your registered mobile or email'}</Text>
              {!currentFlow && <Field label="Mobile or Email" icon="person-outline" value={state.identifier} onChangeText={value => field('identifier', value)} disabled={requested || busy}
                change={requested && !busy ? () => { update({ type: 'CHANGE' }); setTouched(false); } : null} error={touched && !identifierValid ? 'Enter a valid mobile number or email.' : ''} />}
              {!requested && <Primary title="Request Temporary Password" onPress={request} busy={busy} disabled={!identifierValid} />}
              {requested && <Animated.View style={{ opacity: fade }}>
                {!currentFlow && <View style={s.banner} accessibilityLiveRegion="polite"><Ionicons name="checkmark-circle" color="#138A55" size={22} /><Text style={s.bannerText}>Request sent. Your admin will send a temporary password to your phone as a notification. It stays valid for 24 hours after it is sent.</Text></View>}
                <Field label={currentFlow ? 'Current Password' : 'Temporary Password'} icon="key-outline" value={state.tempPassword} onChangeText={value => field('tempPassword', currentFlow ? value : value.trim())} secret disabled={busy}
                  error={touched && !state.tempPassword ? 'Enter your ' + (currentFlow ? 'current' : 'temporary') + ' password.' : ''} />
                <Field label="New Password" icon="lock-closed-outline" value={state.newPassword} secret disabled={busy} onChangeText={value => field('newPassword', value)}
                  error={touched && !validPassword ? 'Use at least 6 characters and a different password.' : ''} />
                <View style={s.strength}>{[1, 2, 3].map(level => <View key={level} style={[s.strengthPart, { backgroundColor: strength >= level ? [B.pink, B.gold, '#138A55'][Math.max(0, strength - 1)] : '#E5E7EB' }]} />)}</View>
                <Text style={s.hint}>At least 6 characters. Use a longer mix of letters and numbers. {state.newPassword ? ['Weak', 'Weak', 'Fair', 'Strong'][strength] : ''}</Text>
                <Field label="Confirm New Password" icon="checkmark-circle-outline" value={state.confirmPassword} secret disabled={busy} onChangeText={value => field('confirmPassword', value)} error={mismatch ? 'Passwords do not match.' : ''} />
                <Primary title={currentFlow ? 'Save New Password' : 'Reset Password'} onPress={submit} busy={busy} disabled={!state.tempPassword || !validPassword || mismatch || !state.confirmPassword} />
                {!currentFlow && <TouchableOpacity accessibilityRole="button" accessibilityLabel={cooldown ? 'Resend available in ' + cooldown + ' seconds' : 'Resend request'} disabled={cooldown > 0 || busy} style={s.resend} onPress={request}><Text style={[s.link, cooldown > 0 && { color: '#64748B' }]}>{cooldown ? 'Resend request in ' + cooldown + 's' : 'Resend request'}</Text></TouchableOpacity>}
              </Animated.View>}
              {!!state.error && <View accessibilityLiveRegion="assertive" style={s.errorBox}><Ionicons name="alert-circle" size={20} color="#BF1647" /><Text style={[s.error, { flex: 1 }]}>{state.error}</Text></View>}
              <View style={s.footer}><Ionicons name="lock-closed" size={14} color={B.gold} /><Text style={s.hint}>{currentFlow ? 'Your new password stays private' : 'Your admin will send you a temporary password'}</Text></View>
              {!currentFlow && requested && <Text style={s.hint}>New phone or notifications unavailable? Contact your admin to verify your identity and collect the temporary password.</Text>}
            </>}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView></SafeAreaView>
  </LinearGradient>;
}
const s = StyleSheet.create({
  root: { flex: 1 }, scroll: { flexGrow: 1, padding: 20, justifyContent: 'center' }, content: { width: '100%', maxWidth: 640, alignSelf: 'center' },
  back: { minHeight: 48, minWidth: 48, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 10 }, hero: { alignItems: 'center', marginBottom: 22 },
  key: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', elevation: 3 },
  card: { backgroundColor: '#FFF', borderRadius: 28, padding: 24, shadowColor: B.ink, shadowOpacity: 0.08, shadowRadius: 22, elevation: 4 },
  title: { fontSize: 27, fontWeight: '800', color: B.ink, textAlign: 'center' }, subtitle: { fontSize: 15, lineHeight: 23, color: '#64748B', textAlign: 'center', marginTop: 8, marginBottom: 22 },
  field: { marginBottom: 15 }, label: { fontSize: 14, fontWeight: '700', color: B.ink, flexShrink: 1 }, labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 26 },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: 14, borderWidth: 1, borderColor: '#CFE6E8', borderRadius: 14, backgroundColor: '#F4FAFA', minHeight: 54, marginTop: 7 },
  input: { flex: 1, minWidth: 0, minHeight: 52, padding: 12, fontSize: 16, color: B.ink }, eye: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  error: { color: '#BF1647', fontSize: 13, lineHeight: 20, marginTop: 5 }, primary: { borderRadius: 15, overflow: 'hidden', marginTop: 5 },
  buttonFill: { minHeight: 54, paddingVertical: 16, paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center' }, buttonText: { color: '#FFF', fontSize: 16, fontWeight: '800', textAlign: 'center' },
  banner: { flexDirection: 'row', padding: 14, gap: 10, backgroundColor: '#EAF8EF', borderRadius: 14, marginBottom: 20 }, bannerText: { flex: 1, color: '#166534', fontSize: 14, lineHeight: 22 },
  hint: { color: '#64748B', fontSize: 12, lineHeight: 19, flexShrink: 1 }, strength: { flexDirection: 'row', gap: 6, marginBottom: 6 }, strengthPart: { flex: 1, height: 4, borderRadius: 2 },
  link: { color: '#087F85', fontWeight: '700', fontSize: 14 }, linkTouch: { minHeight: 48, paddingLeft: 14, justifyContent: 'center' },
  resend: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 6 }, errorBox: { flexDirection: 'row', gap: 9, padding: 12, borderRadius: 12, backgroundColor: '#FFF0F4', marginTop: 14 },
  footer: { flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', marginTop: 21, marginBottom: 7 }, success: { alignItems: 'center', gap: 14, paddingVertical: 35 },
});
