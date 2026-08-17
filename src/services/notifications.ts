import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { ScheduledDose } from '@/models/dose';

type ReminderSchedule = {
  id: string;
  hour: number;
  minute: number;
  weekdayMask: number;
  reminderEnabled: boolean;
};

type ReminderSlot = {
  identifier: string;
  scheduleIds: string[];
  medicineNames?: string[];
  trigger: Notifications.NotificationTriggerInput;
};

export type ReminderNotice = 'none' | 'denied' | 'failed';

type ReminderStore = {
  listReminderSchedules: () => Promise<readonly ReminderSchedule[]>;
  listScheduledDosesForDates?: (dates: readonly Date[]) => Promise<readonly ScheduledDose[][]>;
  setSetting: (key: string, value: string) => Promise<void>;
};

const reminderWindowDays = 7;

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
  upcomingDosesByDate?: readonly ScheduledDose[][],
  now = new Date(),
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

  const slots = buildReminderSlots(enabledSchedules, upcomingDosesByDate, now);
  for (const slot of slots) {
    await Notifications.scheduleNotificationAsync({
      identifier: slot.identifier,
      content: {
        title: 'Time for your medicine',
        body: reminderBodyForSlot(slot),
        sound: 'default',
        data: {
          kind: 'medicineReminder',
          scheduleIds: slot.scheduleIds,
          url: 'pilly-app://today',
        },
      },
      trigger: slot.trigger,
    });
  }
  return 'scheduled';
}

export async function reconcileLocalReminders(store: ReminderStore): Promise<ReminderNotice> {
  let notice: ReminderNotice;
  try {
    const now = new Date();
    const upcomingDosesByDate = await getUpcomingDosesWindow(store, now);
    const status = await scheduleLocalReminders(
      await store.listReminderSchedules(),
      upcomingDosesByDate,
      now,
    );
    notice = status === 'denied' ? 'denied' : 'none';
  } catch {
    notice = 'failed';
  }
  await Promise.allSettled([store.setSetting('reminderNotice', notice)]);
  return notice;
}

async function getUpcomingDosesWindow(
  store: ReminderStore,
  now: Date,
): Promise<readonly ScheduledDose[][] | undefined> {
  if (!store.listScheduledDosesForDates) return undefined;
  try {
    return await store.listScheduledDosesForDates(reminderDates(now));
  } catch {
    return undefined;
  }
}

function buildReminderSlots(
  schedules: readonly ReminderSchedule[],
  upcomingDosesByDate: readonly ScheduledDose[][] | undefined,
  now: Date,
): ReminderSlot[] {
  if (upcomingDosesByDate && upcomingDosesByDate.length > 0) {
    const slotsFromDoses = buildUpcomingDosesSlots(schedules, upcomingDosesByDate, now);
    if (slotsFromDoses.length > 0) {
      return slotsFromDoses;
    }
  }

  return reminderSlots(schedules).map((slot) => ({
    identifier: `pilly-reminder:${slot.weekday}:${slot.hour}:${slot.minute}`,
    scheduleIds: slot.scheduleIds,
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: slot.weekday,
      hour: slot.hour,
      minute: slot.minute,
    },
  }));
}

function buildUpcomingDosesSlots(
  schedules: readonly ReminderSchedule[],
  dosesByDate: readonly ScheduledDose[][],
  now: Date,
): ReminderSlot[] {
  const enabledScheduleIds = new Set(schedules.map((schedule) => schedule.id));
  const slotEntries = new Map<
    number,
    { scheduleIds: Set<string>; medicineNames: Set<string> }
  >();
  const nowMs = now.getTime();

  for (const row of dosesByDate) {
    for (const dose of row) {
      if (dose.status !== 'notRecorded') continue;
      if (dose.scheduledAt.getTime() <= nowMs) continue;
      if (!enabledScheduleIds.has(dose.schedule.id)) continue;

      const scheduledAt = dose.scheduledAt.getTime();
      const slot = slotEntries.get(scheduledAt);
      if (slot) {
        slot.scheduleIds.add(dose.schedule.id);
        slot.medicineNames.add(dose.medication.name);
      } else {
        slotEntries.set(scheduledAt, {
          scheduleIds: new Set([dose.schedule.id]),
          medicineNames: new Set([dose.medication.name]),
        });
      }
    }
  }

  return [...slotEntries.entries()]
    .sort(([left], [right]) => left - right)
    .map(([scheduledAt, slot]) => ({
      identifier: `pilly-reminder:${scheduledAt}`,
      scheduleIds: [...slot.scheduleIds],
      medicineNames: [...slot.medicineNames],
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(scheduledAt),
      },
    }));
}

function reminderSlots(schedules: readonly ReminderSchedule[]): {
  hour: number;
  minute: number;
  weekday: number;
  scheduleIds: string[];
  }[] {
  const slots = new Map<string, { hour: number; minute: number; weekday: number; scheduleIds: string[] }>();
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

function reminderBodyForSlot(slot: ReminderSlot): string {
  if (!slot.medicineNames || slot.medicineNames.length === 0) {
    return 'Open Pilly to see what’s due.';
  }
  const names = [...slot.medicineNames];
  if (names.length === 1) {
    return `Time to take ${names[0]}.`;
  }
  if (names.length === 2) {
    return `Time to take ${names[0]} and ${names[1]}.`;
  }
  return `Time to take ${names[0]} and ${names.length - 1} others.`;
}

function reminderDates(now: Date): Date[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Array.from({ length: reminderWindowDays }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() + index);
    return day;
  });
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
