import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { Colors } from '../utils/colors';
import { Shadows } from '../utils/theme';
import { useBottomTabBarStyle } from './useBottomTabBarStyle';

import DashboardScreen from '../screens/student/DashboardScreen';
import ClassesScreen from '../screens/student/ClassesScreen';
import MaterialsScreen from '../screens/student/MaterialsScreen';
import ChatListScreen from '../screens/student/ChatListScreen';
import ChatRoomScreen from '../screens/student/ChatRoomScreen';
import ProfileScreen from '../screens/student/ProfileScreen';
import StudentLeaveScreen from '../screens/student/LeaveScreen';
import ExamScoresScreen from '../screens/student/ExamScoresScreen';
import AttendanceScreen from '../screens/student/AttendanceScreen';
import FeeStatusScreen from '../screens/student/FeeStatusScreen';
import DiscussScenarioScreen from '../screens/student/DiscussScenarioScreen';
import NotificationsScreen from '../screens/common/NotificationsScreen';
import SettingsScreen from '../screens/common/SettingsScreen';
import ClassDetailScreen from '../screens/student/ClassDetailScreen';
import MaterialDetailScreen from '../screens/student/MaterialDetailScreen';
import DownloadCenterScreen from '../screens/common/DownloadCenterScreen';
import NcertViewerScreen from '../screens/common/NcertViewerScreen';
import DocumentViewerScreen from '../screens/common/DocumentViewerScreen';
import HeaderActions from '../components/HeaderActions';
const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// ─── Stack Navigators for each tab ─────────────────────────────────────────────

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, headerRight: () => <HeaderActions /> }}>
      <Stack.Screen name="StudentDashboard" component={DashboardScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: true, title: 'Notifications', headerStyle: { elevation: 0 } }} />
      <Stack.Screen name="ClassDetail" component={ClassDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Classes" component={ClassesScreen} options={{ title: 'Classes', headerStyle: { elevation: 0 } }} />
      <Stack.Screen name="Materials" component={MaterialsScreen} options={{ title: 'Study Materials', headerStyle: { elevation: 0 } }} />
      <Stack.Screen name="MaterialDetail" component={MaterialDetailScreen} options={{ title: 'Material', headerStyle: { elevation: 0 } }} />
      <Stack.Screen name="Discuss" component={DiscussScenarioScreen} options={{ title: 'Discuss', headerStyle: { elevation: 0 } }} />
      <Stack.Screen name="Attendance" component={AttendanceScreen} options={{ title: 'Attendance', headerStyle: { elevation: 0 } }} />
      <Stack.Screen name="Leave" component={StudentLeaveScreen} options={{ title: 'Leave Application', headerStyle: { elevation: 0 } }} />
      <Stack.Screen name="Fees" component={FeeStatusScreen} options={{ title: 'Fees & Payments', headerStyle: { elevation: 0 } }} />
      <Stack.Screen name="ExamScores" component={ExamScoresScreen} options={{ title: 'Exam Scores', headerStyle: { elevation: 0 } }} />
      <Stack.Screen name="DocumentViewer" component={DocumentViewerScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function ClassesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerRight: () => <HeaderActions /> }}>
      <Stack.Screen name="ClassesList" component={ClassesScreen} options={{ title: 'Classes', headerStyle: { elevation: 0 } }} />
      <Stack.Screen name="ClassDetail" component={ClassDetailScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function DownloadsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerRight: () => <HeaderActions /> }}>
      <Stack.Screen name="DownloadsMain" component={DownloadCenterScreen} options={{ title: 'Downloads', headerStyle: { elevation: 0 } }} />
      <Stack.Screen name="NcertViewer" component={NcertViewerScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MaterialDetail" component={MaterialDetailScreen} options={{ title: 'Material', headerStyle: { elevation: 0 } }} />
      <Stack.Screen name="DocumentViewer" component={DocumentViewerScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function ChatStack() {
  return (
    <Stack.Navigator screenOptions={{ headerRight: () => <HeaderActions /> }}>
      <Stack.Screen name="ChatList" component={ChatListScreen} options={{ title: 'Messages', headerStyle: { elevation: 0 } }} />
      <Stack.Screen name="ChatRoom" component={ChatRoomScreen} options={({ route }) => ({
        title: route.params?.otherUser?.displayName || route.params?.otherUser?.name || 'Chat',
      })} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerRight: () => <HeaderActions /> }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ExamScores" component={ExamScoresScreen} options={{ title: 'Exam Scores', headerStyle: { elevation: 0 } }} />
      <Stack.Screen name="Attendance" component={AttendanceScreen} options={{ title: 'Attendance', headerStyle: { elevation: 0 } }} />
      <Stack.Screen name="Leave" component={StudentLeaveScreen} options={{ title: 'Leave Application', headerStyle: { elevation: 0 } }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications', headerStyle: { elevation: 0 } }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings', headerStyle: { elevation: 0 } }} />
    </Stack.Navigator>
  );
}

// ─── Tab Navigator ──────────────────────────────────────────────────────────────

export default function StudentNavigator() {
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
            case 'Classes': iconName = focused ? 'play-circle' : 'play-circle-outline'; break;
            case 'Downloads': iconName = focused ? 'download' : 'download-outline'; break;
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
      <Tab.Screen name="Classes" component={ClassesStack} options={{ tabBarLabel: 'Classes' }} />
      <Tab.Screen name="Downloads" component={DownloadsStack} options={{ tabBarLabel: 'Downloads' }} />
      <Tab.Screen name="Chat" component={ChatStack} options={{ tabBarLabel: 'Chat', tabBarBadge: unreadCount > 0 ? unreadCount : undefined }} />
      <Tab.Screen name="Profile" component={ProfileStack} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}
