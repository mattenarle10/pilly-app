import {
  describeDoseHistoryChange,
  groupDoseHistory,
  type DoseHistoryEntry,
  type DoseStatus,
} from '@/models/dose';

function entry({
  id,
  occurrenceId,
  previousStatus,
  nextStatus,
  occurredAt,
}: {
  id: string;
  occurrenceId: string;
  previousStatus: DoseStatus;
  nextStatus: DoseStatus;
  occurredAt: string;
}): DoseHistoryEntry {
  return {
    id,
    occurrenceId,
    scheduledAt: new Date('2026-08-14T09:00:00+08:00'),
    previousStatus,
    nextStatus,
    occurredAt: new Date(occurredAt),
  };
}

describe('dose history presentation', () => {
  test.each([
    ['notRecorded', 'taken', 'Marked Taken'],
    ['notRecorded', 'skipped', 'Marked Skipped'],
    ['taken', 'skipped', 'Changed Taken to Skipped'],
    ['skipped', 'taken', 'Changed Skipped to Taken'],
    ['taken', 'notRecorded', 'Removed Taken record'],
    ['skipped', 'notRecorded', 'Removed Skipped record'],
  ] as const)('describes %s to %s clearly', (previousStatus, nextStatus, expected) => {
    expect(
      describeDoseHistoryChange({
        previousStatus,
        nextStatus,
      }),
    ).toBe(expected);
  });

  test('groups corrections with their scheduled dose and orders by latest change', () => {
    const firstTaken = entry({
      id: 'first-taken',
      occurrenceId: 'schedule-a:2026-08-14',
      previousStatus: 'notRecorded',
      nextStatus: 'taken',
      occurredAt: '2026-08-14T01:01:00.000Z',
    });
    const secondTaken = entry({
      id: 'second-taken',
      occurrenceId: 'schedule-b:2026-08-14',
      previousStatus: 'notRecorded',
      nextStatus: 'taken',
      occurredAt: '2026-08-14T01:02:00.000Z',
    });
    const firstCorrected = entry({
      id: 'first-corrected',
      occurrenceId: 'schedule-a:2026-08-14',
      previousStatus: 'taken',
      nextStatus: 'skipped',
      occurredAt: '2026-08-14T01:03:00.000Z',
    });

    const groups = groupDoseHistory([firstTaken, secondTaken, firstCorrected]);

    expect(groups.map((group) => group.occurrenceId)).toEqual([
      'schedule-a:2026-08-14',
      'schedule-b:2026-08-14',
    ]);
    expect(groups[0]?.changes.map((change) => change.id)).toEqual([
      'first-corrected',
      'first-taken',
    ]);
  });
});
