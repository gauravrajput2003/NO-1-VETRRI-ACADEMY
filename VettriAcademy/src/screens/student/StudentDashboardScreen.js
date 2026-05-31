import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity as RNTouchableOpacity,
  ProgressBarAndroid,
  ProgressViewIOS,
  Platform,
} from 'react-native';
import { StatCard } from '../../components/StatCard';
import { ListItem } from '../../components/ListItem';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Colors } from '../../utils/colors';
import ParticleWrapper from '../../components/effects/ParticleWrapper';

const TouchableOpacity = (props) => {
  const { particleCount = 20, size = "small", colors, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNTouchableOpacity {...rest} />
    </ParticleWrapper>
  );
};


export function StudentDashboardScreen({ navigation }) {
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();
  const [progressValue] = useState(0.78);
  const [attendanceValue] = useState(0.92);

  const [streakInfo] = useState({
    current: 7,
    best: 15,
    totalDays: 45,
  });

  const [todayClasses] = useState([
    {
      status: 'LIVE',
      subject: 'Mathematics',
      time: '5:00 PM',
      teacher: 'B. Preetha',
      students: 44,
    },
  ]);

  const [examScores] = useState([
    {
      title: 'Math - Week Test 1',
      score: '88/100',
      grade: 'A+',
      teacher: 'By teacher 2',
    },
    {
      title: 'English - Chapter 5 Quiz',
      score: '78/100',
      grade: 'A',
      teacher: 'By teacher 1',
    },
  ]);

  const [topPerformers] = useState([
    { rank: 1, name: 'Gaurav Kumar Singh', score: '88%', grade: 'Grade 6' },
    { rank: 2, name: 'Priya Singh', score: '85%', grade: 'Grade 7' },
    { rank: 3, name: 'Arun Raj', score: '82%', grade: 'Grade 8' },
  ]);

  const [materials] = useState([
    { icon: '📄', title: 'Chapter 5 - Quadratic Equations', size: '2.5 MB' },
    { icon: '📊', title: 'PPT - Introduction to AI', size: '5.2 MB' },
    { icon: '🎥', title: 'Derivatives Explanation', size: '45 MB' },
  ]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView onScroll={onTabBarScroll} scrollEventThrottle={16} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Rahul Kumar</Text>
            <Text style={styles.headerSubtitle}>Grade 5 • CBSE</Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconButton}>
              <Text style={styles.headerIcon}>🎯</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Text style={styles.headerIcon}>⭐</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Welcome Card */}
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeText}>🎊 Welcome back Rahul!</Text>
          <Text style={styles.streakText}>🔥 You have {streakInfo.current} day streak! Keep it up!</Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <Text style={styles.progressLabel}>📚 Study Progress: 78%</Text>
          {Platform.OS === 'android' ? (
            <ProgressBarAndroid
              styleAttr="Horizontal"
              color={Colors.hotPink}
              progress={progressValue}
              style={styles.progressBar}
            />
          ) : (
            <ProgressViewIOS
              progress={progressValue}
              progressTintColor={Colors.hotPink}
              style={styles.progressBar}
            />
          )}
        </View>

        {/* Stat Cards */}
        <View style={styles.statGrid}>
          <StatCard
            icon="🥇"
            label="Rank in Class"
            amount="#5"
            change="Out of 25"
            color="pink"
          />
          <StatCard
            icon="📝"
            label="Pending Assignments"
            amount="3"
            change="Get them done!"
            color="teal"
          />
          <StatCard
            icon="🔥"
            label="Day Streak"
            amount={streakInfo.current}
            change="Keep going!"
            color="pink"
          />
          <StatCard
            icon="📅"
            label="Total Days"
            amount={streakInfo.totalDays}
            change="This month"
            color="teal"
          />
        </View>

        {/* Today's Classes */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>🔴 Today's Classes</Text>
          {todayClasses.map((cls, index) => (
            <View key={`class-${index}`} style={styles.classCard}>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>🔴 LIVE</Text>
              </View>
              <Text style={styles.className}>{cls.subject}</Text>
              <Text style={styles.classInfo}>
                👨‍🏫 {cls.teacher} • 👥 {cls.students} students
              </Text>
              <Text style={styles.classTime}>{cls.time}</Text>
              <PrimaryButton
                title="🔴 JOIN NOW"
                onPress={() => {}}
              />
            </View>
          ))}
          <TouchableOpacity style={styles.viewMoreButton}>
            <Text style={styles.viewMoreText}>See All Classes →</Text>
          </TouchableOpacity>
        </View>

        {/* Exam Scores */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>📈 Recent Exam Scores</Text>
          {examScores.map((exam, index) => (
            <ListItem
              key={`exam-${index}`}
              icon="📊"
              title={exam.title}
              subtitle={exam.grade}
              metadata={`${exam.score} • ${exam.teacher}`}
              actions={[
                { icon: '👁️', onPress: () => {} },
              ]}
            />
          ))}
          <TouchableOpacity style={styles.viewMoreButton}>
            <Text style={styles.viewMoreText}>View All Scores →</Text>
          </TouchableOpacity>
        </View>

        {/* Top Performers */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>🌟 Weekly Top Performers</Text>
          <View style={styles.rankersCard}>
            {topPerformers.map((performer) => (
              <ListItem
                key={`performer-${performer.rank}`}
                icon={['🥇', '🥈', '🥉'][performer.rank - 1]}
                title={performer.name}
                subtitle={performer.grade}
                metadata={`Score: ${performer.score}`}
              />
            ))}
          </View>
          <TouchableOpacity style={styles.viewMoreButton}>
            <Text style={styles.viewMoreText}>See Full Leaderboard →</Text>
          </TouchableOpacity>
        </View>

        {/* Unlocked Materials */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>📚 Unlocked Materials</Text>
          {materials.map((material, index) => (
            <ListItem
              key={`material-${index}`}
              icon={material.icon}
              title={material.title}
              subtitle={material.size}
              actions={[
                { icon: '👁️', onPress: () => {} },
                { icon: '📥', onPress: () => {} },
              ]}
            />
          ))}
          <TouchableOpacity style={styles.viewMoreButton}>
            <Text style={styles.viewMoreText}>Browse All Materials →</Text>
          </TouchableOpacity>
        </View>

        {/* Fees Status */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>💳 Fees Status</Text>
          <View style={styles.feesCard}>
            <ListItem
              icon="✅"
              title="April 2024: ₹5,000"
              subtitle="Paid on 05-April"
            />
            <ListItem
              icon="⏳"
              title="March 2024: ₹3,000"
              subtitle="₹2,000 pending"
            />
          </View>
          <TouchableOpacity style={styles.viewMoreButton}>
            <Text style={styles.viewMoreText}>View Fee Details →</Text>
          </TouchableOpacity>
        </View>

        {/* Attendance */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>📅 Attendance: 92%</Text>
          {Platform.OS === 'android' ? (
            <ProgressBarAndroid
              styleAttr="Horizontal"
              color={Colors.teal}
              progress={attendanceValue}
              style={styles.attendanceBar}
            />
          ) : (
            <ProgressViewIOS
              progress={attendanceValue}
              progressTintColor={Colors.teal}
              style={styles.attendanceBar}
            />
          )}
          <Text style={styles.attendanceText}>
            23 out of 25 classes attended
          </Text>
          <TouchableOpacity style={styles.viewMoreButton}>
            <Text style={styles.viewMoreText}>View Attendance Details →</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.offWhite,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.navy,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.gray,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    paddingHorizontal: 8,
  },
  headerIcon: {
    fontSize: 18,
  },
  welcomeCard: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: Colors.palePink,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.hotPink,
  },
  welcomeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.navy,
    marginBottom: 4,
  },
  streakText: {
    fontSize: 13,
    color: Colors.navy,
  },
  progressSection: {
    marginHorizontal: 16,
    marginVertical: 12,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.navy,
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  attendanceBar: {
    height: 12,
    borderRadius: 6,
    marginHorizontal: 16,
    marginVertical: 12,
  },
  attendanceText: {
    fontSize: 12,
    color: Colors.gray,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    marginVertical: 8,
  },
  sectionContainer: {
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.navy,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  classCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.red,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: Colors.red,
    marginBottom: 8,
  },
  statusText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  className: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.navy,
    marginBottom: 4,
  },
  classInfo: {
    fontSize: 12,
    color: Colors.gray,
    marginBottom: 2,
  },
  classTime: {
    fontSize: 11,
    color: Colors.gray,
    marginBottom: 12,
  },
  rankersCard: {
    marginHorizontal: 16,
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: 'hidden',
  },
  feesCard: {
    marginHorizontal: 16,
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: 'hidden',
  },
  viewMoreButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  viewMoreText: {
    color: Colors.hotPink,
    fontSize: 13,
    fontWeight: '600',
  },
});

export default StudentDashboardScreen;
