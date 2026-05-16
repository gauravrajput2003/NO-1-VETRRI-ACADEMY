import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StatCard } from '../../components/StatCard';
import { MgmtCard } from '../../components/MgmtCard';
import { ListItem } from '../../components/ListItem';
import { Colors } from '../../utils/colors';

export function AdminDashboardScreen({ navigation }) {
  const [stats, setStats] = useState({
    revenue: '₹3,36,000',
    paidStudents: '₹2,80,000',
    pendingFees: '₹56,000',
    absentStudents: 15,
  });

  const [managementCards] = useState([
    { icon: '📚', title: 'Students', number: '1,250' },
    { icon: '👥', title: 'Teachers', number: '45' },
    { icon: '📅', title: 'Classes', number: '256' },
    { icon: '💰', title: 'Revenue', number: '3.3M' },
    { icon: '📚', title: 'Courses', number: '8' },
    { icon: '📢', title: 'Announcements', number: '12' },
    { icon: '📡', title: 'Live Classes', number: '3' },
    { icon: '✈️', title: 'Leaves', number: '5' },
  ]);

  const [topRankers] = useState([
    { rank: 1, name: 'Gaurav Kumar Singh', score: '88%', grade: 'Grade 6' },
    { rank: 2, name: 'Priya Singh', score: '85%', grade: 'Grade 7' },
    { rank: 3, name: 'Arun Raj', score: '82%', grade: 'Grade 8' },
  ]);

  const [alerts] = useState([
    { icon: '💳', text: '5 students with pending fees' },
    { icon: '✈️', text: '3 leave applications pending' },
    { icon: '📧', text: '12 new inquiries to respond' },
    { icon: '📅', text: '2 classes need scheduling' },
  ]);

  useFocusEffect(
    React.useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  const fetchDashboardData = async () => {
    try {
      console.log('Fetching admin dashboard data...');
    } catch (error) {
      console.log('Error fetching dashboard:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerLabel}>Admin Panel</Text>
            <Text style={styles.headerTitle}>Super Admin</Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <Text style={styles.headerIcon}>👤</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Text style={styles.headerIcon}>⭐</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => navigation.navigate('Chat')}
            >
              <Text style={styles.headerIcon}>🔔</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stat Cards - 2 per row */}
        <View style={styles.statGrid}>
          <StatCard
            icon="📈"
            label="This Month Revenue"
            amount={stats.revenue}
            change="+12%"
            color="pink"
          />
          <StatCard
            icon="💳"
            label="Paid Students"
            amount={stats.paidStudents}
            change="+8%"
            color="teal"
          />
          <StatCard
            icon="⚠️"
            label="Pending Fees"
            amount={stats.pendingFees}
            change="Urgent"
            color="pink"
          />
          <StatCard
            icon="❌"
            label="Absent Students"
            amount={stats.absentStudents}
            change="This Month"
            color="teal"
          />
        </View>

        {/* Management Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Management</Text>
          <View style={styles.mgmtGrid}>
            <FlatList
              data={managementCards}
              numColumns={2}
              scrollEnabled={false}
              keyExtractor={(item, index) => `mgmt-${index}`}
              renderItem={({ item }) => (
                <MgmtCard
                  icon={item.icon}
                  title={item.title}
                  number={item.number}
                  onPress={() => navigation.navigate('Users', { tab: item.title })}
                />
              )}
            />
          </View>
        </View>

        {/* Top Rankers Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>🥇 Monthly Top Rankers</Text>
          <View style={styles.rankersCard}>
            {topRankers.map((ranker) => (
              <ListItem
                key={`ranker-${ranker.rank}`}
                icon={['🥇', '🥈', '🥉'][ranker.rank - 1]}
                title={ranker.name}
                subtitle={ranker.grade}
                metadata={`Score: ${ranker.score}`}
              />
            ))}
            <TouchableOpacity style={styles.viewMoreButton}>
              <Text style={styles.viewMoreText}>View More →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Alerts Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>⚠️ Pending Attention</Text>
          <View style={styles.alertsCard}>
            {alerts.map((alert, index) => (
              <ListItem
                key={`alert-${index}`}
                icon={alert.icon}
                title={alert.text}
                subtitle="Action Required"
              />
            ))}
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
  headerLabel: {
    fontSize: 12,
    color: Colors.gray,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.navy,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 8,
  },
  headerIcon: {
    fontSize: 20,
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
  mgmtGrid: {
    paddingHorizontal: 8,
  },
  rankersCard: {
    marginHorizontal: 16,
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: 'hidden',
  },
  alertsCard: {
    marginHorizontal: 16,
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: 'hidden',
  },
  viewMoreButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  viewMoreText: {
    color: Colors.hotPink,
    fontSize: 13,
    fontWeight: '600',
  },
});

export default AdminDashboardScreen;
