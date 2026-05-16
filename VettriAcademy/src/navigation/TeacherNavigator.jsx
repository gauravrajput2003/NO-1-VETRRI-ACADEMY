import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { Colors } from '../utils/colors';
import { Shadows } from '../utils/theme';
import { useBottomTabBarStyle } from './useBottomTabBarStyle';

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
      <Stack.Screen name="TeacherDashboard" component={TeacherDashboard} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: true, title: 'Notifications' }} />
      <Stack.Screen name="LiveClass" component={LiveClassScreen} options={{ headerShown: false, title: 'Live Class' }} />
      <Stack.Screen name="LiveMonitor" component={LiveMonitorScreen} options={{ headerShown: true, title: 'Live Monitor' }} />
      <Stack.Screen name="TeacherMaterials" component={TeacherMaterialsScreen} options={{ headerShown: true, title: 'Manage Materials' }} />
      <Stack.Screen name="Students" component={StudentsScreen} options={{ headerShown: true, title: 'My Students' }} />
      <Stack.Screen name="Leave" component={LeaveScreen} options={{ headerShown: true, title: 'Leave' }} />
      <Stack.Screen name="Grades" component={GradesScreen} options={{ headerShown: true, title: 'Grade Entry' }} />
      <Stack.Screen name="MonthlyReport" component={MonthlyReportScreen} options={{ headerShown: true, title: 'Monthly Report' }} />
      <Stack.Screen name="Downloads" component={DownloadCenterScreen} options={{ headerShown: true, title: 'Download Center' }} />
      <Stack.Screen name="NcertViewer" component={NcertViewerScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DocumentViewer" component={DocumentViewerScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function UsersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerRight: () => <HeaderActions /> }}>
      <Stack.Screen name="TeacherStudents" component={StudentsScreen} options={{ title: 'My Students' }} />
      <Stack.Screen name="LiveMonitor" component={LiveMonitorScreen} options={{ title: 'Live Monitor' }} />
    </Stack.Navigator>
  );
}

function ScheduleStack() {
  return (
    <Stack.Navigator screenOptions={{ headerRight: () => <HeaderActions /> }}>
      <Stack.Screen name="ClassSchedulerMain" component={ClassSchedulerScreen} options={{ title: 'Class Scheduler' }} />
      <Stack.Screen name="LiveClassMain" component={LiveClassScreen} options={{ headerShown: false, title: 'Go Live' }} />
      <Stack.Screen name="LiveMonitor" component={LiveMonitorScreen} options={{ title: 'Live Monitor' }} />
    </Stack.Navigator>
  );
}

function TrainingStack() {
  return (
    <Stack.Navigator screenOptions={{ headerRight: () => <HeaderActions /> }}>
      <Stack.Screen name="TrainingMain" component={TrainingVideosScreen} options={{ title: 'Training' }} />
      <Stack.Screen name="VideoPlayer" component={VideoPlayerScreen} options={{ headerShown: false }} />
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
      <Stack.Screen name="TeacherMaterials" component={TeacherMaterialsScreen} options={{ title: 'Manage Materials' }} />
      <Stack.Screen name="MonthlyReport" component={MonthlyReportScreen} options={{ title: 'Monthly Report' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Stack.Navigator>
  );
}

// ─── Tab Navigator ──────────────────────────────────────────────────────────────

export default function TeacherNavigator() {
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
            case 'Home': iconName = focused ? 'home' : 'home-outline'; break;
            case 'Schedule': iconName = focused ? 'calendar' : 'calendar-outline'; break;
            case 'Training': iconName = focused ? 'videocam' : 'videocam-outline'; break;
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
      <Tab.Screen name="Schedule" component={ScheduleStack} options={{ tabBarLabel: 'Schedule' }} />
      <Tab.Screen name="Training" component={TrainingStack} options={{ tabBarLabel: 'Training' }} />
      <Tab.Screen name="Chat" component={ChatStack} options={{ tabBarLabel: 'Chat', tabBarBadge: unreadCount > 0 ? unreadCount : undefined }} />
      <Tab.Screen name="Profile" component={ProfileStack} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}
