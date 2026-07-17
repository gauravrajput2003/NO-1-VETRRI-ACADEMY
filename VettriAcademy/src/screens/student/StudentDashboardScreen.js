import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';

const { width } = Dimensions.get('window');

// --- ANIMATION COMPONENTS ---
const FadeUpCard = ({ children, delay = 0, style }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        delay,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  return (
    <Animated.View style={[style, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {children}
    </Animated.View>
  );
};

const ScaleButton = ({ onPress, children, style }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

export function StudentDashboardScreen({ navigation }) {
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();
  
  const [activeChip, setActiveChip] = useState('All');
  const chips = ['All', 'Math', 'Science', 'English', 'History'];

  const [streakInfo] = useState({ current: 7 });
  
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['#FFF8FB', '#F8F7FC', '#F5FCFF', '#F2FFFC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Decorative Blobs */}
      <View style={[styles.blob, { top: -50, left: -50, backgroundColor: '#FF4F8B' }]} />
      <View style={[styles.blob, { top: 200, right: -100, backgroundColor: '#00C9FF' }]} />

      <ScrollView 
        onScroll={onTabBarScroll} 
        scrollEventThrottle={16} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding + 20 }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Rahul Kumar</Text>
            <Text style={styles.headerSubtitle}>Grade 5 • CBSE</Text>
          </View>
          <View style={styles.headerIcons}>
            <ScaleButton style={styles.iconButton}>
              <Text style={styles.headerIcon}>🎯</Text>
            </ScaleButton>
            <ScaleButton style={styles.iconButton}>
              <Text style={styles.headerIcon}>⭐</Text>
            </ScaleButton>
          </View>
        </View>

        {/* Hero Section */}
        <FadeUpCard delay={0}>
          <ScaleButton>
            <LinearGradient
              colors={['#FF4F8B', '#FF8DA1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <View style={styles.bubble1} />
              <View style={styles.bubble2} />
              <View style={styles.heroContent}>
                <View style={styles.heroTextContainer}>
                  <Text style={styles.heroGreeting}>🎊 Welcome back!</Text>
                  <Text style={styles.heroTitle}>Ready to learn,</Text>
                  <Text style={styles.heroTitleBold}>Rahul?</Text>
                  <View style={styles.streakBadge}>
                    <Text style={styles.streakBadgeText}>🔥 {streakInfo.current} Day Streak!</Text>
                  </View>
                </View>
                <Image 
                  source={require('../../../assets/boy_illustration.png')} 
                  style={styles.heroImage}
                  resizeMode="contain"
                />
              </View>
            </LinearGradient>
          </ScaleButton>
        </FadeUpCard>

        {/* Top Stats Grid */}
        <FadeUpCard delay={100} style={styles.statsGrid}>
          <ScaleButton style={styles.statCardContainer}>
            <LinearGradient colors={['#FFFFFF', '#F0F9FF']} style={styles.statCard}>
              <Image source={require('../../../assets/student_group.png')} style={styles.statIcon} />
              <Text style={styles.statValue}>#5</Text>
              <Text style={styles.statLabel}>Class Rank</Text>
            </LinearGradient>
          </ScaleButton>
          <ScaleButton style={styles.statCardContainer}>
            <LinearGradient colors={['#FFFFFF', '#FFF0F5']} style={styles.statCard}>
              <Image source={require('../../../assets/study.png')} style={styles.statIcon} />
              <Text style={styles.statValue}>3</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </LinearGradient>
          </ScaleButton>
          <ScaleButton style={styles.statCardContainer}>
            <LinearGradient colors={['#FFFFFF', '#F0FDF4']} style={styles.statCard}>
              <Image source={require('../../../assets/streakk.png')} style={styles.statIcon} />
              <Text style={styles.statValue}>{streakInfo.current}</Text>
              <Text style={styles.statLabel}>Streak Days</Text>
            </LinearGradient>
          </ScaleButton>
        </FadeUpCard>

        {/* Learning Champion */}
        <FadeUpCard delay={200}>
          <ScaleButton style={styles.championCardWrapper}>
            <LinearGradient colors={['#FFFFFF', '#F5F3FF']} style={styles.championCard}>
              <View style={styles.championLeft}>
                <Text style={styles.championTitle}>Learning Champion</Text>
                <Text style={styles.championSubtitle}>You are 220 XP away from Level 6!</Text>
                <View style={styles.progressTrack}>
                  <LinearGradient 
                    colors={['#8B5CF6', '#C4B5FD']} 
                    start={{x: 0, y: 0}} end={{x: 1, y: 0}} 
                    style={[styles.progressFill, { width: '78%' }]} 
                  />
                </View>
                <Text style={styles.progressText}>78% completed</Text>
              </View>
              <Image source={require('../../../assets/cup.png')} style={styles.championImage} />
            </LinearGradient>
          </ScaleButton>
        </FadeUpCard>

        {/* Explore Chips */}
        <FadeUpCard delay={300}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
            {chips.map((chip, idx) => {
              const isActive = activeChip === chip;
              return (
                <ScaleButton key={idx} onPress={() => setActiveChip(chip)}>
                  {isActive ? (
                    <LinearGradient colors={['#FF4F8B', '#FF8DA1']} style={[styles.chip, styles.activeChip]}>
                      <Text style={styles.activeChipText}>{chip}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.inactiveChipWrapper}>
                      <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFillObject} />
                      <Text style={styles.inactiveChipText}>{chip}</Text>
                    </View>
                  )}
                </ScaleButton>
              );
            })}
          </ScrollView>
        </FadeUpCard>

        {/* Feature Cards Grid (2 columns) */}
        <FadeUpCard delay={400} style={styles.featureGrid}>
          <ScaleButton style={styles.featureCardContainer}>
            <LinearGradient colors={['#FFFFFF', '#E0F2FE']} style={styles.featureCard}>
              <Image source={require('../../../assets/scedule.png')} style={styles.featureImage} />
              <View style={styles.featureTextWrap}>
                <Text style={styles.featureTitle}>Attendance</Text>
                <Text style={styles.featureSubtitle}>92% Present</Text>
              </View>
            </LinearGradient>
          </ScaleButton>
          
          <ScaleButton style={styles.featureCardContainer}>
            <LinearGradient colors={['#FFFFFF', '#FEF3C7']} style={styles.featureCard}>
              <Image source={require('../../../assets/book_quiz.png')} style={styles.featureImage} />
              <View style={styles.featureTextWrap}>
                <Text style={styles.featureTitle}>Tests</Text>
                <Text style={styles.featureSubtitle}>2 Upcoming</Text>
              </View>
            </LinearGradient>
          </ScaleButton>
        </FadeUpCard>

        {/* Today's Classes */}
        <FadeUpCard delay={500}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Classes</Text>
            <TouchableOpacity><Text style={styles.viewAllText}>View All</Text></TouchableOpacity>
          </View>
          <ScaleButton>
            <LinearGradient colors={['#FFFFFF', '#FFEDD5']} style={styles.scheduleCard}>
              <View style={styles.scheduleLeft}>
                <View style={styles.liveBadge}>
                  <Text style={styles.liveBadgeText}>🔴 LIVE</Text>
                </View>
                <Text style={styles.scheduleSubject}>Mathematics</Text>
                <Text style={styles.scheduleTeacher}>👨‍🏫 B. Preetha</Text>
                <Text style={styles.scheduleTime}>5:00 PM</Text>
                <View style={styles.joinButton}>
                  <Text style={styles.joinButtonText}>JOIN NOW</Text>
                </View>
              </View>
              <Image source={require('../../../assets/classes.png')} style={styles.scheduleImage} />
            </LinearGradient>
          </ScaleButton>
        </FadeUpCard>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF8FB',
  },
  blob: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    opacity: 0.05,
  },
  scrollContent: {
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  headerIcon: {
    fontSize: 20,
  },
  heroCard: {
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 28,
    height: 180,
    overflow: 'hidden',
    shadowColor: '#FF4F8B',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  bubble1: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.15)',
    top: -50,
    right: -20,
  },
  bubble2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
    bottom: -30,
    left: 40,
  },
  heroContent: {
    flex: 1,
    flexDirection: 'row',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTextContainer: {
    flex: 1,
    zIndex: 10,
  },
  heroGreeting: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '600',
  },
  heroTitleBold: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 12,
  },
  streakBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  streakBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  heroImage: {
    width: 130,
    height: 160,
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCardContainer: {
    width: (width - 48) / 3,
  },
  statCard: {
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  statIcon: {
    width: 48,
    height: 48,
    marginBottom: 8,
    resizeMode: 'contain',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'center',
  },
  championCardWrapper: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  championCard: {
    flexDirection: 'row',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  championLeft: {
    flex: 1,
    marginRight: 10,
  },
  championTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  championSubtitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 14,
  },
  progressTrack: {
    height: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressText: {
    fontSize: 11,
    color: '#8B5CF6',
    fontWeight: '700',
  },
  championImage: {
    width: 90,
    height: 90,
    resizeMode: 'contain',
  },
  chipsScroll: {
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  chip: {
    height: 42,
    paddingHorizontal: 20,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  inactiveChipWrapper: {
    height: 42,
    paddingHorizontal: 20,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    backgroundColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden',
  },
  activeChip: {
    shadowColor: '#FF4F8B',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    borderColor: 'transparent',
  },
  activeChipText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  inactiveChipText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 14,
  },
  featureGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  featureCardContainer: {
    width: (width - 56) / 2,
  },
  featureCard: {
    borderRadius: 24,
    padding: 16,
    height: 180,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    justifyContent: 'space-between',
  },
  featureImage: {
    width: '90%',
    height: 90,
    resizeMode: 'contain',
    alignSelf: 'center',
  },
  featureTextWrap: {
    alignItems: 'center',
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 2,
  },
  featureSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  viewAllText: {
    fontSize: 13,
    color: '#FF4F8B',
    fontWeight: '700',
  },
  scheduleCard: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowColor: '#F97316',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    marginBottom: 20,
  },
  scheduleLeft: {
    flex: 1,
  },
  liveBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  liveBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  scheduleSubject: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  scheduleTeacher: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 4,
  },
  scheduleTime: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 14,
  },
  joinButton: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  scheduleImage: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
});

export default StudentDashboardScreen;
