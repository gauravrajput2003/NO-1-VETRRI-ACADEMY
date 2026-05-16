import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, ScrollView, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../utils/colors';
import { APP_NAME, ROLES } from '../../utils/constants';

const GOLD = '#FFD166';
const DARK_GOLD = '#C98A06';

const roles = [
  { key: ROLES.STUDENT, label: 'Student', icon: 'school-outline', desc: 'Classes, materials, doubt support and progress tracking', color: '#7C5CFF', accent: '#B7A3FF', bullets: 'Learn, revise and grow' },
  { key: ROLES.TEACHER, label: 'Teacher', icon: 'people-outline', desc: 'Live classes, attendance, grades and student guidance', color: '#11C5C6', accent: '#7EE8E8', bullets: 'Teach, manage and mentor' },
  { key: ROLES.ADMIN, label: 'Admin', icon: 'shield-checkmark-outline', desc: 'Admissions, fees, staff, scheduling and academy control', color: '#FF4F8B', accent: '#FFB1C9', bullets: 'Operate the whole academy' },
];

export default function RoleSelectScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrap}>
          <LinearGradient
            colors={['#F8FAFC', '#EEF7FB', '#FFF4F7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroOrbTop} />
            <View style={styles.heroOrbBottom} />
            <View style={styles.heroTopRow}>
              <View style={[styles.badgePill, styles.badgePillLight]}>
                <Ionicons name="sparkles" size={14} color={Colors.pink} />
                <Text style={styles.badgePillText}>Premium EdTech Platform</Text>
              </View>
              <View style={[styles.sincePill, styles.sincePillLight]}>
                <Text style={styles.sinceText}>SINCE 2003</Text>
              </View>
            </View>

            <View style={styles.logoShell}>
              <LinearGradient colors={['rgba(255,79,139,0.18)', 'rgba(17,197,198,0.10)']} style={styles.logoFrame}>
                <Image source={require('../../../assets/Picsart_ client.png')} style={styles.logoImage} />
              </LinearGradient>
            </View>

            <Text style={styles.mainTitle}>{APP_NAME}</Text>
            <Text style={styles.subtitle}>Select your role to continue</Text>
            <Text style={styles.tagline}>Learn Today • Dream Big • Achieve Tomorrow</Text>

          </LinearGradient>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Choose your workspace</Text>
          <Text style={styles.sectionCaption}>Designed for every role</Text>
        </View>

        <View style={styles.cardsContainer}>
          {roles.map((role) => (
            <TouchableOpacity
              key={role.key}
              style={styles.card}
              activeOpacity={0.92}
              onPress={() => navigation.navigate('Login', { role: role.key })}
            >
              <LinearGradient colors={[role.color, role.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardStripe} />

              <LinearGradient colors={[`${role.color}18`, `${role.color}08`]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconGlow}>
                <View style={[styles.cardIconBg, { backgroundColor: `${role.color}18` }]}>
                  <Ionicons name={role.icon} size={30} color={role.color} />
                </View>
              </LinearGradient>

              <View style={styles.cardTextSection}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitle}>{role.label}</Text>
                  <Ionicons name="arrow-forward" size={18} color={GOLD} />
                </View>
                <Text style={styles.cardDesc}>{role.desc}</Text>
                <View style={[styles.cardChip, { backgroundColor: `${role.color}10` }]}>
                  <Text style={[styles.cardChipText, { color: role.color }]}>{role.bullets}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footerSection}>
          <Text style={styles.footerText}>Built for structured learning, teaching and academy operations</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.offWhite },
  scrollContent: { paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 22 : 14, paddingBottom: 28 },
  heroWrap: { marginBottom: 16, borderRadius: 30, overflow: 'hidden', shadowColor: '#081425', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 5 },
  hero: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 18, borderRadius: 30, position: 'relative' },
  heroOrbTop: { position: 'absolute', top: -26, right: -20, width: 108, height: 108, borderRadius: 54, backgroundColor: 'rgba(255,79,139,0.08)' },
  heroOrbBottom: { position: 'absolute', bottom: -28, left: -12, width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(17,197,198,0.10)' },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  badgePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(17,197,198,0.14)', flexShrink: 1, maxWidth: '72%' },
  badgePillLight: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  badgePillText: { color: Colors.navy, fontSize: 12, fontWeight: '800', flexShrink: 1 },
  sincePill: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, marginLeft: 8, flexShrink: 0 },
  sincePillLight: { backgroundColor: 'rgba(255,209,102,0.18)', borderWidth: 1, borderColor: 'rgba(255,209,102,0.26)' },
  sinceText: { color: DARK_GOLD, fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  logoShell: { alignItems: 'center', marginBottom: 14 },
  logoFrame: { width: 132, height: 132, borderRadius: 34, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(8,21,37,0.06)' },
  logoImage: { width: 118, height: 118, resizeMode: 'contain' },
  mainTitle: { fontSize: 26, fontWeight: '900', color: Colors.navy, textAlign: 'center', letterSpacing: -0.7, paddingHorizontal: 6 },
  subtitle: { fontSize: 15, color: Colors.textSecondary.light, marginTop: 8, textAlign: 'center', fontWeight: '600', paddingHorizontal: 10 },
  tagline: { fontSize: 12.5, color: Colors.pink, marginTop: 10, textAlign: 'center', fontWeight: '900', letterSpacing: 0.2, paddingHorizontal: 18, lineHeight: 18 },
  sectionHeader: { marginBottom: 14, paddingHorizontal: 4 },
  sectionTitle: { fontSize: 20, fontWeight: '900', color: Colors.navy, letterSpacing: -0.4 },
  sectionCaption: { fontSize: 12, color: Colors.textSecondary.light, fontWeight: '600', marginTop: 2 },
  cardsContainer: { gap: 14, marginBottom: 18 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 26,
    overflow: 'hidden',
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#081425',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 5,
  },
  cardStripe: { width: 6, height: '100%', borderRadius: 999, marginRight: 14 },
  iconGlow: { width: 66, height: 66, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardIconBg: { width: 56, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  cardTextSection: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardTitle: { fontSize: 18, fontWeight: '900', color: Colors.navy, letterSpacing: -0.3 },
  cardDesc: { fontSize: 12.5, lineHeight: 18, color: Colors.textSecondary.light, fontWeight: '500', paddingRight: 8 },
  cardChip: { alignSelf: 'flex-start', marginTop: 10, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  cardChipText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  footerSection: { marginTop: 8, alignItems: 'center', paddingTop: 16 },
  footerText: { fontSize: 12.5, color: DARK_GOLD, fontWeight: '700', letterSpacing: 0.2, textAlign: 'center' },
});
