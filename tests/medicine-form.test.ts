import {
  defaults,
  draftSchema,
  medicationDraftsMatch,
  parseTime,
  scheduleConfigurationFromDraft,
  scheduleDraftsFromSchedules,
  supplyValue,
  validateMedicationDraft,
  validateMedicationStep,
} from '@/features/medicine-form/medication-form';
import { friendlySaveError } from '@/features/medicine-form/medication-form-errors';

describe('medicine setup validation', () => {
  test('restores older drafts with safe appearance defaults', () => {
    const draft = draftSchema.parse({
      name: 'Morning tablet',
      instructions: '',
      selectedDays: [1, 2, 3, 4, 5, 6, 7],
      time: '09:00',
      supply: '14',
      reminderEnabled: false,
    });

    expect(draft).toMatchObject({
      schedules: [{ time: '09:00', reminderEnabled: false }],
      appearanceShape: 'capsule',
      appearanceSize: 'medium',
      appearanceTone: 'rose',
      appearanceSecondaryTone: 'rose',
    });
  });

  test('returns a typed issue for each invalid step', () => {
    expect(validateMedicationStep({ ...defaults, name: '   ' }, 0)).toEqual({
      field: 'name',
      step: 0,
      message: 'Enter the name from the label.',
    });
    expect(validateMedicationStep({ ...defaults, selectedDays: [] }, 1)).toEqual({
      field: 'selectedDays',
      step: 1,
      message: 'Choose at least one day.',
    });
    expect(
      validateMedicationStep(
        { ...defaults, schedules: [{ time: '29:00', reminderEnabled: false }] },
        2,
      ),
    ).toEqual({
      field: 'schedules',
      step: 2,
      message: 'Choose a valid time.',
    });
    expect(validateMedicationStep({ ...defaults, supply: '-1' }, 3)).toEqual({
      field: 'supply',
      step: 3,
      message: 'Enter zero or a positive number.',
    });
  });

  test('routes the full draft to its first invalid step', () => {
    expect(validateMedicationDraft({ ...defaults, name: '', selectedDays: [] })).toEqual({
      field: 'name',
      step: 0,
      message: 'Enter the name from the label.',
    });
    expect(
      validateMedicationDraft({ ...defaults, name: 'Morning tablet', selectedDays: [] }),
    ).toEqual({ field: 'selectedDays', step: 1, message: 'Choose at least one day.' });
  });

  test('accepts optional supply and parses a local time', () => {
    expect(validateMedicationDraft({ ...defaults, name: 'Morning tablet' })).toBeNull();
    expect(supplyValue('')).toBeNull();
    expect(supplyValue('14.5')).toBe(14.5);
    expect(parseTime('09:15').getHours()).toBe(9);
    expect(parseTime('09:15').getMinutes()).toBe(15);
  });

  test('requires unique times and maps multiple schedules chronologically', () => {
    expect(
      validateMedicationStep(
        {
          ...defaults,
          schedules: [
            { time: '09:00', reminderEnabled: false },
            { time: '09:00', reminderEnabled: true },
          ],
        },
        2,
      ),
    ).toEqual({
      field: 'schedules',
      step: 2,
      message: 'Use each dose time once.',
    });

    expect(
      scheduleConfigurationFromDraft({
        ...defaults,
        selectedDays: [1, 3, 5],
        schedules: [
          { time: '18:30', reminderEnabled: true },
          { time: '08:15', reminderEnabled: false },
        ],
      }),
    ).toEqual([
      {
        hour: 8,
        minute: 15,
        weekdayMask: 21,
        sortOrder: 0,
        reminderEnabled: false,
      },
      {
        hour: 18,
        minute: 30,
        weekdayMask: 21,
        sortOrder: 1,
        reminderEnabled: true,
      },
    ]);
  });

  test('restores all existing schedules into a chronological edit draft', () => {
    expect(
      scheduleDraftsFromSchedules([
        { hour: 18, minute: 30, reminderEnabled: true },
        { hour: 8, minute: 15, reminderEnabled: false },
      ]),
    ).toEqual([
      { time: '08:15', reminderEnabled: false },
      { time: '18:30', reminderEnabled: true },
    ]);
  });

  test('does not expose internal save errors', () => {
    expect(friendlySaveError(new Error('SQLITE_CONSTRAINT'))).toBe(
      'Couldn’t save this medicine. Try again.',
    );
  });

  test('treats reverted selections and equivalent supply text as unchanged', () => {
    expect(
      medicationDraftsMatch(
        { ...defaults, supply: '9', selectedDays: [1, 2, 3, 4, 5, 6, 7] },
        { ...defaults, supply: '09', selectedDays: [7, 6, 5, 4, 3, 2, 1] },
      ),
    ).toBe(true);
    expect(
      medicationDraftsMatch(defaults, {
        ...defaults,
        schedules: [{ time: '09:00', reminderEnabled: true }],
      }),
    ).toBe(false);
    expect(
      medicationDraftsMatch(
        {
          ...defaults,
          schedules: [
            { time: '18:00', reminderEnabled: true },
            { time: '08:00', reminderEnabled: false },
          ],
        },
        {
          ...defaults,
          schedules: [
            { time: '08:00', reminderEnabled: false },
            { time: '18:00', reminderEnabled: true },
          ],
        },
      ),
    ).toBe(true);
  });
});
