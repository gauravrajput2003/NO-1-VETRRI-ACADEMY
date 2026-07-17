import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Animated, Easing, FlatList, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';

const ASSETS = {
  newStudent: require('../../../assets/new_student.png'),
  newTeacher: require('../../../assets/new_teacher.png'),
  newEnquiry: require('../../../assets/new_enquiry.png'),
  newLeave: require('../../../assets/new_leave.png'),
  newFee: require('../../../assets/new_fees.png'),
  newSalary: require('../../../assets/new_salary.png'),
  newNotice: require('../../../assets/new_notice.png'),
  newSchedular: require('../../../assets/new_schedular.png'),
  newTraining: require('../../../assets/new_training.png'),
};

// Prefetch assets for faster rendering
Image.prefetch(Object.values(ASSETS));

import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../utils/colors';
import { fetchAdminStats } from '../../redux/slices/adminSlice';
import { fetchUnreadNotificationCount } from '../../redux/slices/notificationsSlice';
import { toggleAI } from '../../redux/slices/uiSlice';
import { getAdminStudentMarksAPI, getAdminTopRankersAPI } from '../../services/api';



// --- ANIMATION COMPONENTS ---
function FadeInDown({ children, delay = 0, style }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 600, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 600, delay, easing: Easing.out(Easing.ease), useNativeDriver: true })
    ]).start();
  }, []);
  return <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

function FadeInUp({ children, delay = 0, style }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 600, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 600, delay, easing: Easing.out(Easing.ease), useNativeDriver: true })
    ]).start();
  }, []);
  return <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

function FloatingCircle({ size, top, left, right, bottom, opacity = 0.1 }) {
  return (
    <View style={{
      position: 'absolute', width: size, height: size, borderRadius: size / 2,
      backgroundColor: '#FFFFFF', opacity, top, left, right, bottom
    }} />
  );
}

function ActionButton({ icon, badge, onPress, isGold = false, delay = 0 }) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, speed: 40 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();

  return (
    <FadeInDown delay={delay}>
      <TouchableOpacity onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} activeOpacity={1}>
        <Animated.View style={[
          styles.actionBtn,
          { transform: [{ scale }] },
          {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 10,
            elevation: 4
          }
        ]}>
          <Ionicons name={icon} size={24} color={isGold ? "#F8C24E" : "#FFF"} />
          {badge > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>
    </FadeInDown>
  );
}

function PremiumCard({ title, subtitle, value, icon, gradient, onPress, width, height = 160, footerText = "Explore Module", delay = 0 }) {
  const scale = useRef(new Animated.Value(1)).current;
  const rotation = useRef(new Animated.Value(0)).current;

  const pressIn = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40 }),
      Animated.timing(rotation, { toValue: 1, duration: 150, useNativeDriver: true })
    ]).start();
  };
  const pressOut = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }),
      Animated.timing(rotation, { toValue: 0, duration: 150, useNativeDriver: true })
    ]).start();
  };

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg']
  });

  return (
    <FadeInUp delay={delay}>
      <TouchableOpacity onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} activeOpacity={1}>
        <Animated.View style={[
          { transform: [{ scale }] },
          styles.cardBase,
          { width: width || '100%', height },
          {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
            elevation: 4
          }
        ]}>
          <LinearGradient colors={gradient} style={styles.cardGradient}>
            <View style={styles.cardTop}>
              {title && <Text style={styles.cardTitle}>{title}</Text>}
              {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
              {value !== undefined && <Text style={styles.cardValue}>{value}</Text>}
            </View>
            
            {icon && <Image source={icon} style={[styles.cardImage, (!title && !subtitle && value === undefined) && styles.cardImageFull]} contentFit="contain" transition={200} cachePolicy="memory-disk" />}
            
            <View style={styles.cardFooter}>
              <Text style={styles.cardFooterText}>{footerText}</Text>
              <View style={styles.glassArrowBtn}>
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <Ionicons name="arrow-forward" size={16} color="#FFF" />
                </Animated.View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    </FadeInUp>
  );
}

