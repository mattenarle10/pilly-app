import {
  defaults,
  parseTime,
  supplyValue,
  validateMedicationDraft,
  validateMedicationStep,
} from './new-medication-form';
import { friendlySaveError } from './new-medication-errors';

describe('medicine setup validation', () => {
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
    expect(validateMedicationStep({ ...defaults, time: '29:00' }, 2)).toEqual({
      field: 'time',
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

  test('does not expose internal save errors', () => {
    expect(friendlySaveError(new Error('SQLITE_CONSTRAINT'))).toBe(
      'Couldn’t save this medicine. Try again.',
    );
  });
});
