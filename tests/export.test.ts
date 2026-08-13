import {
  buildPillyExport,
  exportDoseRecordsCsv,
  exportPlanHtml,
  exportSummary,
} from '@/models/export';
import type { Medication } from '@/models/medication';
import type { Schedule } from '@/models/schedule';

const medicine: Medication = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Ada, daily',
  instructions: 'Take with <food>',
  supplyCount: 7,
  appearanceShape: 'capsule',
  appearanceSize: 'medium',
  appearanceTone: 'rose',
  appearanceSecondaryTone: 'peach',
  createdAt: '2026-08-13T00:00:00.000Z',
  updatedAt: '2026-08-13T00:00:00.000Z',
  archivedAt: null,
  timeZoneIdentifier: 'Asia/Manila',
};
const schedule: Schedule = {
  id: '22222222-2222-4222-8222-222222222222',
  medicationId: medicine.id,
  hour: 9,
  minute: 0,
  weekdayMask: 127,
  sortOrder: 0,
  reminderEnabled: true,
};
const exportSchedule = {
  ...schedule,
  startsOn: '2026-08-13',
  endsOn: null,
  createdAt: '2026-08-13T00:00:00.000Z',
};

const data = buildPillyExport({
  exportedAt: new Date('2026-08-13T01:00:00.000Z'),
  displayName: 'Ada & Co',
  medicines: [{ medicine, schedules: [exportSchedule] }],
  doseRecords: [
    {
      occurrenceId: `${schedule.id}:2026-08-13`,
      scheduleId: schedule.id,
      medicineId: medicine.id,
      medicineName: medicine.name,
      scheduledAt: '2026-08-13T01:00:00.000Z',
      status: 'taken',
      recordedAt: '2026-08-13T01:02:00.000Z',
      updatedAt: '2026-08-13T01:02:00.000Z',
    },
  ],
  doseEvents: [
    {
      id: '33333333-3333-4333-8333-333333333333',
      occurrenceId: `${schedule.id}:2026-08-13`,
      previousStatus: 'notRecorded',
      nextStatus: 'taken',
      occurredAt: '2026-08-13T01:02:00.000Z',
    },
  ],
  supplyEvents: [
    {
      id: '44444444-4444-4444-8444-444444444444',
      medicineId: medicine.id,
      doseOccurrenceId: `${schedule.id}:2026-08-13`,
      delta: -1,
      resultingCount: 6,
      reason: 'doseRecorded',
      occurredAt: '2026-08-13T01:02:00.000Z',
    },
  ],
});

describe('Pilly export', () => {
  test('builds a versioned complete local export and summary', () => {
    expect(data).toMatchObject({
      format: 'pilly-export',
      version: 1,
      profile: { displayName: 'Ada & Co' },
      doseEvents: expect.arrayContaining([expect.objectContaining({ nextStatus: 'taken' })]),
      supplyEvents: expect.arrayContaining([expect.objectContaining({ resultingCount: 6 })]),
    });
    expect(exportSummary(data)).toEqual({ medicines: 1, schedules: 1, records: 1 });
  });

  test('quotes spreadsheet values safely', () => {
    const csv = exportDoseRecordsCsv(data);

    expect(csv).toContain('"Ada, daily"');
    expect(csv).toContain('"taken"');
  });

  test('neutralizes user-entered spreadsheet formulas', () => {
    const unsafe = {
      ...data,
      doseRecords: [{ ...data.doseRecords[0]!, medicineName: '=HYPERLINK("bad")' }],
    };

    expect(exportDoseRecordsCsv(unsafe)).toContain('"\'=HYPERLINK(""bad"")"');
  });

  test('escapes private text in the print-ready plan', () => {
    const html = exportPlanHtml(data);

    expect(html).toContain('Ada &amp; Co');
    expect(html).toContain('Take with &lt;food&gt;');
    expect(html).not.toContain('Take with <food>');
  });
});
