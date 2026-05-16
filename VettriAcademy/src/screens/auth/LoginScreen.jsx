import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import Toast from 'react-native-toast-message';
import { Colors } from '../../utils/colors';
import { loginUser, clearError } from '../../redux/slices/authSlice';

export default function LoginScreen({ route, navigation }) {
  const { role } = route.params;
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const canSubmit = identifier.trim().length > 0 && password.trim().length >= 6;

  const roleLabels = { student: 'Student', teacher: 'Teacher', admin: 'Admin' };

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
      Toast.show({ type: 'success', text1: 'Welcome! 🎉', text2: `Logged in as ${roleLabels[role]}` });
    } else {
      Toast.show({ type: 'error', text1: 'Login Failed', text2: result.payload || 'Invalid credentials.' });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[Colors.navy, '#152238']} style={styles.gradient}>
        <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {/* Back */}
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color={Colors.white} />
            </TouchableOpacity>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.roleChip}>
                <Ionicons name={role === 'student' ? 'school' : role === 'teacher' ? 'people' : 'shield-checkmark'} size={18} color={Colors.primary} />
                <Text style={styles.roleChipText}>{roleLabels[role]} Login</Text>
              </View>
              <Text style={styles.title}>Welcome Back!</Text>
              <Text style={styles.subtitle}>Sign in to continue your learning journey</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color={Colors.mediumGray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Mobile number or email"
                  placeholderTextColor={Colors.mediumGray}
                  value={identifier}
                  onChangeText={setIdentifier}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.mediumGray} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Password"
                  placeholderTextColor={Colors.mediumGray}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={Colors.mediumGray} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.loginBtn, (!canSubmit || loading) && styles.loginBtnDisabled]}
                onPress={handleLogin}
                disabled={loading || !canSubmit}
                activeOpacity={0.85}
              >
                <LinearGradient colors={Colors.gradient.primary} style={styles.loginGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  {loading ? (
                    <ActivityIndicator color={Colors.white} size="small" />
                  ) : (
                    <>
                      <Text style={styles.loginText}>Sign In</Text>
                      <Ionicons name="arrow-forward" size={20} color={Colors.white} />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {error && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color={Colors.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24 },
  backBtn: { marginTop: 56, width: 40 },
  header: { marginTop: 32, marginBottom: 40 },
  roleChip: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,20,147,0.12)', paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, marginBottom: 16, gap: 6,
  },
  roleChipText: { color: Colors.primary, fontSize: 14, fontWeight: '600' },
  title: { fontSize: 30, fontWeight: 'bold', color: Colors.white },
  subtitle: { fontSize: 15, color: Colors.mediumGray, marginTop: 8 },
  form: { gap: 16 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14,
    paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: Colors.white, fontSize: 16, paddingVertical: 16 },
  eyeBtn: { padding: 8 },
  loginBtn: { marginTop: 8 },
  loginBtnDisabled: { opacity: 0.7 },
  loginGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: 14, gap: 8,
  },
  loginText: { color: Colors.white, fontSize: 18, fontWeight: '700' },
  errorContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(244,67,54,0.12)', padding: 12, borderRadius: 10,
  },
  errorText: { color: Colors.error, fontSize: 13, flex: 1 },
});
