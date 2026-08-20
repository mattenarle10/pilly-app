import * as Notifications from 'expo-notifications';

import {
  configureNotificationPresentation,
  reconcileLocalReminders,
  scheduleLocalReminders,
} from '@/services/notifications';

jest.mock('expo-notifications', () => ({
  getAllScheduledNotificationsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  SchedulableTriggerInputTypes: { WEEKLY: 'weekly' },
  IosAuthorizationStatus: {
    NOT_DETERMINED: 0,
    DENIED: 1,
    AUTHORIZED: 2,
    PROVISIONAL: 3,
    EPHEMERAL: 4,
  },
}));

const getScheduled = jest.mocked(Notifications.getAllScheduledNotificationsAsync);
const cancelScheduled = jest.mocked(Notifications.cancelScheduledNotificationAsync);
const getPermissions = jest.mocked(Notifications.getPermissionsAsync);
const requestPermissions = jest.mocked(Notifications.requestPermissionsAsync);
const scheduleNotification = jest.mocked(Notifications.scheduleNotificationAsync);
const setNotificationHandler = jest.mocked(Notifications.setNotificationHandler);

const reminder = {
  id: 'schedule-1',
  hour: 9,
  minute: 15,
  weekdayMask: 1 | 4,
  reminderEnabled: true,
};

