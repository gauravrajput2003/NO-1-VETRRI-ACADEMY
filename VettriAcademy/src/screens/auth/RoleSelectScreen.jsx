import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, ScrollView, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ROLES } from '../../utils/constants';

// ─── Premium Theme ─────────────────────────────────────────────────────────────
const THEME = {
  primary: '#6C63FF',
  primaryDark: '#5A52D5',
  accent: '#F5B942',
  accentDark: '#D9A030',
  background: '#F8F7FF',
  textDark: '#1E1B39',
  textSecondary: '#6B7280',
  cardBorder: '#ECEAF8',
  white: '#FFFFFF',
  cardShadow: '#1E1B39',
};

// ─── Role Data ─────────────────────────────────────────────────────────────────
const roles = [
  {
    key: ROLES.STUDENT,
    label: 'Student',
    icon: 'school-outline',
    desc: 'Classes, materials, doubt support and progress tracking',
    tagline: 'Learn & grow',
    accentColor: '#6C63FF',
  },
  {
    key: ROLES.TEACHER,
    label: 'Teacher',
    icon: 'people-outline',
    desc: 'Live classes, attendance, grades and student guidance',
    tagline: 'Teach & mentor',
    accentColor: '#4EAAA1',
  },
  {
    key: ROLES.ADMIN,
    label: 'Admin',
    icon: 'shield-checkmark-outline',
    desc: 'Admissions, fees, staff, scheduling and academy control',
    tagline: 'Operate the academy',
    accentColor: '#E07A5F',
  },
];

// ─── Role Card Component ───────────────────────────────────────────────────────
function RoleCard({ role, onPress }) {
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={onPress}
    >
      {/* Left accent bar */}
      <View style={[styles.cardAccentBar, { backgroundColor: role.accentColor }]} />

      <View style={styles.cardContent}>
        {/* Icon container */}
        <View style={[styles.cardIconContainer, { backgroundColor: `${role.accentColor}12` }]}>
          <Ionicons name={role.icon} size={26} color={role.accentColor} />
        </View>

        {/* Text section */}
        <View style={styles.cardTextSection}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>{role.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={THEME.textSecondary} />
          </View>
          <Text style={styles.cardDesc} numberOfLines={2}>{role.desc}</Text>
          <Text style={[styles.cardTagline, { color: role.accentColor }]}>{role.tagline}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function RoleSelectScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={THEME.background} />

      {/* Subtle background blobs */}
      <View style={styles.blobTopLeft} />
      <View style={styles.blobBottomRight} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Logo Section ────────────────────────────────────────────── */}
        <View style={styles.logoSection}>
          <View style={styles.logoElevatedCard}>
            <Image
              source={require('../../../assets/Picsart_ client.png')}
              style={styles.logoImage}
            />
          </View>
          <Text style={styles.academyName}>VETTRI ACADEMY</Text>
        </View>

        {/* ── Hero Section ────────────────────────────────────────────── */}
        <View style={styles.heroSection}>
          <Text style={styles.heroHeading}>Learn Without Limits</Text>
          <Text style={styles.heroSubtitle}>Choose your role to continue learning</Text>
        </View>

        {/* ── Section Header ──────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Choose Workspace</Text>
          <Text style={styles.sectionCaption}>Designed for every role</Text>
        </View>

        {/* ── Role Cards ──────────────────────────────────────────────── */}
        <View style={styles.cardsContainer}>
          {roles.map((role) => (
            <RoleCard
              key={role.key}
              role={role}
              onPress={() => navigation.navigate('Login', { role: role.key })}
            />
          ))}
        </View>

        {/* ── CTA Section ─────────────────────────────────────────────── */}
        <View style={styles.ctaSection}>
          <View style={styles.ctaRow}>
            <TouchableOpacity
              style={styles.skipButton}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Login', { role: ROLES.STUDENT })}
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.88}
              onPress={() => navigation.navigate('Login', { role: ROLES.STUDENT })}
            >
              <LinearGradient
                colors={[THEME.primary, THEME.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButtonGradient}
              >
                <Text style={styles.primaryButtonText}>Get Started</Text>
                <Ionicons name="arrow-forward" size={19} color={THEME.white} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <View style={styles.footerSection}>
          <Text style={styles.footerText}>
            Built for structured learning, teaching and academy operations
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Container & Background
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 22 : 12,
    paddingBottom: 28,
  },

  // ── Subtle Background Blobs
  blobTopLeft: {
    position: 'absolute',
    top: -60,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: THEME.primary,
    opacity: 0.05,
  },
  blobBottomRight: {
    position: 'absolute',
    bottom: -80,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: THEME.accent,
    opacity: 0.06,
  },

  // ── Logo Section
  logoSection: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  logoElevatedCard: {
    width: 98,
    height: 98,
    borderRadius: 49,
    backgroundColor: THEME.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.11,
    shadowRadius: 18,
    elevation: 8,
    marginBottom: 16,
  },
  logoImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
    resizeMode: 'contain',
  },
  academyName: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.textDark,
    letterSpacing: 4,
    textAlign: 'center',
  },

  // ── Hero Section
  heroSection: {
    alignItems: 'center',
    marginBottom: 28,
    paddingHorizontal: 12,
  },
  heroHeading: {
    fontSize: 35,
    fontWeight: '800',
    color: THEME.textDark,
    textAlign: 'center',
    letterSpacing: -0.6,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: THEME.textSecondary,
    textAlign: 'center',
    lineHeight: 23,
  },

  // ── Section Header
  sectionHeader: {
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: THEME.textDark,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  sectionCaption: {
    fontSize: 14,
    fontWeight: '500',
    color: THEME.textSecondary,
  },

  // ── Cards
  cardsContainer: {
    marginBottom: 28,
  },
  card: {
    backgroundColor: THEME.white,
    borderRadius: 22,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    shadowColor: '#1E1B39',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 5,
  },
  cardAccentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 22,
    borderBottomLeftRadius: 22,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 18,
    paddingLeft: 20,
  },
  cardIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardTextSection: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: THEME.textDark,
    letterSpacing: -0.2,
  },
  cardDesc: {
    fontSize: 14,
    fontWeight: '400',
    color: THEME.textSecondary,
    lineHeight: 20,
    marginBottom: 6,
    paddingRight: 4,
  },
  cardTagline: {
    fontSize: 13,
    fontWeight: '600',
    fontStyle: 'italic',
  },

  // ── CTA Section
  ctaSection: {
    marginBottom: 18,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  primaryButton: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 6,
  },
  primaryButtonGradient: {
    height: 56,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: THEME.white,
    letterSpacing: 0.3,
  },
  skipButton: {
    minWidth: 56,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.textSecondary,
  },

  // ── Footer
  footerSection: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '500',
    color: THEME.textSecondary,
    textAlign: 'center',
    letterSpacing: 0.1,
    lineHeight: 19,
  },
});
