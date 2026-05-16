import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { Colors } from '../utils/colors';
import { Shadows } from '../utils/theme';
import { useBottomTabBarStyle } from './useBottomTabBarStyle';

// Admin Screens
import AdminDashboard from '../screens/admin/DashboardScreen';
import ManageStudentsScreen from '../screens/admin/ManageStudentsScreen';
import ManageTeachersScreen from '../screens/admin/ManageTeachersScreen';
import FeeManagementScreen from '../screens/admin/FeeManagementScreen';
import SalaryManagementScreen from '../screens/admin/SalaryManagementScreen';
import AdminLeavesScreen from '../screens/admin/AdminLeavesScreen';
import AnnouncementsScreen from '../screens/admin/AnnouncementsScreen';
import CourseManagementScreen from '../screens/admin/CourseManagementScreen';
import LiveMonitorScreen from '../screens/admin/LiveMonitorScreen';
import ClassSchedulerScreen from '../screens/admin/ClassSchedulerScreen';
import EnquiriesScreen from '../screens/admin/EnquiriesScreen';
import AdminMaterialsScreen from '../screens/admin/AdminMaterialsScreen';
import AdminTrainingVideosScreen from '../screens/admin/AdminTrainingVideosScreen';

// Shared Screens
import ChatListScreen from '../screens/student/ChatListScreen';
import ChatRoomScreen from '../screens/student/ChatRoomScreen';
import NotificationsScreen from '../screens/common/NotificationsScreen';
import SettingsScreen from '../screens/common/SettingsScreen';
import ProfileScreen from '../screens/student/ProfileScreen';
import DownloadCenterScreen from '../screens/common/DownloadCenterScreen';
import NcertViewerScreen from '../screens/common/NcertViewerScreen';
import DocumentViewerScreen from '../screens/common/DocumentViewerScreen';
import HeaderActions from '../components/HeaderActions';
const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// ─── Stack Navigators ───────────────────────────────────────────────────────────

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, headerRight: () => <HeaderActions /> }}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: true, title: 'Notifications' }} />
      <Stack.Screen name="ManageStudents" component={ManageStudentsScreen} options={{ headerShown: true, title: 'Students' }} />
      <Stack.Screen name="ManageTeachers" component={ManageTeachersScreen} options={{ headerShown: true, title: 'Teachers' }} />
      <Stack.Screen name="FeeManagement" component={FeeManagementScreen} options={{ headerShown: true, title: 'Fees' }} />
      <Stack.Screen name="SalaryManagement" component={SalaryManagementScreen} options={{ headerShown: true, title: 'Salaries' }} />
      <Stack.Screen name="AdminLeaves" component={AdminLeavesScreen} options={{ headerShown: true, title: 'Leaves' }} />
      <Stack.Screen name="Announcements" component={AnnouncementsScreen} options={{ headerShown: true, title: 'Announcements' }} />
      <Stack.Screen name="CourseManagement" component={CourseManagementScreen} options={{ headerShown: true, title: 'Courses' }} />
      <Stack.Screen name="LiveMonitor" component={LiveMonitorScreen} options={{ headerShown: true, title: 'Live Monitor' }} />
      <Stack.Screen name="ClassScheduler" component={ClassSchedulerScreen} options={{ headerShown: true, title: 'Scheduler' }} />
      <Stack.Screen name="Enquiries" component={EnquiriesScreen} options={{ headerShown: true, title: 'Enquiries' }} />
      <Stack.Screen name="AdminMaterials" component={AdminMaterialsScreen} options={{ headerShown: true, title: 'Manage Materials' }} />
      <Stack.Screen name="AdminTrainingVideos" component={AdminTrainingVideosScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Downloads" component={DownloadCenterScreen} options={{ headerShown: true, title: 'Download Center' }} />
      <Stack.Screen name="NcertViewer" component={NcertViewerScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DocumentViewer" component={DocumentViewerScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function ManageStack() {
  return (
    <Stack.Navigator screenOptions={{ headerRight: () => <HeaderActions /> }}>
      <Stack.Screen name="ManageStudentsMain" component={ManageStudentsScreen} options={{ title: 'Students' }} />
      <Stack.Screen name="ManageTeachersMain" component={ManageTeachersScreen} options={{ title: 'Teachers' }} />
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

function ChatStack() {
  return (
    <Stack.Navigator screenOptions={{ headerRight: () => <HeaderActions /> }}>
      <Stack.Screen name="ChatList" component={ChatListScreen} options={{ title: 'Messages' }} />
      <Stack.Screen name="ChatRoom" component={ChatRoomScreen} options={({ route }) => ({ title: route.params?.otherUser?.displayName || route.params?.otherUser?.name || 'Chat' })} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerRight: () => <HeaderActions /> }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Stack.Navigator>
  );
}

// ─── Tab Navigator ──────────────────────────────────────────────────────────────

export default function AdminNavigator() {
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';
  const { unreadCount } = useSelector((s) => s.chat);
  const tabBarStyles = useBottomTabBarStyle({
    backgroundColor: isDark ? Colors.navy : Colors.white,
    shadowStyle: Shadows.light,
  });

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        lazy: false,
        tabBarShowLabel: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          switch (route.name) {
            case 'Home': iconName = focused ? 'grid' : 'grid-outline'; break;
            case 'Users': iconName = focused ? 'people' : 'people-outline'; break;
            case 'Schedule': iconName = focused ? 'calendar' : 'calendar-outline'; break;
            case 'Salary': iconName = focused ? 'cash' : 'cash-outline'; break;
            case 'Chat': iconName = focused ? 'chatbubbles' : 'chatbubbles-outline'; break;
            case 'Profile': iconName = focused ? 'person' : 'person-outline'; break;
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.mediumGray,
        ...tabBarStyles,
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="Users" component={ManageStack} options={{ tabBarLabel: 'Users' }} />
      <Tab.Screen name="Schedule" component={ScheduleStack} options={{ tabBarLabel: 'Schedule' }} />
      <Tab.Screen name="Salary" component={SalaryManagementScreen} options={{ tabBarLabel: 'Salary' }} />
      <Tab.Screen name="Chat" component={ChatStack} options={{ tabBarLabel: 'Chat', tabBarBadge: unreadCount > 0 ? unreadCount : undefined }} />
      <Tab.Screen name="Profile" component={ProfileStack} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}
