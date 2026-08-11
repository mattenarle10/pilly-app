import * as Notifications from 'expo-notifications';

type ReminderSchedule = {
  id: string;
  hour: number;
  minute: number;
  weekdayMask: number;
  reminderEnabled: boolean;
};

export async function scheduleLocalReminders(
  schedules: readonly ReminderSchedule[],
): Promise<'notRequested' | 'denied' | 'scheduled'> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!schedules.some((schedule) => schedule.reminderEnabled)) return 'notRequested';
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return 'denied';

  for (const schedule of schedules) {
    if (!schedule.reminderEnabled) continue;
    for (let day = 1; day <= 7; day += 1) {
      const nativeWeekday = day === 7 ? 1 : day + 1;
      if ((schedule.weekdayMask & (1 << (day - 1))) === 0) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: `${schedule.id}:${nativeWeekday}`,
        content: {
          title: 'Medicine reminder',
          body: 'Open Pilly to see what is due.',
          data: { scheduleId: schedule.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: nativeWeekday,
          hour: schedule.hour,
          minute: schedule.minute,
        },
      });
    }
  }
  return 'scheduled';
}
