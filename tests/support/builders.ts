import type { ScheduledDose } from '@/models/dose';
import type { Medication } from '@/models/medication';
import type { Schedule } from '@/models/schedule';

const medicineId = 'd7bf17a4-3b0c-4c61-9155-7102fe0769f2';
const scheduleId = '4cf5bccb-1e47-4093-b91d-428cf5eed57b';

export function buildMedication(overrides: Partial<Medication> = {}): Medication {
  return {
    id: medicineId,
    name: 'Morning capsule',
    instructions: '',
    supplyCount: 14,
    appearanceShape: 'capsule',
    appearanceSize: 'medium',
    appearanceColor: '#F3CCD7',
    appearanceSecondaryColor: '#FBE9DE',
    createdAt: '2026-08-09T00:00:00.000Z',
    updatedAt: '2026-08-09T00:00:00.000Z',
    archivedAt: null,
    timeZoneIdentifier: 'Asia/Manila',
    ...overrides,
  };
}

export function buildSchedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    id: scheduleId,
    medicationId: medicineId,
    hour: 9,
    minute: 0,
    weekdayMask: 127,
    sortOrder: 0,
    reminderEnabled: false,
    ...overrides,
  };
}

export function buildScheduledDose({
  occurrenceId = 'schedule:2026-08-10',
  scheduledAt = new Date(2026, 7, 10, 9, 0),
  status = 'notRecorded',
  medication: medicationOverrides,
  schedule: scheduleOverrides,
}: {
  occurrenceId?: string;
  scheduledAt?: Date;
  status?: ScheduledDose['status'];
  medication?: Partial<Medication>;
  schedule?: Partial<Schedule>;
} = {}): ScheduledDose {
  const medication = buildMedication(medicationOverrides);
  const schedule = buildSchedule({
    medicationId: medication.id,
    hour: scheduledAt.getHours(),
    minute: scheduledAt.getMinutes(),
    ...scheduleOverrides,
  });
  return {
    occurrenceId,
    medication,
    schedule,
    scheduledAt,
    status,
    recordedAt: status === 'notRecorded' ? null : scheduledAt,
  };
}
