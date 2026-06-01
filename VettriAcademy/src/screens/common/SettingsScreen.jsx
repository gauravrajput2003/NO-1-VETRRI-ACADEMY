import React from 'react';
import { View, Text, ScrollView, TouchableOpacity as RNTouchableOpacity, StyleSheet, Switch, Alert } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { toggleTheme } from '../../redux/slices/uiSlice';
import { logoutUser } from '../../redux/slices/authSlice';
import { APP_VERSION, APP_NAME } from '../../utils/constants';
import ParticleWrapper from '../../components/effects/ParticleWrapper';

const TouchableOpacity = (props) => {
  const { particleCount = 20, size = "small", colors, children, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNTouchableOpacity {...rest}>{children}</RNTouchableOpacity>
    </ParticleWrapper>
  );
};


export default function SettingsScreen({ navigation }) {
  const dispatch = useDispatch();
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';

  const bgColor = isDark ? Colors.background.dark : Colors.surface.light;
  const cardBg = isDark ? Colors.card.dark : Colors.card.light;
  const textColor = isDark ? Colors.text.dark : Colors.text.light;
  const textSec = isDark ? Colors.textSecondary.dark : Colors.textSecondary.light;

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => dispatch(logoutUser()) },
    ]);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: bgColor }]} contentContainerStyle={{ padding: 16 }}>
      <Text style={[styles.sectionTitle, { color: textSec }]}>Appearance</Text>
      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <View style={styles.row}>
          <Ionicons name="moon-outline" size={22} color={Colors.primary} />
          <Text style={[styles.rowLabel, { color: textColor }]}>Dark Mode</Text>
          <Switch value={isDark} onValueChange={() => dispatch(toggleTheme())} trackColor={{ true: Colors.primary, false: Colors.gray }} thumbColor={Colors.white} />
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: textSec }]}>Account</Text>
      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <TouchableOpacity style={styles.row} onPress={() => Alert.alert('Coming Soon', 'Change Password feature is under development.')}>
          <Ionicons name="lock-closed-outline" size={22} color={Colors.primary} />
          <Text style={[styles.rowLabel, { color: textColor }]}>Change Password</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.mediumGray} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, { color: textSec }]}>About</Text>
      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <View style={styles.row}>
          <Ionicons name="information-circle-outline" size={22} color={Colors.primary} />
          <Text style={[styles.rowLabel, { color: textColor }]}>Version</Text>
          <Text style={[styles.rowValue, { color: textSec }]}>{APP_VERSION}</Text>
        </View>
      </View>

      <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: Colors.errorLight }]} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color={Colors.error} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionTitle: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { borderRadius: 14, padding: 4, ...Shadows.light },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 14 },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  rowValue: { fontSize: 14 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, padding: 16, marginTop: 24, gap: 8 },
  logoutText: { fontSize: 16, fontWeight: '600', color: Colors.error },
});
