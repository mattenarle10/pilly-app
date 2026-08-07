export function estimatedDaysLeft(
  supplyCount: number | null,
  scheduledDosesPerWeek: number,
): number | null {
  if (supplyCount === null || scheduledDosesPerWeek <= 0) return null;
  return Math.floor(supplyCount / (scheduledDosesPerWeek / 7));
}

export function supplyAdjustment(
  previousStatus: 'notRecorded' | 'taken' | 'skipped',
  nextStatus: 'notRecorded' | 'taken' | 'skipped',
): number {
  if (previousStatus !== 'taken' && nextStatus === 'taken') return -1;
  if (previousStatus === 'taken' && nextStatus !== 'taken') return 1;
  return 0;
}
