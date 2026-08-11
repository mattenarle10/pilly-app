import { estimatedDaysLeft, supplyAdjustment } from '@/models/supply';

describe('supply estimates', () => {
  test('labels unknown or unscheduled supply as unknown', () => {
    expect(estimatedDaysLeft(null, 7)).toBeNull();
    expect(estimatedDaysLeft(12, 0)).toBeNull();
  });

  test('returns a conservative whole-day estimate', () => {
    expect(estimatedDaysLeft(10, 7)).toBe(10);
    expect(estimatedDaysLeft(10, 14)).toBe(5);
    expect(estimatedDaysLeft(2, 3)).toBe(4);
  });

  test('adjusts supply only when the Taken state changes', () => {
    expect(supplyAdjustment('notRecorded', 'taken')).toBe(-1);
    expect(supplyAdjustment('skipped', 'taken')).toBe(-1);
    expect(supplyAdjustment('taken', 'notRecorded')).toBe(1);
    expect(supplyAdjustment('taken', 'skipped')).toBe(1);
    expect(supplyAdjustment('notRecorded', 'skipped')).toBe(0);
  });
});
