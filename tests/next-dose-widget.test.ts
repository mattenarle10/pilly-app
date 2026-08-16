import type { ScheduledDose } from '@/models/dose';
import { buildNextDoseWidgetTimeline } from '@/models/next-dose-widget';

function scheduledDose(scheduledAt: Date, status: ScheduledDose['status']): ScheduledDose {
  return {
    occurrenceId: `schedule:${scheduledAt.toISOString()}`,
    medication: {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Private medicine name',
      instructions: '',
      supplyCount: 10,
      appearanceShape: 'capsule',
      appearanceSize: 'medium',
      appearanceColor: '#F3CCD7',
      appearanceSecondaryColor: '#FBE9DE',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
      archivedAt: null,
      timeZoneIdentifier: 'Asia/Manila',
    },
    schedule: {
      id: '00000000-0000-4000-8000-000000000002',
      medicationId: '00000000-0000-4000-8000-000000000001',
      hour: scheduledAt.getHours(),
      minute: scheduledAt.getMinutes(),
      weekdayMask: 127,
      sortOrder: 0,
      reminderEnabled: true,
    },
    scheduledAt,
    status,
    recordedAt: status === 'notRecorded' ? null : scheduledAt,
  };
}

describe('next-dose widget timeline', () => {
  const now = new Date(2026, 7, 15, 8, 0);

  test('offers setup without exposing a placeholder medicine', () => {
    const [entry] = buildNextDoseWidgetTimeline({ medicationCount: 0, doses: [], now });

    expect(entry?.props).toEqual({
      state: 'empty',
      title: 'Add medicine',
      detail: 'Set your first reminder',
    });
  });

  test('groups doses at the next time and never includes medicine names', () => {
    const first = scheduledDose(new Date(2026, 7, 15, 9, 0), 'notRecorded');
    const second = {
      ...scheduledDose(new Date(2026, 7, 15, 9, 0), 'notRecorded'),
      occurrenceId: 'schedule-2:2026-08-15',
    };
    const [entry] = buildNextDoseWidgetTimeline({
      medicationCount: 2,
      doses: [first, second],
      now,
    });

    expect(entry?.props.state).toBe('upcoming');
    expect(entry?.props.detail).toBe('Today · 2 doses');
    expect(JSON.stringify(entry?.props)).not.toContain('Private medicine name');
  });

  test('advances from upcoming to ready at the scheduled time', () => {
    const scheduledAt = new Date(2026, 7, 15, 9, 0);
    const timeline = buildNextDoseWidgetTimeline({
      medicationCount: 1,
      doses: [scheduledDose(scheduledAt, 'notRecorded')],
      now,
    });

    expect(timeline).toHaveLength(2);
    expect(timeline[0]?.props.state).toBe('upcoming');
    expect(timeline[1]).toEqual({
      date: scheduledAt,
      props: {
        state: 'ready',
        title: '1 dose ready',
        detail: 'Open to record',
      },
    });
  });

  test('ignores recorded doses and shows a calm clear state', () => {
    const timeline = buildNextDoseWidgetTimeline({
      medicationCount: 1,
      doses: [scheduledDose(new Date(2026, 7, 15, 7, 0), 'taken')],
      now,
    });

    expect(timeline).toHaveLength(1);
    expect(timeline[0]?.props).toEqual({
      state: 'clear',
      title: 'Nothing due',
      detail: 'Next 7 days',
    });
  });

  test('pluralizes grouped ready doses', () => {
    const scheduledAt = new Date(2026, 7, 15, 7, 0);
    const first = scheduledDose(scheduledAt, 'notRecorded');
    const second = {
      ...scheduledDose(scheduledAt, 'notRecorded'),
      occurrenceId: 'schedule-2:2026-08-15',
    };

    const [entry] = buildNextDoseWidgetTimeline({
      medicationCount: 2,
      doses: [first, second],
      now,
    });

    expect(entry?.props).toEqual({
      state: 'ready',
      title: '2 doses ready',
      detail: 'Open to record',
    });
  });

  test('shows the latest due group instead of accumulating prior days', () => {
    const today = new Date(2026, 7, 15, 9, 0);
    const tomorrow = new Date(2026, 7, 16, 9, 0);
    const timeline = buildNextDoseWidgetTimeline({
      medicationCount: 2,
      doses: [
        scheduledDose(today, 'notRecorded'),
        {
          ...scheduledDose(today, 'notRecorded'),
          occurrenceId: 'today-2',
        },
        scheduledDose(tomorrow, 'notRecorded'),
        {
          ...scheduledDose(tomorrow, 'notRecorded'),
          occurrenceId: 'tomorrow-2',
        },
      ],
      now,
    });

    expect(timeline.at(-1)?.props).toEqual({
      state: 'ready',
      title: '2 doses ready',
      detail: 'Open to record',
    });
  });
});
