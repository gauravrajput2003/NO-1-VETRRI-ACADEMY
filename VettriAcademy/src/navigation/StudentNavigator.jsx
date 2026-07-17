import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { TouchableOpacity } from 'react-native';
import CustomTabBar from '../components/CustomTabBar';
import { TabBarVisibilityProvider } from '../context/TabBarVisibilityContext';

import DashboardScreen       from '../screens/student/DashboardScreen';
import ClassesScreen         from '../screens/student/ClassesScreen';
import MaterialsScreen       from '../screens/student/MaterialsScreen';
import ProfileScreen         from '../screens/student/ProfileScreen';
import StudentLeaveScreen    from '../screens/student/LeaveScreen';
import ExamScoresScreen      from '../screens/student/ExamScoresScreen';
import AttendanceScreen      from '../screens/student/AttendanceScreen';
import FeeStatusScreen       from '../screens/student/FeeStatusScreen';
import DiscussScenarioScreen from '../screens/student/DiscussScenarioScreen';
import NotificationsScreen   from '../screens/common/NotificationsScreen';
import SettingsScreen        from '../screens/common/SettingsScreen';
import ClassDetailScreen     from '../screens/student/ClassDetailScreen';
import MaterialDetailScreen  from '../screens/student/MaterialDetailScreen';
import DownloadCenterScreen  from '../screens/common/DownloadCenterScreen';
import NcertViewerScreen     from '../screens/common/NcertViewerScreen';
import DocumentViewerScreen  from '../screens/common/DocumentViewerScreen';
import PdfViewerScreen       from '../screens/common/PdfViewerScreen';
import BookmarkScreen        from '../screens/student/BookmarkScreen';
import NotesScreen           from '../screens/student/NotesScreen';
import TopPerformersScreen  from '../screens/student/TopPerformersScreen';
import DoubtThreadScreen     from '../screens/common/DoubtThreadScreen';
import HeaderActions         from '../components/HeaderActions';


const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ─── Colors ───────────────────────────────────────────────────────────────────
const PINK = '#FF4FA3';
const TEAL = '#14B8A6';

// ─── Custom Back Button ───────────────────────────────────────────────────────
const CustomBackButton = () => {
  const navigation = useNavigation();
  const handlePress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('StudentDashboard');
    }
  };
  return (
    <TouchableOpacity onPress={handlePress} style={{ padding: 8, marginRight: 12, backgroundColor: 'rgba(255, 79, 163, 0.1)', borderRadius: 20 }}>
      <Ionicons name="arrow-back" size={22} color={PINK} />
    </TouchableOpacity>
  );
};

// ─── Shared header options ────────────────────────────────────────────────────
const HEADER_OPTS = {
  headerStyle: { backgroundColor: '#FFFFFF', elevation: 0, shadowOpacity: 0 },
  headerTintColor: '#1A1A2E',
  headerTitleStyle: { fontWeight: '700', fontSize: 17, color: '#1A1A2E' },
  headerBackVisible: false,
  headerLeft: () => <CustomBackButton />,
  headerRight: () => <HeaderActions />,
};