export default function AdminDashboard({ navigation }) {
  const dispatch = useDispatch();
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();
  const { user } = useSelector((s) => s.auth);
  const { stats, loading } = useSelector((s) => s.admin);
  const { unreadCount } = useSelector((s) => s.notifications);
  const [refreshing, setRefreshing] = useState(false);
  const { width } = useWindowDimensions();

  const availableWidth = width - 40;
  const numCols = Math.max(2, Math.floor((availableWidth + 16) / 176));
  const cardWidth = (availableWidth - (numCols - 1) * 16) / numCols;

  // We keep the API calls logic intact even if we don't map over the lists directly anymore
  const loadAdminInsights = useCallback(async () => {
    try {
      await Promise.all([
        getAdminTopRankersAPI({ limit: 3 }),
        getAdminStudentMarksAPI({ limit: 100 }),
      ]);
    } catch {}
  }, []);

  const loadData = useCallback(() => {
    dispatch(fetchAdminStats());
    dispatch(fetchUnreadNotificationCount());
    loadAdminInsights();
    setRefreshing(false);
  }, [dispatch, loadAdminInsights]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading && !stats) {
    return <View style={[styles.centered, { backgroundColor: '#FAFBFC' }]}><ActivityIndicator size="large" color="#11C5C6" /></View>;
  }

  const s = stats || {};

  const statCards = [
    { icon: ASSETS.newStudent, value: s.totalStudents || 0, label: 'Students', gradient: ['#1D4ED8', '#3B82F6'], screen: 'ManageStudents' },
    { icon: ASSETS.newTeacher, value: s.totalTeachers || 0, label: 'Teachers', gradient: ['#0F766E', '#2DD4BF'], screen: 'ManageTeachers' },
    { icon: ASSETS.newEnquiry, value: s.pendingEnquiries || 0, label: 'Enquiries', gradient: ['#DB2777', '#F472B6'], screen: 'Enquiries' },
    { icon: ASSETS.newLeave, value: s.pendingLeaves || 0, label: 'Leaves', gradient: ['#FF4F8B', '#FF6AA8'], screen: 'AdminLeaves' },
  ];

  const quickActions = [
    { id: '3', icon: ASSETS.newFee, label: 'Fees', subtitle: 'Manage Payments', screen: 'FeeManagement', gradient: ['#14C8C4', '#38BDF8'] },
    { id: '4', icon: ASSETS.newNotice, label: 'Notice', subtitle: 'Create & View Notices', screen: 'Announcements', gradient: ['#FF4F8B', '#FB7185'] },
    { id: '5', icon: ASSETS.newSalary, label: 'Salary', subtitle: 'Employee Payroll', screen: 'SalaryManagement', gradient: ['#F59E0B', '#FB923C'] },
    { id: '6', icon: ASSETS.newSchedular, label: 'Scheduler', subtitle: 'Manage Classes', screen: 'ClassScheduler', gradient: ['#0F766E', '#06B6D4'] },
    { id: '7', icon: ASSETS.newTraining, label: 'Training', subtitle: 'Video Library', screen: 'AdminTrainingVideos', gradient: ['#7C3AED', '#EC4899'] },
  ];

  const greetingTime = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good Morning,';
    if (hr < 17) return 'Good Afternoon,';
    return 'Good Evening,';
  };

  const formattedDate = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <ScrollView onScroll={onTabBarScroll} scrollEventThrottle={16} style={[styles.container, { backgroundColor: '#FAFBFC' }]} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} colors={['#11C5C6']} />}>
      
      {/* Teal Wave Header */}
      <FadeInDown delay={0}>
        <View style={styles.headerBg}>
          <LinearGradient colors={['#1A3C40', '#11C5C6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerGradient}>
            <View style={styles.headerContent}>
              <View style={{ flex: 1 }}>
                <Text style={styles.greeting}>ADMIN PANEL</Text>
                <View style={styles.headerNameRow}>
                  <Text style={styles.headerName}>{(user?.displayName || user?.name || '').split(' ')[0]} </Text>
                  <Text style={styles.headerNameAccent}>{(user?.displayName || user?.name || '').split(' ').slice(1).join(' ')}</Text>
                </View>
                <Text style={styles.headerDateline}>
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' })} · All systems normal
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <ActionButton icon="sparkles" isGold onPress={() => dispatch(toggleAI())} delay={100} />
                <ActionButton icon="notifications" badge={unreadCount} onPress={() => navigation.navigate('Notifications')} delay={200} />
              </View>
            </View>
          </LinearGradient>
        </View>
      </FadeInDown>

      {/* QUICK STATS */}
      <View style={styles.sectionStats}>
        <View style={styles.statsGrid}>
          {statCards.map((card, i) => (
            <View key={i} style={[styles.statCardWrap, { width: cardWidth }]}>
              <PremiumCard 
                icon={card.icon}
                gradient={card.gradient}
                onPress={() => navigation.navigate(card.screen)}
                delay={300 + (i * 100)}
                height={150}
                footerText="Open"
              />
            </View>
          ))}
        </View>
      </View>

      {/* MANAGEMENT SECTION */}
      <View style={styles.section}>
        <FadeInUp delay={600}>
          <View style={styles.sectionHeaderFlex}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Management</Text>
              <Text style={styles.sectionSubtitle}>Manage Academy Resources</Text>
            </View>
           
          </View>
        </FadeInUp>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          snapToAlignment="start"
          decelerationRate="fast"
          snapToInterval={175 + 16}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, paddingTop: 8 }}
          data={quickActions}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <View style={{ marginRight: index === quickActions.length - 1 ? 0 : 16 }}>
              <PremiumCard 
                width={175}
                height={160}
                icon={item.icon}
                gradient={item.gradient}
                onPress={() => navigation.navigate(item.screen)}
                delay={700 + (index * 100)}
                footerText="Open"
              />
            </View>
          )}
        />
      </View>

      {/* MONTHLY TOP RANKERS SINGLE CARD */}
      <View style={styles.sectionPad}>
        <PremiumCard 
          title="🏆 Monthly Top Rankers"
          subtitle="View the highest-performing students this month."
          gradient={['#F59E0B', '#F8C24E']}
          onPress={() => navigation.navigate('MonthlyTopRankers')}
          delay={900}
          height={120}
          footerText="View Leaderboard"
        />
      </View>

      {/* STUDENT MARKS SINGLE CARD */}
      <View style={styles.sectionPad}>
        <PremiumCard 
          title="📝 Student Marks"
          subtitle="View marks, grades and exam performance."
          gradient={['#0F766E', '#11C5C6']}
          onPress={() => navigation.navigate('StudentMarks')}
          delay={1000}
          height={120}
          footerText="View Performance"
        />
      </View>

      <View style={{ height: Math.max(40, bottomPadding) }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  headerBg: { backgroundColor: '#FAFBFC' },
  headerGradient: { paddingTop: 48, paddingBottom: 22, paddingHorizontal: 18 },
  headerContent: { flexDirection: 'row', alignItems: 'center' },
  greeting: { fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: 3, fontWeight: '700', textTransform: 'uppercase' },
  headerNameRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  headerName: { fontSize: 26, fontWeight: '900', color: '#FFF', letterSpacing: 0.2 },
  headerNameAccent: { fontSize: 26, fontWeight: '900', color: '#FF4FA3', letterSpacing: 0.2 },
  headerDateline: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 3, fontWeight: '500' },
  
  actionBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  badge: {
    position: 'absolute', top: -2, right: -2,
    backgroundColor: '#FF4F8B', borderRadius: 10,
    width: 20, height: 20,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#11C5C6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4,
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },


  sectionStats: { paddingHorizontal: 20, marginTop: 16, paddingBottom: 28 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  statCardWrap: { },

  section: { paddingBottom: 20 },
  sectionPad: { paddingHorizontal: 20, paddingBottom: 28 },
  sectionHeaderFlex: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#1F2D3D', fontFamily: 'Inter' },
  sectionSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 4, fontWeight: '500', fontFamily: 'Inter' },
  viewAllPill: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: 'rgba(255, 79, 139, 0.1)',
  },
  viewAllPillText: { fontSize: 13, fontWeight: '700', color: '#FF4F8B' },

  cardBase: { borderRadius: 24, overflow: 'hidden' },
  cardGradient: { flex: 1, position: 'relative' },
  cardTop: { padding: 16, zIndex: 2 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#FFF', fontFamily: 'Inter' },
  cardSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 2, fontWeight: '500', fontFamily: 'Inter' },
  cardValue: { fontSize: 24, color: '#FFF', fontWeight: '900', marginTop: 4, fontFamily: 'Inter' },
  cardImage: { position: 'absolute', width: '65%', height: '65%', bottom: '20%', right: -10, zIndex: 1, opacity: 0.95 },
  cardImageFull: { width: '85%', height: '80%', bottom: '20%', right: '7.5%', left: '7.5%' },
  
  cardFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '22%',
    backgroundColor: 'rgba(255,255,255,0.18)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, zIndex: 3
  },
  cardFooterText: { fontSize: 12, fontWeight: '700', color: '#FFF', fontFamily: 'Inter' },
  glassArrowBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
});
