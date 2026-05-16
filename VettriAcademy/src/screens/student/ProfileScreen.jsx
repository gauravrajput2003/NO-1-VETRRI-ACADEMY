import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert, Platform } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { Colors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { formatDate, getInitials } from '../../utils/formatters';
import { getProfileAPI, updateProfileAPI, changePasswordAPI } from '../../services/api';
import { logoutUser, updateUser } from '../../redux/slices/authSlice';
import { getDiceBearUrl, APP_VERSION } from '../../utils/constants';

export default function ProfileScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const bgColor = isDark ? Colors.background.dark : Colors.surface.light;
  const cardBg = isDark ? Colors.card.dark : Colors.card.light;
  const textColor = isDark ? Colors.text.dark : Colors.text.light;
  const textSec = isDark ? Colors.textSecondary.dark : Colors.textSecondary.light;

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data } = await getProfileAPI();
      setProfile(data.user || data.profile);
    } catch (err) {
      console.error('Profile load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const performLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
      Toast.show({ type: 'success', text1: 'Logged out successfully' });
    } catch {
      Toast.show({ type: 'error', text1: 'Logout failed. Please try again.' });
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web' && typeof globalThis.confirm === 'function') {
      const ok = globalThis.confirm('Are you sure you want to logout?');
      if (ok) performLogout();
      return;
    }

    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: performLogout },
    ]);
  };

  if (loading) {
    return <View style={[styles.centered, { backgroundColor: bgColor }]}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  const p = profile || user;
  const avatarUrl = p?.profilePic || getDiceBearUrl(p?._id);

  const role = p?.role;
  const menuByRole = {
    student: [
      { icon: 'stats-chart-outline', label: 'Exam Scores', screen: 'ExamScores', color: Colors.primary },
      { icon: 'calendar-outline', label: 'Attendance', screen: 'Attendance', color: Colors.info },
      { icon: 'airplane-outline', label: 'Leave Application', screen: 'Leave', color: Colors.warning },
      { icon: 'notifications-outline', label: 'Notifications', screen: 'Notifications', color: Colors.gold },
      { icon: 'settings-outline', label: 'Settings', screen: 'Settings', color: Colors.mediumGray },
    ],
    teacher: [
      { icon: 'document-text-outline', label: 'Manage Materials', screen: 'TeacherMaterials', color: Colors.primary },
      { icon: 'bar-chart-outline', label: 'Monthly Report', screen: 'MonthlyReport', color: Colors.info },
      { icon: 'notifications-outline', label: 'Notifications', screen: 'Notifications', color: Colors.gold },
      { icon: 'settings-outline', label: 'Settings', screen: 'Settings', color: Colors.mediumGray },
    ],
    admin: [
      { icon: 'notifications-outline', label: 'Notifications', screen: 'Notifications', color: Colors.gold },
      { icon: 'settings-outline', label: 'Settings', screen: 'Settings', color: Colors.mediumGray },
    ],
  };
  const menuItems = menuByRole[role] || menuByRole.student;

  return (
    <ScrollView style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Profile Header */}
      <LinearGradient colors={Colors.gradient.pink} style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          {avatarUrl?.includes('dicebear') ? (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>{getInitials(p?.name)}</Text>
            </View>
          ) : (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          )}
        </View>
        <Text style={styles.profileName}>{p?.displayName || p?.name}</Text>
        <Text style={styles.profileRole}>{p?.role?.toUpperCase()}</Text>
        {p?.grade && <Text style={styles.profileGrade}>Grade {p.grade} • {p?.board || 'N/A'}</Text>}
      </LinearGradient>

      {/* Info Cards */}
      <View style={styles.infoSection}>
        <View style={[styles.infoCard, { backgroundColor: cardBg }]}>
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={18} color={Colors.primary} />
            <Text style={[styles.infoLabel, { color: textSec }]}>Mobile</Text>
            <Text style={[styles.infoValue, { color: textColor }]}>{p?.mobile || 'Not set'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={18} color={Colors.primary} />
            <Text style={[styles.infoLabel, { color: textSec }]}>Email</Text>
            <Text style={[styles.infoValue, { color: textColor }]}>{p?.email || 'Not set'}</Text>
          </View>
          {p?.bio && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Ionicons name="pencil-outline" size={18} color={Colors.primary} />
                <Text style={[styles.infoLabel, { color: textSec }]}>Bio</Text>
                <Text style={[styles.infoValue, { color: textColor }]}>{p.bio}</Text>
              </View>
            </>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: cardBg }]}>
            <Text style={[styles.statNum, { color: Colors.primary }]}>🔥 {p?.loginStreak || 0}</Text>
            <Text style={[styles.statLbl, { color: textSec }]}>Day Streak</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: cardBg }]}>
            <Text style={[styles.statNum, { color: Colors.gold }]}>🏆 {p?.longestStreak || 0}</Text>
            <Text style={[styles.statLbl, { color: textSec }]}>Best Streak</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: cardBg }]}>
            <Text style={[styles.statNum, { color: Colors.success }]}>📅 {p?.totalLoginDays || 0}</Text>
            <Text style={[styles.statLbl, { color: textSec }]}>Total Days</Text>
          </View>
        </View>

        {/* Menu Items */}
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={[styles.menuItem, { backgroundColor: cardBg }]}
            onPress={() => navigation.navigate(item.screen)}
          >
            <Ionicons name={item.icon} size={22} color={item.color} />
            <Text style={[styles.menuLabel, { color: textColor }]}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.mediumGray} />
          </TouchableOpacity>
        ))}

        {/* Logout */}
        <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: Colors.errorLight }]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={Colors.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: textSec }]}>Version {APP_VERSION}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  profileHeader: { paddingTop: 60, paddingBottom: 30, alignItems: 'center' },
  avatarContainer: { marginBottom: 12 },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: Colors.white },
  avatarPlaceholder: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: Colors.white },
  avatarInitials: { fontSize: 32, fontWeight: 'bold', color: Colors.white },
  profileName: { fontSize: 22, fontWeight: 'bold', color: Colors.white },
  profileRole: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4, letterSpacing: 1 },
  profileGrade: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  infoSection: { padding: 16 },
  infoCard: { borderRadius: 14, padding: 16, ...Shadows.light },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  infoLabel: { fontSize: 13, width: 60 },
  infoValue: { fontSize: 14, fontWeight: '500', flex: 1 },
  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.05)', marginVertical: 2 },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  statBox: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', ...Shadows.light },
  statNum: { fontSize: 18, fontWeight: 'bold' },
  statLbl: { fontSize: 11, marginTop: 4 },
  menuItem: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 16, marginTop: 10, gap: 14, ...Shadows.light },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, padding: 16, marginTop: 16, gap: 8 },
  logoutText: { fontSize: 16, fontWeight: '600', color: Colors.error },
  version: { textAlign: 'center', fontSize: 12, marginTop: 16, marginBottom: 24 },
});
