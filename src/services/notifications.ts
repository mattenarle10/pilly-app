import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

type ReminderSchedule = {
  id: string;
  hour: number;
  minute: number;
  weekdayMask: number;
  reminderEnabled: boolean;
};

type ReminderSlot = {
  hour: number;
  minute: number;
  weekday: number;
  scheduleIds: string[];
};

export function configureNotificationPresentation(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function scheduleLocalReminders(
  schedules: readonly ReminderSchedule[],
): Promise<'notRequested' | 'denied' | 'scheduled'> {
  const enabledSchedules = schedules.filter((schedule) => schedule.reminderEnabled);
  await cancelPillyReminders();

  if (enabledSchedules.length === 0) {
    return 'notRequested';
  }

  let permission = await Notifications.getPermissionsAsync();
  if (!allowsNotifications(permission)) {
    if (permissionIsDenied(permission)) return 'denied';
    permission = await Notifications.requestPermissionsAsync();
    if (!allowsNotifications(permission)) return 'denied';
  }

  for (const slot of reminderSlots(enabledSchedules)) {
    await Notifications.scheduleNotificationAsync({
      identifier: `pilly-reminder:${slot.weekday}:${slot.hour}:${slot.minute}`,
      content: {
        title: 'Time for your medicine',
        body: 'Open Pilly to see what’s due.',
        sound: 'default',
        data: {
          kind: 'medicineReminder',
          scheduleIds: slot.scheduleIds,
          url: 'pilly-app://today',
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: slot.weekday,
        hour: slot.hour,
        minute: slot.minute,
      },
    });
  }
  return 'scheduled';
}

function reminderSlots(schedules: readonly ReminderSchedule[]): ReminderSlot[] {
  const slots = new Map<string, ReminderSlot>();
  for (const schedule of schedules) {
    for (let day = 1; day <= 7; day += 1) {
      if ((schedule.weekdayMask & (1 << (day - 1))) === 0) continue;
      const weekday = day === 7 ? 1 : day + 1;
      const key = `${weekday}:${schedule.hour}:${schedule.minute}`;
      const slot = slots.get(key);
      if (slot) slot.scheduleIds.push(schedule.id);
      else {
        slots.set(key, {
          weekday,
          hour: schedule.hour,
          minute: schedule.minute,
          scheduleIds: [schedule.id],
        });
      }
    }
  }
  return [...slots.values()].sort(
    (left, right) =>
      left.weekday - right.weekday || left.hour - right.hour || left.minute - right.minute,
  );
}

async function cancelPillyReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(
        (notification) =>
          notification.identifier.startsWith('pilly-reminder:') ||
          notification.content.data?.kind === 'medicineReminder',
      )
      .map((notification) =>
        Notifications.cancelScheduledNotificationAsync(notification.identifier),
      ),
  );
}

function allowsNotifications(permission: Notifications.NotificationPermissionsStatus): boolean {
  if (permission.granted) return true;
  if (Platform.OS !== 'ios') return false;
  return (
    permission.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    permission.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL
  );
}

function permissionIsDenied(permission: Notifications.NotificationPermissionsStatus): boolean {
  if (Platform.OS === 'ios') {
    return permission.ios
      ? permission.ios.status === Notifications.IosAuthorizationStatus.DENIED
      : permission.status === 'denied';
  }
  return permission.status === 'denied';
}
