import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, Clipboard, Platform } from 'react-native';
import Toast from 'react-native-toast-message';

export async function copyLoginText(value) {
  try {
    if (Platform.OS === 'web') await navigator.clipboard.writeText(value);
    else Clipboard.setString(value);
    Toast.show({ type: 'success', text1: 'Copied' });
  } catch { Toast.show({ type: 'error', text1: 'Could not copy. Select and copy the text instead.' }); }
}

// Plain passwords exist only in this short-lived form state, never in storage or API responses.
export default function StudentLoginDetails({ details, onClose, accountType = 'Student' }) {
  const [visible, setVisible] = useState(false);
  if (!details) return null;
  const button = { padding: 12, backgroundColor: '#E0F7F7', borderRadius: 10, marginTop: 8 };
  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#0008' }}>
        <View style={{ backgroundColor: '#FFF', borderRadius: 20, padding: 24 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827' }}>Login details saved</Text>
          <Text style={{ marginVertical: 10, color: '#374151' }}>{details.name}</Text>
          <Text selectable style={{ color: '#111827' }}>Phone: {details.mobile}</Text>
          <TouchableOpacity style={button} onPress={() => copyLoginText(details.mobile)}><Text>Copy phone number</Text></TouchableOpacity>
          <Text selectable={visible} style={{ marginTop: 16, color: '#111827' }}>Password: {visible ? details.password : '••••••••'}</Text>
          <TouchableOpacity style={button} onPress={() => setVisible(!visible)}><Text>{visible ? 'Hide' : 'Show'} password</Text></TouchableOpacity>
          <TouchableOpacity style={button} onPress={() => copyLoginText(details.password)}><Text>Copy password</Text></TouchableOpacity>
          <TouchableOpacity style={button} onPress={() => copyLoginText(`Phone: ${details.mobile}\nPassword: ${details.password}`)}><Text>Copy both login details</Text></TouchableOpacity>
          <Text style={{ marginTop: 16, color: '#6B7280', fontSize: 12 }}>Copy now to share with the {accountType === 'Teacher' ? 'teacher' : 'parent'}. You can set another password anytime from Edit {accountType}.</Text>
          <TouchableOpacity style={[button, { backgroundColor: '#20C7C9', alignItems: 'center' }]} onPress={onClose}><Text style={{ fontWeight: '700' }}>Done</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
