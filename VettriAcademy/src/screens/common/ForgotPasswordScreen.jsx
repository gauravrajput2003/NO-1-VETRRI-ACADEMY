import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { forgotPasswordAPI } from '../../services/api';

const T = { pink: '#FF4F8B', teal: '#20C7C9', text: '#111827', sec: '#6B7280', border: '#E5E7EB', bg: '#F5F7FB' };

export default function ForgotPasswordScreen({ navigation }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
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
      await forgotPasswordAPI(newPassword);
      Toast.show({ type: 'success', text1: 'Password reset successfully' });
      navigation.goBack();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Reset failed', text2: error.response?.data?.message || 'Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={T.text} />
        </TouchableOpacity>
        <Text style={st.title}>Forgot Password</Text>
      </View>

      <View style={st.body}>
        <TextInput
          style={st.input}
          placeholder="New Password"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
        />
        <TextInput
          style={st.input}
          placeholder="Confirm New Password"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        <TouchableOpacity style={st.btn} onPress={handleReset} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={st.btnText}>Reset Password</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  title: { fontSize: 18, fontWeight: '800', color: T.text },
  body: { padding: 16, gap: 12 },
  input: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 14, fontSize: 15 },
  btn: { backgroundColor: T.pink, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});