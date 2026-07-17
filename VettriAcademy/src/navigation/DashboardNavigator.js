import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import { Colors } from '../utils/colors';
import { Shadows } from '../utils/theme';
import { useBottomTabBarStyle } from './useBottomTabBarStyle';

// Import screens
import { AdminDashboardScreen } from '../screens/Admin/AdminDashboardScreen';
import { TeacherDashboardScreen } from '../screens/Teacher/TeacherDashboardScreen';
import { StudentDashboardScreen } from '../screens/Student/StudentDashboardScreen';
import { UsersScreen } from '../screens/Users/UsersScreen';
import { ScheduleScreen } from '../screens/Schedule/ScheduleScreen';
import { SalaryScreen } from '../screens/Salary/SalaryScreen';
import { ProfileScreen } from '../screens/Profile/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

export function DashboardNavigator({ userRole = 'admin' }) {
  const getDashboardScreen = () => {
    switch (userRole) {
      case 'teacher':
        return TeacherDashboardScreen;
      case 'student':
        return StudentDashboardScreen;
      default:
        return AdminDashboardScreen;
    }
  };

  const tabBarStyles = useBottomTabBarStyle({
    backgroundColor: Colors.white,
    shadowStyle: Shadows.light,
    borderTopColor: Colors.lightGray,
  });

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Home: '🏠',
            Users: '👥',
            Schedule: '📅',
            Salary: '💰',
            Profile: '👤',
          };
          return (
            <Text style={{ fontSize: 24, marginBottom: 2 }}>
              {icons[route.name]}
            </Text>
          );
        },
        tabBarActiveTintColor: Colors.hotPink,
        tabBarInactiveTintColor: Colors.gray,
        ...tabBarStyles,
      })}
    >
      <Tab.Screen name="Home" component={getDashboardScreen()} />
      <Tab.Screen name="Users" component={UsersScreen} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} />
      <Tab.Screen name="Salary" component={SalaryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default DashboardNavigator;
