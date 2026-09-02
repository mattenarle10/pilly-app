import { z } from 'zod';

const offlineGraceMs = 3 * 24 * 60 * 60 * 1000;

const plusEntitlementCacheSchema = z.object({
  active: z.boolean(),
  checkedAt: z.iso.datetime(),
});

export function serializePlusEntitlementCache(active: boolean, checkedAt: string): string {
  return JSON.stringify(plusEntitlementCacheSchema.parse({ active, checkedAt }));
}

export function hasFreshCachedPlusEntitlement(
  value: string | null | undefined,
  now = Date.now(),
): boolean {
  if (!value) return false;
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(value);
  } catch {
    return false;
  }
  const parsed = plusEntitlementCacheSchema.safeParse(parsedJson);
  if (!parsed.success || !parsed.data.active) return false;
  const checkedAt = Date.parse(parsed.data.checkedAt);
  return Number.isFinite(checkedAt) && checkedAt <= now && now - checkedAt <= offlineGraceMs;
}
