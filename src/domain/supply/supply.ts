export function estimatedDaysLeft(
  supplyCount: number | null,
  scheduledDosesPerWeek: number,
): number | null {
  if (supplyCount === null || scheduledDosesPerWeek <= 0) return null;
  return Math.floor(supplyCount / (scheduledDosesPerWeek / 7));
}

export type SupplyEstimate = {
  daysLeft: number;
  runsOutOn: Date;
  confidence: 'estimated';
};

export function estimateSupply(
  supplyCount: number | null,
  scheduledDosesPerWeek: number,
  today = new Date(),
): SupplyEstimate | null {
  const daysLeft = estimatedDaysLeft(supplyCount, scheduledDosesPerWeek);
  if (daysLeft === null) return null;
  return {
    daysLeft,
    runsOutOn: new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysLeft),
    confidence: 'estimated',
  };
}

export function supplyAdjustment(
  previousStatus: 'notRecorded' | 'taken' | 'skipped',
  nextStatus: 'notRecorded' | 'taken' | 'skipped',
): number {
  if (previousStatus !== 'taken' && nextStatus === 'taken') return -1;
  if (previousStatus === 'taken' && nextStatus !== 'taken') return 1;
  return 0;
}
