import { createMedicationSchema } from './medication.schema';

describe('medicine input', () => {
  test('requires a label name and at least one valid schedule', () => {
    expect(
      createMedicationSchema.safeParse({
        name: '',
        instructions: '',
        supplyCount: null,
        schedules: [],
      }).success,
    ).toBe(false);
    expect(
      createMedicationSchema.safeParse({
        name: 'Morning tablet',
        instructions: 'One tablet',
        supplyCount: 14,
        schedules: [{ hour: 9, minute: 0, weekdayMask: 127, sortOrder: 0, reminderEnabled: false }],
      }).success,
    ).toBe(true);
  });
});