// ─── Stack Navigators ─────────────────────────────────────────────────────────
function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="StudentDashboard" component={DashboardScreen}       options={{ headerShown: false }} />
      <Stack.Screen name="Notifications"    component={NotificationsScreen}   options={{ headerShown: false }} />
      <Stack.Screen name="ClassDetail"      component={ClassDetailScreen}     options={{ headerShown: false }} />
      <Stack.Screen name="Classes"          component={ClassesScreen}         options={{ ...HEADER_OPTS, title: 'Classes' }} />
      <Stack.Screen name="Materials"        component={MaterialsScreen}       options={{ ...HEADER_OPTS, title: 'Study Materials' }} />
      <Stack.Screen name="MaterialDetail"   component={MaterialDetailScreen}  options={{ ...HEADER_OPTS, title: 'Material' }} />
      <Stack.Screen name="PdfViewer"        component={PdfViewerScreen}       options={{ headerShown: false }} />
      <Stack.Screen name="Bookmarks"        component={BookmarkScreen}        options={{ ...HEADER_OPTS, title: 'My Bookmarks' }} />
      <Stack.Screen name="MyNotes"          component={NotesScreen}           options={{ ...HEADER_OPTS, title: 'My Notes' }} />
      <Stack.Screen name="Discuss"          component={DiscussScenarioScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DoubtCenter"      component={DiscussScenarioScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DoubtDetail"      component={DoubtThreadScreen}     options={{ headerShown: false }} />
      <Stack.Screen name="Attendance"       component={AttendanceScreen}      options={{ ...HEADER_OPTS, title: 'Attendance' }} />
      <Stack.Screen name="Leave"            component={StudentLeaveScreen}    options={{ ...HEADER_OPTS, title: 'Leave Application' }} />
      <Stack.Screen name="Fees"             component={FeeStatusScreen}       options={{ ...HEADER_OPTS, title: 'Fees & Payments' }} />
      <Stack.Screen name="ExamScores"       component={ExamScoresScreen}      options={{ ...HEADER_OPTS, title: 'Exam Scores' }} />
      <Stack.Screen name="DocumentViewer"   component={DocumentViewerScreen}  options={{ headerShown: false }} />
      <Stack.Screen name="TopPerformers"    component={TopPerformersScreen}   options={{ ...HEADER_OPTS, title: 'Weekly Top Performers' }} />
    </Stack.Navigator>

  );
}

function ClassesStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="ClassesList" component={ClassesScreen}    options={{ ...HEADER_OPTS, title: 'Classes' }} />
      <Stack.Screen name="ClassDetail" component={ClassDetailScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function DownloadsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="DownloadsMain"  component={DownloadCenterScreen} options={{ headerShown: false }} />
      <Stack.Screen name="NcertViewer"    component={NcertViewerScreen}    options={{ headerShown: false }} />
      <Stack.Screen name="MaterialDetail" component={MaterialDetailScreen} options={{ ...HEADER_OPTS, title: 'Material' }} />
      <Stack.Screen name="PdfViewer"      component={PdfViewerScreen}      options={{ headerShown: false }} />
      <Stack.Screen name="DocumentViewer" component={DocumentViewerScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function DiscussionStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="DoubtCenterMain" component={DiscussScenarioScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DoubtDetail" component={DoubtThreadScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="ProfileMain"   component={ProfileScreen}      options={{ headerShown: false }} />
      <Stack.Screen name="ExamScores"    component={ExamScoresScreen}   options={{ ...HEADER_OPTS, title: 'Exam Scores' }} />
      <Stack.Screen name="Attendance"    component={AttendanceScreen}   options={{ ...HEADER_OPTS, title: 'Attendance' }} />
      <Stack.Screen name="Leave"         component={StudentLeaveScreen} options={{ ...HEADER_OPTS, title: 'Leave Application' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ ...HEADER_OPTS, title: 'Notifications' }} />
      <Stack.Screen name="Settings"      component={SettingsScreen}     options={{ ...HEADER_OPTS, title: 'Settings' }} />
      <Stack.Screen name="DoubtCenter"   component={DiscussScenarioScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DoubtDetail"   component={DoubtThreadScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

// ─── Tab icon definitions ─────────────────────────────────────────────────────
const TAB_CFG = {
  Home:      { active: 'home',           inactive: 'home-outline'           },
  Classes:   { active: 'calendar',       inactive: 'calendar-outline'       },
  Downloads: { active: 'cloud-download', inactive: 'cloud-download-outline' },
  Discussion:{ active: 'chatbubbles',     inactive: 'chatbubbles-outline'    },
  Profile:   { active: 'person',         inactive: 'person-outline'         },
};

// ─── Tab Navigator ────────────────────────────────────────────────────────────
export default function StudentNavigator() {
  return (
    <TabBarVisibilityProvider>
      <Tab.Navigator
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <CustomTabBar {...props} iconConfig={TAB_CFG} />}
      >
        <Tab.Screen name="Home"      component={HomeStack}      />
        <Tab.Screen name="Classes"   component={ClassesStack}   />
        <Tab.Screen name="Downloads" component={DownloadsStack} />
        <Tab.Screen name="Discussion" component={DiscussionStack} />
        <Tab.Screen name="Profile"   component={ProfileStack}   />
      </Tab.Navigator>
    </TabBarVisibilityProvider>
  );
}
