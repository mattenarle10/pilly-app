import { createMedicationSchema, updateMedicationSchema } from '@/models/medication';

describe('medicine input', () => {
  test('requires a label name and at least one valid schedule', () => {
    expect(
      createMedicationSchema.safeParse({
        name: '',
        instructions: '',
        supplyCount: null,
        appearanceShape: 'capsule',
        appearanceSize: 'medium',
        appearanceTone: 'rose',
        appearanceSecondaryTone: 'neutral',
        schedules: [],
      }).success,
    ).toBe(false);
    expect(
      createMedicationSchema.safeParse({
        name: 'Morning tablet',
        instructions: 'One tablet',
        supplyCount: 14,
        appearanceShape: 'round',
        appearanceSize: 'small',
        appearanceTone: 'lavender',
        appearanceSecondaryTone: 'peach',
        schedules: [{ hour: 9, minute: 0, weekdayMask: 127, sortOrder: 0, reminderEnabled: false }],
      }).success,
    ).toBe(true);
  });

  test('requires supply in the atomic edit payload', () => {
    const edit = {
      name: 'Morning tablet',
      instructions: 'One tablet',
      appearanceShape: 'round',
      appearanceSize: 'small',
      appearanceTone: 'lavender',
      appearanceSecondaryTone: 'peach',
      schedules: [{ hour: 9, minute: 0, weekdayMask: 127, sortOrder: 0, reminderEnabled: false }],
    };

    expect(updateMedicationSchema.safeParse(edit).success).toBe(false);
    expect(updateMedicationSchema.safeParse({ ...edit, supplyCount: 14 }).success).toBe(true);
  });
});
