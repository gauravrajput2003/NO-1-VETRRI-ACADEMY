import React from 'react';
import { View, Text, ScrollView, TouchableOpacity as RNTouchableOpacity, StyleSheet, Switch, Alert } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

// Same brand palette used across the app — teal + pink + gold + white
const B = {
  pink: '#FF4F8B',
  teal: '#20C7C9',
  gold: '#F6C453',
  bg: '#F5F7FB',
  card: '#FFFFFF',
  white: '#FFFFFF',
  text: '#111827',
  sec: '#6B7280',
  border: '#E5E7EB',
};

export default function SettingsScreen({ navigation }) {
  const dispatch = useDispatch();
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';

  const cardBg = isDark ? Colors.card.dark : B.card;
  const textColor = isDark ? Colors.text.dark : B.text;
  const textSec = isDark ? Colors.textSecondary.dark : B.sec;

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => dispatch(logoutUser()) },
    ]);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: B.bg }]} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

      {/* ---- Colorful header, same style as the admin screens ---- */}
      <View style={styles.header}>
        <LinearGradient colors={[B.teal, B.pink, B.gold]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerIconBadge}>
          <Ionicons name="settings" size={22} color={B.card} />
        </LinearGradient>
        <View>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Manage your app preferences</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: textSec }]}>Appearance</Text>
      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <View style={styles.row}>
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(124,58,237,0.12)' }]}>
            <Ionicons name="moon-outline" size={20} color="#7C3AED" />
          </View>
          <Text style={[styles.rowLabel, { color: textColor }]}>Dark Mode</Text>
          <Switch
            value={isDark}
            onValueChange={() => dispatch(toggleTheme())}
            trackColor={{ true: B.teal, false: B.border }}
            thumbColor={B.card}
            ios_backgroundColor={B.border}
          />
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: textSec }]}>Account</Text>
      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <TouchableOpacity style={styles.row} onPress={() => Alert.alert('Coming Soon', 'Change Password feature is under development.')}>
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(246,196,83,0.16)' }]}>
            <Ionicons name="lock-closed-outline" size={20} color="#B58B29" />
          </View>
          <Text style={[styles.rowLabel, { color: textColor }]}>Change Password</Text>
          <Ionicons name="chevron-forward" size={18} color={B.sec} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, { color: textSec }]}>About</Text>
      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <View style={styles.row}>
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(32,199,201,0.14)' }]}>
            <Ionicons name="information-circle-outline" size={20} color={B.teal} />
          </View>
          <Text style={[styles.rowLabel, { color: textColor }]}>Version</Text>
          <Text style={[styles.rowValue, { color: textSec }]}>{APP_VERSION}</Text>
        </View>
      </View>

      {/* ---- Logout: solid pink gradient instead of a flat pale-red block ---- */}
      <TouchableOpacity style={styles.logoutBtnWrap} onPress={handleLogout}>
        <LinearGradient colors={[B.pink, '#FF7A9E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color={B.card} />
          <Text style={styles.logoutText}>Logout</Text>
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  headerIconBadge: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: B.pink, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: B.text, fontFamily: 'Inter' },
  headerSubtitle: { fontSize: 13, color: B.sec, fontWeight: '500', marginTop: 2, fontFamily: 'Inter' },

  sectionTitle: { fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: 'Inter' },
  card: { borderRadius: 18, padding: 4, borderWidth: 1, borderColor: B.border, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 16, elevation: 2 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 14 },
  iconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '600', fontFamily: 'Inter' },
  rowValue: { fontSize: 14, fontWeight: '500', fontFamily: 'Inter' },

  logoutBtnWrap: { borderRadius: 16, marginTop: 28, shadowColor: B.pink, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 5, overflow: 'hidden' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 16, padding: 16, gap: 8 },
  logoutText: { fontSize: 16, fontWeight: '700', color: B.card, fontFamily: 'Inter' },
});