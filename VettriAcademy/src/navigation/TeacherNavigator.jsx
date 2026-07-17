import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { Colors } from '../utils/colors';
import { Shadows } from '../utils/theme';
import CustomTabBar from '../components/CustomTabBar';
import { TabBarVisibilityProvider } from '../context/TabBarVisibilityContext';
import { Platform, View, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

// Teacher Screens
import TeacherDashboard from '../screens/teacher/DashboardScreen';
import LiveClassScreen from '../screens/teacher/LiveClassScreen';
import LiveMonitorScreen from '../screens/teacher/LiveMonitorScreen';
import GradesScreen from '../screens/teacher/GradesScreen';
import TeacherMaterialsScreen from '../screens/teacher/TeacherMaterialsScreen';
import StudentsScreen from '../screens/teacher/StudentsScreen';
import LeaveScreen from '../screens/teacher/LeaveScreen';
import MonthlyReportScreen from '../screens/teacher/MonthlyReportScreen';
import SalaryScreen from '../screens/teacher/SalaryScreen';
import ClassSchedulerScreen from '../screens/admin/ClassSchedulerScreen';
import TrainingVideosScreen from '../screens/teacher/TrainingVideosScreen';
import VideoPlayerScreen from '../screens/teacher/VideoPlayerScreen';

import NotificationsScreen from '../screens/common/NotificationsScreen';
import SettingsScreen from '../screens/common/SettingsScreen';
import ProfileScreen from '../screens/student/ProfileScreen';
import DownloadCenterScreen from '../screens/common/DownloadCenterScreen';
import NcertViewerScreen from '../screens/common/NcertViewerScreen';
import DocumentViewerScreen from '../screens/common/DocumentViewerScreen';
import PdfViewerScreen from '../screens/common/PdfViewerScreen';
import PdfAnalyticsScreen from '../screens/teacher/PdfAnalyticsScreen';
import DiscussScenarioScreen from '../screens/student/DiscussScenarioScreen';
import DoubtThreadScreen from '../screens/common/DoubtThreadScreen';
import HeaderActions from '../components/HeaderActions';
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ─── Custom Back Button ────────────────────────────────────────────────────────
const CustomBackButton = () => {
  const navigation = useNavigation();
  return (
    <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 6, marginRight: 12, backgroundColor: 'rgba(255, 79, 163, 0.1)', borderRadius: 20 }}>
      <Ionicons name="arrow-back" size={24} color={Colors.pink} />
    </TouchableOpacity>
  );
};

const HEADER_OPTS = {
  headerStyle: { backgroundColor: '#FFFFFF', elevation: 0, shadowOpacity: 0 },
  headerTintColor: '#1A1A2E',
  headerTitleStyle: { fontWeight: '700', fontSize: 17, color: '#1A1A2E' },
  headerBackVisible: false,
  headerLeft: ({ canGoBack }) => canGoBack ? <CustomBackButton /> : null,
  headerRight: () => <HeaderActions />,
};

// ─── Stack Navigators ───────────────────────────────────────────────────────────

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={HEADER_OPTS}>
      <Stack.Screen name="TeacherDashboard" component={TeacherDashboard} options={{ headerShown: false }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
      <Stack.Screen name="LiveClass" component={LiveClassScreen} options={{ headerShown: false, title: 'Live Class' }} />
      <Stack.Screen name="LiveMonitor" component={LiveMonitorScreen} options={{ title: 'Live Monitor' }} />
      <Stack.Screen name="TeacherMaterials" component={TeacherMaterialsScreen} options={{ title: 'Manage Materials' }} />
      <Stack.Screen name="PdfViewer" component={PdfViewerScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PdfAnalytics" component={PdfAnalyticsScreen} options={{ title: 'PDF Analytics' }} />
      <Stack.Screen name="DoubtCenter" component={DiscussScenarioScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DoubtDetail" component={DoubtThreadScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Students" component={StudentsScreen} options={{ title: 'My Students' }} />
      <Stack.Screen name="Leave" component={LeaveScreen} options={{ title: 'Leave' }} />
      <Stack.Screen name="Grades" component={GradesScreen} options={{ title: 'Grade Entry' }} />
      <Stack.Screen name="Salary" component={SalaryScreen} options={{ title: 'Salary' }} />
      <Stack.Screen name="MonthlyReport" component={MonthlyReportScreen} options={{ title: 'Monthly Report' }} />
      <Stack.Screen name="Downloads" component={DownloadCenterScreen} options={{ title: 'Download Center' }} />
      <Stack.Screen name="NcertViewer" component={NcertViewerScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DocumentViewer" component={DocumentViewerScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function UsersStack() {
  return (
    <Stack.Navigator screenOptions={HEADER_OPTS}>
      <Stack.Screen name="TeacherStudents" component={StudentsScreen} options={{ title: 'My Students' }} />
      <Stack.Screen name="LiveMonitor" component={LiveMonitorScreen} options={{ title: 'Live Monitor' }} />
    </Stack.Navigator>
  );
}

function ScheduleStack() {
  return (
    <Stack.Navigator screenOptions={HEADER_OPTS}>
      <Stack.Screen name="ClassSchedulerMain" component={ClassSchedulerScreen} options={{ title: 'Class Scheduler' }} />
      <Stack.Screen name="LiveClassMain" component={LiveClassScreen} options={{ headerShown: false, title: 'Go Live' }} />
      <Stack.Screen name="LiveMonitor" component={LiveMonitorScreen} options={{ title: 'Live Monitor' }} />
    </Stack.Navigator>
  );
}

function TrainingStack() {
  return (
    <Stack.Navigator screenOptions={HEADER_OPTS}>
      <Stack.Screen name="TrainingMain" component={TrainingVideosScreen} options={{ title: 'Training' }} />
      <Stack.Screen name="VideoPlayer" component={VideoPlayerScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={HEADER_OPTS}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="TeacherMaterials" component={TeacherMaterialsScreen} options={{ title: 'Manage Materials' }} />
      <Stack.Screen name="MonthlyReport" component={MonthlyReportScreen} options={{ title: 'Monthly Report' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      <Stack.Screen name="DoubtCenter" component={DiscussScenarioScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DoubtDetail" component={DoubtThreadScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

// ─── Tab icon definitions ────────────────────────────────────────────────────
const TEACHER_TAB_CFG = {
  Home:     { active: 'home',     inactive: 'home-outline'     },
  Schedule: { active: 'calendar', inactive: 'calendar-outline' },
  Training: { active: 'videocam', inactive: 'videocam-outline' },
  Profile:  { active: 'person',   inactive: 'person-outline'   },
};

// ─── Tab Navigator ──────────────────────────────────────────────────────────────

export default function TeacherNavigator() {
  return (
    <TabBarVisibilityProvider>
      <Tab.Navigator
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <CustomTabBar {...props} iconConfig={TEACHER_TAB_CFG} />}
      >
        <Tab.Screen name="Home" component={HomeStack} />
        <Tab.Screen name="Schedule" component={ScheduleStack} />
        <Tab.Screen name="Training" component={TrainingStack} />
        <Tab.Screen name="Profile" component={ProfileStack} />
      </Tab.Navigator>
    </TabBarVisibilityProvider>
  );
}
