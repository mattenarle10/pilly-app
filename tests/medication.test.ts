import {
  createMedicationSchema,
  medicationSchema,
  updateMedicationSchema,
} from '@/models/medication';

describe('medicine input', () => {
  test('requires a label name and at least one valid schedule', () => {
    expect(
      createMedicationSchema.safeParse({
        name: '',
        instructions: '',
        supplyCount: null,
        form: 'capsule',
        tabletShape: 'round',
        appearanceSize: 'medium',
        appearanceColor: '#F3CCD7',
        appearanceSecondaryColor: '#F3F1EB',
        schedules: [],
      }).success,
    ).toBe(false);
    expect(
      createMedicationSchema.safeParse({
        name: 'Morning tablet',
        instructions: 'One tablet',
        supplyCount: 14,
        form: 'tablet',
        tabletShape: 'round',
        appearanceSize: 'small',
        appearanceColor: '#ECEAF7',
        appearanceSecondaryColor: '#FBE9DE',
        schedules: [{ hour: 9, minute: 0, weekdayMask: 127, sortOrder: 0, reminderEnabled: false }],
      }).success,
    ).toBe(true);
  });

  test('requires supply in the atomic edit payload', () => {
    const edit = {
      name: 'Morning tablet',
      instructions: 'One tablet',
      form: 'tablet',
      tabletShape: 'round',
      appearanceSize: 'small',
      appearanceColor: '#ECEAF7',
      appearanceSecondaryColor: '#FBE9DE',
      schedules: [{ hour: 9, minute: 0, weekdayMask: 127, sortOrder: 0, reminderEnabled: false }],
    };

    expect(updateMedicationSchema.safeParse(edit).success).toBe(false);
    expect(updateMedicationSchema.safeParse({ ...edit, supplyCount: 14 }).success).toBe(true);
  });

  test('normalizes legacy and future medicine records without blocking access', () => {
    const base = {
      id: '8acdb1aa-7758-4918-92c0-86761d8205a0',
      name: 'Medicine',
      instructions: '',
      supplyCount: null,
      appearanceSize: 'medium',
      appearanceColor: '#F3CCD7',
      appearanceSecondaryColor: '#FBE9DE',
      createdAt: '2026-09-03T00:00:00.000Z',
      updatedAt: '2026-09-03T00:00:00.000Z',
      archivedAt: null,
      timeZoneIdentifier: 'Asia/Manila',
    };

    expect(createMedicationSchema.omit({ schedules: true }).safeParse(base).success).toBe(false);
    expect(medicationSchema.parse({ ...base, appearanceShape: 'oval' })).toMatchObject({
      form: 'tablet',
      tabletShape: 'oval',
    });
    expect(medicationSchema.parse({ ...base, form: 'patch', tabletShape: 'round' })).toMatchObject({
      form: 'other',
      tabletShape: 'round',
    });
  });
});
