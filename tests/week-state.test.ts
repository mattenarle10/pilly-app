import type { ScheduledDose } from '@/models/dose';
import {
  buildWeekDays,
  dayState,
  groupWeekDoses,
  resolveWeekSelection,
  weekProgress,
  weekProgressMessage,
} from '@/models/week';
import { buildMedication, buildScheduledDose } from './support/builders';

const medication: ScheduledDose['medication'] = buildMedication({
  instructions: 'With breakfast',
  appearanceSecondaryColor: '#ECEAF7',
});

function makeDose(
  occurrenceId: string,
  status: ScheduledDose['status'],
  scheduledAt: Date,
  name = medication.name,
): ScheduledDose {
  return buildScheduledDose({
    occurrenceId,
    scheduledAt,
    status,
    medication: { ...medication, name },
    schedule: { id: occurrenceId.padEnd(36, '0').slice(0, 36) },
  });
}

describe('Week state', () => {
  const now = new Date(2026, 7, 10, 12, 0);

  test('distinguishes upcoming, due, taken, skipped, and empty days', () => {
    expect(dayState([], now)).toBe('empty');
    expect(dayState([makeDose('future', 'notRecorded', new Date(2026, 7, 10, 13, 0))], now)).toBe(
      'scheduled',
    );
    expect(dayState([makeDose('due', 'notRecorded', new Date(2026, 7, 10, 9, 0))], now)).toBe(
      'notRecorded',
    );
    expect(dayState([makeDose('taken', 'taken', new Date(2026, 7, 10, 9, 0))], now)).toBe('taken');
    expect(dayState([makeDose('skip', 'skipped', new Date(2026, 7, 10, 9, 0))], now)).toBe(
      'skipped',
    );
  });

  test('prioritizes an unrecorded due dose over a recorded skipped dose', () => {
    const doses = [
      makeDose('skip', 'skipped', new Date(2026, 7, 10, 8, 0)),
      makeDose('due', 'notRecorded', new Date(2026, 7, 10, 9, 0)),
    ];

    expect(dayState(doses, now)).toBe('notRecorded');
  });

  test('builds seven selectable summaries and resolves a local route date', () => {
    const dates = Array.from({ length: 7 }, (_, offset) => new Date(2026, 7, 10 + offset));
    const days = buildWeekDays(dates, undefined, now);

    expect(days).toHaveLength(7);
    expect(days[0]).toMatchObject({ key: '2026-08-10', dateNumber: 10, state: 'empty' });
    expect(resolveWeekSelection(dates, '2026-08-13')).toBe(3);
    expect(resolveWeekSelection(dates, '2026-09-01')).toBe(0);
  });

  test('groups dense schedules by exact time', () => {
    const groups = groupWeekDoses([
      makeDose('first', 'taken', new Date(2026, 7, 10, 9, 0), 'First'),
      makeDose('second', 'notRecorded', new Date(2026, 7, 10, 9, 0), 'Second'),
      makeDose('third', 'notRecorded', new Date(2026, 7, 10, 21, 0), 'Third'),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]?.doses.map((dose) => dose.medication.name)).toEqual(['First', 'Second']);
    expect(groups[1]?.doses[0]?.medication.name).toBe('Third');
  });

  test('summarizes recorded and upcoming doses without overstating completion', () => {
    const progress = weekProgress(
      [
        [
          makeDose('taken', 'taken', new Date(2026, 7, 10, 9, 0)),
          makeDose('future', 'notRecorded', new Date(2026, 7, 10, 13, 0)),
        ],
      ],
      now,
    );

    expect(progress).toEqual({ recorded: 1, total: 2, upcoming: 1 });
    expect(weekProgressMessage(progress)).toBe('1 of 2 recorded · 1 upcoming');
  });
});
