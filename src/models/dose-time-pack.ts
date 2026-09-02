import type { ScheduledDose } from './dose';
import type {
  MedicationAppearanceColor,
  MedicationAppearanceShape,
  MedicationAppearanceSize,
} from './medication';
import { formatTime } from './schedule';

export type DoseTimePackState = 'overdue' | 'due' | 'partial' | 'complete' | 'future';

export type MedicineRecognitionPreview = {
  id: string;
  name: string;
  shape: MedicationAppearanceShape;
  size: MedicationAppearanceSize;
  color: MedicationAppearanceColor;
  secondaryColor: MedicationAppearanceColor;
};

export type DoseTimePackModel = {
  key: string;
  time: string;
  scheduledAt: Date;
  doses: ScheduledDose[];
  total: number;
  unresolved: number;
  taken: number;
  skipped: number;
  state: DoseTimePackState;
  previews: MedicineRecognitionPreview[];
  overflowCount: number;
  actionable: boolean;
  focal: boolean;
  accessibilityLabel: string;
};

export function buildDoseTimePacks(
  doses: readonly ScheduledDose[] | undefined,
  now: Date,
  interactive: boolean,
): DoseTimePackModel[] {
  const grouped = new Map<string, ScheduledDose[]>();
  [...(doses ?? [])]
    .sort((left, right) => left.scheduledAt.getTime() - right.scheduledAt.getTime())
    .forEach((dose) => {
      const key = `${dose.schedule.hour}:${dose.schedule.minute}`;
      const group = grouped.get(key);
      if (group) group.push(dose);
      else grouped.set(key, [dose]);
    });

  const packs = [...grouped.entries()].map(([key, groupDoses]) => {
    const scheduledAt = groupDoses[0]!.scheduledAt;
    const taken = groupDoses.filter((dose) => dose.status === 'taken').length;
    const skipped = groupDoses.filter((dose) => dose.status === 'skipped').length;
    const unresolved = groupDoses.length - taken - skipped;
    const state = resolvePackState({
      scheduledAt,
      now,
      recorded: taken + skipped,
      unresolved,
    });
    const actionable =
      interactive && unresolved > 0 && scheduledAt.getTime() <= now.getTime();
    const previews = groupDoses.slice(0, 3).map(toRecognitionPreview);
    const time = formatTime(groupDoses[0]!.schedule.hour, groupDoses[0]!.schedule.minute);

    return {
      key,
      time,
      scheduledAt,
      doses: groupDoses,
      total: groupDoses.length,
      unresolved,
      taken,
      skipped,
      state,
      previews,
      overflowCount: Math.max(0, groupDoses.length - previews.length),
      actionable,
      focal: false,
      accessibilityLabel: packAccessibilityLabel({
        time,
        total: groupDoses.length,
        unresolved,
        taken,
        skipped,
        interactive,
      }),
    } satisfies DoseTimePackModel;
  });

  const focalIndex = packs.findIndex((pack) => pack.actionable);
  return packs.map((pack, index) => ({ ...pack, focal: index === focalIndex }));
}

function resolvePackState({
  scheduledAt,
  now,
  recorded,
  unresolved,
}: {
  scheduledAt: Date;
  now: Date;
  recorded: number;
  unresolved: number;
}): DoseTimePackState {
  if (unresolved === 0) return 'complete';
  if (recorded > 0) return 'partial';
  if (scheduledAt.getTime() > now.getTime()) return 'future';

  const scheduledMinute = Math.floor(scheduledAt.getTime() / 60_000);
  const currentMinute = Math.floor(now.getTime() / 60_000);
  return scheduledMinute === currentMinute ? 'due' : 'overdue';
}

function toRecognitionPreview(dose: ScheduledDose): MedicineRecognitionPreview {
  return {
    id: dose.medication.id,
    name: dose.medication.name,
    shape: dose.medication.appearanceShape,
    size: dose.medication.appearanceSize,
    color: dose.medication.appearanceColor,
    secondaryColor: dose.medication.appearanceSecondaryColor,
  };
}

function packAccessibilityLabel({
  time,
  total,
  unresolved,
  taken,
  skipped,
  interactive,
}: {
  time: string;
  total: number;
  unresolved: number;
  taken: number;
  skipped: number;
  interactive: boolean;
}): string {
  const parts = [
    time,
    `${total} ${total === 1 ? 'medicine' : 'medicines'}`,
    unresolved === 0 ? 'Complete' : `${unresolved} ${unresolved === 1 ? 'due' : 'due'}`,
  ];
  if (taken > 0) parts.push(`${taken} taken`);
  if (skipped > 0) parts.push(`${skipped} skipped`);
  parts.push(interactive ? 'Opens dose list' : 'Opens medicine list');
  return parts.join('. ');
}
