import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { getTeacherLeavesAPI } from './api';

const COMP_NOTIFS_KEY = '@comp_notifs_scheduled';

export const syncCompensationNotifications = async () => {
  try {
    const { data } = await getTeacherLeavesAPI();
    const leaves = data?.leaves || [];

    // Filter leaves with compensation dates that are pending
    const upcomingComps = leaves.filter(l => 
      l.compensationClassDate && 
      (l.compensationStatus === 'pending' || l.compensationStatus === 'completed_by_teacher')
    );

    const scheduledData = await AsyncStorage.getItem(COMP_NOTIFS_KEY);
    let scheduledMap = scheduledData ? JSON.parse(scheduledData) : {};

    for (const comp of upcomingComps) {
      const compDate = new Date(comp.compensationClassDate);
      if (isNaN(compDate.getTime())) continue;

      // Only schedule if date is in future
      const now = new Date();
      if (compDate < now && compDate.toDateString() !== now.toDateString()) continue;

      const leaveId = comp._id;

      // Avoid rescheduling if already done
      if (!scheduledMap[leaveId]) {
        // Schedule reminder 1 day before at 9 AM
        const dayBefore = new Date(compDate);
        dayBefore.setDate(dayBefore.getDate() - 1);
        dayBefore.setHours(9, 0, 0, 0);

        // Schedule same day at 8 AM
        const sameDay = new Date(compDate);
        sameDay.setHours(8, 0, 0, 0);

        const notifIds = [];

        if (dayBefore > now) {
          const id = await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Upcoming Compensation Class',
              body: `You have a compensation class scheduled for tomorrow.`,
            },
            trigger: dayBefore,
          });
          notifIds.push(id);
        }

        if (sameDay > now) {
          const id = await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Compensation Class Today',
              body: `Don't forget your compensation class today.`,
            },
            trigger: sameDay,
          });
          notifIds.push(id);
        }

        scheduledMap[leaveId] = notifIds;
      }
    }

    await AsyncStorage.setItem(COMP_NOTIFS_KEY, JSON.stringify(scheduledMap));
  } catch (err) {
    console.log('Failed to sync compensation notifications:', err);
  }
};
