import type { Medication } from './medication';
import type { DoseStatus } from './dose';
import type { Schedule } from './schedule';

export type ExportDoseRecord = {
  occurrenceId: string;
  scheduleId: string;
  medicineId: string;
  medicineName: string;
  scheduledAt: string;
  status: Exclude<DoseStatus, 'notRecorded'>;
  recordedAt: string;
  updatedAt: string;
};

export type ExportSchedule = Schedule & {
  startsOn: string;
  endsOn: string | null;
  createdAt: string;
};

export type ExportDoseEvent = {
  id: string;
  occurrenceId: string;
  previousStatus: DoseStatus;
  nextStatus: DoseStatus;
  occurredAt: string;
};

export type ExportSupplyEvent = {
  id: string;
  medicineId: string;
  doseOccurrenceId: string | null;
  delta: number | null;
  resultingCount: number | null;
  reason: 'doseRecorded' | 'doseCorrected' | 'manualCount';
  occurredAt: string;
};

export type MedicineExportEntry = {
  medicine: Medication;
  schedules: ExportSchedule[];
};

export type PillyExport = {
  format: 'pilly-export';
  version: 1;
  exportedAt: string;
  profile: { displayName: string };
  medicines: MedicineExportEntry[];
  doseRecords: ExportDoseRecord[];
  doseEvents: ExportDoseEvent[];
  supplyEvents: ExportSupplyEvent[];
};

export function buildPillyExport({
  exportedAt,
  displayName,
  medicines,
  doseRecords,
  doseEvents,
  supplyEvents,
}: {
  exportedAt: Date;
  displayName: string;
  medicines: MedicineExportEntry[];
  doseRecords: ExportDoseRecord[];
  doseEvents: ExportDoseEvent[];
  supplyEvents: ExportSupplyEvent[];
}): PillyExport {
  return {
    format: 'pilly-export',
    version: 1,
    exportedAt: exportedAt.toISOString(),
    profile: { displayName },
    medicines,
    doseRecords,
    doseEvents,
    supplyEvents,
  };
}

export function exportSummary(data: PillyExport): {
  medicines: number;
  schedules: number;
  records: number;
} {
  return {
    medicines: data.medicines.length,
    schedules: data.medicines.reduce((count, entry) => count + entry.schedules.length, 0),
    records: data.doseRecords.length,
  };
}

export function exportDoseRecordsCsv(data: PillyExport): string {
  const rows = [
    ['Medicine', 'Scheduled at', 'Status', 'Recorded at'],
    ...data.doseRecords.map((record) => [
      record.medicineName,
      record.scheduledAt,
      record.status,
      record.recordedAt,
    ]),
  ];
  return rows.map((row) => row.map(csvCell).join(',')).join('\n');
}

export function exportPlanHtml(data: PillyExport): string {
  const profile = data.profile.displayName
    ? `<p class="profile">Prepared for ${html(data.profile.displayName)}</p>`
    : '';
  const medicines = data.medicines
    .filter(({ medicine }) => medicine.archivedAt === null)
    .map(({ medicine, schedules }) => {
      const scheduleRows = schedules
        .filter((schedule) => schedule.endsOn === null)
        .map(
          (schedule) =>
            `<li>${html(formatWeekdays(schedule.weekdayMask))} · ${html(formatTime(schedule.hour, schedule.minute))}${schedule.reminderEnabled ? ' · Reminder' : ''}</li>`,
        )
        .join('');
      return `<section><h2>${html(medicine.name)}</h2>${medicine.instructions ? `<p>${html(medicine.instructions)}</p>` : ''}<ul>${scheduleRows}</ul></section>`;
    })
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { margin: 42px; } body { color: #2b2328; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
    h1 { color: #963f63; font-size: 28px; margin-bottom: 4px; } h2 { font-size: 18px; margin-bottom: 4px; }
    .profile, .meta { color: #776e73; } section { border-top: 1px solid #eadfe3; padding: 16px 0; }
    p, li { font-size: 13px; line-height: 1.45; } ul { margin: 8px 0 0; padding-left: 18px; }
  </style></head><body><h1>Pilly medicine plan</h1>${profile}<p class="meta">Exported ${html(new Intl.DateTimeFormat(undefined, { dateStyle: 'long', timeStyle: 'short' }).format(new Date(data.exportedAt)))}</p>${medicines || '<p>No medicines saved.</p>'}</body></html>`;
}

function csvCell(value: string): string {
  const spreadsheetSafe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${spreadsheetSafe.replaceAll('"', '""')}"`;
}

function formatTime(hour: number, minute: number): string {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(
    new Date(2000, 0, 1, hour, minute),
  );
}

function formatWeekdays(mask: number): string {
  if (mask === 127) return 'Every day';
  const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return names.filter((_, index) => (mask & (1 << index)) !== 0).join(', ');
}

function html(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
