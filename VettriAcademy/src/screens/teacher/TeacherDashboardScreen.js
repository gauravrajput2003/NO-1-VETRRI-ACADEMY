import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { StatCard } from '../../components/StatCard';
import { ListItem } from '../../components/ListItem';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Colors } from '../../utils/colors';

export function TeacherDashboardScreen({ navigation }) {
  const [liveClasses] = useState([
    {
      status: 'SCHEDULED',
      title: 'Math Chapter 5',
      teacher: 'B. Preetha',
      students: 2,
      time: '1 Jan 2002 • 11:34 PM',
      duration: '60min',
    },
    {
      status: 'LIVE',
      title: 'CSE Batch',
      teacher: 'B. Preetha',
      students: 2,
      joined: 2,
    },
  ]);

  const [myStudents] = useState([
    { name: 'Sunny', grade: 'Grade 9 • CBSE', score: '92%' },
    { name: 'Test Student', grade: 'Grade 10 • State Board', score: '78%' },
    { name: 'Rahul', grade: 'Grade 5 • CBSE', score: '88%' },
  ]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>B. Preetha</Text>
            <Text style={styles.headerSubtitle}>Mathematics Teacher</Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconButton}>
              <Text style={styles.headerIcon}>⭐ 4.8</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Text style={styles.headerIcon}>🔔</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stat Cards */}
        <View style={styles.statGrid}>
          <StatCard
            icon="👥"
            label="Total Students"
            amount="45"
            change="Enrolled"
            color="pink"
          />
          <StatCard
            icon="📅"
            label="Classes Today"
            amount="3"
            change="Scheduled"
            color="teal"
          />
          <StatCard
            icon="💰"
            label="Monthly Salary"
            amount="₹28,000"
            change="April"
            color="pink"
          />
          <StatCard
            icon="⭐"
            label="Rating"
            amount="4.8/5.0"
            change="+0.2 this month"
            color="teal"
          />
        </View>

        {/* Live Classes */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>🎬 Live Classes</Text>
          {liveClasses.map((cls, index) => (
            <View key={`class-${index}`} style={styles.classCard}>
              <View style={[
                styles.statusBadge,
                { backgroundColor: cls.status === 'LIVE' ? Colors.red : Colors.cyan }
              ]}>
                <Text style={styles.statusText}>{cls.status}</Text>
              </View>
              <Text style={styles.className}>{cls.title}</Text>
              <Text style={styles.classInfo}>
                👤 {cls.teacher} • 👥 {cls.students} students
              </Text>
              <Text style={styles.classTime}>
                {cls.time || `${cls.joined} joined`}
              </Text>
              <PrimaryButton
                title={cls.status === 'LIVE' ? '⏹️ END CLASS' : '🔴 GO LIVE'}
                onPress={() => {}}
              />
            </View>
          ))}
        </View>

        {/* My Students */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>📚 My Students</Text>
          {myStudents.map((student, index) => (
            <ListItem
              key={`student-${index}`}
              icon="👨‍🎓"
              title={student.name}
              subtitle={student.grade}
              metadata={`Score: ${student.score}`}
              actions={[
                { icon: '✏️', onPress: () => {} },
                { icon: '👁️', onPress: () => {} },
              ]}
            />
          ))}
          <TouchableOpacity style={styles.viewMoreButton}>
            <Text style={styles.viewMoreText}>View All Students →</Text>
          </TouchableOpacity>
        </View>

        {/* Salary Information */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>💰 Salary Information</Text>
          <View style={styles.salaryCard}>
            <View style={styles.salaryRow}>
              <Text style={styles.salaryLabel}>April 2024:</Text>
              <Text style={styles.salaryStatus}>✅ PAID</Text>
            </View>
            <Text style={styles.salaryAmount}>₹26,500</Text>
            <Text style={styles.salaryDate}>05-April-2024 • UPI</Text>
            <PrimaryButton
              title="📥 Download Slip"
              onPress={() => {}}
            />
            <TouchableOpacity style={styles.viewMoreButton}>
              <Text style={styles.viewMoreText}>View Salary History →</Text>
            </TouchableOpacity>
          </View>
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
    gap: 12,
  },
  iconButton: {
    paddingHorizontal: 8,
  },
  headerIcon: {
    fontSize: 16,
    fontWeight: '600',
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
    borderLeftColor: Colors.hotPink,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
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
  salaryCard: {
    marginHorizontal: 16,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
  },
  salaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  salaryLabel: {
    fontSize: 13,
    color: Colors.gray,
  },
  salaryStatus: {
    fontSize: 13,
    fontWeight: '600',
  },
  salaryAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.hotPink,
    marginVertical: 8,
  },
  salaryDate: {
    fontSize: 11,
    color: Colors.gray,
    marginBottom: 12,
  },
  viewMoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  viewMoreText: {
    color: Colors.hotPink,
    fontSize: 13,
    fontWeight: '600',
  },
});

export default TeacherDashboardScreen;
