import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';

// Admin Screens
import AdminDashboard from '../screens/admin/DashboardScreen';
import ManageStudentsScreen from '../screens/admin/ManageStudentsScreen';
import ManageTeachersScreen from '../screens/admin/ManageTeachersScreen';
import FeeManagementScreen from '../screens/admin/FeeManagementScreen';
import StudentFeeHistoryScreen from '../screens/admin/StudentFeeHistoryScreen';
import SalaryManagementScreen from '../screens/admin/SalaryManagementScreen';
import AdminLeavesScreen from '../screens/admin/AdminLeavesScreen';
import AnnouncementsScreen from '../screens/admin/AnnouncementsScreen';
import CourseManagementScreen from '../screens/admin/CourseManagementScreen';
import LiveMonitorScreen from '../screens/admin/LiveMonitorScreen';
import ClassSchedulerScreen from '../screens/admin/ClassSchedulerScreen';
import EnquiriesScreen from '../screens/admin/EnquiriesScreen';
import AdminMaterialsScreen from '../screens/admin/AdminMaterialsScreen';
import AdminTrainingVideosScreen from '../screens/admin/AdminTrainingVideosScreen';
import StudentMarksScreen from '../screens/admin/StudentMarksScreen';
import MonthlyTopRankersScreen from '../screens/admin/MonthlyTopRankersScreen';

import NotificationsScreen from '../screens/common/NotificationsScreen';
import SettingsScreen from '../screens/common/SettingsScreen';
import ProfileScreen from '../screens/student/ProfileScreen';
import DownloadCenterScreen from '../screens/common/DownloadCenterScreen';
import NcertViewerScreen from '../screens/common/NcertViewerScreen';
import DocumentViewerScreen from '../screens/common/DocumentViewerScreen';
import PdfViewerScreen from '../screens/common/PdfViewerScreen';
import DiscussScenarioScreen from '../screens/student/DiscussScenarioScreen';
import DoubtThreadScreen from '../screens/common/DoubtThreadScreen';
import HeaderActions from '../components/HeaderActions';
import CustomTabBar from '../components/CustomTabBar';
import { TabBarVisibilityProvider } from '../context/TabBarVisibilityContext';
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const PINK = '#FF4FA3';

// ─── Stack Navigators ───────────────────────────────────────────────────────────

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, headerRight: () => <HeaderActions /> }}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: true, title: 'Notifications' }} />
      <Stack.Screen name="ManageStudents" component={ManageStudentsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ManageTeachers" component={ManageTeachersScreen} options={{ headerShown: false }} />
      <Stack.Screen name="FeeManagement" component={FeeManagementScreen} options={{ headerShown: true, title: 'Fees' }} />
      <Stack.Screen name="StudentFeeHistory" component={StudentFeeHistoryScreen} options={{ headerShown: true, title: 'Fee History' }} />
      <Stack.Screen name="SalaryManagement" component={SalaryManagementScreen} options={{ headerShown: true, title: 'Salaries' }} />
      <Stack.Screen name="AdminLeaves" component={AdminLeavesScreen} options={{ headerShown: true, title: 'Leaves' }} />
      <Stack.Screen name="Announcements" component={AnnouncementsScreen} options={{ headerShown: true, title: 'Announcements' }} />
      <Stack.Screen name="CourseManagement" component={CourseManagementScreen} options={{ headerShown: true, title: 'Courses' }} />
      <Stack.Screen name="LiveMonitor" component={LiveMonitorScreen} options={{ headerShown: true, title: 'Live Monitor' }} />
      <Stack.Screen name="ClassScheduler" component={ClassSchedulerScreen} options={{ headerShown: true, title: 'Scheduler' }} />
      <Stack.Screen name="Enquiries" component={EnquiriesScreen} options={{ headerShown: true, title: 'Enquiries' }} />
      <Stack.Screen name="AdminMaterials" component={AdminMaterialsScreen} options={{ headerShown: true, title: 'Manage Materials' }} />
      <Stack.Screen name="AdminTrainingVideos" component={AdminTrainingVideosScreen} options={{ headerShown: false }} />
      <Stack.Screen name="StudentMarks" component={StudentMarksScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MonthlyTopRankers" component={MonthlyTopRankersScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DoubtCenter" component={DiscussScenarioScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DoubtDetail" component={DoubtThreadScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Downloads" component={DownloadCenterScreen} options={{ headerShown: true, title: 'Download Center' }} />
      <Stack.Screen name="NcertViewer" component={NcertViewerScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PdfViewer" component={PdfViewerScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DocumentViewer" component={DocumentViewerScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function ManageStack() {
  return (
    <Stack.Navigator screenOptions={{ headerRight: () => <HeaderActions /> }}>
      <Stack.Screen name="ManageStudentsMain" component={ManageStudentsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ManageTeachersMain" component={ManageTeachersScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function ScheduleStack() {
  return (
    <Stack.Navigator screenOptions={{ headerRight: () => <HeaderActions /> }}>
      <Stack.Screen name="ClassSchedulerMain" component={ClassSchedulerScreen} options={{ title: 'Class Scheduler' }} />
      <Stack.Screen name="LiveMonitorMain" component={LiveMonitorScreen} options={{ title: 'Live Monitor' }} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerRight: () => <HeaderActions /> }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      <Stack.Screen name="DoubtCenter" component={DiscussScenarioScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DoubtDetail" component={DoubtThreadScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

// ─── Tab icon definitions ────────────────────────────────────────────────────
const ADMIN_TAB_CFG = {
  Home:     { active: 'home',     inactive: 'home-outline'     },
  Users:    { active: 'people',   inactive: 'people-outline'   },
  Schedule: { active: 'calendar', inactive: 'calendar-outline' },
  Salary:   { active: 'cash',     inactive: 'cash-outline'     },
  Profile:  { active: 'person',   inactive: 'person-outline'   },
};

// ─── Tab Navigator ──────────────────────────────────────────────────────────────

export default function AdminNavigator() {
  return (
    <TabBarVisibilityProvider>
      <Tab.Navigator
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <CustomTabBar {...props} iconConfig={ADMIN_TAB_CFG} />}
      >
        <Tab.Screen name="Home" component={HomeStack} />
        <Tab.Screen name="Users" component={ManageStack} />
        <Tab.Screen name="Schedule" component={ScheduleStack} />
        <Tab.Screen name="Salary" component={SalaryManagementScreen} />
        <Tab.Screen name="Profile" component={ProfileStack} />
      </Tab.Navigator>
    </TabBarVisibilityProvider>
  );
}
