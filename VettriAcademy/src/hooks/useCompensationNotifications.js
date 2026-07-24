import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEY = '@compensation_notifications';

export const useCompensationNotifications = () => {
  const { dashboard } = useSelector((state) => state.teacher);
  const pendingLeaves = dashboard?.pendingCompensationLeaves || [];
  const processedRef = useRef(false);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    
    const syncNotifications = async () => {
      // Allow re-syncing if the length of pending leaves changes, meaning new ones arrived
      if (pendingLeaves.length === 0) return;
      
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        let scheduledMap = stored ? JSON.parse(stored) : {};
        let modified = false;

        for (const leave of pendingLeaves) {
          const compDate = new Date(leave.compensationClassDate);
          if (isNaN(compDate.getTime())) continue;

          if (scheduledMap[leave._id] && scheduledMap[leave._id].date === leave.compensationClassDate) {
            continue;
          }

          if (scheduledMap[leave._id]) {
            if (scheduledMap[leave._id].dayBeforeId) await Notifications.cancelScheduledNotificationAsync(scheduledMap[leave._id].dayBeforeId);
            if (scheduledMap[leave._id].sameDayId) await Notifications.cancelScheduledNotificationAsync(scheduledMap[leave._id].sameDayId);
          }

          const now = new Date();
          
          const dayBefore = new Date(compDate);
          dayBefore.setDate(dayBefore.getDate() - 1);
          dayBefore.setHours(9, 0, 0, 0);

          let dayBeforeId = null;
          if (dayBefore > now) {
            dayBeforeId = await Notifications.scheduleNotificationAsync({
              content: {
                title: 'Upcoming Compensation Class 📚',
                body: `Reminder: You have a compensation class scheduled for tomorrow.`,
                sound: true,
              },
              trigger: dayBefore,
            });
          }

          const sameDay = new Date(compDate);
          sameDay.setHours(8, 0, 0, 0);

          let sameDayId = null;
          if (sameDay > now) {
            sameDayId = await Notifications.scheduleNotificationAsync({
              content: {
                title: 'Compensation Class Today 📚',
                body: `Today is your scheduled compensation class. After completing it, please tap 'Mark Compensation Completed' in your leave history.`,
                sound: true,
              },
              trigger: sameDay,
            });
          }

          scheduledMap[leave._id] = {
            date: leave.compensationClassDate,
            dayBeforeId,
            sameDayId
          };
          modified = true;
        }

        if (modified) {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(scheduledMap));
        }
      } catch (error) {
        console.error('Failed to sync compensation notifications:', error);
      }
    };

    syncNotifications();
  }, [pendingLeaves]);
};