describe('local medicine reminders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getScheduled.mockResolvedValue([]);
    cancelScheduled.mockResolvedValue();
    getPermissions.mockResolvedValue({
      granted: true,
      status: 'granted',
    } as Notifications.NotificationPermissionsStatus);
    scheduleNotification.mockResolvedValue('notification-id');
  });

  test('shows a banner, keeps it in Notification Center, and plays the alert sound in-app', async () => {
    configureNotificationPresentation();

    const handler = setNotificationHandler.mock.calls[0]?.[0];
    expect(handler).toBeDefined();
    await expect(handler?.handleNotification({} as Notifications.Notification)).resolves.toEqual({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    });
  });

  test('removes only Pilly reminders when every reminder is off', async () => {
    getScheduled.mockResolvedValue([
      {
        identifier: 'pilly-reminder:old:2',
        content: {
          title: null,
          subtitle: null,
          body: null,
          data: { kind: 'medicineReminder', scheduleId: 'old' },
          sound: null,
        },
        trigger: null,
      },
      {
        identifier: 'another-feature',
        content: {
          title: null,
          subtitle: null,
          body: null,
          data: { kind: 'other' },
          sound: null,
        },
        trigger: null,
      },
    ] as unknown as Notifications.NotificationRequest[]);

    await expect(scheduleLocalReminders([{ ...reminder, reminderEnabled: false }])).resolves.toBe(
      'notRequested',
    );

    expect(cancelScheduled).toHaveBeenCalledWith('pilly-reminder:old:2');
    expect(cancelScheduled).not.toHaveBeenCalledWith('another-feature');
    expect(requestPermissions).not.toHaveBeenCalled();
    expect(scheduleNotification).not.toHaveBeenCalled();
  });

  test('clears stale Pilly reminders without prompting or scheduling when permission is denied', async () => {
    getScheduled.mockResolvedValue([
      {
        identifier: 'pilly-reminder:old:2',
        content: {
          title: null,
          subtitle: null,
          body: null,
          data: { kind: 'medicineReminder', scheduleId: 'old' },
          sound: null,
        },
        trigger: null,
      },
      {
        identifier: 'another-feature',
        content: {
          title: null,
          subtitle: null,
          body: null,
          data: { kind: 'other' },
          sound: null,
        },
        trigger: null,
      },
    ] as unknown as Notifications.NotificationRequest[]);
    getPermissions.mockResolvedValue({
      granted: false,
      status: 'denied',
      ios: { status: Notifications.IosAuthorizationStatus.DENIED },
    } as Notifications.NotificationPermissionsStatus);

    await expect(scheduleLocalReminders([reminder])).resolves.toBe('denied');
    expect(requestPermissions).not.toHaveBeenCalled();
    expect(cancelScheduled).toHaveBeenCalledWith('pilly-reminder:old:2');
    expect(cancelScheduled).not.toHaveBeenCalledWith('another-feature');
    expect(scheduleNotification).not.toHaveBeenCalled();
  });

  test('uses private recurring copy and schedules only the selected weekdays', async () => {
    await expect(scheduleLocalReminders([reminder])).resolves.toBe('scheduled');

    expect(scheduleNotification).toHaveBeenCalledTimes(2);
    expect(scheduleNotification).toHaveBeenNthCalledWith(1, {
      identifier: 'pilly-reminder:2:9:15',
      content: {
        title: 'Time for your medicine',
        body: 'Open Pilly to see what’s due.',
        sound: 'default',
        data: {
          kind: 'medicineReminder',
          scheduleIds: ['schedule-1'],
          url: 'pilly-app://today',
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 2,
        hour: 9,
        minute: 15,
      },
    });
    expect(scheduleNotification).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        identifier: 'pilly-reminder:4:9:15',
        trigger: expect.objectContaining({ weekday: 4 }),
      }),
    );
  });

  test('combines medicines due at the same time into one private alert', async () => {
    await scheduleLocalReminders([reminder, { ...reminder, id: 'schedule-2', weekdayMask: 1 }]);

    expect(scheduleNotification).toHaveBeenCalledTimes(2);
    expect(scheduleNotification).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        identifier: 'pilly-reminder:2:9:15',
        content: expect.objectContaining({
          data: expect.objectContaining({ scheduleIds: ['schedule-1', 'schedule-2'] }),
        }),
      }),
    );
  });

  test('requests permission only while the decision is undetermined', async () => {
    getPermissions.mockResolvedValue({
      granted: false,
      status: 'undetermined',
      ios: { status: Notifications.IosAuthorizationStatus.NOT_DETERMINED },
    } as Notifications.NotificationPermissionsStatus);
    requestPermissions.mockResolvedValue({
      granted: true,
      status: 'granted',
      ios: { status: Notifications.IosAuthorizationStatus.AUTHORIZED },
    } as Notifications.NotificationPermissionsStatus);

    await expect(scheduleLocalReminders([reminder])).resolves.toBe('scheduled');
    expect(requestPermissions).toHaveBeenCalledTimes(1);
  });

  test('accepts provisional iOS permission without prompting again', async () => {
    getPermissions.mockResolvedValue({
      granted: false,
      status: 'denied',
      ios: { status: Notifications.IosAuthorizationStatus.PROVISIONAL },
    } as Notifications.NotificationPermissionsStatus);

    await expect(scheduleLocalReminders([reminder])).resolves.toBe('scheduled');
    expect(requestPermissions).not.toHaveBeenCalled();
  });

  test('persists a denied reminder notice', async () => {
    getPermissions.mockResolvedValue({
      granted: false,
      status: 'denied',
      ios: { status: Notifications.IosAuthorizationStatus.DENIED },
    } as Notifications.NotificationPermissionsStatus);
    const store = {
      listReminderSchedules: jest.fn().mockResolvedValue([reminder]),
      setSetting: jest.fn().mockResolvedValue(undefined),
    };

    await expect(reconcileLocalReminders(store)).resolves.toBe('denied');
    expect(store.setSetting).toHaveBeenCalledWith('reminderNotice', 'denied');
  });

  test('keeps medicine changes successful when scheduling or notice persistence fails', async () => {
    const store = {
      listReminderSchedules: jest.fn().mockRejectedValue(new Error('notifications unavailable')),
      setSetting: jest.fn().mockRejectedValue(new Error('settings unavailable')),
    };

    await expect(reconcileLocalReminders(store)).resolves.toBe('failed');
    expect(store.setSetting).toHaveBeenCalledWith('reminderNotice', 'failed');
  });
});
