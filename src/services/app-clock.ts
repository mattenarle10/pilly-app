const configuredE2EHour = process.env.EXPO_PUBLIC_E2E_CLOCK_HOUR;

export function appNow(source = new Date()): Date {
  const hour = parseE2EHour(configuredE2EHour);
  if (hour === null) return source;

  const fixed = new Date(source);
  fixed.setHours(hour, 59, 0, 0);
  return fixed;
}

export function hasFixedE2EClock(): boolean {
  return parseE2EHour(configuredE2EHour) !== null;
}

function parseE2EHour(value: string | undefined): number | null {
  if (!value || !/^\d{1,2}$/.test(value)) return null;
  const hour = Number(value);
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : null;
}
