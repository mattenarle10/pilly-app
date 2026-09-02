import { buildDoseTimePacks } from '@/models/dose-time-pack';
import { buildScheduledDose } from './support/builders';

function dose(
  id: string,
  hour: number,
  status: 'notRecorded' | 'taken' | 'skipped' = 'notRecorded',
) {
  return buildScheduledDose({
    occurrenceId: id,
    scheduledAt: new Date(2026, 8, 2, hour, 0),
    status,
    medication: { id: id.padEnd(36, '0').slice(0, 36), name: `Medicine ${id}` },
  });
}

describe('dose time packs', () => {
  const now = new Date(2026, 8, 2, 9, 0);

  test('groups, sorts, counts, and limits recognition previews', () => {
    const packs = buildDoseTimePacks(
      [dose('later', 13), dose('a', 9, 'taken'), dose('b', 9), dose('c', 9), dose('d', 9)],
      now,
      true,
    );

    expect(packs).toHaveLength(2);
    expect(packs[0]).toMatchObject({
      total: 4,
      unresolved: 3,
      taken: 1,
      state: 'partial',
      actionable: true,
      focal: true,
      overflowCount: 1,
    });
    expect(packs[0]?.previews).toHaveLength(3);
    expect(packs[1]).toMatchObject({ state: 'future', actionable: false, focal: false });
  });

  test('distinguishes due, overdue, complete, and read-only states', () => {
    expect(buildDoseTimePacks([dose('due', 9)], now, true)[0]?.state).toBe('due');
    expect(buildDoseTimePacks([dose('old', 8)], now, true)[0]?.state).toBe('overdue');
    expect(buildDoseTimePacks([dose('done', 8, 'skipped')], now, true)[0]).toMatchObject({
      state: 'complete',
      actionable: false,
    });
    expect(buildDoseTimePacks([dose('readonly', 8)], now, false)[0]).toMatchObject({
      state: 'overdue',
      actionable: false,
      focal: false,
    });
  });

  test('produces one explicit accessibility summary per pack', () => {
    const pack = buildDoseTimePacks(
      [dose('taken', 9, 'taken'), dose('skipped', 9, 'skipped'), dose('due', 9)],
      now,
      true,
    )[0];

    expect(pack?.accessibilityLabel).toContain('3 medicines');
    expect(pack?.accessibilityLabel).toContain('1 due');
    expect(pack?.accessibilityLabel).toContain('1 taken');
    expect(pack?.accessibilityLabel).toContain('1 skipped');
    expect(pack?.accessibilityLabel).toContain('Opens dose list');
  });
});
